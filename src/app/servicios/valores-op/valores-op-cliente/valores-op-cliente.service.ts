import { Injectable } from "@angular/core";

import { Operacion } from "src/app/interfaces/operacion";
import { Valores } from "src/app/interfaces/informe-op-nuevo";

@Injectable({
  providedIn: "root",
})
export class ValoresOpClienteService {

  /** Bloque 7 Paso 2 — calcula desde el motor nuevo de Tarifas
   *  (op.valoresNuevos.cliente, ya calculado por ValoresTarifaService).
   *  tarifaBase del InformeOp va YA MULTIPLICADA por op.multiplicadorCliente
   *  (convención del InformeOp) — valoresNuevos siempre la trae cruda. No
   *  muta la op (TC10: sin espejo legacy); devuelve el
   *  InformeOpNuevo.Valores del lado cliente, para que el caller arme el
   *  InformeOp. El idTarifa legacy (numérico)
   *  desaparece — InformeOpNuevo no lo tiene, la tarifa aplicada se
   *  identifica con op.tarifaAplicadaCliente. */
  calcularValoresCliente(op: Operacion): Valores {
    const v = op.valoresNuevos!.cliente;
    const tarifaBase = v.tarifaBase * op.multiplicadorCliente;
    const acompaniante = v.acompValor;
    const kmMonto = v.kmAdicional;
    // Del motor (no de la entrada): respeta "multiplicador 0 anula el lado".
    const adExtra = v.adExtraValor ?? 0;

    return {
      tarifaBase,
      acompaniante,
      kmMonto,
      adExtra,
      total: tarifaBase + acompaniante + kmMonto + adExtra,
    };
  }
}
