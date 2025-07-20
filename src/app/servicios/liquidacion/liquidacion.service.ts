import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';
import { DbFirestoreService } from '../database/db-firestore.service';
import { StorageService } from '../storage/storage.service';




import { ConId } from 'src/app/interfaces/conId';
import { Operacion } from 'src/app/interfaces/operacion';
import { take } from 'rxjs';
import { forEach } from 'lodash';
import { doc, DocumentData, Firestore, getDoc, writeBatch } from 'firebase/firestore';
import { chunk } from 'lodash';
import { InformeOp } from 'src/app/interfaces/informe-op';
import { InformeLiq } from 'src/app/interfaces/informe-liq';

@Injectable({
  providedIn: 'root'
})
export class LiquidacionService {

  constructor(private storageService: StorageService, private dbFirebase: DbFirestoreService,) { }

  mensajesError(msj:string){
      Swal.fire({
        icon: "error",
        //title: "Oops...",
        text: `${msj}`
        //footer: `${msj}`
      });
      
    }

    
    
  liquidarFacOpCliente(factura: InformeLiq, facturasOp: ConId<InformeOp>[]){
    console.log("liquidarFacOpClientes");
    /* this.addItem(factura, "facturaCliente", factura.idFacturaCliente, "ALTA");
    this.editarOperacionesFac(facturasOp, "clientes");
    this.eliminarFacturasOp(facturasOp, "facOpLiqCliente", "facturaOpCliente");  */       
    //this.dbFirebase.procesarLiquidacion(facturasOp, "clientes", "facOpLiqCliente", "facturaOpCliente")
  }

  liquidarFacOpChofer(factura: InformeLiq, facturasOp: ConId<InformeOp>[]){
    console.log("liquidarFacOpChoferes");
    this.addItem(factura, "facturaChofer", factura.idInfLiq, "ALTA");
    this.editarOperacionesFac(facturasOp, "choferes");
    this.eliminarFacturasOp(facturasOp, "facOpLiqChofer", "facturaOpChofer");
  }

  liquidarFacOpProveedor(factura: InformeLiq, facturasOp: ConId<InformeOp>[]){
    console.log("liquidarFacOpProveedores");
    this.addItem(factura, "facturaProveedor", factura.idInfLiq, "ALTA");
    this.editarOperacionesFac(facturasOp, "proveedores");
    this.eliminarFacturasOp(facturasOp, "facOpLiqProveedor", "facturaOpProveedor");
  }  

  addItem(item:any, componente:string, idItem:number, accion:string): void {   
    console.log("llamada al storage desde liq-cliente, addItem");
    this.storageService.addItem(componente, item, idItem, accion, accion === "INTERNA" ? "" : componente === 'proforma' ? `Proforma de Cliente ${item.razonSocial}` : `Alta de Factura de Cliente ${item.razonSocial}`);        

  } 
  
  eliminarFacturasOp(facturasOp: ConId<InformeOp>[], componenteAlta: string, componenteBaja: string){
    
    facturasOp.forEach((facturaOp: ConId<InformeOp>) => {          
      let{id, ...factura} = facturaOp;
      this.addItem(factura, componenteAlta, factura.idInfOp, "INTERNA");
      this.removeItem(facturaOp, componenteBaja);
      
    }); 
    console.log("eliminarFacturasOp");
  }
  
  editarOperacionesFac(facturaOp:ConId<InformeOp>[], modo:string){
    //factura.idOperacion
    
    facturaOp.forEach((factura: ConId<InformeOp>)=>{
      let op:ConId<Operacion>;
      this.dbFirebase
        .obtenerTarifaIdTarifa("operaciones",factura.idOperacion, "idOperacion")
        .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
        .subscribe(data => {      
            op = data;
            console.log("OP LIQUIDADA: ", op);
            op.estado = {
              abierta: false,
              cerrada: false,
              facCliente: modo === 'clientes' ? true : op.estado.facCliente,
              facChofer: modo === 'choferes' || modo === 'proveedores' ? true : op.estado.facChofer,
              facturada: modo === 'clientes' && op.estado.facChofer ? true : modo === 'choferes' || modo === 'proveedores' && op.estado.facCliente ? true :  false,
              proformaCl: false,
              proformaCh: false,
            }
            if(op.estado.facturada){
              op.estado.facCliente = false;  
              op.estado.facChofer = false;
            }
            let {id, ...opp} = op
            this.storageService.updateItem("operaciones", opp, op.idOperacion, "LIQUIDAR", `Operación de Cliente ${op.cliente.razonSocial} Liquidada`, op.id);
            //this.removeItem(factura);
        });
      })
    console.log("editarOperacionesFac");      
  }
  
  removeItem(item:ConId<InformeOp>, componente:string){

    console.log("llamada al storage desde liq-cliente, deleteItem");
    this.storageService.deleteItem(componente, item, item.idInfOp, "INTERNA", "");    

  }



  
  

  
}
