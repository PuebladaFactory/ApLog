import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Documentacion, DocumentacionHistorial, Legajo } from 'src/app/interfaces/legajo';
import { ConIdType } from 'src/app/interfaces/conId';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { StorageArchivosService } from 'src/app/servicios/storage-archivos/storage-archivos.service';
import { LegajoFactoryService } from 'src/app/servicios/legajos/legajo-factory.service';

@Injectable({ providedIn: 'root' })
export class LegajoService implements OnDestroy {

  private _legajos$ = new BehaviorSubject<ConIdType<Legajo>[]>([]);
  public legajos$ = this._legajos$.asObservable();

  private destroy$ = new Subject<void>();

  constructor(
    private db: DbFirestoreService,
    private storageService: StorageService,
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
   * Alta de legajo vacío al crear un chofer. Devuelve el idLegajo generado.
   * Llamado desde ChoferService en el Bloque 4 (reemplaza a LegajosService.crearLegajo).
   */
  async crearLegajoParaChofer(idChofer: string): Promise<string> {
    const legajoVacio = this.legajoFactoryService.crearLegajoVacio(idChofer);
    const { idLegajo, ...paraGuardar } = legajoVacio;
    return this.storageService.addItemAndGetId(
      'legajos',
      paraGuardar,
      'ALTA',
      `Alta de Legajo (chofer ${idChofer})`,
    );
  }

  /**
   * Baja SIMPLE, sin entrada propia de papelera — mismo criterio que Vehiculo en las
   * cascadas de ChoferService/ProveedorService. El caller (dueño de la cascada) es
   * responsable de incluir el legajo devuelto en su propio objeto compuesto de papelera.
   * Devuelve el legajo eliminado (con su id), o null si el chofer no tenía legajo
   * (caso anómalo — no debería pasar en datos sanos, ver nota en Bloque 4).
   */
  async eliminarLegajoDeChofer(idChofer: string): Promise<ConIdType<Legajo> | null> {
    const resultados = await this.db.getByField<Legajo>('legajos', 'idChofer', idChofer);
    if (resultados.length === 0) {
      console.warn(`No se encontró legajo para el chofer ${idChofer} — caso anómalo, no debería pasar en datos sanos`);
      return null;
    }
    const { id, data } = resultados[0];
    // idLegajo se reconstruye desde el id real del doc, no desde data — mismo motivo
    // que en init(): el campo idXxx no se persiste dentro del documento (ver toFirestore).
    const legajo = { ...data, id, idLegajo: id, type: '' } as ConIdType<Legajo>;
    await this.storageService.deleteItemAsync(
      'legajos',
      id,
      id,
      'BAJA',
      `Legajo eliminado por baja de Chofer/Proveedor (chofer ${idChofer})`,
    );
    return legajo;
  }

  async toggleVisibilidad(idLegajo: string): Promise<void> {
    const legajo = this.getLegajosActuales().find(l => l.idLegajo === idLegajo || l.id === idLegajo);
    if (!legajo) {
      throw new Error(`No se encontró el legajo ${idLegajo} al intentar cambiar visibilidad`);
    }
    const paraGuardar = this.toFirestore({ ...legajo, visible: !legajo.visible });
    await this.storageService.updateItemAsync(
      'legajos',
      paraGuardar,
      legajo.id,
      'EDITAR',
      `Visibilidad de legajo actualizada (legajo ${legajo.idLegajo})`,
    );
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
        await this.storageService.addItemAndGetId(
          'documentacionHistorial',
          entradaHistorial,
          'ALTA',
          `Archivado histórico de documentación (legajo ${legajo.idLegajo}, categoría ${docViejo.idCategoria})`,
        );
        documentacionActualizada[indexExistente] = docNuevo;
      } else {
        documentacionActualizada.push(docNuevo);
      }
    }

    const paraGuardar = this.toFirestore({ ...legajo, documentacion: documentacionActualizada });
    await this.storageService.updateItemAsync(
      'legajos',
      paraGuardar,
      legajo.id,
      'EDITAR',
      `Documentación actualizada (legajo ${legajo.idLegajo})`,
    );
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
