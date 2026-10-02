import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { AsignacionVenta, DatosPersonalesVendedor, VendedorNuevo } from 'src/app/interfaces/vendedor-nuevo';
import { DbFirestoreService, EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';
import { LogRegistroService } from 'src/app/servicios/log-registro/log-registro.service';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';

/** Asignación vista desde el vendedor: a qué cliente y con qué porcentaje.
 *  (La asignación se guarda en el Cliente: Cliente.comisionesVenta.) */
export interface AsignacionCliente {
  idCliente: string;
  porcentaje: number;
}

/** Dueño del módulo Vendedores (Frente Vendedores).
 *  - Lectura: listener en memoria de `vendedores` (init() desde el shell del
 *    módulo: solo dev/admin/demo pueden leer la colección). Normaliza el
 *    formato viejo al leer.
 *  - Escritura: alta/edición (con asignaciones), desactivación y
 *    reactivación — cada gesto en UN batch atómico con su log. Las
 *    asignaciones se escriben en Cliente.comisionesVenta, calculadas sobre
 *    los clientes VIVOS de ClienteService. */
@Injectable({ providedIn: 'root' })
export class VendedorService implements OnDestroy {

  static readonly COLECCION = 'vendedores';

  private _vendedores$ = new BehaviorSubject<ConId<VendedorNuevo>[]>([]);
  readonly vendedores$ = this._vendedores$.asObservable();

  private destroy$ = new Subject<void>();
  private iniciado = false;

  constructor(
    private db: DbFirestoreService,
    private logRegistro: LogRegistroService,
    private clienteService: ClienteService,
  ) {}

  // ── Lectura ─────────────────────────────────────────────────────

  /** Idempotente: el listener se abre una sola vez por sesión. */
  init(): void {
    if (this.iniciado) return;
    this.iniciado = true;
    this.db.getAllStateChanges<any>(VendedorService.COLECCION)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: changes => {
          let actual = this._vendedores$.getValue();
          for (const change of changes) {
            const { type, ...raw } = change as any;
            const v = this.normalizar(raw);
            if (type === 'removed') {
              actual = actual.filter(x => x.id !== v.id);
            } else if (actual.some(x => x.id === v.id)) {
              actual = actual.map(x => (x.id === v.id ? v : x));
            } else {
              actual = [...actual, v];
            }
          }
          this._vendedores$.next(this.ordenar(actual));
        },
        error: err => {
          this.iniciado = false;
          console.error('VendedorService: error en el listener de vendedores', err);
        },
      });
  }

  getVendedoresActuales(): ConId<VendedorNuevo>[] {
    return this._vendedores$.getValue();
  }

  getVendedorPorId(id: string): ConId<VendedorNuevo> | undefined {
    return this.getVendedoresActuales().find(v => v.id === id);
  }

  /** 'Apellido, Nombre'. */
  nombre(v: VendedorNuevo): string {
    return `${v.datosPersonales.apellido}, ${v.datosPersonales.nombre}`;
  }

  /** Clientes asignados a un vendedor (derivado de los clientes vivos). */
  asignacionesDe(idVendedor: string): AsignacionCliente[] {
    const resultado: AsignacionCliente[] = [];
    for (const c of this.clienteService.getClientesActuales()) {
      const a = (c.comisionesVenta ?? []).find(x => x.idVendedor === idVendedor);
      if (a) resultado.push({ idCliente: c.id, porcentaje: a.porcentaje });
    }
    return resultado;
  }

  /** Suma de % que tienen en un cliente los vendedores distintos de idVendedor. */
  porcentajeOtros(idCliente: string, idVendedor: string | null): number {
    const c = this.clienteService.getClientePorId(idCliente);
    return (c?.comisionesVenta ?? [])
      .filter(a => a.idVendedor !== idVendedor)
      .reduce((acc, a) => acc + (a.porcentaje ?? 0), 0);
  }

  /** Validación de negocio de un alta/edición. Devuelve el mensaje de error
   *  o null. `idVendedor` es null en un alta. */
  validar(idVendedor: string | null, datos: DatosPersonalesVendedor, asignaciones: AsignacionCliente[]): string | null {
    if (!datos.nombre?.trim() || !datos.apellido?.trim()) return 'Nombre y apellido son obligatorios.';
    if (!/^\d{11}$/.test(String(datos.cuit))) return 'El CUIT debe tener 11 dígitos.';
    const duplicado = this.getVendedoresActuales()
      .find(v => v.id !== idVendedor && v.datosPersonales.cuit === datos.cuit);
    if (duplicado) return `Ya existe un vendedor con ese CUIT (${this.nombre(duplicado)}).`;

    const vistos = new Set<string>();
    for (const a of asignaciones) {
      const cliente = this.clienteService.getClientePorId(a.idCliente);
      if (!cliente) return `No se encontró el cliente ${a.idCliente}.`;
      if (vistos.has(a.idCliente)) return `El cliente ${cliente.razonSocial} está asignado dos veces.`;
      vistos.add(a.idCliente);
      if (!Number.isFinite(a.porcentaje) || a.porcentaje <= 0 || a.porcentaje > 100) {
        return `El porcentaje de ${cliente.razonSocial} tiene que ser mayor que 0 y hasta 100.`;
      }
      const total = this.porcentajeOtros(a.idCliente, idVendedor) + a.porcentaje;
      if (total > 100 + 1e-9) {
        return `En ${cliente.razonSocial} la suma de porcentajes de los vendedores sería ${total}% (máximo 100%).`;
      }
    }
    return null;
  }

  // ── Escritura ───────────────────────────────────────────────────

  /** Alta o edición de un vendedor con sus asignaciones — un batch atómico
   *  (vendedor + clientes afectados + log). Devuelve el id del vendedor. */
  async guardarVendedor(
    modo: 'alta' | 'edicion',
    datos: DatosPersonalesVendedor,
    asignaciones: AsignacionCliente[],
    original?: ConId<VendedorNuevo>,
  ): Promise<string> {
    if (modo === 'edicion' && !original) throw new Error('Falta el vendedor a editar.');
    if (modo === 'edicion' && !original!.activo) {
      throw new Error('El vendedor está inactivo: reactivalo antes de editarlo.');
    }
    const id = modo === 'alta' ? this.db.generarId(VendedorService.COLECCION) : original!.id;
    const error = this.validar(modo === 'alta' ? null : id, datos, asignaciones);
    if (error) throw new Error(error);

    const vendedor: VendedorNuevo = { datosPersonales: { ...datos }, activo: true };
    const escrituras: EscrituraBatch[] = [
      {
        coleccion: VendedorService.COLECCION,
        id,
        // 'reemplazar' reescribe los docs viejos en el formato nuevo
        // (desaparecen idVendedor / asignaciones / mail).
        modo: modo === 'alta' ? 'crear' : 'reemplazar',
        data: vendedor,
      },
      ...this.escriturasAsignaciones(id, asignaciones),
    ];
    const nombre = `${datos.apellido} ${datos.nombre}`;
    const accion = modo === 'alta' ? 'ALTA' : 'EDITAR';
    const msj = modo === 'alta' ? `Alta de Vendedor ${nombre}` : `Edición de Vendedor ${nombre}`;
    await this.logRegistro.agregarAlBatch(escrituras, accion, VendedorService.COLECCION, id, msj);
    try {
      await this.db.commitBatch(escrituras);
    } catch (e: any) {
      await this.logRegistro.registrarError(accion, VendedorService.COLECCION, id, `Error: ${e?.message ?? e}`);
      throw e;
    }
    return id;
  }

  /** Baja = desactivar: activo false + quita sus asignaciones de todos los
   *  clientes + log BAJA, en un batch. Las comisiones ya generadas se
   *  conservan (y se liquidan desde el Tablero). */
  async desactivar(vendedor: ConId<VendedorNuevo>, motivo: string): Promise<void> {
    if (!vendedor.activo) throw new Error('El vendedor ya está inactivo.');
    const escrituras: EscrituraBatch[] = [
      { coleccion: VendedorService.COLECCION, id: vendedor.id, modo: 'actualizar', data: { activo: false } },
      ...this.escriturasAsignaciones(vendedor.id, []),
    ];
    const msj = `Desactivación de Vendedor ${vendedor.datosPersonales.apellido} ${vendedor.datosPersonales.nombre}. Motivo: ${motivo}`;
    await this.logRegistro.agregarAlBatch(escrituras, 'BAJA', VendedorService.COLECCION, vendedor.id, msj);
    try {
      await this.db.commitBatch(escrituras);
    } catch (e: any) {
      await this.logRegistro.registrarError('BAJA', VendedorService.COLECCION, vendedor.id, `Error: ${e?.message ?? e}`);
      throw e;
    }
  }

  /** Reactivar: activo true + log RESTAURAR. No repone asignaciones. */
  async reactivar(vendedor: ConId<VendedorNuevo>): Promise<void> {
    if (vendedor.activo) throw new Error('El vendedor ya está activo.');
    const escrituras: EscrituraBatch[] = [
      { coleccion: VendedorService.COLECCION, id: vendedor.id, modo: 'actualizar', data: { activo: true } },
    ];
    const msj = `Reactivación de Vendedor ${vendedor.datosPersonales.apellido} ${vendedor.datosPersonales.nombre}`;
    await this.logRegistro.agregarAlBatch(escrituras, 'RESTAURAR', VendedorService.COLECCION, vendedor.id, msj);
    try {
      await this.db.commitBatch(escrituras);
    } catch (e: any) {
      await this.logRegistro.registrarError('RESTAURAR', VendedorService.COLECCION, vendedor.id, `Error: ${e?.message ?? e}`);
      throw e;
    }
  }

  // ── Privados ────────────────────────────────────────────────────

  /** 'actualizar' de comisionesVenta en cada cliente cuyo array cambia:
   *  los que tenían al vendedor y los que lo van a tener. Conserva la
   *  posición de la entrada si ya existía. Sobre clientes VIVOS. */
  private escriturasAsignaciones(idVendedor: string, nuevas: AsignacionCliente[]): EscrituraBatch[] {
    const porCliente = new Map(nuevas.map(a => [a.idCliente, a.porcentaje]));
    const escrituras: EscrituraBatch[] = [];

    for (const c of this.clienteService.getClientesActuales()) {
      const actual: AsignacionVenta[] = c.comisionesVenta ?? [];
      const tenia = actual.some(a => a.idVendedor === idVendedor);
      const tendra = porCliente.has(c.id);
      if (!tenia && !tendra) continue;

      let nueva: AsignacionVenta[] = actual
        .map(a => (a.idVendedor === idVendedor
          ? (tendra ? { idVendedor, porcentaje: porCliente.get(c.id)! } : null)
          : a))
        .filter((a): a is AsignacionVenta => a !== null);
      if (!tenia && tendra) nueva = [...nueva, { idVendedor, porcentaje: porCliente.get(c.id)! }];

      if (JSON.stringify(nueva) === JSON.stringify(actual)) continue;
      escrituras.push({ coleccion: 'clientes', id: c.id, modo: 'actualizar', data: { comisionesVenta: nueva } });
    }
    return escrituras;
  }

  /** Formato viejo → nuevo (los docs viejos se reescriben al editarlos). */
  private normalizar(raw: any): ConId<VendedorNuevo> {
    const dp = raw?.datosPersonales ?? {};
    return {
      id: raw.id,
      datosPersonales: {
        nombre: dp.nombre ?? '',
        apellido: dp.apellido ?? '',
        cuit: Number(String(dp.cuit ?? '').replace(/\D/g, '')) || 0,
        celular: String(dp.celular ?? ''),
        email: dp.email ?? dp.mail ?? '',
      },
      activo: raw?.activo ?? true,
    };
  }

  private ordenar(lista: ConId<VendedorNuevo>[]): ConId<VendedorNuevo>[] {
    return [...lista].sort((a, b) =>
      a.datosPersonales.apellido.localeCompare(b.datosPersonales.apellido)
      || a.datosPersonales.nombre.localeCompare(b.datosPersonales.nombre));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
