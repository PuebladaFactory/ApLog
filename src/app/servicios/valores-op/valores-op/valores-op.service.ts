import { Injectable } from "@angular/core";

import { Operacion } from "src/app/interfaces/operacion";

import { ValoresOpClienteService } from "../valores-op-cliente/valores-op-cliente.service";
import { StorageService } from "../../storage/storage.service";

import { DbFirestoreService } from "../../database/db-firestore.service";

import { ValoresOpChoferService } from "../valores-op-chofer/valores-op-chofer.service";
import { Proveedor } from "src/app/interfaces/proveedor";
import { ConId, ConIdType } from "src/app/interfaces/conId";

import { InformeOp } from "src/app/interfaces/informe-op";
import { InformeVenta } from "src/app/interfaces/informe-venta";
import { LogRegistroService } from "../../log-registro/log-registro.service";
import { RegistroLog } from "src/app/interfaces/registro-log";

@Injectable({
  providedIn: "root",
})
export class ValoresOpService {
  //facturaChofer!:FacturaOpChofer;

  facturaOpCliente!: InformeOp;
  facturaOpChofer!: InformeOp;
  facturaOpProveedor!: InformeOp;
  $proveedores!: ConIdType<Proveedor>[];
  operacion!: ConId<Operacion>;
  proveedorSeleccionado!: ConId<Proveedor> | undefined;
  informesVenta: InformeVenta[] = [];

  constructor(
    private facturacionCliente: ValoresOpClienteService,
    private facturacionChofer: ValoresOpChoferService,
    private storageService: StorageService,
    private dbFirebase: DbFirestoreService,
    private logRegistro: LogRegistroService,
  ) {}

  async facturarOperacion(
    op: ConId<Operacion>,
    msj: string = 'Cierre de Operación',
  ): Promise<{ exito: boolean; mensaje: string }> {
    this.informesVenta = [];
    try {
      this.$proveedores = this.storageService.loadInfo("proveedores");
      if (op.proveedor !== null) {
        // TODO: refactor Tarifas — idProveedor desde snapshot op.proveedor
        this.proveedorSeleccionado = this.$proveedores.find(
          (p) => p.idProveedor === op.proveedor!.id,
        );
      }

      this.operacion = op;

      await this.$facturarOpCliente(op);
      if (op.cliente.vendedor && op.cliente.vendedor.length > 0)
        this.asignacionComisionVenta(op);

      // Log del cierre — se agrega al MISMO writeBatch que guardarFacturasOp usa
      // para informesOp/resúmenes (ver DbFirestoreService.guardarFacturasOp).
      // 'EDITAR' porque cerrar es editar op.estado (mismo criterio para todo el
      // log: no hay acción 'CERRAR' separada en AccionLog).
      const entradaLog = this.logRegistro.construirEntradaSuelta('EDITAR', 'operaciones', op.idOperacion, msj);

      return await this.$guardarFacturas(op, entradaLog);
    } catch (error: any) {
      console.error("Error durante facturarOperacion:", error);
      return {
        exito: false,
        mensaje: error?.message || "Error inesperado al facturar operación",
      };
    }
  }

  async $facturarOpCliente(op: ConId<Operacion>) {
    try {
      // Bloque 7 Paso 2 — factura siempre desde el motor nuevo de Tarifas
      // (op.valoresNuevos). Reemplaza la rama vieja por tarifaTipo
      // (general/especial/personalizada/eventual, con "especial" tratado
      // como "general") — de paso, las operaciones con tarifa Especial
      // empiezan a facturar con la Especial real.
      if (!op.valoresNuevos) {
        throw new Error(
          "La operación no tiene valoresNuevos calculados — no se puede facturar (tarifa no resuelta al alta/cierre)",
        );
      }
      const respuesta = this.facturacionCliente.$facturarOpClienteNuevo(op);

      this.operacion.valores.cliente = respuesta.op.valores.cliente;
      this.facturaOpCliente = respuesta.factura;

      if (op.proveedor === null) {
        await this.$facturarOpChofer(op);
      } else {
        await this.$facturarOpProveedor(op);
      }
    } catch (error: any) {
      throw new Error("Error al facturar cliente: " + error?.message);
    }
  }

  async $facturarOpChofer(op: ConId<Operacion>) {
    try {
      if (!op.valoresNuevos) {
        throw new Error(
          "La operación no tiene valoresNuevos calculados — no se puede facturar (tarifa no resuelta al alta/cierre)",
        );
      }
      const respuesta = this.facturacionChofer.$facturarOpChoferNuevo(op, '');

      this.operacion.valores.chofer = respuesta.op.valores.chofer;
      this.facturaOpChofer = respuesta.factura;

      await this.$armarFacturasOp(op);
    } catch (error: any) {
      throw new Error("Error al facturar chofer: " + error?.message);
    }
  }

