import { Injectable } from "@angular/core";

import { StorageService } from "../../storage/storage.service";
import { DbFirestoreService } from "../../database/db-firestore.service";
import { Operacion } from "src/app/interfaces/operacion";

import { Cliente } from "src/app/interfaces/cliente";
import { Proveedor } from "src/app/interfaces/proveedor";
import { parseActionCodeURL } from "firebase/auth";

import {
  TarifaGralCliente,
  CategoriaTarifa,
} from "src/app/interfaces/tarifa-gral-cliente";

import {
  Seccion,
  TarifaPersonalizadaCliente,
} from "src/app/interfaces/tarifa-personalizada-cliente";
import { InformeOp } from "src/app/interfaces/informe-op";

@Injectable({
  providedIn: "root",
})
export class ValoresOpClienteService {
  $clientes!: Cliente[];

  clienteOp!: Cliente;

  categoriaMonto!: number;
  acompanianteMonto!: number;
  adicionalKmMonto!: number;

  total!: number;
  tarifaGralCliente!: TarifaGralCliente;
  facturaOpCliente!: InformeOp;
  tarifaBase!: number;
  acompaniante!: number;
  kmValor!: number;

  constructor(private storageService: StorageService) {}

  clientes() {
    this.storageService.clientes$.subscribe((data) => {
      this.$clientes = data;
    });
  }

  tarifaGral() {
    this.storageService.ultTarifaGralCliente$.subscribe((data) => {
      //////console.log("data: ", data);
      this.tarifaGralCliente = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
      this.tarifaGralCliente.cargasGenerales =
        this.tarifaGralCliente.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
      //////console.log("1) ult tarifa GRAL: ",this.ultTarifa);
    });
  }

  /*  facturarOperacion(op: Operacion)  :FacturaOpCliente{        
    //this.clientes();    
    this.facturarOpCliente(op);
    return this.facturaCliente
  } */

  $facturarOpCliente(op: Operacion, tarifa: TarifaGralCliente) {
    let respuesta: {
      op: Operacion;
      factura: InformeOp;
      resultado: boolean;
      msj: string;
    };

    //console.log("$facturarOpCliente) op: ", op, " tarifa: ", tarifa);
    const vehiculo = op.vehiculo;
    ////console.log("1c) vehiculo: ", vehiculo);

    if (op.multiplicadorCliente === 0) {
      this.tarifaBase = 0;
      op.valores.cliente.tarifaBase = 0;
      ////console.log("tarifa base: " ,this.tarifaBase);
      this.acompaniante = 0;
      op.valores.cliente.acompValor = 0;
      ////console.log("acompañante valor: ", this.acompaniante);
      this.kmValor = 0;
      op.valores.cliente.kmAdicional = 0;
      op.valores.cliente.adExtraValor = 0;
      op.valores.cliente.aCobrar = 0;
    } else {
      this.tarifaBase =
        this.$calcularCG(tarifa, vehiculo) * op.multiplicadorCliente;
      op.valores.cliente.tarifaBase = this.tarifaBase;
      ////console.log("tarifa base: " ,this.tarifaBase);
      //this.acompaniante = op.acompaniante ? tarifa.adicionales.acompaniante : 0 ;
      this.acompaniante = op.acompaniante
        ? tarifa.adicionales.acompaniante * (op.acompanianteCant ?? 1)
        : 0;
      op.valores.cliente.acompValor = this.acompaniante;
      ////console.log("acompañante valor: ", this.acompaniante);
      this.kmValor = this.$calcularKm(op, tarifa, vehiculo);
      op.valores.cliente.kmAdicional = this.kmValor;
      op.valores.cliente.aCobrar =
        this.tarifaBase + this.acompaniante + this.kmValor + (op.valores.cliente.adExtraValor ?? 0);
    }

    ////console.log("km valor: ", this.kmValor);
    this.$crearFacturaOpCliente(op, tarifa.idTarifa);
    respuesta = {
      op: op,
      factura: this.facturaOpCliente,
      resultado: true,
      msj: "",
    };
    ////console.log("Factura OP cliente ", this.facturaOpCliente)
    return respuesta;
  }

  $facturarOpPersCliente(
    op: Operacion,
    tarifa: TarifaPersonalizadaCliente,
    tGeneral: TarifaGralCliente,
  ) {
    //console.log("!!!!!!!!!!!)op: ", op, " y tarifa: ",tarifa);
    let respuesta: {
      op: Operacion;
      factura: InformeOp;
      resultado: boolean;
      msj: string;
    };
    if (op.multiplicadorCliente === 0) {
      this.tarifaBase = 0;
      op.valores.cliente.tarifaBase = 0;
      ////console.log("tarifa base: " ,this.tarifaBase);
      this.acompaniante = 0;
      op.valores.cliente.acompValor = 0;
      ////console.log("acompañante valor: ", this.acompaniante);
      this.kmValor = 0;
      op.valores.cliente.kmAdicional = 0;
      op.valores.cliente.adExtraValor = 0;
      op.valores.cliente.aCobrar = 0;
    } else { 

    this.tarifaBase =
      this.$calcularCGPersonalizada(tarifa, op) * op.multiplicadorCliente;
    op.valores.cliente.tarifaBase = this.tarifaBase;
    //this.acompaniante = op.acompaniante ? tGeneral.adicionales.acompaniante : 0 ;
    this.acompaniante = op.acompaniante
      ? tGeneral.adicionales.acompaniante * (op.acompanianteCant ?? 1)
      : 0;
    op.valores.cliente.acompValor = this.acompaniante;
    if (tarifa.adKmboolean) {
      this.kmValor = this.$calcularKmTarifaPersonalizada(op, tarifa);
    } else {
      this.kmValor = 0;
    }
    op.valores.cliente.aCobrar =
        this.tarifaBase + this.acompaniante + this.kmValor + (op.valores.cliente.adExtraValor ?? 0);
    }


    //console.log("tarifa base: " ,this.tarifaBase);
    this.$crearFacturaOpCliente(op, tarifa.idTarifa);
    ////console.log("Factura OP cliente ", this.facturaOpCliente)
    respuesta = {
      op: op,
      factura: this.facturaOpCliente,
      resultado: true,
      msj: "",
    };
    console.log("Factura OP cliente personalizada", this.facturaOpCliente);
    return respuesta;
    //return this.facturaOpCliente
  }

