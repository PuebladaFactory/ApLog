import { Injectable } from "@angular/core";
import { ValoresOpClienteService } from "../valores-op-cliente/valores-op-cliente.service";
import { StorageService } from "../../storage/storage.service";
import { DbFirestoreService } from "../../database/db-firestore.service";

import { Operacion } from "src/app/interfaces/operacion";
import { Chofer } from "src/app/interfaces/chofer";
import { Proveedor } from "src/app/interfaces/proveedor";

import {
  CategoriaTarifa,
  TarifaGralCliente,
} from "src/app/interfaces/tarifa-gral-cliente";

import {
  Seccion,
  TarifaPersonalizadaCliente,
} from "src/app/interfaces/tarifa-personalizada-cliente";
import { InformeOp } from "src/app/interfaces/informe-op";

@Injectable({
  providedIn: "root",
})
export class ValoresOpChoferService {
  total: number = 0;
  $adicional!: number;
  $tarifas!: any;

  choferOp!: Chofer;
  $choferes!: Chofer[];
  $proveedores!: Proveedor[];
  proveedorOp!: Proveedor;
  montoValorJornada!: number;
  facturaOpChofer!: InformeOp;
  tarifaBase!: number;
  acompaniante!: number;
  kmValor!: number;

  constructor(
    private storageService: StorageService,
    private dbFirebase: DbFirestoreService,
  ) {}

  choferes() {
    this.storageService.choferes$.subscribe((data) => {
      this.$choferes = data;
    });
  }

  /*  proveedores(){
    this.storageService.proveedores$.subscribe(data => {
      this.$proveedores = data;
    });
  } */

  $facturarOpChofer(op: Operacion, tarifa: TarifaGralCliente) {
    let respuesta: {
      op: Operacion;
      factura: InformeOp;
      resultado: boolean;
      msj: string;
    };
    ////console.log("1)Chofer Serv:  op: ", op, " tarifa: ", tarifa);
    // TODO: refactor Tarifas — antes buscaba en el array embebido del chofer (ya inexistente);
    // ahora el vehículo de la op está en op.vehiculo (RefVehiculo).
    const vehiculo = op.vehiculo;
    ////console.log("1c) vehiculo: ", vehiculo);

    if (op.multiplicadorChofer === 0) {
      this.tarifaBase = 0;
      op.valores.chofer.tarifaBase = 0;
      //////console.log("tarifa base: " ,this.tarifaBase);
      this.acompaniante = 0;
      op.valores.chofer.acompValor = 0;
      //////console.log("acompañante valor: ", this.acompaniante);
      this.kmValor = 0;
      op.valores.chofer.kmAdicional = 0;
      op.valores.chofer.adExtraValor = 0;
      op.valores.chofer.aPagar = 0;
    } else {
      this.tarifaBase =
        this.$calcularCG(tarifa, vehiculo) * op.multiplicadorChofer;
      op.valores.chofer.tarifaBase = this.tarifaBase;
      ////////console.log("tarifa base: " ,this.tarifaBase);
      //this.acompaniante = op.acompaniante ? tarifa.adicionales.acompaniante : 0 ;
      this.acompaniante = op.acompaniante
        ? tarifa.adicionales.acompaniante * (op.acompanianteCant ?? 1)
        : 0;
      op.valores.chofer.acompValor = this.acompaniante;
      ////////console.log("acompañante valor: ", this.acompaniante);
      this.kmValor = this.$calcularKm(op, tarifa, vehiculo);
      op.valores.chofer.kmAdicional = this.kmValor;
      op.valores.chofer.aPagar =
        this.tarifaBase + this.acompaniante + this.kmValor +(op.valores.chofer.adExtraValor ?? 0);
    }

    ////////console.log("km valor: ", this.kmValor);
    this.$crearFacturaOpChofer(op, tarifa.idTarifa, '');
    respuesta = {
      op: op,
      factura: this.facturaOpChofer,
      resultado: true,
      msj: "",
    };
    ////////console.log("Factura OP cliente ", this.facturaOpCliente)
    return respuesta;
  }

