import { Component, Input, OnInit, TemplateRef } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, take, takeUntil } from 'rxjs';
import { EditarTarifaOpComponent } from 'src/app/raiz/liquidacion/modales/editar-tarifa-op/editar-tarifa-op.component';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { Descuento, InformeLiq, Valores } from 'src/app/interfaces/informe-liq';

import { InformeOp } from 'src/app/interfaces/informe-op';

import { Operacion } from 'src/app/interfaces/operacion';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { EditarInfOpComponent } from '../editar-inf-op/editar-inf-op.component';
import { DescuentosComponent } from '../descuentos/descuentos.component';
import Swal from 'sweetalert2';


@Component({
    selector: 'app-modal-factura',
    templateUrl: './informe-liq-detalle.component.html',
    styleUrls: ['./informe-liq-detalle.component.scss'],
    standalone: false
})
export class InformeLiqDetalleComponent implements OnInit {
  
  @Input() fromParent : any;
  titulo:string = "" ;
  informesOp!: InformeOp[];
  $choferes!: Chofer[];
  $clientes!: Cliente[];
  $proveedores!: Proveedor[];
  informeLiq!: ConIdType<InformeLiq>;
  searchText: string = "";
  private destroy$ = new Subject<void>(); // Subject para manejar la destrucción
  tarifaGral!: ConIdType<TarifaGralCliente> | undefined;
  tarifaEsp!: ConIdType<TarifaGralCliente> | undefined;
  tarifaPers!: ConIdType<TarifaPersonalizadaCliente> | undefined;
  tarifaAplicada!: any;
  operacion!: Operacion;
  descuentosEditar!: Descuento[];
  obsInterna: string = "";

  constructor(public activeModal: NgbActiveModal, private storageService: StorageService, private dbFirebase: DbFirestoreService, private modalService: NgbModal){}
  
  ngOnInit(): void {
    this.storageService.choferes$
      .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
      .subscribe(data => {
        this.$choferes = data;
        this.$choferes = this.$choferes.sort((a, b) => a.apellido.localeCompare(b.apellido)); // Ordena por el nombre del chofer
      });
    this.storageService.clientes$
      .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
      .subscribe(data => {
        this.$clientes = data;
        this.$clientes = this.$clientes.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
    }); 
      this.storageService.proveedores$
      .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
      .subscribe(data => {
        this.$proveedores = data;
        this.$proveedores = this.$proveedores.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
    });  


    console.log("fromParent", this.fromParent);
    this.informesOp = this.fromParent.facOp;
    this.informeLiq = this.fromParent.item;
    this.titulo = this.fromParent.item.entidad.razonSocial;
    
  }

  getChofer(idChofer: number){
    let chofer: Chofer []
    chofer = this.$choferes.filter((chofer:Chofer)=>{
      return chofer.idChofer === idChofer
    })
    if(chofer[0]){
      return chofer[0].apellido + " " + chofer[0].nombre; 
    } else {
      return `Chofer dado de baja. idChofer ${idChofer}`;
    }
  
  }

  getCliente(idCliente: number){
    let cliente: Cliente []
    cliente = this.$clientes.filter((cliente:Cliente)=>{
      return cliente.idCliente === idCliente
    })
    if(cliente[0]){
      return cliente[0].razonSocial;
    } else {
      return `Cliente dado de baja. idChofer ${idCliente}`;
    }

  } 

  editarFacOp(facOp:ConIdType<InformeOp>){
    //////console.log("facOp: ", facOp);
    this.buscarTarifa(facOp)
  }

  editarDesc(){
    //////console.log("facOp: ", facOp);
    this.descuentosEditar = this.informeLiq.descuentos;
    this.openModalDescuentos()
    
  }

