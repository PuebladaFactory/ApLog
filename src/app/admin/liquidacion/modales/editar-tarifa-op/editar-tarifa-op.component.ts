import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, take, takeUntil } from 'rxjs';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { FacturaOp } from 'src/app/interfaces/factura-op';
import { Operacion } from 'src/app/interfaces/operacion';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { FormatoNumericoService } from 'src/app/servicios/formato-numerico/formato-numerico.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-editar-tarifa-op',
  templateUrl: './editar-tarifa-op.component.html',
  styleUrls: ['./editar-tarifa-op.component.scss']
})
export class EditarTarifaOpComponent implements OnInit {

@Input() fromParent: any;
    facDetallada!: ConId<FacturaOp>;
    ultimaTarifa!: ConIdType<TarifaGralCliente>;
    edicion:boolean = false;
    tarifaEditForm: any;
    swichForm:any;    
    facturaEditada!: ConId<FacturaOp>;
    swich!: boolean;
    $choferes!: ConIdType<Chofer>[];
    $clientes!: ConIdType<Cliente>[];
    $proveedores!: ConIdType<Proveedor>[];
    choferOp!: ConIdType<Chofer>[];
    vehiculoOp!: Vehiculo[];
    operacion!: ConId<Operacion>;
    tarifaPersonalizada!: ConIdType<TarifaPersonalizadaCliente>;
    componente: string = "";
    facOriginal!: ConId<FacturaOp>;
    opOriginal!: ConId<Operacion>;
    facContraParte!: ConId<FacturaOp>;
     private destroy$ = new Subject<void>();
  
    constructor(private storageService: StorageService, private modalService: NgbModal, public activeModal: NgbActiveModal, private formNumServ: FormatoNumericoService, private dbFirebase: DbFirestoreService){
     
    }
    
    ngOnInit(): void {         
      console.log("fromParent: ",this.fromParent);    
      this.facOriginal = this.fromParent.factura;
      this.facDetallada = structuredClone(this.facOriginal);
      this.opOriginal = this.fromParent.op;
      this.operacion = structuredClone(this.opOriginal);
      this.storageService.choferes$
      .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
      .subscribe(data => {
        if(data){this.$choferes = data};        
      });
      this.storageService.clientes$
      .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
      .subscribe(data => {
        if(data){this.$clientes = data};        
      });
      this.storageService.proveedores$
      .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
      .subscribe(data => {
        if(data){this.$proveedores = data};        
      });
      this.getChofer(); 
      switch(this.fromParent.origen){
        case "clientes":{
            this.componente = "facturaOpCliente";
            break;
        };
        case "choferes":{
          this.componente = "facturaOpChofer";
          break;
        }
        case "proveedores":{
          this.componente = "facturaOpProveedor";
          break;
        }
        default:{
          console.log("error en fromParent.origen")
          break
        }
      } 
      

      //this.swich = this.facDetallada.operacion.tarifaEventual;        
      if(!this.facDetallada.tarifaTipo.personalizada){
        this.ultimaTarifa = this.fromParent.tarifaAplicada;
      } else {
        this.tarifaPersonalizada = this.fromParent.tarifaAplicada;
      }
  
     
    }
  
    getChofer(){
      this.choferOp = this.$choferes.filter((chofer:Chofer)=>{
        return chofer.idChofer === this.facDetallada.idChofer;
      })
      console.log("this.choferOp: ", this.choferOp);
      
      this.vehiculoOp = this.choferOp[0].vehiculo.filter((vehiculo:Vehiculo)=>{
        return vehiculo.dominio === this.operacion.patenteChofer.toUpperCase()
      })
      console.log("vehiculoOp: ", this.vehiculoOp);
      
  
    }

   limpiarValorFormateado(valorFormateado: string): number {
    // Elimina el punto de miles y reemplaza la coma por punto para que sea un valor numérico válido
      return parseFloat(valorFormateado.replace(/\./g, '').replace(',', '.'));
    }
  