  $facturarOpPersChofer(
    op: Operacion,
    tarifa: TarifaPersonalizadaCliente,
    idProveedor: string,
    tGeneral: TarifaGralCliente,
  ) {
    let respuesta: {
      op: Operacion;
      factura: InformeOp;
      resultado: boolean;
      msj: string;
    };

        if (op.multiplicadorChofer === 0) {
      this.tarifaBase = 0;
      op.valores.chofer.tarifaBase = 0;
      //////console.log("tarifa base: " ,this.tarifaBase);
      this.acompaniante = 0;
      op.valores.chofer.acompValor = 0;
      //////console.log("acompañante valor: ", this.acompaniante);
      this.kmValor = 0;
      op.valores.chofer.kmAdicional = 0;
      op.valores.chofer.adExtraValor = 0;
      op.valores.chofer.aPagar = 0;
    } else {

    this.tarifaBase =
      this.$calcularCGPersonalizada(tarifa, op) * op.multiplicadorChofer;
    op.valores.chofer.tarifaBase = this.tarifaBase;
    //this.acompaniante = op.acompaniante ? tGeneral.adicionales.acompaniante : 0 ;
    this.acompaniante = op.acompaniante
      ? tGeneral.adicionales.acompaniante * (op.acompanianteCant ?? 1)
      : 0;
    op.valores.chofer.acompValor = this.acompaniante;
    if (tarifa.adKmboolean) {
      this.kmValor = this.$calcularKmTarifaPersonalizada(op, tarifa);
    } else {
      this.kmValor = 0;
    }
    op.valores.chofer.aPagar =
        this.tarifaBase + this.acompaniante + this.kmValor +(op.valores.chofer.adExtraValor ?? 0);
    }

    //////console.log("tarifa base: " ,this.tarifaBase);
    this.$crearFacturaOpChofer(op, tarifa.idTarifa, idProveedor);
    respuesta = {
      op: op,
      factura: this.facturaOpChofer,
      resultado: true,
      msj: "",
    };
    console.log("Factura OP chofer ", this.facturaOpChofer);
    return respuesta;
    ////////console.log("Factura OP cliente ", this.facturaOpCliente)
    //return this.facturaOpChofer
  }

  $facturarOpEveChofer(
    op: Operacion,
    idProveedor: string,
    tGeneral: TarifaGralCliente,
  ) {
    let respuesta: {
      op: Operacion;
      factura: InformeOp;
      resultado: boolean;
      msj: string;
    };
            if (op.multiplicadorChofer === 0) {
      this.tarifaBase = 0;
      op.valores.chofer.tarifaBase = 0;
      //////console.log("tarifa base: " ,this.tarifaBase);
      this.acompaniante = 0;
      op.valores.chofer.acompValor = 0;
      //////console.log("acompañante valor: ", this.acompaniante);
      this.kmValor = 0;
      op.valores.chofer.kmAdicional = 0;
      op.valores.chofer.adExtraValor = 0;
      op.valores.chofer.aPagar = 0;
    }else {
// TODO: refactor Tarifas — invariante: eventual ⟺ datosTarifaEventual !== null
this.tarifaBase = op.datosTarifaEventual!.chofer.valor * op.multiplicadorChofer;
    op.valores.chofer.tarifaBase = this.tarifaBase;
    //this.acompaniante = op.acompaniante ? tGeneral.adicionales.acompaniante : 0 ;
    this.acompaniante = op.acompaniante
      ? tGeneral.adicionales.acompaniante * (op.acompanianteCant ?? 1)
      : 0;
    op.valores.chofer.acompValor = this.acompaniante;
    this.kmValor = 0;
    op.valores.chofer.aPagar =
        this.tarifaBase + this.acompaniante + this.kmValor +(op.valores.chofer.adExtraValor ?? 0);
    }
    
    this.$crearFacturaOpChofer(op, 0, idProveedor);
    respuesta = {
      op: op,
      factura: this.facturaOpChofer,
      resultado: true,
      msj: "",
    };
    ////////console.log("Factura OP cliente ", this.facturaOpCliente)
    return respuesta;
    //return this.facturaOpChofer
  }

  // TODO: refactor Tarifas — firma ampliada a tipo estructural mínimo (solo usa categoria.catOrden).
  $calcularCG(tarifa: TarifaGralCliente, vehiculo: { categoria: { catOrden: number } }) {
    let catCg = tarifa.cargasGenerales.filter((cat: CategoriaTarifa) => {
      return cat.orden === vehiculo.categoria.catOrden;
    });
    ////console.log("Chofer Service: catCg: ", catCg);

    return catCg[0].valor;
  }

  $calcularCGPersonalizada(tarifa: TarifaPersonalizadaCliente, op: Operacion) {
    // TODO: refactor Tarifas — invariante: personalizada ⟺ datosTarifaPersonalizada !== null
    let seccionPers: Seccion[] = tarifa.secciones.filter((seccion: Seccion) => {
      return seccion.orden === Number(op.datosTarifaPersonalizada!.seccion);
    });
    let categoria: any[] = seccionPers[0].categorias.filter((cat: any) => {
      return cat.orden === Number(op.datosTarifaPersonalizada!.categoria);
    });
    return categoria[0].aPagar;
  }

