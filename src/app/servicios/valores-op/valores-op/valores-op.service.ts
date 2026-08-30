import { Injectable } from "@angular/core";

import { Operacion } from "src/app/interfaces/operacion";

import { ValoresOpClienteService } from "../valores-op-cliente/valores-op-cliente.service";
import { StorageService } from "../../storage/storage.service";

import { DbFirestoreService } from "../../database/db-firestore.service";
import { TarifaGralCliente } from "src/app/interfaces/tarifa-gral-cliente";

import { TarifaPersonalizadaCliente } from "src/app/interfaces/tarifa-personalizada-cliente";
import { ValoresOpChoferService } from "../valores-op-chofer/valores-op-chofer.service";
import { Proveedor } from "src/app/interfaces/proveedor";
import { TarifaEventual } from "src/app/interfaces/tarifa-eventual";
import { ConId, ConIdType } from "src/app/interfaces/conId";

import { InformeOp } from "src/app/interfaces/informe-op";
import { InformeVenta } from "src/app/interfaces/informe-venta";

@Injectable({
  providedIn: "root",
})
export class ValoresOpService {
  //facturaChofer!:FacturaOpChofer;

  $ultTarifaGralCliente!: ConIdType<TarifaGralCliente>;
  $ultTarifaEspCliente!: ConIdType<TarifaGralCliente>;
  $ultTarifaPersCliente!: ConIdType<TarifaPersonalizadaCliente>;
  $ultTarifaGralChofer!: ConIdType<TarifaGralCliente>;
  $ultTarifaEspChofer!: ConIdType<TarifaGralCliente>;
  $ultTarifaGralProveedor!: ConIdType<TarifaGralCliente>;
  $ultTarifaEspProveedor!: ConIdType<TarifaGralCliente>;
  tarifaOpCliente!: ConIdType<TarifaGralCliente>;
  facturaOpCliente!: InformeOp;
  facturaOpChofer!: InformeOp;
  facturaOpProveedor!: InformeOp;
  $proveedores!: ConIdType<Proveedor>[];
  clienteFacOp!: InformeOp[];
  choferFacOp!: InformeOp[];
  ProveedorFacOp!: InformeOp[];
  operacion!: ConId<Operacion>;
  proveedorSeleccionado!: ConId<Proveedor> | undefined;
  tarifaEventual!: TarifaEventual;
  informesVenta: InformeVenta[] = [];
  respuesta: any;

  constructor(
    private facturacionCliente: ValoresOpClienteService,
    private facturacionChofer: ValoresOpChoferService,
    private storageService: StorageService,
    private dbFirebase: DbFirestoreService,
  ) {}

