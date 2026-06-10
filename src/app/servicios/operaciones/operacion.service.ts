import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, merge } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Operacion } from 'src/app/interfaces/operacion';
import { ConId } from 'src/app/interfaces/conId';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { Asignacion } from 'src/app/interfaces/asignacion';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { OperacionFactoryService } from 'src/app/servicios/operaciones/operacion-factory.service';

export interface ResultadoCreacionOps {
  operaciones: Operacion[];
  errores: ErrorCreacionOp[];
}

export interface ErrorCreacionOp {
  idCliente: string;
  idChofer: string;
  motivo: string;
}

@Injectable({ providedIn: 'root' })
export class OperacionService implements OnDestroy {

  private _operaciones$ = new BehaviorSubject<ConId<Operacion>[]>([]);
  public operaciones$ = this._operaciones$.asObservable();

  private destroy$       = new Subject<void>();
  private cancelarRango$ = new Subject<void>();

  constructor(
    private db: DbFirestoreService,
    private clienteService: ClienteService,
    private choferService: ChoferService,
    private proveedorService: ProveedorService,
    private operacionFactory: OperacionFactoryService,
  ) {}

  /**
   * Carga las operaciones de un rango de fechas. Reemplaza por completo el contenido
   * del observable (no acumula). Cada llamada cancela la suscripción del rango anterior
   * para evitar streams superpuestos.
   * @param desde fecha ISO 'YYYY-MM-DD'
   * @param hasta fecha ISO 'YYYY-MM-DD'
   * @param orden 'asc' | 'desc'
   */
  cargarOperaciones(desde: string, hasta: string, orden: 'asc' | 'desc' = 'desc'): void {
    this.cancelarRango$.next();

    this.db.getAllByDateValue<Operacion>('operaciones', 'fecha', desde, hasta, orden)
      .pipe(takeUntil(merge(this.destroy$, this.cancelarRango$)))
      .subscribe(docs => {
        const ops = docs.map(d => ({ ...d, idOperacion: d.id })) as ConId<Operacion>[];
        this._operaciones$.next(ops);
      });
  }

  getOperacionesActuales(): ConId<Operacion>[] {
    return this._operaciones$.getValue();
  }

  /**
   * Crea las operaciones base a partir de una estructura de asignaciones.
   * Resuelve cliente/chofer/proveedor por ID contra los services en memoria y delega
   * la construcción al factory. NO persiste. Devuelve las operaciones creadas y la lista
   * de asignaciones que no se pudieron resolver (para que el componente avise al usuario).
   */
  crearOperacionesDesdeAsignacion(asignacion: Asignacion): ResultadoCreacionOps {
    const operaciones: Operacion[] = [];
    const errores: ErrorCreacionOp[] = [];

    const clientes   = this.clienteService.getClientesActuales();
    const choferes   = this.choferService.getChoferesActuales();
    const proveedores = this.proveedorService.getProveedoresActuales();

    for (const base of asignacion.asignaciones) {
      const cliente = clientes.find(c => c.id === base.idCliente);

      if (!cliente) {
        for (const ac of base.asignacionesChofer) {
          errores.push({
            idCliente: base.idCliente,
            idChofer:  ac.idChofer,
            motivo:    `Cliente ${base.idCliente} no encontrado`,
          });
        }
        continue;
      }

      for (const ac of base.asignacionesChofer) {
        const chofer = choferes.find(c => c.id === ac.idChofer);

        if (!chofer) {
          errores.push({
            idCliente: base.idCliente,
            idChofer:  ac.idChofer,
            motivo:    `Chofer ${ac.idChofer} no encontrado`,
          });
          continue;
        }

        // Resolver proveedor solo si la contratación del chofer es vía proveedor.
        let proveedor: ConId<Proveedor> | null = null;
        if (chofer.contratacion.tipo === 'proveedor') {
          const idProv = chofer.contratacion.idProveedor;
          const provEncontrado = proveedores.find(p => p.id === idProv);
          if (!provEncontrado) {
            errores.push({
              idCliente: base.idCliente,
              idChofer:  ac.idChofer,
              motivo:    `Proveedor ${idProv} del chofer ${ac.idChofer} no encontrado`,
            });
            continue;
          }
          proveedor = provEncontrado;
        }

        const op = this.operacionFactory.crearOperacionBase({
          cliente,
          chofer,
          proveedor,
          fecha:       asignacion.fecha,
          observacion: ac.observacion,
          hojaDeRuta:  ac.hojaDeRuta,
        });

        operaciones.push(op);
      }
    }

    return { operaciones, errores };
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cancelarRango$.complete();
  }
}