  buscarTarifa(facturaOp:ConIdType<InformeOp> ) {
    ////console.log("0)",facturaOp);
    let coleccionHistorialTarfGral: string = this.fromParent.tipo === 'cliente' ? 'historialTarifasGralCliente' : this.fromParent.tipo === 'chofer' ? 'historialTarifasGralChofer' : 'historialTarifasGralProveedor'
    let coleccionHistorialTarfEsp: string = this.fromParent.tipo === 'cliente' ? 'historialTarifasEspCliente' : this.fromParent.tipo === 'chofer' ? 'historialTarifasEspChofer' : 'historialTarifasEspProveedor'

    if(facturaOp.tarifaTipo.general){
      this.tarifaGral = this.getTarifaGral(facturaOp.idTarifa);
      ////console.log("1)this.tarifaGral", this.tarifaGral);      
      if(this.tarifaGral === undefined){
        this.dbFirebase
        .obtenerTarifaIdTarifa(coleccionHistorialTarfGral,facturaOp.idTarifa, "idTarifa")
        .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
        .subscribe(data => {      
            this.tarifaAplicada = data;
           ////console.log("1.5) TARIFA APLICADA: ", this.tarifaAplicada);           
        });
      } else {
        this.tarifaAplicada = this.tarifaGral;        
      }
      this.buscarOperacion(facturaOp);     
      
    }
    if(facturaOp.tarifaTipo.especial){
      this.tarifaEsp = this.getTarifaEsp(facturaOp.idTarifa);
      ////console.log("1)this.tarifaEsp", this.tarifaEsp);      
      if(this.tarifaEsp === undefined){
        this.dbFirebase
        .obtenerTarifaIdTarifa(coleccionHistorialTarfEsp,facturaOp.idTarifa, "idTarifa")
        .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
        .subscribe(data => {      
            this.tarifaAplicada = data;
          ////console.log("1.5) TARIFA APLICADA: ", this.tarifaAplicada);           
        });
      } else {
        this.tarifaAplicada = this.tarifaEsp;        
      }
      this.buscarOperacion(facturaOp);
    
    }
    if(facturaOp.tarifaTipo.eventual){
      this.tarifaAplicada = {};
      ////console.log("1)TARIFA APLICADA: ", this.tarifaAplicada);
      this.buscarOperacion(facturaOp);
      
    }
    if(facturaOp.tarifaTipo.personalizada){
      this.tarifaPers = this.getTarifaPers(facturaOp.idTarifa);
      ////console.log("1)this.tarifaPers", this.tarifaPers);
      if(this.tarifaPers === undefined){
        this.dbFirebase
        .obtenerTarifaIdTarifa('tarifasPersCliente',facturaOp.idTarifa, "idTarifa")
        .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
        .subscribe(data => {      
            this.tarifaAplicada = data;
           ////console.log("1.5) TARIFA APLICADA: ", this.tarifaAplicada);           
        });
      } else {
        this.tarifaAplicada = this.tarifaPers;        
      }
      this.buscarOperacion(facturaOp);   
      
    }        
    
  }
  