  $facturarOpEveCliente(op: Operacion, tGeneral: TarifaGralCliente) {
    let respuesta: {
      op: Operacion;
      factura: InformeOp;
      resultado: boolean;
      msj: string;
    };

        if (op.multiplicadorCliente === 0) {
      this.tarifaBase = 0;
      op.valores.cliente.tarifaBase = 0;
      ////console.log("tarifa base: " ,this.tarifaBase);
      this.acompaniante = 0;
      op.valores.cliente.acompValor = 0;
      ////console.log("acompañante valor: ", this.acompaniante);
      this.kmValor = 0;
      op.valores.cliente.kmAdicional = 0;
      op.valores.cliente.adExtraValor = 0;      
      op.valores.cliente.aCobrar = 0;
    } else {
this.tarifaBase = op.datosTarifaEventual!.cliente.valor * op.multiplicadorCliente;
    op.valores.cliente.tarifaBase = this.tarifaBase;
    //this.acompaniante = op.acompaniante ? tGeneral.adicionales.acompaniante : 0 ;
    this.acompaniante = op.acompaniante
      ? tGeneral.adicionales.acompaniante * (op.acompanianteCant ?? 1)
      : 0;
    op.valores.cliente.acompValor = this.acompaniante;
    this.kmValor = 0;
    op.valores.cliente.aCobrar =
        this.tarifaBase + this.acompaniante + this.kmValor + (op.valores.cliente.adExtraValor ?? 0);
    }
    
    this.$crearFacturaOpCliente(op, 0);
    respuesta = {
      op: op,
      factura: this.facturaOpCliente,
      resultado: true,
      msj: "",
    };
    return respuesta;
    //return this.facturaOpCliente
  }

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

  // TODO: refactor Tarifas — firma ampliada de Vehiculo a tipo estructural mínimo (solo usa categoria.catOrden)
  $calcularCG(tarifa: TarifaGralCliente, vehiculo: { categoria: { catOrden: number } }) {
    let catCg = tarifa.cargasGenerales.filter((cat: CategoriaTarifa) => {
      return cat.orden === vehiculo.categoria.catOrden;
    });
    return catCg[0].valor;
  }

  $calcularCGPersonalizada(tarifa: TarifaPersonalizadaCliente, op: Operacion) {
    //console.log("tarifa: ", tarifa);

    let seccionPers: Seccion[] = tarifa.secciones.filter((seccion: Seccion) => {
      return seccion.orden === Number(op.datosTarifaPersonalizada!.seccion);
    });
    //console.log("seccionPers", seccionPers);

    let categoria: any[] = seccionPers[0].categorias.filter((cat: any) => {
      return cat.orden === Number(op.datosTarifaPersonalizada!.categoria);
    });
    //console.log("categoria", categoria);
    return categoria[0].aCobrar;
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

  valoresInicialesTarifaGral(op: Operacion, tarifa: TarifaGralCliente) {
    const vehiculo = op.vehiculo;
    let categoria = vehiculo.categoria.catOrden;
    let catCG = tarifa?.cargasGenerales?.filter((cat: CategoriaTarifa) => {
      return cat.orden === categoria;
    });
    return catCG[0].valor;
  }

  $calcularKmTarifaPersonalizada(
    op: Operacion,
    tarifa: TarifaPersonalizadaCliente,
  ) {
    let catCg = op.datosTarifaPersonalizada!.categoria;
    let seccion = op.datosTarifaPersonalizada!.seccion;
    ////console.log("catCg: ", catCg);

    let montoTotal = 0;
    if (tarifa.adicionales) {
      // Verifica si los kilómetros recorridos son menores o iguales al primer sector
      if (op.km < tarifa.adicionales?.KmDistancia.primerSector) {
        return montoTotal; // No se cobra adicional
      }

      // Si supera el primer sector, se cobra el valor del primer sector
      montoTotal =
        tarifa.secciones[seccion - 1].categorias[catCg - 1].adicionalKmACobrar
          ?.primerSector ?? 0;

      // Calcula cuántos kilómetros adicionales quedan luego del primer sector
      let kmRestantes = op.km - tarifa.adicionales.KmDistancia.primerSector;

      // Calcula cuántos sectores adicionales completos se recorren
      let sectoresAdicionales = Math.floor(
        kmRestantes / tarifa.adicionales.KmDistancia.sectoresSiguientes,
      );

      // Suma el costo de los sectores adicionales
      montoTotal +=
        sectoresAdicionales *
        (tarifa.secciones[seccion - 1].categorias[catCg - 1].adicionalKmACobrar
          ?.sectoresSiguientes ?? 0);
    }

    return montoTotal;
  }
}
