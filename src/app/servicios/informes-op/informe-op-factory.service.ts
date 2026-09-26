import { Injectable } from '@angular/core';
import { ConId } from 'src/app/interfaces/conId';
import { Operacion, RefCliente, RefChofer, RefProveedor } from 'src/app/interfaces/operacion';
import { InformeOpNuevo, Valores } from 'src/app/interfaces/informe-op-nuevo';

/** Construcción pura de InformeOpNuevo — sin Firestore, sin decidir ids. El
 *  caller genera idInfOp (DbFirestoreService.generarId) ANTES de llamar acá,
 *  porque para cruzar `contraParte` entre los dos informes de una misma
 *  operación hacen falta ambos ids antes de persistir cualquiera de los dos
 *  (mismo problema que resolvía el id sintético + $armarFacturasOp del
 *  sistema viejo, ahora con ids reales conocidos de antemano). */
@Injectable({ providedIn: 'root' })
export class InformeOpFactoryService {

  crear(
    idInfOp: string,
    op: ConId<Operacion>,
    tipo: 'cliente' | 'chofer' | 'proveedor',
    valores: Valores,
    contraParte: { idInfOp: string; monto: number; entidad: RefCliente | RefChofer | RefProveedor },
  ): InformeOpNuevo {
    const entidad = this.resolverEntidad(op, tipo);
    const tarifaAplicada = tipo === 'cliente' ? op.tarifaAplicadaCliente : op.tarifaAplicadaChofer;
    const datosEventualLado = op.datosTarifaEventual
      ? (tipo === 'cliente' ? op.datosTarifaEventual.cliente : op.datosTarifaEventual.chofer)
      : null;

    return {
      idInfOp,
      idOperacion: op.idOperacion,
      tipo,
      entidad,
      fecha: this.normalizarFecha(op.fecha),
      valores,
      datosOperacion: {
        km: op.km,
        vehiculo: op.vehiculo,
        chofer: op.chofer,
        tarifaAplicada,
        datosEventual: datosEventualLado,
        observaciones: op.observaciones,
        hojaRuta: op.hojaRuta,
      },
      estado: 'activo',
      bloqueadoPorContraparte: false,
      contraParte,
      idInfLiq: null,
      observacionInforme: '',
      anulacion: null,
    };
  }

  /** Pública porque InformeOpService.crearPar() la necesita para resolver
   *  la entidad de la CONTRAPARTE al armar contraParte.entidad. */
  resolverEntidad(
    op: ConId<Operacion>,
    tipo: 'cliente' | 'chofer' | 'proveedor',
  ): RefCliente | RefChofer | RefProveedor {
    if (tipo === 'cliente') return op.cliente;
    if (tipo === 'chofer') return op.chofer;
    if (!op.proveedor) {
      throw new Error(
        `InformeOpFactoryService.crear(): tipo 'proveedor' pero la operación ${op.idOperacion} no tiene proveedor asignado.`,
      );
    }
    return op.proveedor;
  }

  private normalizarFecha(fecha: string | Date): string {
    return typeof fecha === 'string' ? fecha : fecha.toISOString().slice(0, 10);
  }
}
