import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject } from 'rxjs';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { InformeOp } from 'src/app/interfaces/informe-op';
import { Operacion } from 'src/app/interfaces/operacion';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { CategoriaTarifa, TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { FormatoNumericoService } from 'src/app/servicios/formato-numerico/formato-numerico.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-editar-inf-op',
  standalone: false,
  templateUrl: './editar-inf-op.component.html',
  styleUrl: './editar-inf-op.component.scss'
})
export class EditarInfOpComponent implements OnInit {
  
  @Input() fromParent: any;
  infOpDetallada!: ConId<InformeOp>;
  ultimaTarifa!: ConIdType<TarifaGralCliente>;
  edicion:boolean = false;
  tarifaEditForm: any;
  swichForm:any;    
  facturaEditada!: ConId<InformeOp>;
  swich!: boolean;
  choferes!: ConIdType<Chofer>[];
  clientes!: ConIdType<Cliente>[];
  proveedores!: ConIdType<Proveedor>[];
  choferOp!: ConIdType<Chofer>[];
  vehiculoOp!: Vehiculo[];
  operacion!: ConId<Operacion>;
  tarifaPersonalizada!: ConIdType<TarifaPersonalizadaCliente>;
  componente: string = "";
  infOpOriginal!: ConId<InformeOp>;
  opOriginal!: ConId<Operacion>;
  facContraParte!: ConId<InformeOp>;
    private destroy$ = new Subject<void>();

  constructor(
    private storageService: StorageService, 
    private modalService: NgbModal, 
    public activeModal: NgbActiveModal, 
    private formNumServ: FormatoNumericoService, 
    private dbFirebase: DbFirestoreService
  ){    
  }
  
  ngOnInit(): void {
    console.log("0) fromParent: ",this.fromParent);    
    this.infOpOriginal = this.fromParent.infOp;
    this.infOpDetallada = structuredClone(this.infOpOriginal);
    this.opOriginal = this.fromParent.op;
    this.operacion = structuredClone(this.opOriginal);
    this.choferes = this.storageService.loadInfo('choferes');
    this.clientes = this.storageService.loadInfo('choferes');
    this.proveedores = this.storageService.loadInfo('choferes');


    this.getChofer(); 
    ///remplazado un método general que haga todo en el servicio
    /* switch(this.fromParent.origen){
      case "cliente":{
          this.componente = "informesOpClientes";
          break;
      };
      case "chofer":{
        this.componente = "informesOpChoferes";
        break;
      }
      case "proveedor":{
        this.componente = "informesOpProveedores";
        break;
      }
      default:{
        //////console.log("error en fromParent.origen")
        break
      }
    }  */
    if(!this.infOpDetallada.tarifaTipo.personalizada){
      this.ultimaTarifa = this.fromParent.tarifaAplicada;
      ////console.log("5) ultimaTarifa: ",this.ultimaTarifa);    
    } else {
      this.tarifaPersonalizada = this.fromParent.tarifaAplicada;
    }
    
  }

  getChofer(){
    this.choferOp = this.choferes.filter((chofer:Chofer)=>{
      return chofer.idChofer === this.infOpDetallada.idChofer;
    })
    ////console.log("4.25)this.choferOp: ", this.choferOp);
    
    this.vehiculoOp = this.choferOp[0].vehiculo.filter((vehiculo:Vehiculo)=>{
      return vehiculo.dominio === this.operacion.patenteChofer.toUpperCase()
    })
    ////console.log("4.5)vehiculoOp: ", this.vehiculoOp);    

  }

  getCategoriaNombre():string{
    let catCg = this.ultimaTarifa.cargasGenerales.filter((cat:CategoriaTarifa) =>{
      return cat.orden === this.vehiculoOp[0].categoria.catOrden;
    });
    ////console.log("getCategoriaValor: catCg: ", catCg);
    return catCg[0].nombre;            
  }
  
  getCategoriaValor():number{      
    let catCg = this.ultimaTarifa.cargasGenerales.filter((cat:CategoriaTarifa) =>{
      return cat.orden === this.vehiculoOp[0].categoria.catOrden;
    });
    ////console.log("getCategoriaValor: catCg: ", catCg);
    return catCg[0].valor;      
  }
  
  getKmPrimerSectorValor():number{
    let catCg = this.ultimaTarifa.cargasGenerales.filter((cat:CategoriaTarifa) =>{
      return cat.orden === this.vehiculoOp[0].categoria.catOrden;
    });
    ////console.log("getCategoriaValor: catCg: ", catCg);
    return catCg[0].adicionalKm.primerSector;        
  }
  
  getKmIntervalosSectorValor():number{
    let catCg = this.ultimaTarifa.cargasGenerales.filter((cat:CategoriaTarifa) =>{
      return cat.orden === this.vehiculoOp[0].categoria.catOrden;
    });
    ////console.log("getCategoriaValor: catCg: ", catCg);
    return catCg[0].adicionalKm.sectoresSiguientes;        
  }
  
/*   limpiarValorFormateado(valorFormateado: string): number {
  // Elimina el punto de miles y reemplaza la coma por punto para que sea un valor numérico válido
    return parseFloat(valorFormateado.replace(/\./g, '').replace(',', '.'));
  } */