    onSubmit(){      
  
      Swal.fire({
        title: "¿Desea guardar los cambios en la factura?",
        //text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Guardar",
        cancelButtonText: "Cancelar"
      }).then((result) => {
        if (result.isConfirmed) {
          ////////console.log("op: ", this.op);
          this.formatearDatos();
          Swal.fire({
            title: "Confirmado",
            text: "Los cambios se han guardado.",
            icon: "success"
          }).then((result)=>{
            if (result.isConfirmed) {
              this.activeModal.close();
            }
          });   
          
        }
      });   
      console.log("factura EDITADA: ", this.facDetallada);      
    
     }

     formatearDatos(){
      this.facDetallada.km = this.formNumServ.convertirAValorNumerico(this.facDetallada.km);
      
      this.facDetallada.valores.acompaniante =this.formNumServ.convertirAValorNumerico(this.facDetallada.valores.acompaniante);
      this.facDetallada.valores.kmMonto =this.formNumServ.convertirAValorNumerico(this.facDetallada.valores.kmMonto);
      this.facDetallada.valores.tarifaBase =this.formNumServ.convertirAValorNumerico(this.facDetallada.valores.tarifaBase);
      this.facDetallada.valores.total =this.formNumServ.convertirAValorNumerico(this.facDetallada.valores.total);
     
      if(this.facDetallada.tarifaTipo.eventual || this.facDetallada.tarifaTipo.personalizada){
        this.facDetallada.valores.tarifaBase = this.facDetallada.valores.total;
      }

      this.operacion.km = this.facDetallada.km;
      this.operacion.observaciones = this.facDetallada.observaciones;
      switch(this.fromParent.origen){
        case "clientes":{
            this.operacion.valores.cliente.aCobrar = this.facDetallada.valores.total;
            this.operacion.valores.cliente.acompValor = this.facDetallada.valores.acompaniante;
            this.operacion.valores.cliente.kmAdicional = this.facDetallada.valores.kmMonto;
            this.operacion.valores.cliente.tarifaBase = this.facDetallada.valores.tarifaBase;            
            this.buscarContraParte();
            //this.updateItem();
            break;
        };
        case "choferes":{
            this.operacion.valores.chofer.aPagar = this.facDetallada.valores.total;
            this.operacion.valores.chofer.acompValor = this.facDetallada.valores.acompaniante;
            this.operacion.valores.chofer.kmAdicional = this.facDetallada.valores.kmMonto;
            this.operacion.valores.chofer.tarifaBase = this.facDetallada.valores.tarifaBase;
            this.buscarContraParte();
          break;
        }
        case "proveedores":{
            this.operacion.valores.chofer.aPagar = this.facDetallada.valores.total;
            this.operacion.valores.chofer.acompValor = this.facDetallada.valores.acompaniante;
            this.operacion.valores.chofer.kmAdicional = this.facDetallada.valores.kmMonto;
            this.operacion.valores.chofer.tarifaBase = this.facDetallada.valores.tarifaBase;
            this.buscarContraParte();
          break;
        }
        default:{
          console.log("error en fromParent.origen")
          break
        }
      }
     }
  
