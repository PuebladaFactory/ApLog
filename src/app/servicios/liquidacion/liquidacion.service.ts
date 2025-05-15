import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';
import { DbFirestoreService } from '../database/db-firestore.service';
import { StorageService } from '../storage/storage.service';
import { FacturaCliente } from 'src/app/interfaces/factura-cliente';
import { FacturaOp } from 'src/app/interfaces/factura-op';
import { FacturaChofer } from 'src/app/interfaces/factura-chofer';
import { FacturaProveedor } from 'src/app/interfaces/factura-proveedor';
import { ConId } from 'src/app/interfaces/conId';
import { Operacion } from 'src/app/interfaces/operacion';
import { take } from 'rxjs';
import { forEach } from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class LiquidacionService {

  constructor(private storageService: StorageService, private dbFirebase: DbFirestoreService) { }

  mensajesError(msj:string){
      Swal.fire({
        icon: "error",
        //title: "Oops...",
        text: `${msj}`
        //footer: `${msj}`
      });
    }
    
  liquidarFacOpClientes(factura: FacturaCliente, facturasOp: ConId<FacturaOp>[]){
    this.addItem(factura, "facturaCliente", factura.idFacturaCliente, "ALTA")
    this.editarOperacionesFac(facturasOp);
    this.eliminarFacturasOp(facturasOp, "facOpLiqCliente", "facturaOpCliente")
  }

  liquidarFacOpChofer(factura: FacturaChofer, facturasOp: FacturaOp){
    
  }

  liquidarFacOpProveedor(factura: FacturaProveedor, facturasOp: FacturaOp){
    
  }


  
  
    addItem(item:any, componente:string, idItem:number, accion:string): void {   
      console.log("llamada al storage desde liq-cliente, addItem");
      this.storageService.addItem(componente, item, idItem, accion, accion === "INTERNA" ? "" : componente === 'proforma' ? `Proforma de Cliente ${item.razonSocial}` : `Alta de Factura de Cliente ${item.razonSocial}`);        
  
    } 
  
    eliminarFacturasOp(facturasOp: ConId<FacturaOp>[], componenteAlta: string, componenteBaja: string){
      
      facturasOp.forEach((facturaOp: ConId<FacturaOp>) => {  
        console.log("llamada al storage desde liq-cliente, addItem");
        let{id, ...factura} = facturaOp;
        this.addItem(factura, componenteAlta, factura.idFacturaOp, "INTERNA");
        this.removeItem(factura, componenteBaja);
        
      }); 
    }
  
    editarOperacionesFac(facturaOp:ConId<FacturaOp>[]){
      //factura.idOperacion
      
      facturaOp.forEach((factura: ConId<FacturaOp>)=>{
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
                facCliente: true,
                facChofer: op.estado.facChofer,
                facturada: op.estado.facChofer ? true : false,
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
      

      
    }
  
    removeItem(item:FacturaOp, componente:string){
  
      console.log("llamada al storage desde liq-cliente, deleteItem");
      this.storageService.deleteItem("facturaOpCliente", item, item.idFacturaOp, "INTERNA", "");    
  
    }
  

  
}