  async $facturarOpProveedor(op: ConId<Operacion>) {
    try {
      if (!this.proveedorSeleccionado) throw new Error("Proveedor no definido");
      if (!op.valoresNuevos) {
        throw new Error(
          "La operación no tiene valoresNuevos calculados — no se puede facturar (tarifa no resuelta al alta/cierre)",
        );
      }
      const respuesta = this.facturacionChofer.$facturarOpChoferNuevo(
        op,
        this.proveedorSeleccionado.idProveedor,
      );

      this.operacion.valores.chofer = respuesta.op.valores.chofer;
      this.facturaOpProveedor = respuesta.factura;

      await this.$armarFacturasOp(op);
    } catch (error: any) {
      throw new Error("Error al facturar proveedor: " + error?.message);
    }
  }

  async $armarFacturasOp(op: ConId<Operacion>) {
    try {
      // lógica de armado
      if (op.proveedor === null) {
        if (this.facturaOpCliente !== null && this.facturaOpChofer !== null) {
          op.valores.cliente.aCobrar = this.facturaOpCliente.valores.total;
          op.valores.chofer.aPagar = this.facturaOpChofer.valores.total;
          op.estado = {
            ciclo: 'cerrada',
            liquidacion: { cliente: false, chofer: false },
            proforma: { cliente: false, chofer: false },
          };
          op.informeOpCliente = this.facturaOpCliente.idInfOp;
          op.informeOpChofer = this.facturaOpChofer.idInfOp;
          this.facturaOpCliente.contraParteMonto =
            this.facturaOpChofer.valores.total;
          this.facturaOpChofer.contraParteMonto =
            this.facturaOpCliente.valores.total;
          this.facturaOpCliente.contraParteId = this.facturaOpChofer.idInfOp;
          this.facturaOpChofer.contraParteId = this.facturaOpCliente.idInfOp;
          //this.$guardarFacturas(op);
        }
      } else {
        if (
          this.facturaOpCliente !== null &&
          this.facturaOpProveedor !== null
        ) {
          op.valores.cliente.aCobrar = this.facturaOpCliente.valores.total;
          op.valores.chofer.aPagar = this.facturaOpProveedor.valores.total;
          op.estado = {
            ciclo: 'cerrada',
            liquidacion: { cliente: false, chofer: false },
            proforma: { cliente: false, chofer: false },
          };
          op.informeOpCliente = this.facturaOpCliente.idInfOp;
          op.informeOpChofer = this.facturaOpProveedor.idInfOp;
          this.facturaOpCliente.contraParteMonto =
            this.facturaOpProveedor.valores.total;
          this.facturaOpProveedor.contraParteMonto =
            this.facturaOpCliente.valores.total;
          this.facturaOpCliente.contraParteId = this.facturaOpProveedor.idInfOp;
          this.facturaOpProveedor.contraParteId = this.facturaOpCliente.idInfOp;
          //this.$guardarFacturas(op);
        }
      }
      return; // opcionalmente devolver algún dato
    } catch (error: any) {
      throw new Error("Error al armar facturas: " + error?.message);
    }
  }

  async $guardarFacturas(
    op: ConId<Operacion>,
    entradaLog: { id: string; entrada: RegistroLog } | null,
  ): Promise<{ exito: boolean; mensaje: string }> {
    console.log("$guardarFacturas: informesVenta", this.informesVenta);

    try {
      let result;
      if (op.proveedor === null) {
        result = await this.dbFirebase.guardarFacturasOp(
          "informesOpClientes",
          this.facturaOpCliente,
          "informesOpChoferes",
          this.facturaOpChofer,
          op,
          entradaLog,
          this.informesVenta,
        );
      } else {
        result = await this.dbFirebase.guardarFacturasOp(
          "informesOpClientes",
          this.facturaOpCliente,
          "informesOpProveedores",
          this.facturaOpProveedor,
          op,
          entradaLog,
          this.informesVenta,
        );
      }
      return result;
    } catch (error: any) {
      throw new Error("Error al guardar facturas: " + error?.message);
    }
    return { exito: false, mensaje: "" };
  }

  asignacionComisionVenta(op: ConId<Operacion>) {
    this.informesVenta = [];
    op.cliente.vendedor?.forEach((idVend: string) => {
      let informeVenta: InformeVenta;
      informeVenta = {
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
      };
      this.informesVenta.push(informeVenta);
    });
  }
}