  // TODO: refactor Tarifas — firma ampliada a tipo estructural mínimo (solo usa categoria.catOrden).
  $calcularKm(op: Operacion, tarifa: TarifaGralCliente, vehiculo: { categoria: { catOrden: number } }) {
    let catCg = tarifa.cargasGenerales.filter((cat: CategoriaTarifa) => {
      return cat.orden === vehiculo.categoria.catOrden;
    });
    ////////console.log("catCg: ", catCg);

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

  // TODO: refactor Tarifas — posiblemente huérfano (sin callers detectados).
  $getTarifaTipoChofer(op: Operacion) {
    if ((op.chofer as any).tarifaTipo?.especial) { // TODO: refactor Tarifas — tarifaTipo no existe en RefChofer
      return true;
    } else {
      return false;
    }
  }

  $facturarOpProveedor(
    op: Operacion,
    tarifa: TarifaGralCliente,
    idProveedor: string,
  ) {
    let respuesta: {
      op: Operacion;
      factura: InformeOp;
      resultado: boolean;
      msj: string;
    };
    ////console.log("1)Proveedor Serv:  op: ", op, " tarifa: ", tarifa);
    // TODO: refactor Tarifas — antes buscaba en el array embebido del chofer (ya inexistente);
    // ahora el vehículo de la op está en op.vehiculo (RefVehiculo).
    const vehiculo = op.vehiculo;
    ////////console.log("1c) vehiculo: ", vehiculo);

    if (op.multiplicadorCliente === 0) {
      this.tarifaBase = 0;
      op.valores.chofer.tarifaBase = 0;
      //////console.log("tarifa base: " ,this.tarifaBase);
      this.acompaniante = 0;
      op.valores.chofer.acompValor = 0;
      //////console.log("acompañante valor: ", this.acompaniante);
      this.kmValor = 0;
      op.valores.chofer.kmAdicional = 0;
      op.valores.chofer.aPagar = 0;
    } else {
      this.tarifaBase =
        this.$calcularCG(tarifa, vehiculo) * op.multiplicadorChofer;
      op.valores.chofer.tarifaBase = this.tarifaBase;
      ////////console.log("tarifa base: " ,this.tarifaBase);
      this.acompaniante = op.acompaniante ? tarifa.adicionales.acompaniante : 0;
      op.valores.chofer.acompValor = this.acompaniante;
      ////////console.log("acompañante valor: ", this.acompaniante);
      this.kmValor = this.$calcularKm(op, tarifa, vehiculo);
      op.valores.chofer.kmAdicional = this.kmValor;
      op.valores.chofer.aPagar =
        this.tarifaBase + this.acompaniante + this.kmValor;
      ////////console.log("km valor: ", this.kmValor);
    }

    this.$crearFacturaOpChofer(op, tarifa.idTarifa, idProveedor);
    respuesta = {
      op: op,
      factura: this.facturaOpChofer,
      resultado: true,
      msj: "",
    };
    ////////console.log("Factura OP cliente ", this.facturaOpCliente)
    return respuesta;
  }

  valoresInicialesTarifaGral(op: Operacion, tarifa: TarifaGralCliente) {
    // TODO: refactor Tarifas — vehículo de la op desde el snapshot op.vehiculo.
    const categoria = op.vehiculo.categoria.catOrden;
    let catCG = tarifa.cargasGenerales.filter((cat: CategoriaTarifa) => {
      return cat.orden === categoria;
    });
    return catCG[0].valor;
  }

  $calcularKmTarifaPersonalizada(
    op: Operacion,
    tarifa: TarifaPersonalizadaCliente,
  ) {
    // TODO: refactor Tarifas — invariante: personalizada ⟺ datosTarifaPersonalizada !== null
    let catCg = op.datosTarifaPersonalizada!.categoria;
    let seccion = op.datosTarifaPersonalizada!.seccion;
    ////////console.log("catCg: ", catCg);

    let montoTotal = 0;
    if (tarifa.adicionales) {
      // Verifica si los kilómetros recorridos son menores o iguales al primer sector
      if (op.km < tarifa.adicionales.KmDistancia.primerSector) {
        return montoTotal; // No se cobra adicional
      }

      // Si supera el primer sector, se cobra el valor del primer sector
      montoTotal =
        tarifa.secciones[seccion - 1].categorias[catCg - 1].adicionalKmAPagar
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
        (tarifa.secciones[seccion - 1].categorias[catCg - 1].adicionalKmAPagar
          ?.sectoresSiguientes ?? 0);
    }

    return montoTotal;
  }
}
