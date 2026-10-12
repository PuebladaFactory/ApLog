import { Injectable } from "@angular/core";

import { Operacion } from "src/app/interfaces/operacion";
import { Valores } from "src/app/interfaces/informe-op-nuevo";

@Injectable({
  providedIn: "root",
})
export class ValoresOpClienteService {

  /** Bloque 7 Paso 2 — calcula desde el motor nuevo de Tarifas
   *  (op.valoresNuevos.cliente, ya calculado por ValoresTarifaService).
   *  tarifaBase se persiste YA MULTIPLICADA por op.multiplicadorCliente
   *  (convención heredada del cierre viejo, se mantiene para op.valores) —
   *  valoresNuevos siempre la trae cruda. Muta op.valores.cliente (mismo
   *  criterio que antes — es la fuente que lee el resto de la app para
   *  mostrar la op) y devuelve el InformeOpNuevo.Valores del lado cliente,
   *  para que el caller arme el InformeOp. El idTarifa legacy (numérico)
   *  desaparece — InformeOpNuevo no lo tiene, la tarifa aplicada se
   *  identifica con op.tarifaAplicadaCliente. */
  calcularValoresCliente(op: Operacion): Valores {
    const v = op.valoresNuevos!.cliente;
    const tarifaBase = v.tarifaBase * op.multiplicadorCliente;
    const acompaniante = v.acompValor;
    const kmMonto = v.kmAdicional;
    const adExtra = op.valores.cliente.adExtraValor ?? 0;

    op.valores.cliente.tarifaBase = tarifaBase;
    op.valores.cliente.acompValor = acompaniante;
    op.valores.cliente.kmAdicional = kmMonto;
    op.valores.cliente.aCobrar = v.aCobrar;

    return {
      tarifaBase,
      acompaniante,
      kmMonto,
      adExtra,
      total: tarifaBase + acompaniante + kmMonto + adExtra,
    };
  }
}
