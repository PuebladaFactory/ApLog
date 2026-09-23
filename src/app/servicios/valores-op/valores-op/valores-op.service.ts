import { Injectable } from "@angular/core";

import { Operacion } from "src/app/interfaces/operacion";
import { Valores } from "src/app/interfaces/informe-op-nuevo";
import { ConId } from "src/app/interfaces/conId";

import { ValoresOpClienteService } from "../valores-op-cliente/valores-op-cliente.service";
import { ValoresOpChoferService } from "../valores-op-chofer/valores-op-chofer.service";

import { InformeVenta } from "src/app/interfaces/informe-venta";

export interface ResultadoCalculoCierre {
  valoresCliente: Valores;
  valoresOtro: Valores;
  tipoOtro: 'chofer' | 'proveedor';
  informesVenta: InformeVenta[];
}

/** Calcula los valores de cierre de una operación con el motor nuevo de
 *  Tarifas (op.valoresNuevos) — NO persiste nada (eso es responsabilidad de
 *  OperacionService.cerrarOperacion, que arma un único batch atómico con
 *  estos valores + InformeOpService.crearPar + Operación + resúmenes).
 *  Reemplaza a facturarOperacion/$facturarOpCliente/$facturarOpChofer/
 *  $facturarOpProveedor/$armarFacturasOp/$guardarFacturas — esos cinco
 *  métodos mezclaban cálculo, armado y persistencia; acá queda solo el
 *  cálculo. */
@Injectable({
  providedIn: "root",
})
export class ValoresOpService {

  constructor(
    private facturacionCliente: ValoresOpClienteService,
    private facturacionChofer: ValoresOpChoferService,
  ) {}

  calcularValoresCierre(op: ConId<Operacion>): ResultadoCalculoCierre {
    if (!op.valoresNuevos) {
      throw new Error(
        "La operación no tiene valoresNuevos calculados — no se puede facturar (tarifa no resuelta al alta/cierre)",
      );
    }

    const valoresCliente = this.facturacionCliente.calcularValoresCliente(op);
    const valoresOtro = this.facturacionChofer.calcularValoresChofer(op);
    const tipoOtro: 'chofer' | 'proveedor' = op.proveedor === null ? 'chofer' : 'proveedor';
    const informesVenta = this.asignacionComisionVenta(op);

    return { valoresCliente, valoresOtro, tipoOtro, informesVenta };
  }

  private asignacionComisionVenta(op: ConId<Operacion>): InformeVenta[] {
    const informesVenta: InformeVenta[] = [];
    op.cliente.vendedor?.forEach((idVend: string) => {
      informesVenta.push({
        idInfVenta: new Date().getTime() + Math.floor(Math.random() * 1000),
        fecha: op.fecha,
        idOperacion: op.idOperacion,
        idCliente: Number(op.cliente.id), // TODO: migrar a string cuando se refactorice este módulo
        idVendedor: Number(idVend), // TODO: migrar a string cuando se refactorice este módulo
        valoresOp: {
          totalCliente: op.valores.cliente.aCobrar,
          totalChofer: op.valores.chofer.aPagar,
        },
        pago: false,
      });
    });
    return informesVenta;
  }
}
