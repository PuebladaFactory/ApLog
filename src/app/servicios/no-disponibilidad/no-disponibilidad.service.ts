import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Anulacion } from 'src/app/interfaces/anulacion';
import { ConId } from 'src/app/interfaces/conId';
import { ConsultaSujeto, NoDisponibilidad, SujetoNoDisponibilidad } from 'src/app/interfaces/no-disponibilidad';
import { Resultado } from 'src/app/interfaces/resultado';
import { DbFirestoreService, EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';
import { LogRegistroService } from 'src/app/servicios/log-registro/log-registro.service';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import {
  NoDisponibilidadFactoryService, PeriodoNoDisponibilidad,
} from './no-disponibilidad-factory.service';
import {
  mismoSujeto, nombreSujeto, periodosSeSolapan,
} from 'src/app/shared/utils/vigencia-no-disponibilidad.util';

/** Dueño de la colección `noDisponibilidades` (diseño:
 *  docs/disenos/no-disponibilidad.md).
 *  - Lectura: listener vivo sobre la colección COMPLETA, sin filtro. La
 *    vigencia (y el historial) se derivan en memoria con
 *    vigencia-no-disponibilidad.util.ts. `init()` idempotente: lo llama quien
 *    lo necesite (nadie todavía, bloque 1).
 *  - Escritura: alta, edición y anulación, cada una en UN commitBatch con su
 *    log (LogRegistroService) y retorno Resultado<T>. Cerrar una no
 *    disponibilidad indeterminada es una edición (se escribe `hasta`).
 *  - Patrón puente: el alta recibe el sujeto por id, lo resuelve contra
 *    ChoferService / ProveedorService y le pasa la entidad al factory para el
 *    snapshot. */
@Injectable({ providedIn: 'root' })
export class NoDisponibilidadService implements OnDestroy {

  static readonly COLECCION = 'noDisponibilidades';

  /** Ordenadas de la más nueva a la más vieja por `desde` (orden del historial). */
  private _noDisponibilidades$ = new BehaviorSubject<ConId<NoDisponibilidad>[]>([]);
  readonly noDisponibilidades$ = this._noDisponibilidades$.asObservable();

  private destroy$ = new Subject<void>();
  private iniciado = false;
  /** true desde el primer snapshot del listener. La colección puede estar
   *  vacía de verdad, así que `[]` no alcanza para saber si ya se leyó. */
  private cargado = false;

  constructor(
    private db: DbFirestoreService,
    private logRegistro: LogRegistroService,
    private factory: NoDisponibilidadFactoryService,
    private choferService: ChoferService,
    private proveedorService: ProveedorService,
    private usuarioSesion: UsuarioSesionService,
  ) {}

  // ── Lectura ─────────────────────────────────────────────────────

  /** Idempotente: el listener se abre una sola vez por sesión. */
  init(): void {
    if (this.iniciado) return;
    this.iniciado = true;
    this.db.getAllStateChanges<any>(NoDisponibilidadService.COLECCION)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: changes => {
          let actual = this._noDisponibilidades$.getValue();
          for (const change of changes) {
            const { type, ...dato } = change as any;
            const nd = { ...dato, idNoDisponibilidad: dato.id } as ConId<NoDisponibilidad>;
            if (type === 'removed') {
              actual = actual.filter(x => x.id !== nd.id);
            } else if (actual.some(x => x.id === nd.id)) {
              actual = actual.map(x => (x.id === nd.id ? nd : x));
            } else {
              actual = [...actual, nd];
            }
          }
          this.cargado = true;
          this._noDisponibilidades$.next(this.ordenar(actual));
        },
        error: err => {
          this.iniciado = false;
          this.cargado = false;
          console.error('NoDisponibilidadService: error en el listener de noDisponibilidades', err);
        },
      });
  }

  /** ¿Ya llegó el primer snapshot? false antes de `init()` o si el listener falló. */
  estaCargado(): boolean {
    return this.cargado;
  }

  /** Todas (incluidas las terminadas y las anuladas), más nueva primero. */
  getNoDisponibilidadesActuales(): ConId<NoDisponibilidad>[] {
    return this._noDisponibilidades$.getValue();
  }

  getNoDisponibilidadPorId(id: string): ConId<NoDisponibilidad> | undefined {
    return this.getNoDisponibilidadesActuales().find(nd => nd.id === id);
  }

  /** Activas del mismo sujeto cuyo período se superpone con el dado. Para el
   *  aviso de solapamiento (avisa, no rechaza). `excluirId`: la que se está
   *  editando. Sobre el estado en memoria: requiere `init()`. */
  solapadasCon(
    sujeto: ConsultaSujeto,
    periodo: { desde: string; hasta: string | null },
    excluirId?: string,
  ): ConId<NoDisponibilidad>[] {
    return this.getNoDisponibilidadesActuales().filter(nd =>
      nd.activa
      && nd.id !== excluirId
      && mismoSujeto(nd.sujeto, sujeto)
      && periodosSeSolapan(nd, periodo));
  }

  // ── Escritura ───────────────────────────────────────────────────

  /** Alta. Devuelve el id del registro creado. */
  async alta(sujeto: ConsultaSujeto, periodo: PeriodoNoDisponibilidad): Promise<Resultado<string>> {
    const error = this.factory.validar(periodo);
    if (error) return { exito: false, mensaje: error };

    const snapshot = this.resolverSujeto(sujeto);
    if (!snapshot) return { exito: false, mensaje: `No se encontró el ${sujeto.tipo} a marcar como no disponible.` };

    const id = this.db.generarId(NoDisponibilidadService.COLECCION);
    const nd = this.factory.crearNoDisponibilidad(snapshot, periodo);
    const escrituras: EscrituraBatch[] = [
      { coleccion: NoDisponibilidadService.COLECCION, id, data: nd, modo: 'crear' },
    ];
    const detalle = `Alta de No disponibilidad de ${this.descripcion(nd)}`;
    try {
      await this.logRegistro.agregarAlBatch(escrituras, 'ALTA', NoDisponibilidadService.COLECCION, id, detalle);
      await this.db.commitBatch(escrituras);
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'ALTA', NoDisponibilidadService.COLECCION, id, `Error en ${detalle}: ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: `No se pudo guardar la no disponibilidad: ${e?.message ?? e}` };
    }
    return { exito: true, mensaje: 'No disponibilidad registrada.', objeto: id };
  }

  /** Edición del período y el motivo (el sujeto no se edita: si está mal, se
   *  anula y se carga otra). Cerrar una indeterminada es esto con `hasta`. */
  async editar(idNoDisponibilidad: string, periodo: PeriodoNoDisponibilidad): Promise<Resultado<void>> {
    const error = this.factory.validar(periodo);
    if (error) return { exito: false, mensaje: error };

    const coleccion = NoDisponibilidadService.COLECCION;
    try {
      const anterior = await this.db.getById<NoDisponibilidad>(coleccion, idNoDisponibilidad);
      if (!anterior) return { exito: false, mensaje: 'La no disponibilidad ya no existe.' };
      if (!anterior.activa) return { exito: false, mensaje: 'La no disponibilidad está anulada: no se puede editar.' };

      const escrituras: EscrituraBatch[] = [
        { coleccion, id: idNoDisponibilidad, data: this.factory.edicionPeriodo(periodo), modo: 'actualizar' },
      ];
      await this.logRegistro.agregarAlBatch(
        escrituras, 'EDITAR', coleccion, idNoDisponibilidad,
        `Edición de No disponibilidad de ${this.descripcion(anterior)}`, anterior,
      );
      await this.db.commitBatch(escrituras);
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'EDITAR', coleccion, idNoDisponibilidad, `Error al editar No disponibilidad: ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: `No se pudo editar la no disponibilidad: ${e?.message ?? e}` };
    }
    return { exito: true, mensaje: 'No disponibilidad actualizada.' };
  }

  /** Anulación: se cargó por error, nunca existió. `activa: false` + la
   *  `anulacion` con quién, cuándo y por qué; el registro queda (historial).
   *  NO es "ya terminó": eso es editar `hasta`. */
  async anular(idNoDisponibilidad: string, motivo: string): Promise<Resultado<void>> {
    const motivoLimpio = (motivo ?? '').trim();
    if (!motivoLimpio) return { exito: false, mensaje: 'Falta el motivo de la anulación.' };

    const coleccion = NoDisponibilidadService.COLECCION;
    const anulacion: Anulacion = {
      motivo: motivoLimpio,
      usuario: this.usuarioSesion.getUsuarioActual()?.email ?? 'Desconocido',
      fecha: new Date().toISOString(),
    };
    try {
      const anterior = await this.db.getById<NoDisponibilidad>(coleccion, idNoDisponibilidad);
      if (!anterior) return { exito: false, mensaje: 'La no disponibilidad ya no existe.' };
      if (!anterior.activa) return { exito: false, mensaje: 'La no disponibilidad ya estaba anulada.' };

      const escrituras: EscrituraBatch[] = [
        { coleccion, id: idNoDisponibilidad, data: { activa: false, anulacion, timestamp: Date.now() }, modo: 'actualizar' },
      ];
      await this.logRegistro.agregarAlBatch(
        escrituras, 'ANULAR', coleccion, idNoDisponibilidad,
        `Anulación de No disponibilidad de ${this.descripcion(anterior)}. Motivo: ${motivoLimpio}`, anterior,
      );
      await this.db.commitBatch(escrituras);
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'ANULAR', coleccion, idNoDisponibilidad, `Error al anular No disponibilidad: ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: `No se pudo anular la no disponibilidad: ${e?.message ?? e}` };
    }
    return { exito: true, mensaje: 'No disponibilidad anulada.' };
  }

  // ── Privados ────────────────────────────────────────────────────

  /** Puente: id → entidad viva → snapshot. undefined si no resuelve (ej.
   *  entidad dada de baja): el alta se rechaza, nunca se escribe un snapshot vacío. */
  private resolverSujeto(sujeto: ConsultaSujeto): SujetoNoDisponibilidad | undefined {
    switch (sujeto.tipo) {
      case 'chofer': {
        const chofer = this.choferService.getChoferPorId(sujeto.idChofer);
        return chofer ? this.factory.sujetoChofer(chofer) : undefined;
      }
      case 'vehiculo': {
        const vehiculo = this.choferService.getVehiculoPorId(sujeto.idVehiculo);
        return vehiculo ? this.factory.sujetoVehiculo(vehiculo) : undefined;
      }
      case 'proveedor': {
        const proveedor = this.proveedorService.getProveedorPorId(sujeto.idProveedor);
        return proveedor ? this.factory.sujetoProveedor(proveedor) : undefined;
      }
    }
  }

  /** 'chofer Pérez Juan (2026-11-01 → sin fin)' — para el detalle del log. */
  private descripcion(nd: Pick<NoDisponibilidad, 'sujeto' | 'desde' | 'hasta'>): string {
    return `${nd.sujeto.tipo} ${nombreSujeto(nd.sujeto)} (${nd.desde} → ${nd.hasta ?? 'sin fin'})`;
  }

  private ordenar(lista: ConId<NoDisponibilidad>[]): ConId<NoDisponibilidad>[] {
    return [...lista].sort((a, b) =>
      b.desde.localeCompare(a.desde) || b.timestamp - a.timestamp);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