  onSubmit(){  
  //console.log("onSubmit");    
    let cambios:boolean = false;
    Swal.fire({
      title: "¿Desea guardar los cambios?",
      //text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        //////////////console.log("op: ", this.op);
        this.formatearDatos();
        cambios = true;
        this.infOpOriginal = this.infOpDetallada;
        this.opOriginal = this.operacion;
        let respuesta={
          infOp: this.infOpOriginal,
          op: this.opOriginal,
          resultado: cambios,
        }
        this.activeModal.close(respuesta);        
      } else {
        this.activeModal.close();
      }
    });   
    //////console.log("factura EDITADA: ", this.infOpDetallada);      
      
  }
    
  formatearDatos(){
    //console.log("formatearDatos");
    
    this.infOpDetallada.km = this.formNumServ.convertirAValorNumerico(this.infOpDetallada.km);
    
    this.infOpDetallada.valores.acompaniante =this.formNumServ.convertirAValorNumerico(this.infOpDetallada.valores.acompaniante);
    this.infOpDetallada.valores.kmMonto =this.formNumServ.convertirAValorNumerico(this.infOpDetallada.valores.kmMonto);
    this.infOpDetallada.valores.tarifaBase =this.formNumServ.convertirAValorNumerico(this.infOpDetallada.valores.tarifaBase);
    this.infOpDetallada.valores.total =this.formNumServ.convertirAValorNumerico(this.infOpDetallada.valores.total);
    
  /*       if(this.infOpDetallada.tarifaTipo.eventual || this.infOpDetallada.tarifaTipo.personalizada){
      this.infOpDetallada.valores.tarifaBase = this.infOpDetallada.valores.total;
    } */

    this.operacion.km = this.infOpDetallada.km;
    this.operacion.observaciones = this.infOpDetallada.observaciones;
    switch(this.fromParent.origen){
      case "cliente":{
        this.operacion.valores.cliente.aCobrar = this.infOpDetallada.valores.total;
        this.operacion.valores.cliente.acompValor = this.infOpDetallada.valores.acompaniante;
        this.operacion.valores.cliente.kmAdicional = this.infOpDetallada.valores.kmMonto;
        this.operacion.valores.cliente.tarifaBase = this.infOpDetallada.valores.tarifaBase;            
        //this.buscarContraParte();
        //this.updateItem();
        break;
      };
      case "chofer":{
        this.operacion.valores.chofer.aPagar = this.infOpDetallada.valores.total;
        this.operacion.valores.chofer.acompValor = this.infOpDetallada.valores.acompaniante;
        this.operacion.valores.chofer.kmAdicional = this.infOpDetallada.valores.kmMonto;
        this.operacion.valores.chofer.tarifaBase = this.infOpDetallada.valores.tarifaBase;
        //this.buscarContraParte();
        break;
      }
      case "proveedor":{
        this.operacion.valores.chofer.aPagar = this.infOpDetallada.valores.total;
        this.operacion.valores.chofer.acompValor = this.infOpDetallada.valores.acompaniante;
        this.operacion.valores.chofer.kmAdicional = this.infOpDetallada.valores.kmMonto;
        this.operacion.valores.chofer.tarifaBase = this.infOpDetallada.valores.tarifaBase;
        //this.buscarContraParte();
        break;
      }
      default:{
        //////console.log("error en fromParent.origen")
        break
      }
    }
  }

  actualizarTotal(){
    this.infOpDetallada.valores.total = this.formNumServ.convertirAValorNumerico(this.infOpDetallada.valores.tarifaBase) + this.formNumServ.convertirAValorNumerico(this.infOpDetallada.valores.acompaniante) + this.formNumServ.convertirAValorNumerico(this.infOpDetallada.valores.kmMonto)
    this.infOpDetallada.valores.total = this.formatearValor(this.infOpDetallada.valores.total)
    ////console.log("facDetallada.valores.tarifaBase: ", this.infOpDetallada.valores.total);
  }
    
  formatearValor(valor: number) : any{
    let nuevoValor =  new Intl.NumberFormat('es-ES', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(valor);
    //////////////////////console.log(nuevoValor);    
    return nuevoValor
  }
      

/////// REEMPLAZADO POR UN METODO GENERAL QUE HAGA TODO ////////////////
/*     updateItem(){
    //console.log("updateItem");
    //console.log("this.infOpDetallada: ", this.infOpDetallada);
    //console.log("this.componente: ", this.componente);
    
    //////console.log("this.operacion: ", this.operacion);      
    let {id, ...facDet} = this.infOpDetallada;
    this.storageService.updateItem(
      this.componente, 
      facDet, 
      this.infOpDetallada.idInfOp, 
      "EDITAR", 
      this.componente === "informesOpClientes" ? `Edición de Informe de Operación del Cliente ${this.getClienteId(this.infOpDetallada.idCliente)}` : this.componente === "informesOpChoferes" ? `Edición de Informe de Operación del Chofer ${this.getChoferId(this.infOpDetallada.idChofer)}` : `Edición de Informe de Operación del Proveedor ${this.getProveedorId(this.infOpDetallada.idProveedor)}`,
      this.infOpDetallada.id);
      if(this.operacion){
        let {id, ...op} = this.operacion;
        this.storageService.updateItem("operaciones", op, this.operacion.idOperacion,"EDITAR", "Edición de Operación desde Liquidación", this.operacion.id);
      }
    
    switch(this.fromParent.origen){
      case "cliente":{
        let{id, ...facOp} = this.facContraParte;
        if(this.operacion.chofer.idProveedor === 0){            
          this.storageService.updateItem("informesOpChoferes", facOp, this.facContraParte.idInfOp, "INTERNA", "", this.facContraParte.id);
        } else {
          this.storageService.updateItem("informesOpProveedores", facOp, this.facContraParte.idInfOp, "INTERNA", "", this.facContraParte.id);
        }          
        break;
      };
      case "chofer":{
        let{id, ...facOp} = this.facContraParte;
        this.storageService.updateItem("informesOpClientes", facOp, this.facContraParte.idInfOp, "INTERNA", "", this.facContraParte.id);
        break;
      }
      case "proveedor":{
        let{id, ...facOp} = this.facContraParte;
        this.storageService.updateItem("informesOpClientes", facOp, this.facContraParte.idInfOp, "INTERNA", "", this.facContraParte.id);
        break;
      }
      default:{
        //////console.log("error en fromParent.origen")
        break
      }
    } 

    }
    
    buscarContraParte(){     
    //console.log("buscarContraParte");
    
    switch(this.fromParent.origen){
      case "cliente":{
          if(this.operacion.chofer.idProveedor === 0){
            this.dbFirebase
                .obtenerTarifaIdTarifa("informesOpChoferes",this.infOpDetallada.contraParteId, "idInfOp")
                .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
                .subscribe(data => {      
                    this.facContraParte = data || {};
                    //////console.log("factura contraparte: ", this.facContraParte);
                    if(this.facContraParte !== undefined){
                      this.facContraParte.contraParteMonto = this.infOpDetallada.valores.total;
                      this.updateItem()
                    }
                });
          } else {
            this.dbFirebase
                .obtenerTarifaIdTarifa("informesOpProveedores",this.infOpDetallada.contraParteId, "idInfOp")
                .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
                .subscribe(data => {      
                    this.facContraParte = data || {};
                    //////console.log("factura contraparte: ", this.facContraParte);
                    if(this.facContraParte !== undefined){
                      this.facContraParte.contraParteMonto = this.infOpDetallada.valores.total;
                      this.updateItem()
                    }
                });
          }

          break;
      };
      case "chofer":{
        this.dbFirebase
                .obtenerTarifaIdTarifa("informesOpClientes",this.infOpDetallada.contraParteId, "idInfOp")  
                .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
                .subscribe(data => {      
                    this.facContraParte = data || {};
                    //////console.log("factura contraparte: ", this.facContraParte);
                    if(this.facContraParte !== undefined){
                      this.facContraParte.contraParteMonto = this.infOpDetallada.valores.total;
                      this.updateItem()
                    }
                });
          
        break;
      }
      case "proveedor":{
        this.dbFirebase
                .obtenerTarifaIdTarifa("informesOpClientes",this.infOpDetallada.contraParteId, "idInfOp")  
                .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
                .subscribe(data => {      
                    this.facContraParte = data || {};
                    //////console.log("factura contraparte: ", this.facContraParte);
                    if(this.facContraParte !== undefined){
                      this.facContraParte.contraParteMonto = this.infOpDetallada.valores.total;
                      this.updateItem()
                    }
                });
          
        break;
      }
      default:{
        //////console.log("error en fromParent.origen")
        break
      }
    }
    } */
      
        /* cerrarEdicion(){
          this.edicion = false;
        }  */
    
        /* getClienteId(idCliente:number){
          //console.log("aca si tiene que llegar");   
          let clientes: Cliente [] = this.clientes.filter((c:Cliente) => {return c.idCliente === idCliente});
          return clientes[0].razonSocial;
        } */
    
        /* getChoferId(idChofer:number){
          let choferes: Chofer [] = this.choferes.filter((c:Chofer) => { return c.idChofer === idChofer});
          return choferes[0].apellido + " " + choferes[0].nombre;
        } */
    
        /* getProveedorId(idProveedor:number){
          //console.log("no tiene que llegar aca?");      
          let prov: Proveedor [] = this.proveedores.filter((p:Proveedor) => {return p.idProveedor === idProveedor});
          return prov ? prov[0].razonSocial : "";
        } */

}
