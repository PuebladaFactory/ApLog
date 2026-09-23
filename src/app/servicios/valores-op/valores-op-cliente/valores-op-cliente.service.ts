import { Injectable } from "@angular/core";

import { Operacion } from "src/app/interfaces/operacion";
import { Valores } from "src/app/interfaces/informe-op-nuevo";

import {
  TarifaGralCliente,
  CategoriaTarifa,
} from "src/app/interfaces/tarifa-gral-cliente";

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

  // TODO: refactor Tarifas — firma ampliada de Vehiculo a tipo estructural mínimo
  // (solo se usa categoria.catOrden). Acepta Vehiculo y RefVehiculo por igual.
  $calcularKm(op: Operacion, tarifa: TarifaGralCliente, vehiculo: { categoria: { catOrden: number } }) {
    let catCg = tarifa.cargasGenerales.filter((cat: CategoriaTarifa) => {
      return cat.orden === vehiculo.categoria.catOrden;
    });

    let montoTotal = 0;

    if (tarifa.adicionales.KmDistancia.primerSector > 0) {
      // Verifica si los kilómetros recorridos son menores o iguales al primer sector
      if (op.km < tarifa.adicionales.KmDistancia.primerSector) {
        return montoTotal; // No se cobra adicional
      }

      // Si supera el primer sector, se cobra el valor del primer sector
      montoTotal = catCg[0].adicionalKm.primerSector;

      // Calcula cuántos kilómetros adicionales quedan luego del primer sector
      let kmRestantes = op.km - tarifa.adicionales.KmDistancia.primerSector;

      // Calcula cuántos sectores adicionales completos se recorren
      let sectoresAdicionales = Math.floor(
        kmRestantes / tarifa.adicionales.KmDistancia.sectoresSiguientes,
      );

      // Suma el costo de los sectores adicionales
      montoTotal +=
        sectoresAdicionales * catCg[0].adicionalKm.sectoresSiguientes;
    }

    return montoTotal;
  }
}
