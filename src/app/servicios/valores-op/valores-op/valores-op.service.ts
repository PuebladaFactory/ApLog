import { Injectable } from "@angular/core";

import { Operacion } from "src/app/interfaces/operacion";
import { Valores } from "src/app/interfaces/informe-op-nuevo";
import { ConId } from "src/app/interfaces/conId";

import { ValoresOpClienteService } from "../valores-op-cliente/valores-op-cliente.service";
import { ValoresOpChoferService } from "../valores-op-chofer/valores-op-chofer.service";

export interface ResultadoCalculoCierre {
  valoresCliente: Valores;
  valoresOtro: Valores;
  tipoOtro: 'chofer' | 'proveedor';
}

/** Calcula los valores de cierre de una operación con el motor nuevo de
 *  Tarifas (op.valoresNuevos) — NO persiste nada (eso es responsabilidad de
 *  OperacionService.cerrarOperacion, que arma un único batch atómico con
 *  estos valores + InformeOpService.crearPar + Operación + comisiones +
 *  resúmenes). Las comisiones de venta ya no se calculan acá: las arma
 *  ComisionVentaFactoryService (Frente Vendedores).
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

    return { valoresCliente, valoresOtro, tipoOtro };
  }
}