  async facturarOperacion(
    op: ConId<Operacion>,
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

      const tGral = this.storageService.loadInfo("tarifasGralCliente");
      this.$ultTarifaGralCliente = tGral[0];

      const tGralCho = this.storageService.loadInfo("tarifasGralChofer");
      this.$ultTarifaGralChofer = tGralCho[0];

      const tGralPro = this.storageService.loadInfo("tarifasGralProveedor");
      this.$ultTarifaGralProveedor = tGralPro[0];

      this.operacion = op;

      await this.$facturarOpCliente(op);
      if (op.cliente.vendedor && op.cliente.vendedor.length > 0)
        this.asignacionComisionVenta(op);
      return await this.$guardarFacturas(op);
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
          this.informesVenta,
        );
      } else {
        result = await this.dbFirebase.guardarFacturasOp(
          "informesOpClientes",
          this.facturaOpCliente,
          "informesOpProveedores",
          this.facturaOpProveedor,
          op,
          this.informesVenta,
        );
      }
      if (op.tarifaTipo.eventual) {
        this.guardarTarifasEventuales(op);
      }
      return result;
    } catch (error: any) {
      throw new Error("Error al guardar facturas: " + error?.message);
    }
    return { exito: false, mensaje: "" };
  }

  guardarTarifasEventuales(op: Operacion) {
    this.tarifaEventual = {
      idTarifa: new Date().getTime() + Math.floor(Math.random() * 1000),
      fecha: op.fecha,
      // TODO: refactor Tarifas — invariante: eventual ⟺ datosTarifaEventual !== null
      cliente: {
        concepto: op.datosTarifaEventual!.cliente.concepto,
        valor: op.datosTarifaEventual!.cliente.valor,
      },
      chofer: {
        concepto: op.datosTarifaEventual!.chofer.concepto,
        valor: op.datosTarifaEventual!.chofer.valor,
      },
      tipo: {
        general: false,
        especial: false,
        eventual: true,
        personalizada: false,
      },
      idCliente: Number(op.cliente.id), // TODO: migrar a string cuando se refactorice este módulo
      idChofer: Number(op.chofer.id),   // TODO: migrar a string cuando se refactorice este módulo
      idProveedor: Number(op.proveedor?.id ?? 0), // TODO: refactor Tarifas — idProveedor desde snapshot
      idOperacion: op.idOperacion,
      km: op.km,
    };
    this.storageService.addItem(
      "tarifasEventuales",
      this.tarifaEventual,
      this.tarifaEventual.idTarifa,
      "ALTA",
      `Alta de Tarifa Eventual ${this.tarifaEventual.idTarifa}, Cliente ${op.cliente.razonSocial}, Chofer ${op.chofer.apellido} ${op.chofer.nombre} `,
    );
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

  valoresIniciales(op: Operacion): Operacion {
    op.valores.cliente = this.aCobrarOp(op);

    op.valores.chofer = this.aPagarOp(op);

    return op;
  }

  aCobrarOp(op: Operacion) {
    let tarifa: any;
    let tarifaGral = this.storageService.loadInfo("tarifasGralCliente");
    // let tarifasEspeciales = this.storageService.loadInfo("tarifasEspCliente"); // (rama especial comentada abajo)

    // TODO: refactor Tarifas — rama especial deshabilitada: op.cliente es RefCliente (sin tarifaTipo).
    // Mientras tanto se aplica siempre tarifa general. Recuperar al reestructurar Tarifas.
    // if (op.cliente.tarifaTipo.especial) {
    //   tarifa = tarifasEspeciales.find((t) => String(t.idCliente) === op.cliente.id);
    // } else {
    tarifa = tarifaGral[0];
    // }

    if (tarifa) {
      op.valores.cliente.aCobrar =
        this.facturacionCliente.valoresInicialesTarifaGral(op, tarifa);
    } else {
      op.valores.cliente.aCobrar = 0;
    }
    return op.valores.cliente;
  }

  aPagarOp(op: Operacion) {
    let tarifa: any;
    let tarifaGralChofer = this.storageService.loadInfo("tarifasGralChofer");
    let tarifaGralProveedor = this.storageService.loadInfo(
      "tarifasGralProveedor",
    );
    // let tarifasEspecialesChofer = this.storageService.loadInfo("tarifasEspChofer"); // (rama especial comentada abajo)
    // let tarifasEspecialesProveedor = this.storageService.loadInfo("tarifasEspProveedor"); // (rama especial comentada abajo)

    // TODO: refactor Tarifas — rama especial deshabilitada: op.chofer es RefChofer (sin tarifaTipo).
    // Toda la lógica de tarifa especial chofer/proveedor (selección por idCliente, etc.) queda
    // comentada. Mientras tanto se aplica siempre tarifa general (chofer o proveedor según op.proveedor).
    // Recuperar al reestructurar Tarifas.
    // if (op.chofer.tarifaTipo.especial) {
    //   if (op.chofer.contratacion.tipo === 'directo') {
    //     let tEsp = tarifasEspecialesChofer.find((t) => String(t.idChofer) === op.chofer.idChofer);
    //     if (tEsp.idCliente === 0 || String(tEsp.idCliente) === String(op.cliente.idCliente)) {
    //       tarifa = tEsp;
    //     } else {
    //       tarifa = tarifaGralChofer[0];
    //     }
    //   } else {
    //     let tEsp = tarifasEspecialesProveedor.find((t) => t.idProveedor === (op.chofer.contratacion as any).idProveedor);
    //     if (tEsp.idCliente === 0 || String(tEsp.idCliente) === String(op.cliente.idCliente)) {
    //       tarifa = tEsp;
    //     } else {
    //       tarifa = tarifaGralProveedor[0];
    //     }
    //   }
    // } else {
    tarifa =
      op.proveedor === null
        ? tarifaGralChofer[0]
        : tarifaGralProveedor[0];
    // }

    if (tarifa) {
      op.valores.chofer.aPagar =
        this.facturacionChofer.valoresInicialesTarifaGral(op, tarifa);
    } else {
      op.valores.chofer.aPagar = 0;
    }
    return op.valores.chofer;
  }

  valoresOpAcompaniante(op: Operacion): Operacion {
    op.valores.cliente.acompValor = this.clienteAcompaniante(op);
    op.valores.chofer.acompValor = this.choferAcompaniante(op);

    return op;
  }

  clienteAcompaniante(op: Operacion): number {
    let tarifas;
    let tarifaAplicada: TarifaGralCliente;
    // TODO: refactor Tarifas — rama especial deshabilitada (op.cliente sin tarifaTipo). Siempre general.
    // if (op.cliente.tarifaTipo.especial) {
    //   tarifas = this.storageService.loadInfo("tarifasEspCliente");
    //   tarifaAplicada = tarifas.find((t) => String(t.idCliente) === op.cliente.id);
    // } else {
    tarifas = this.storageService.loadInfo("tarifasGralCliente");
    tarifaAplicada = tarifas[0];
    // }

    return tarifaAplicada.adicionales.acompaniante * (op.acompanianteCant ?? 1);
  }

  choferAcompaniante(op: Operacion): number {
    // let tarifas; // (rama especial comentada abajo)
    let tGralChofer = this.storageService.loadInfo("tarifasGralChofer");
    let tarifaAplicada: TarifaGralCliente;

    // TODO: refactor Tarifas — rama especial deshabilitada (op.chofer sin tarifaTipo). Siempre general.
    // if (op.chofer.tarifaTipo.especial) {
    //   tarifas = this.storageService.loadInfo("tarifasEspChofer");
    //   let tEspecial = tarifas.find((t) => String(t.idChofer) === op.chofer.id);
    //   if (tEspecial.idCliente === 0 || String(tEspecial.idCliente) === String(op.cliente.id)) {
    //     tarifaAplicada = tEspecial;
    //   } else {
    //     tarifaAplicada = tGralChofer[0];
    //   }
    // } else {
    tarifaAplicada = tGralChofer[0];
    // }

    return tarifaAplicada.adicionales.acompaniante * (op.acompanianteCant ?? 1);
  }

  recalcularValores(op: Operacion): Operacion {
    op.valores.cliente.aCobrar =
      op.valores.cliente.tarifaBase * op.multiplicadorCliente +
      op.valores.cliente.kmAdicional +
      op.valores.cliente.acompValor +
      (op.valores.cliente.adExtraValor ?? 0);
    op.valores.chofer.aPagar =
      op.valores.chofer.tarifaBase * op.multiplicadorChofer +
      op.valores.chofer.kmAdicional +
      op.valores.chofer.acompValor +
      (op.valores.chofer.adExtraValor ?? 0);
    return op;
  }
}
