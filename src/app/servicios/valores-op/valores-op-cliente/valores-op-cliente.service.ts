import { Injectable } from "@angular/core";

import { Operacion } from "src/app/interfaces/operacion";

import {
  TarifaGralCliente,
  CategoriaTarifa,
} from "src/app/interfaces/tarifa-gral-cliente";
import { InformeOp } from "src/app/interfaces/informe-op";

@Injectable({
  providedIn: "root",
})
export class ValoresOpClienteService {
  facturaOpCliente!: InformeOp;
  tarifaBase!: number;
  acompaniante!: number;
  kmValor!: number;

  constructor() {}

  /** Bloque 7 Paso 2 — factura desde el motor nuevo de Tarifas
   *  (op.valoresNuevos.cliente, ya calculado por ValoresTarifaService).
   *  tarifaBase se persiste YA MULTIPLICADA por op.multiplicadorCliente
   *  (convención del cierre viejo para op.valores/InformeOp) — valoresNuevos
   *  siempre la trae cruda. idTarifa legacy (numérico) no tiene equivalente
   *  para el id de Firestore de la tarifa nueva — se persiste en 0, mismo
   *  criterio que $facturarOpEveCliente para eventual. */
  $facturarOpClienteNuevo(op: Operacion) {
    const v = op.valoresNuevos!.cliente;
    this.tarifaBase = v.tarifaBase * op.multiplicadorCliente;
    op.valores.cliente.tarifaBase = this.tarifaBase;
    this.acompaniante = v.acompValor;
    op.valores.cliente.acompValor = this.acompaniante;
    this.kmValor = v.kmAdicional;
    op.valores.cliente.kmAdicional = this.kmValor;
    op.valores.cliente.aCobrar = v.aCobrar;

    this.$crearFacturaOpCliente(op, 0);
    return {
      op,
      factura: this.facturaOpCliente,
      resultado: true,
      msj: "",
    };
  }

  // TODO: refactor Tarifas — firma ampliada de Vehiculo a tipo estructural mínimo
  // (solo se usa categoria.catOrden). Acepta Vehiculo y RefVehiculo por igual.
  $calcularKm(op: Operacion, tarifa: TarifaGralCliente, vehiculo: { categoria: { catOrden: number } }) {
    let catCg = tarifa.cargasGenerales.filter((cat: CategoriaTarifa) => {
      return cat.orden === vehiculo.categoria.catOrden;
    });
    ////console.log("catCg: ", catCg);

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

  $crearFacturaOpCliente(op: Operacion, idTarifa: number) {
    this.facturaOpCliente = {
      idInfOp: new Date().getTime() + Math.floor(Math.random() * 1000),
      idOperacion: op.idOperacion,
      idCliente: Number(op.cliente.id),
      idChofer: Number(op.chofer.id), // TODO: migrar a string cuando se refactorice este módulo
      idProveedor: op.proveedor?.id ?? '0', // TODO: refactor Tarifas — idProveedor desde snapshot op.proveedor (string)
      idTarifa: idTarifa,
      fecha: op.fecha,
      valores: {
        tarifaBase: this.tarifaBase,
        acompaniante: this.acompaniante,
        kmMonto: this.kmValor,
        adExtra: op.valores.cliente.adExtraValor ?? 0 ,
        total: this.tarifaBase + this.acompaniante + this.kmValor + (op.valores.cliente.adExtraValor ?? 0),
      },
      km: op.km,
      liquidacion: false,
      contraParteMonto: 0,
      contraParteId: 0,
      // TODO: refactor Tarifas — usar snapshot op.tarifaTipo en lugar de resolver desde cliente vivo
      tarifaTipo: { ...op.tarifaTipo },
      observaciones: op.observaciones,
      hojaRuta: op.hojaRuta,
      patente: op.vehiculo.dominio,
      proforma: false,
      contraParteProforma: false,
    };
  }
}
