import { Injectable } from "@angular/core";

import { Operacion } from "src/app/interfaces/operacion";
import { InformeOp } from "src/app/interfaces/informe-op";

@Injectable({
  providedIn: "root",
})
export class ValoresOpChoferService {
  facturaOpChofer!: InformeOp;
  tarifaBase!: number;
  acompaniante!: number;
  kmValor!: number;

  constructor() {}

  /** Bloque 7 Paso 2 — factura desde el motor nuevo de Tarifas
   *  (op.valoresNuevos.chofer). Compartido por chofer directo Y proveedor —
   *  a diferencia del sistema viejo ($facturarOpChofer/$facturarOpProveedor
   *  por separado), acá no hace falta distinguir: ValoresTarifaService.
   *  calcularLado ya resolvió tarifaBase/adicionales del lado chofer según
   *  esProveedor. idProveedor: '' para chofer directo, idProveedor real para
   *  proveedor. idTarifa legacy en 0 (ver $facturarOpClienteNuevo). */
  $facturarOpChoferNuevo(op: Operacion, idProveedor: string) {
    const v = op.valoresNuevos!.chofer;
    this.tarifaBase = v.tarifaBase * op.multiplicadorChofer;
    op.valores.chofer.tarifaBase = this.tarifaBase;
    this.acompaniante = v.acompValor;
    op.valores.chofer.acompValor = this.acompaniante;
    this.kmValor = v.kmAdicional;
    op.valores.chofer.kmAdicional = this.kmValor;
    op.valores.chofer.aPagar = v.aPagar;

    this.$crearFacturaOpChofer(op, 0, idProveedor);
    return {
      op,
      factura: this.facturaOpChofer,
      resultado: true,
      msj: "",
    };
  }

  $crearFacturaOpChofer(op: Operacion, idTarifa: number, idProveedor: string) {
    this.facturaOpChofer = {
      idInfOp: new Date().getTime() + Math.floor(Math.random() * 1000),
      idOperacion: op.idOperacion,
      idCliente: Number(op.cliente.id), // TODO: migrar a string cuando se refactorice este módulo
      idChofer: Number(op.chofer.id),   // TODO: migrar a string cuando se refactorice este módulo
      idProveedor: idProveedor,
      idTarifa: idTarifa,
      fecha: op.fecha,
      valores: {
        tarifaBase: this.tarifaBase,
        acompaniante: this.acompaniante,
        kmMonto: this.kmValor,
        adExtra: op.valores.chofer.adExtraValor ?? 0,
        total: this.tarifaBase + this.acompaniante + this.kmValor + (op.valores.chofer.adExtraValor ?? 0),
      },
      km: op.km,
      liquidacion: false,
      contraParteMonto: 0,
      contraParteId: 0,
      // TODO: refactor Tarifas — antes derivaba general/especial del chofer (op.chofer.tarifaTipo,
      // inexistente en RefChofer). Se simplifica a copiar el tipo de la op. En el caso 'especial'
      // ya no deriva del chofer; revisar en el rediseño de Tarifas.
      tarifaTipo: { ...op.tarifaTipo },
      observaciones: op.observaciones,
      hojaRuta: op.hojaRuta,
      patente: op.vehiculo.dominio, // TODO: refactor Tarifas
      proforma: false,
      contraParteProforma: false,
    };
  }
}