  async openModalEditarInfOp(informeOp: ConIdType<InformeOp>) {   
    ////console.log("2)this.tarifaAplicada", this.tarifaAplicada);
    ////console.log("3)this.operacion", this.operacion);
    {
      const modalRef = this.modalService.open(EditarInfOpComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'lg', 
        //backdrop:"static" 
      });
      
    let origen = this.fromParent.tipo;

      let info = {
        infOp: informeOp,
        tarifaAplicada: this.tarifaAplicada,   
        op: this.operacion,     
        origen: origen,
        componente:this.fromParent.modo,
      }; 
      ////////console.log(info); 
      
      modalRef.componentInstance.fromParent = info;
      const respuesta = await modalRef.result
      if(respuesta){
        //console.log("result:", result);
          informeOp = respuesta.infOp;
          //console.log("informeOp:", informeOp);
          this.recalcularFactura(informeOp);
          
          
/*             if(result){
            if(this.fromParent.modo === 'proforma'){
              
              facturaOp = result.factura;
              //console.log("result:", facturaOp);
              this.recalcularFactura(facturaOp);
            }
            if(this.fromParent.modo === 'facturacion'){
              
              facturaOp = result.factura;
              //console.log("result:", facturaOp);
              this.recalcularFactura(facturaOp);
            }
            
          } */
      }
/*       modalRef.result.then(
        (result) => {
          //console.log("result:", result);
          informeOp = result.infOp;
          //console.log("informeOp:", informeOp);
          this.recalcularFactura(informeOp);
          
          
            if(result){
            if(this.fromParent.modo === 'proforma'){
              
              facturaOp = result.factura;
              //console.log("result:", facturaOp);
              this.recalcularFactura(facturaOp);
            }
            if(this.fromParent.modo === 'facturacion'){
              
              facturaOp = result.factura;
              //console.log("result:", facturaOp);
              this.recalcularFactura(facturaOp);
            }
            
          }
          
          
        },
        (reason) => {}
      ); */
    }
  }

  async openModalDescuentos(){
    {
      const modalRef = this.modalService.open(DescuentosComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'md', 
        //backdrop:"static" 
      });
      

      let info = {      
        descuentos : this.descuentosEditar,
      }; 
      
      
      modalRef.componentInstance.fromParent = info;
      const respuesta = await modalRef.result;
      console.log("respuesta modal: ", respuesta);
      if (respuesta && respuesta.cambios){
        console.log("total descuentos: ", respuesta.total);
        this.informeLiq.valores.descuentoTotal = respuesta.total;
        this.informeLiq.descuentos = respuesta.descuentos;
        this.actualizarInformeLiq()
      }
      
/*       modalRef.result.then(
        (result) => {
          //console.log("descuentos: ", result);
          if(result.total > 0){            
           this.descuentosAplicados = result.descuentos;
            this.tieneDescuentos = true;
            this.totalDescuento = result.total;            
          }

        },
        (reason) => {}
      ); */
    }

  }

  abrirModalObs(modalRef: TemplateRef<any>) {
    let obs:string = this.informeLiq.observaciones || "";
    this.obsInterna = structuredClone(obs)
    let componente: string = this.fromParent.modo === "proforma" ? "proforma" : "resumenLiq"
    const modal = this.modalService.open(modalRef, { centered: true });


    // Limpiar referencias al cerrar o cancelar el modal
    modal.result.finally(() => {
      this.storageService.updateItem(componente, this.informeLiq, this.informeLiq.idInfLiq, "EDICION", `Observaciones del informe ${this.informeLiq.idInfLiq}, editada`, this.informeLiq.id );
    });
  }

  async guardarCambiosObs(modal: any) {    
    const respuesta = await Swal.fire({
        title: "¿Desea guardar los cambios?",
        //text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Guardar",
        cancelButtonText: "Cancelar"
      })

    if (respuesta.isConfirmed) {
      this.informeLiq.observaciones = this.obsInterna;
      modal.close(); // El finally del modal se encarga de limpiar
    } else if (respuesta.dismiss === Swal.DismissReason.cancel) {        
    }
    
  }

    getTarifaGral(idTarifa: number):ConIdType<TarifaGralCliente> | undefined{
      let tarifasGral: ConIdType<TarifaGralCliente>[];
      let tarifa: ConIdType<TarifaGralCliente> | undefined;
      let coleccion: string = this.fromParent.tipo === 'cliente' ? 'tarifasGralCliente' : this.fromParent.tipo === 'chofer' ? 'tarifasGralChofer' : 'tarifasGralProveedor'
      
      tarifasGral = this.storageService.loadInfo(coleccion);
      tarifa = tarifasGral.find((tarf:ConIdType<TarifaGralCliente>)=> {return tarf.idTarifa === idTarifa});
      return tarifa;      
    }

    getTarifaEsp(idTarifa: number):ConIdType<TarifaGralCliente> | undefined{
      let tarifasGral: ConIdType<TarifaGralCliente>[];
      let tarifa: ConIdType<TarifaGralCliente> | undefined;
      let coleccion: string = this.fromParent.tipo === 'cliente' ? 'tarifasEspCliente' : this.fromParent.tipo === 'chofer' ? 'tarifasEspChofer' : 'tarifasEspProveedor'

      tarifasGral = this.storageService.loadInfo(coleccion);
      tarifa = tarifasGral.find((tarf:ConIdType<TarifaGralCliente>)=> {return tarf.idTarifa === idTarifa});
      return tarifa;                
    }

    getTarifaPers(idTarifa: number):ConIdType<TarifaPersonalizadaCliente> | undefined{
      let tarifasPersonalizada: ConIdType<TarifaPersonalizadaCliente>[];
      let tarifa: ConIdType<TarifaPersonalizadaCliente> | undefined;
      

      tarifasPersonalizada = this.storageService.loadInfo('tarifasPersCliente');
      tarifa = tarifasPersonalizada.find((tarf:ConIdType<TarifaPersonalizadaCliente>)=> {return tarf.idTarifa === idTarifa});
      return tarifa;                
    }

    buscarOperacion(facturaOp: ConIdType<InformeOp>){
      this.dbFirebase
      .obtenerTarifaIdTarifa("operaciones",facturaOp.idOperacion, "idOperacion")
      .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
      .subscribe(data => {      
          this.operacion = data;
          //////////console.log("OPERACION: ", this.operacion);
          this.openModalEditarInfOp(facturaOp)
      });    
    }

    recalcularFactura(infOp: ConIdType<InformeOp>){
      this.informesOp /// estas son las facturaOp de la factura
      this.informeLiq // esta es la proforma
      infOp // esta es la factura editada
      //console.log("0)this.informesOp: ", this.informesOp);
      this.informesOp = this.informesOp.filter(factura=>factura.idInfOp !== infOp.idInfOp);
      //console.log("1)this.informesOp con elemnto eliminado: ", this.informesOp);
      this.informesOp.push(infOp);
      //console.log("2)this.informesOp con elemento agregado: ", this.informesOp);
      this.actualizarInformeLiq()

    
      
    }

    actualizarInformeLiq(){
      //console.log("3)factura antes: ",this.informeLiq );
      
      let valores: Valores = {totalTarifaBase:0, totalAcompaniante:0, totalkmMonto:0, total:0, descuentoTotal: this.informeLiq.valores.descuentoTotal, totalContraParte:this.informeLiq.valores.totalContraParte};
      this.informesOp.forEach((f:InformeOp)=>{
        valores.totalTarifaBase += f.valores.tarifaBase;
        valores.totalAcompaniante += f.valores.acompaniante;
        valores.totalkmMonto += f.valores.kmMonto;          
        valores.total += f.valores.total;          
      });
      
      valores.total -= valores.descuentoTotal;
      this.informeLiq.valores = valores;
      console.log("total de la liquidacion: ", this.informeLiq.valores.total);
      
      //console.log("4)factura desp: ",this.informeLiq );
      /* let idFactura: number; 
      switch(this.fromParent.tipo){
        case 'cliente':
          idFactura = this.informeLiq.idFacturaCliente;
          break;
        case 'chofer':
          idFactura = this.informeLiq.idFacturaChofer;
          break;
        case 'proveedor':
          idFactura = this.informeLiq.idFacturaProveedor;
          break;
        default:
          idFactura = 0;
          break;
      }
      //console.log("5)idFactura", idFactura); */
      
      ///esto lo hace en el servicio
      //let msj: string = this.fromParent.tipo === 'cliente' ? `Edición de proforma de Cliente ${this.informeLiq.entidad.razonSocial}` : this.fromParent.tipo === 'chofer' ? `Edición de proforma del Chofer ${this.informeLiq.entidad.razonSocial} ` : this.fromParent.tipo === 'proveedor' ? `Edición de proforma del Proveedor ${this.informeLiq.entidad.razonSocial}` : '';
      //let{id,type, ...proforma} = this.informeLiq;

      //this.storageService.updateItem("proforma", proforma, proforma.idInfLiq, "EDICION", msj, this.informeLiq.id );
      
    }





}