     updateItem(){

      console.log("this.facDetallada: ", this.facDetallada);
      console.log("this.operacion: ", this.operacion);      
      let {id, ...facDet} = this.facDetallada;
      this.storageService.updateItem(
        this.componente, 
        facDet, 
        this.facDetallada.idFacturaOp, 
        "EDITAR", 
        this.componente === "facturaOpCliente" ? `Edición de Informe de Operación del Cliente ${this.getClienteId(this.facDetallada.idCliente)}` : this.componente === "facturaOpChofer" ? `Edición de Informe de Operación del Chofer ${this.getChoferId(this.facDetallada.idChofer)}` : `Edición de Informe de Operación del Proveedor ${this.getProveedorId(this.facDetallada.idProveedor)}`,
        this.facDetallada.id);
        if(this.operacion){
          let {id, ...op} = this.operacion;
          this.storageService.updateItem("operaciones", op, this.operacion.idOperacion,"EDITAR", "Edición de Operación desde Liquidación", this.operacion.id);
        }
      
      switch(this.fromParent.origen){
        case "clientes":{
          let{id, ...facOp} = this.facContraParte;
          if(this.operacion.chofer.idProveedor === 0){            
            this.storageService.updateItem("facturaOpChofer", facOp, this.facContraParte.idFacturaOp, "INTERNA", "", this.facContraParte.id);
          } else {
            this.storageService.updateItem("facturaOpProveedor", facOp, this.facContraParte.idFacturaOp, "INTERNA", "", this.facContraParte.id);
          }          
          break;
        };
        case "choferes":{
          let{id, ...facOp} = this.facContraParte;
          this.storageService.updateItem("facturaOpCliente", facOp, this.facContraParte.idFacturaOp, "INTERNA", "", this.facContraParte.id);
          break;
        }
        case "proveedores":{
          let{id, ...facOp} = this.facContraParte;
          this.storageService.updateItem("facturaOpCliente", facOp, this.facContraParte.idFacturaOp, "INTERNA", "", this.facContraParte.id);
          break;
        }
        default:{
          console.log("error en fromParent.origen")
          break
        }
      } 

     }

     buscarContraParte(){     

      switch(this.fromParent.origen){
        case "clientes":{
            if(this.operacion.chofer.idProveedor === 0){
              this.dbFirebase
                  .obtenerTarifaIdTarifa("facturaOpChofer",this.facDetallada.contraParteId, "idFacturaOp")
                  .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
                  .subscribe(data => {      
                      this.facContraParte = data || {};
                      console.log("factura contraparte: ", this.facContraParte);
                      if(this.facContraParte !== undefined){
                        this.facContraParte.contraParteMonto = this.facDetallada.valores.total;
                        this.updateItem()
                      }
                  });
            } else {
              this.dbFirebase
                  .obtenerTarifaIdTarifa("facturaOpProveedor",this.facDetallada.contraParteId, "idFacturaOp")
                  .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
                  .subscribe(data => {      
                      this.facContraParte = data || {};
                      console.log("factura contraparte: ", this.facContraParte);
                      if(this.facContraParte !== undefined){
                        this.facContraParte.contraParteMonto = this.facDetallada.valores.total;
                        this.updateItem()
                      }
                  });
            }

            break;
        };
        case "choferes":{
          this.dbFirebase
                  .obtenerTarifaIdTarifa("facturaOpCliente",this.facDetallada.contraParteId, "idFacturaOp")  
                  .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
                  .subscribe(data => {      
                      this.facContraParte = data || {};
                      console.log("factura contraparte: ", this.facContraParte);
                      if(this.facContraParte !== undefined){
                        this.facContraParte.contraParteMonto = this.facDetallada.valores.total;
                        this.updateItem()
                      }
                  });
           
          break;
        }
        case "proveedores":{
          this.dbFirebase
                  .obtenerTarifaIdTarifa("facturaOpCliente",this.facDetallada.contraParteId, "idFacturaOp")  
                  .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
                  .subscribe(data => {      
                      this.facContraParte = data || {};
                      console.log("factura contraparte: ", this.facContraParte);
                      if(this.facContraParte !== undefined){
                        this.facContraParte.contraParteMonto = this.facDetallada.valores.total;
                        this.updateItem()
                      }
                  });
            
          break;
        }
        default:{
          console.log("error en fromParent.origen")
          break
        }
      }
     }
  
    cerrarEdicion(){
      this.edicion = false;
    } 

    getClienteId(idCliente:number){
      let clientes: Cliente [] = this.$clientes.filter((c:Cliente) => {return c.idCliente === idCliente});
      return clientes[0].razonSocial;
    }

    getChoferId(idChofer:number){
      let choferes: Chofer [] = this.$choferes.filter((c:Chofer) => { return c.idChofer === idChofer});
      return choferes[0].apellido + " " + choferes[0].nombre;
    }

    getProveedorId(idProveedor:number){
      let prov: Proveedor [] = this.$proveedores.filter((p:Proveedor) => {return p.idProveedor === idProveedor});
      return prov[0].razonSocial;
    }

}
