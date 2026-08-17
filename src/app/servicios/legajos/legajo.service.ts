import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Documentacion, DocumentacionHistorial, Legajo } from 'src/app/interfaces/legajo';
import { ConIdType } from 'src/app/interfaces/conId';
import { DbFirestoreService, EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';
import { LogRegistroService } from 'src/app/servicios/log-registro/log-registro.service';
import { StorageArchivosService } from 'src/app/servicios/storage-archivos/storage-archivos.service';
import { LegajoFactoryService } from 'src/app/servicios/legajos/legajo-factory.service';

@Injectable({ providedIn: 'root' })
export class LegajoService implements OnDestroy {

  private _legajos$ = new BehaviorSubject<ConIdType<Legajo>[]>([]);
  public legajos$ = this._legajos$.asObservable();

  private destroy$ = new Subject<void>();

  constructor(
    private db: DbFirestoreService,
    private logRegistro: LogRegistroService,
    private storageArchivosService: StorageArchivosService, // sin uso todavía en este bloque — ver nota en guardarDocumentacion
    private legajoFactoryService: LegajoFactoryService,
  ) {}

  init(): void {
    this.db.getAllStateChanges<Legajo>('legajos')
      .pipe(takeUntil(this.destroy$))
      .subscribe(changes => {
        let current = this._legajos$.getValue();
        changes.forEach(change => {
          const { type, ...dato } = change;
          const legajo = { ...dato, idLegajo: dato.id } as ConIdType<Legajo>;
          if (type === 'added' && !current.some(l => l.idLegajo === legajo.idLegajo)) {
            current = [...current, legajo];
          } else if (type === 'modified') {
            current = current.map(l => l.idLegajo === legajo.idLegajo ? legajo : l);
          } else if (type === 'removed') {
            current = current.filter(l => l.idLegajo !== legajo.idLegajo);
          }
        });
        this._legajos$.next(current);
      });
  }

  getLegajosActuales(): ConIdType<Legajo>[] {
    return this._legajos$.getValue();
  }

  getLegajoPorChofer(idChofer: string): ConIdType<Legajo> | undefined {
    return this.getLegajosActuales().find(l => l.idChofer === idChofer);
  }

  /** Excluye idLegajo, id y type (metadata de ConIdType) antes de escribir en Firestore. */
  private toFirestore(legajo: ConIdType<Legajo>): Omit<Legajo, 'idLegajo'> {
    const { idLegajo, id, type, ...resto } = legajo as any;
    return resto;
  }

  /**
   * Prepara (sin escribir) el alta de legajo vacío para un chofer nuevo. El caller
   * (ChoferService, dueño de la cascada de alta) agrega la escritura devuelta a su
   * propio EscrituraBatch[] consolidado y hace el commit + log — ver "Frente Log —
   * mecanismo unificado" en CLAUDE.md. Reemplaza a crearLegajoParaChofer (escribía
   * por su cuenta, fuera de cualquier batch).
   */
  prepararLegajoVacio(idChofer: string): EscrituraBatch {
    const legajoVacio = this.legajoFactoryService.crearLegajoVacio(idChofer);
    const { idLegajo, ...paraGuardar } = legajoVacio;
    const id = this.db.generarId('legajos');
    return { coleccion: 'legajos', id, data: paraGuardar, modo: 'crear' };
  }

  /**
   * Lee el legajo del chofer y prepara (sin escribir) su escritura de baja — misma
   * categoría que Vehiculo en las cascadas de ChoferService/ProveedorService: sin
   * papelera propia. El caller (dueño de la cascada de baja) agrega la escritura a su
   * propio batch consolidado y hace el commit + log; usa el `legajo` devuelto para su
   * objeto compuesto de papelera. null si el chofer no tenía legajo (caso anómalo, no
   * debería pasar en datos sanos). Reemplaza a eliminarLegajoDeChofer (escribía por su
   * cuenta, fuera de cualquier batch).
   */
  async prepararBajaLegajoDeChofer(idChofer: string): Promise<{ legajo: ConIdType<Legajo>; escritura: EscrituraBatch } | null> {
    const resultados = await this.db.getByField<Legajo>('legajos', 'idChofer', idChofer);
    if (resultados.length === 0) {
      console.warn(`No se encontró legajo para el chofer ${idChofer} — caso anómalo, no debería pasar en datos sanos`);
      return null;
    }
    const { id, data } = resultados[0];
    // idLegajo se reconstruye desde el id real del doc, no desde data — mismo motivo
    // que en init(): el campo idXxx no se persiste dentro del documento (ver toFirestore).
    const legajo = { ...data, id, idLegajo: id, type: '' } as ConIdType<Legajo>;
    return { legajo, escritura: { coleccion: 'legajos', id, data: null, modo: 'eliminar' } };
  }

  async toggleVisibilidad(idLegajo: string): Promise<void> {
    const legajo = this.getLegajosActuales().find(l => l.idLegajo === idLegajo || l.id === idLegajo);
    if (!legajo) {
      throw new Error(`No se encontró el legajo ${idLegajo} al intentar cambiar visibilidad`);
    }
    const paraGuardar = this.toFirestore({ ...legajo, visible: !legajo.visible });
    const escrituras: EscrituraBatch[] = [
      { coleccion: 'legajos', id: legajo.id, data: paraGuardar, modo: 'reemplazar' },
    ];
    await this.logRegistro.agregarAlBatch(
      escrituras, 'EDITAR', 'legajos', legajo.id,
      `Visibilidad de legajo actualizada (legajo ${legajo.idLegajo})`,
    );
    try {
      await this.db.commitBatch(escrituras);
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'EDITAR', 'legajos', legajo.id,
        `Error al actualizar visibilidad del legajo ${legajo.idLegajo}: ${e?.message ?? e}`,
      );
      throw e;
    }
  }

  /**
   * Guarda uno o más documentos nuevos/reemplazados en el legajo. Para cada documento
   * cuya idCategoria YA existe en legajo.documentacion, archiva la versión vieja completa
   * en 'documentacionHistorial' ANTES de sobreescribir (Opción B del diseño: historial
   * granular por documento, no snapshot completo del legajo).
   *
   * Precondición: las imagenes[] de cada Documentacion en `documentosNuevos` ya deben
   * tener las URLs reales (subida a Storage ya resuelta por el caller, vía
   * StorageArchivosService, ANTES de llamar a este método — este método no sube archivos).
   */
  async guardarDocumentacion(idLegajo: string, documentosNuevos: Documentacion[]): Promise<void> {
    const legajo = this.getLegajosActuales().find(l => l.id === idLegajo || l.idLegajo === idLegajo);
    if (!legajo) {
      throw new Error(`No se encontró el legajo ${idLegajo} al intentar guardar documentación`);
    }

    const documentacionActualizada = [...legajo.documentacion];
    const escrituras: EscrituraBatch[] = [];

    for (const docNuevo of documentosNuevos) {
      const indexExistente = documentacionActualizada.findIndex(d => d.idCategoria === docNuevo.idCategoria);

      if (indexExistente !== -1) {
        // Archivar versión vieja en documentacionHistorial antes de reemplazar
        const docViejo = documentacionActualizada[indexExistente];
        const entradaHistorial: DocumentacionHistorial = {
          idLegajo: legajo.idLegajo,
          idCategoria: docViejo.idCategoria,
          documento: docViejo,
          fechaReemplazo: new Date().toISOString(),
        };
        const idHistorial = this.db.generarId('documentacionHistorial');
        escrituras.push({ coleccion: 'documentacionHistorial', id: idHistorial, data: entradaHistorial, modo: 'crear' });
        await this.logRegistro.agregarAlBatch(
          escrituras, 'ALTA', 'documentacionHistorial', idHistorial,
          `Archivado histórico de documentación (legajo ${legajo.idLegajo}, categoría ${docViejo.idCategoria})`,
        );
        documentacionActualizada[indexExistente] = docNuevo;
      } else {
        documentacionActualizada.push(docNuevo);
      }
    }

    const paraGuardar = this.toFirestore({ ...legajo, documentacion: documentacionActualizada });
    escrituras.push({ coleccion: 'legajos', id: legajo.id, data: paraGuardar, modo: 'reemplazar' });
    await this.logRegistro.agregarAlBatch(
      escrituras, 'EDITAR', 'legajos', legajo.id, `Documentación actualizada (legajo ${legajo.idLegajo})`,
    );

    try {
      await this.db.commitBatch(escrituras);
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'EDITAR', 'legajos', legajo.id,
        `Error al guardar documentación del legajo ${legajo.idLegajo}: ${e?.message ?? e}`,
      );
      throw e;
    }
  }

  /**
   * Lectura puntual (no listener) del historial de una categoría de un legajo.
   * Usado por consulta-legajos para mostrar versiones anteriores.
   */
  async getHistorialDocumento(idLegajo: string, idCategoria: string): Promise<ConIdType<DocumentacionHistorial>[]> {
    const resultados = await this.db.getByField<DocumentacionHistorial>('documentacionHistorial', 'idLegajo', idLegajo);
    return resultados
      .map(r => ({ ...r.data, id: r.id, type: '' }) as ConIdType<DocumentacionHistorial>)
      .filter(h => h.idCategoria === idCategoria)
      .sort((a, b) => b.fechaReemplazo.localeCompare(a.fechaReemplazo)); // más reciente primero
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
