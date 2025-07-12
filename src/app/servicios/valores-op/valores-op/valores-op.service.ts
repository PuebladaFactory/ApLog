import { Injectable } from '@angular/core';

import { Operacion } from 'src/app/interfaces/operacion';

import { ValoresOpClienteService } from '../valores-op-cliente/valores-op-cliente.service';
import { StorageService } from '../../storage/storage.service';

import { DbFirestoreService } from '../../database/db-firestore.service';
import { TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';

import { TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
import { ValoresOpChoferService } from '../valores-op-chofer/valores-op-chofer.service';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { TarifaEventual } from 'src/app/interfaces/tarifa-eventual';
import { ConId, ConIdType } from 'src/app/interfaces/conId';

import { InformeOp } from 'src/app/interfaces/informe-op';

@Injectable({
  providedIn: 'root'
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
  clienteFacOp!: InformeOp [];
  choferFacOp!: InformeOp [];
  ProveedorFacOp!: InformeOp [];
  operacion!: ConId<Operacion>;
  proveedorSeleccionado!: ConId<Proveedor> | undefined;
  tarifaEventual! : TarifaEventual;    
  
  respuesta:any

  constructor( private facturacionCliente: ValoresOpClienteService, private facturacionChofer: ValoresOpChoferService, private storageService: StorageService, private dbFirebase: DbFirestoreService) { }

  async facturarOperacion(op: ConId<Operacion>): Promise<{ exito: boolean; mensaje: string }> {
    try {
      this.$proveedores = this.storageService.loadInfo('proveedores');
      if (op.chofer.idProveedor !== 0) {
        this.proveedorSeleccionado = this.$proveedores.find(p => p.idProveedor === op.chofer.idProveedor);
      }

      const tGral = this.storageService.loadInfo("tarifasGralCliente");
      this.$ultTarifaGralCliente = tGral[0];

      const tGralCho = this.storageService.loadInfo("tarifasGralChofer");
      this.$ultTarifaGralChofer = tGralCho[0];

      const tGralPro = this.storageService.loadInfo("tarifasGralProveedor");
      this.$ultTarifaGralProveedor = tGralPro[0];

      this.operacion = op;

      await this.$facturarOpCliente(op);
      return await this.$guardarFacturas(op);

    } catch (error: any) {
      console.error("Error durante facturarOperacion:", error);
      return { exito: false, mensaje: error?.message || 'Error inesperado al facturar operación' };
    }
  }

  async $facturarOpCliente(op: ConId<Operacion>) {
    try {
      let respuesta;

      if (op.tarifaTipo.general) {//tarifa general
        ////////////// TARIFA GENERAL CLIENTE ///////////////////////
        ////console.log("1)A.1) tarifa GENERAL CLIENTE: ", this.$ultTarifaGralCliente);     
        respuesta = this.facturacionCliente.$facturarOpCliente(op, this.$ultTarifaGralCliente);        
        //////////console.log("1)A.2)Factura OP cliente ", this.facturaOpCliente);      
      } else if (op.tarifaTipo.especial){  //tarifa especial cliente                
          if(op.cliente.tarifaTipo.especial) {
            ////////////// TARIFA ESPECIAL CLIENTE ///////////////////////
            const tarifas = this.storageService.loadInfo("tarifasEspCliente");
            this.$ultTarifaEspCliente = tarifas.find(t => t.idCliente === op.cliente.idCliente);
            ////console.log("1)A.2) tarifa ESPECIAL CLIENTE: ", this.$ultTarifaEspCliente);     
            if (!this.$ultTarifaEspCliente || !this.$ultTarifaEspCliente.cargasGenerales?.length) {
              throw new Error("Tarifa especial del cliente no válida o vacía");
            }
            respuesta = this.facturacionCliente.$facturarOpCliente(op, this.$ultTarifaEspCliente);          
          } else {
            //tarifa especial solo del chofer. aplica tarifa general al cliente
            respuesta = this.facturacionCliente.$facturarOpCliente(op, this.$ultTarifaGralCliente);            
          }
      } else if (op.tarifaTipo.personalizada) {//tarifa personalizada
        ////////////// TARIFA PERSONALIZADA CLIENTE ///////////////////////
        const tarifas = this.storageService.loadInfo("tarifasPersCliente");
        this.$ultTarifaPersCliente = tarifas.find(t => t.idCliente === op.cliente.idCliente);
        ////console.log("1)A.3) tarifa PERSONALIZADA CLIENTE: ", this.$ultTarifaPersCliente);     
        if (!this.$ultTarifaPersCliente || !this.$ultTarifaPersCliente.secciones?.length) {
          throw new Error("Tarifa personalizada del cliente no válida o vacía");
        }
        respuesta = this.facturacionCliente.$facturarOpPersCliente(op, this.$ultTarifaPersCliente, this.$ultTarifaGralCliente);        
      } else if (op.tarifaTipo.eventual) {//tarifa eventual
        ////////////// TARIFA EVENTUAL CLIENTE ///////////////////////
        respuesta = this.facturacionCliente.$facturarOpEveCliente(op, this.$ultTarifaGralCliente);        
      } else {
        throw new Error("Tipo de tarifa del cliente no reconocido");
      }

      this.operacion.valores.cliente = respuesta.op.valores.cliente;
      this.facturaOpCliente = respuesta.factura;

      if (op.chofer.idProveedor === 0) {
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
      let respuesta;

      if (op.tarifaTipo.general) { //tarifa general
        /////////TARIFA GENERAL CHOFER /////////////////////////
        ////console.log("1)B.1) tarifa GENERAL CHOFER: ", this.$ultTarifaGralChofer);  
        respuesta = this.facturacionChofer.$facturarOpChofer(op, this.$ultTarifaGralChofer);
      } else if (op.tarifaTipo.especial){  //tarifa especial chofer
          if(op.chofer.tarifaTipo.especial) {
            /////////TARIFA ESPECIAL CHOFER /////////////////////////
            const tarifas = this.storageService.loadInfo("tarifasEspChofer");
            this.$ultTarifaEspChofer = tarifas.find(t => t.idChofer === op.chofer.idChofer);
            ////console.log("1)B.2) tarifa ESPECIAL CHOFER: ", this.$ultTarifaEspChofer);  
            if (!this.$ultTarifaEspChofer || !this.$ultTarifaEspChofer.cargasGenerales?.length) {
              throw new Error("Tarifa especial del chofer no válida o vacía");
            }
            if (this.$ultTarifaEspChofer.idCliente === 0 || this.$ultTarifaEspChofer.idCliente === op.cliente.idCliente) {
              //tarifa especial gral o especifica al cliente de la op
              respuesta = this.facturacionChofer.$facturarOpChofer(op, this.$ultTarifaEspChofer);
            } else {
               ////este caso es donde la tarifa especial no aplica   
              //aca le cambio el tipo de tarifa pq usa una tarifa especial no aplica
              respuesta = this.facturacionChofer.$facturarOpChofer(op, this.$ultTarifaGralChofer);
              respuesta.factura.tarifaTipo = { general: true, especial: false, eventual: false, personalizada: false };
            }
          } else {
            //tarifa especial solo del cliente. aplica tarifa general al chofer
            respuesta = this.facturacionChofer.$facturarOpChofer(op, this.$ultTarifaGralChofer);
          }          
      } else if (op.tarifaTipo.personalizada) {//tarifa personalizada      
        /////////TARIFA PERSONALIZADA CHOFER /////////////////////////
        const tarifas = this.storageService.loadInfo("tarifasPersCliente");
        this.$ultTarifaPersCliente = tarifas.find(t => t.idCliente === op.cliente.idCliente);
        ////console.log("1)B.3) tarifa PERSONALIZADA CHOFER: ", this.$ultTarifaPersCliente);  
        if (!this.$ultTarifaPersCliente || !this.$ultTarifaPersCliente.secciones?.length) {
          throw new Error("Tarifa personalizada del cliente para chofer no válida o vacía");
        }
        respuesta = this.facturacionChofer.$facturarOpPersChofer(op, this.$ultTarifaPersCliente, 0, this.$ultTarifaGralChofer);
      } else if (op.tarifaTipo.eventual) {//tarifa eventual      
        /////////TARIFA EVENTUAL CHOFER /////////////////////////
        respuesta = this.facturacionChofer.$facturarOpEveChofer(op, 0, this.$ultTarifaGralChofer);
      } else {
        throw new Error("Tipo de tarifa del chofer no reconocido");
      }

      this.operacion.valores.chofer = respuesta.op.valores.chofer;
      this.facturaOpChofer = respuesta.factura;

      await this.$armarFacturasOp(op);

    } catch (error: any) {
      throw new Error("Error al facturar chofer: " + error?.message);
    }
  }

async $facturarOpProveedor(op: ConId<Operacion>) {
    try {
      let respuesta;
      if (!this.proveedorSeleccionado) throw new Error("Proveedor no definido");

      if (op.tarifaTipo.general) {
        ////console.log("3)C.1) tarifa GENERAL Proveedor: ", this.$ultTarifaGralProveedor);
        respuesta = this.facturacionChofer.$facturarOpProveedor(op, this.$ultTarifaGralProveedor, this.proveedorSeleccionado.idProveedor);
      } else if (op.tarifaTipo.especial){  //tarifa especial proveedor
          if(this.proveedorSeleccionado.tarifaTipo.especial) {
            ///////////// TARIFA ESPECIAL PROVEEDOR ///////////////////
            const tarifas = this.storageService.loadInfo("tarifasEspProveedor");
            this.$ultTarifaEspProveedor = tarifas.find(t => t.idChofer === op.chofer.idChofer);
            ////console.log("3)C.2) tarifa ESPECIAL Proveedor: ", this.$ultTarifaGralProveedor);
            if (!this.$ultTarifaEspProveedor || !this.$ultTarifaEspProveedor.cargasGenerales?.length) {
              throw new Error("Tarifa especial del proveedor no válida o vacía");
            }
            if (this.$ultTarifaEspProveedor.idCliente === 0 || this.$ultTarifaEspProveedor.idCliente === op.cliente.idCliente) {
              //tarifa especial gral o especifica al cliente de la op
              respuesta = this.facturacionChofer.$facturarOpProveedor(op, this.$ultTarifaEspProveedor, this.proveedorSeleccionado.idProveedor);
            } else {
              ////este caso es donde la tarifa especial no aplica   
              //aca le cambio el tipo de tarifa pq usa una tarifa especial no aplica
              respuesta = this.facturacionChofer.$facturarOpProveedor(op, this.$ultTarifaGralProveedor, this.proveedorSeleccionado.idProveedor);
              respuesta.factura.tarifaTipo = { general: true, especial: false, eventual: false, personalizada: false };
            }
        } else {
          //tarifa especial solo del cliente. aplica tarifa general al chofer
          respuesta = this.facturacionChofer.$facturarOpProveedor(op, this.$ultTarifaGralProveedor, this.proveedorSeleccionado.idProveedor);
        }
      } else if (op.tarifaTipo.personalizada) { //tarifa personalizada
        /////////TARIFA PERSONALIZADA PROVEEDOR /////////////////////////
        const tarifas = this.storageService.loadInfo("tarifasPersCliente");
        this.$ultTarifaPersCliente = tarifas.find(t => t.idCliente === op.cliente.idCliente);
        ////console.log("3)C.3) tarifa PERSONALIZADA Proveedor: ", this.$ultTarifaPersCliente);
        if (!this.$ultTarifaPersCliente || !this.$ultTarifaPersCliente.secciones?.length) {
          throw new Error("Tarifa personalizada del cliente no válida para proveedor");
        }
        respuesta = this.facturacionChofer.$facturarOpPersChofer(op, this.$ultTarifaPersCliente, this.proveedorSeleccionado.idProveedor, this.$ultTarifaGralProveedor);
      } else if (op.tarifaTipo.eventual) {//tarifa eventual
        /////////TARIFA EVENTUAL PROVEEDOR /////////////////////////
        respuesta = this.facturacionChofer.$facturarOpEveChofer(op, this.proveedorSeleccionado.idProveedor, this.$ultTarifaGralProveedor);
      } else {
        throw new Error("Tipo de tarifa del proveedor no reconocido");
      }

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
      if(op.chofer.idProveedor === 0){
      if(this.facturaOpCliente !== null && this.facturaOpChofer !== null){
        op.valores.cliente.aCobrar = this.facturaOpCliente.valores.total;
        op.valores.chofer.aPagar = this.facturaOpChofer.valores.total;
        op.estado = {
          abierta : false,
          cerrada : true,
          facCliente: false,
          facChofer: false,
          facturada : false,
          proformaCl: false,
          proformaCh: false,
        };
        op.facturaCliente = this.facturaOpCliente.idInfOp;
        op.facturaChofer = this.facturaOpChofer.idInfOp;
        this.facturaOpCliente.contraParteMonto = this.facturaOpChofer.valores.total;
        this.facturaOpChofer.contraParteMonto = this.facturaOpCliente.valores.total;
        this.facturaOpCliente.contraParteId = this.facturaOpChofer.idInfOp;
        this.facturaOpChofer.contraParteId = this.facturaOpCliente.idInfOp;
        //this.$guardarFacturas(op);
      }
      } else {
        if(this.facturaOpCliente !== null && this.facturaOpProveedor !== null){
          op.valores.cliente.aCobrar = this.facturaOpCliente.valores.total;
          op.valores.chofer.aPagar = this.facturaOpProveedor.valores.total;
          op.estado = {
            abierta : false,
            cerrada : true,
            facCliente: false,
            facChofer: false,
            facturada : false,
            proformaCl: false,
            proformaCh: false,
          };
          op.facturaCliente = this.facturaOpCliente.idInfOp;
          op.facturaChofer = this.facturaOpProveedor.idInfOp;
          this.facturaOpCliente.contraParteMonto = this.facturaOpProveedor.valores.total;
          this.facturaOpProveedor.contraParteMonto = this.facturaOpCliente.valores.total;
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


async $guardarFacturas(op: ConId<Operacion>): Promise<{ exito: boolean; mensaje: string }> {
    try {
      let result;
      if (op.chofer.idProveedor === 0) {
        result = await this.dbFirebase.guardarFacturasOp("informesOpClientes", this.facturaOpCliente, "informesOpChoferes", this.facturaOpChofer, op);
      } else {
        result = await this.dbFirebase.guardarFacturasOp("informesOpClientes", this.facturaOpCliente, "informesOpProveedores", this.facturaOpProveedor, op);
      }
      if (op.tarifaTipo.eventual) {
        this.guardarTarifasEventuales(op);
      }
      return result;
    } catch (error: any) {
      throw new Error("Error al guardar facturas: " + error?.message);
    }
  }

  guardarTarifasEventuales(op:Operacion){
    this.tarifaEventual = {
      
      idTarifa: new Date().getTime(),
      fecha: op.fecha,
      cliente: {
        concepto: op.tarifaEventual.cliente.concepto,
        valor:op.tarifaEventual.cliente.valor,
      },
      chofer: {
        concepto: op.tarifaEventual.chofer.concepto,
        valor:op.tarifaEventual.chofer.valor,
      },      
      tipo: {
        general: false,
        especial: false,
        eventual: true,
        personalizada: false,
      },
      idCliente: op.cliente.idCliente,
      idChofer: op.chofer.idChofer,
      idProveedor: op.chofer.idProveedor,
      idOperacion: op.idOperacion,
      km: op.km,
    }
    this.storageService.addItem("tarifasEventuales", this.tarifaEventual, this.tarifaEventual.idTarifa, "ALTA", `Alta de Tarifa Eventual ${this.tarifaEventual.idTarifa}, Cliente ${op.cliente.razonSocial}, Chofer ${op.chofer.apellido} ${op.chofer.nombre} `);

  }


}
