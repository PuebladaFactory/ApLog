import { Injectable } from "@angular/core";

import { Operacion } from "src/app/interfaces/operacion";
import { Valores } from "src/app/interfaces/informe-op-nuevo";

@Injectable({
  providedIn: "root",
})
export class ValoresOpChoferService {

  /** Bloque 7 Paso 2 — calcula desde el motor nuevo de Tarifas
   *  (op.valoresNuevos.chofer). Compartido por chofer directo Y proveedor —
   *  ValoresTarifaService.calcularLado ya resolvió tarifaBase/adicionales
   *  del lado chofer según esProveedor, así que acá no hace falta
   *  distinguir (a diferencia del sistema viejo, que llamaba a este método
   *  una vez por cada caso con idProveedor distinto). No muta la op (TC10,
   *  mismo criterio que ValoresOpClienteService); devuelve el
   *  InformeOpNuevo.Valores del lado chofer/proveedor — la resolución de
   *  CUÁL entidad (chofer o proveedor) le corresponde a ese Valores la hace
   *  InformeOpFactoryService a partir de op.proveedor, no acá. */
  calcularValoresChofer(op: Operacion): Valores {
    const v = op.valoresNuevos!.chofer;
    const tarifaBase = v.tarifaBase * op.multiplicadorChofer;
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
