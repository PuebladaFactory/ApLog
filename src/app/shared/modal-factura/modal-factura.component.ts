import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, take, takeUntil } from 'rxjs';
import { EditarTarifaOpComponent } from 'src/app/admin/liquidacion/modales/editar-tarifa-op/editar-tarifa-op.component';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConIdType } from 'src/app/interfaces/conId';
import { Valores } from 'src/app/interfaces/factura-cliente';
import { FacturaOp } from 'src/app/interfaces/factura-op';
import { Operacion } from 'src/app/interfaces/operacion';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';


@Component({
    selector: 'app-modal-factura',
    templateUrl: './modal-factura.component.html',
    styleUrls: ['./modal-factura.component.scss'],
    standalone: false
})
export class ModalFacturaComponent implements OnInit {
  
  @Input() fromParent : any;
  titulo:string = "" ;
  facOp!: FacturaOp[];
  $choferes!: Chofer[];
  $clientes!: Cliente[];
  $proveedores!: Proveedor[];
  factura: any;
  searchText: string = "";
  private destroy$ = new Subject<void>(); // Subject para manejar la destrucción
  tarifaGral!: ConIdType<TarifaGralCliente> | undefined;
  tarifaEsp!: ConIdType<TarifaGralCliente> | undefined;
  tarifaPers!: ConIdType<TarifaPersonalizadaCliente> | undefined;
  tarifaAplicada!: any;
  operacion!: Operacion;

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


    //console.log("fromParent", this.fromParent);
    this.facOp = this.fromParent.facOp
    this.factura = this.fromParent.item;
    switch(this.fromParent.tipo){
      case "clientes":
        this.titulo = this.fromParent.item.razonSocial
        break;
      case "choferes":
        this.titulo = this.fromParent.item.apellido + " " + this.fromParent.item.nombre
        break;
      case "proveedores":
        this.titulo = this.fromParent.item.razonSocial
        break;
      default:
        break;
    }
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

  editarFacOp(facOp:ConIdType<FacturaOp>){
    ////console.log("facOp: ", facOp);
    this.buscarTarifa(facOp)
  }

  buscarTarifa(facturaOp:ConIdType<FacturaOp> ) {
    //console.log("0)",facturaOp);
    let coleccionHistorialTarfGral: string = this.fromParent.tipo === 'clientes' ? 'historialTarifasGralCliente' : this.fromParent.tipo === 'choferes' ? 'historialTarifasGralChofer' : 'historialTarifasGralProveedor'
    let coleccionHistorialTarfEsp: string = this.fromParent.tipo === 'clientes' ? 'historialTarifasEspCliente' : this.fromParent.tipo === 'choferes' ? 'historialTarifasEspChofer' : 'historialTarifasEspProveedor'

    if(facturaOp.tarifaTipo.general){
      this.tarifaGral = this.getTarifaGral(facturaOp.idTarifa);
      //console.log("1)this.tarifaGral", this.tarifaGral);      
      if(this.tarifaGral === undefined){
        this.dbFirebase
        .obtenerTarifaIdTarifa(coleccionHistorialTarfGral,facturaOp.idTarifa, "idTarifa")
        .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
        .subscribe(data => {      
            this.tarifaAplicada = data;
           //console.log("1.5) TARIFA APLICADA: ", this.tarifaAplicada);           
        });
      } else {
        this.tarifaAplicada = this.tarifaGral;        
      }
      this.buscarOperacion(facturaOp);     
      
    }
  if(facturaOp.tarifaTipo.especial){
    this.tarifaEsp = this.getTarifaEsp(facturaOp.idTarifa);
    //console.log("1)this.tarifaEsp", this.tarifaEsp);      
    if(this.tarifaEsp === undefined){
      this.dbFirebase
      .obtenerTarifaIdTarifa(coleccionHistorialTarfEsp,facturaOp.idTarifa, "idTarifa")
      .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
      .subscribe(data => {      
          this.tarifaAplicada = data;
         //console.log("1.5) TARIFA APLICADA: ", this.tarifaAplicada);           
      });
    } else {
      this.tarifaAplicada = this.tarifaEsp;        
    }
    this.buscarOperacion(facturaOp);
    
    }
    if(facturaOp.tarifaTipo.eventual){
      this.tarifaAplicada = {};
      //console.log("1)TARIFA APLICADA: ", this.tarifaAplicada);
      this.buscarOperacion(facturaOp);
      
    }
    if(facturaOp.tarifaTipo.personalizada){
      this.tarifaPers = this.getTarifaPers(facturaOp.idTarifa);
      //console.log("1)this.tarifaPers", this.tarifaPers);
      if(this.tarifaPers === undefined){
        this.dbFirebase
        .obtenerTarifaIdTarifa('tarifasPersCliente',facturaOp.idTarifa, "idTarifa")
        .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
        .subscribe(data => {      
            this.tarifaAplicada = data;
           //console.log("1.5) TARIFA APLICADA: ", this.tarifaAplicada);           
        });
      } else {
        this.tarifaAplicada = this.tarifaPers;        
      }
      this.buscarOperacion(facturaOp);   
      
    }        
    
    }
  
    openModalTarifa(facturaOp: ConIdType<FacturaOp>): void {   
     //console.log("2)this.tarifaAplicada", this.tarifaAplicada);
     //console.log("3)this.operacion", this.operacion);
     
      
      {
        const modalRef = this.modalService.open(EditarTarifaOpComponent, {
          windowClass: 'myCustomModalClass',
          centered: true,
          size: 'lg', 
          //backdrop:"static" 
        });
        
      let origen = "clientes";
  
       let info = {
          factura: facturaOp,
          tarifaAplicada: this.tarifaAplicada,   
          op: this.operacion,     
          origen: this.fromParent.tipo,
          componente:'proforma',
        }; 
        //////console.log(info); 
        
        modalRef.componentInstance.fromParent = info;
        modalRef.result.then(
          (result) => {
            //console.log("result:", result);
            if(result.resultado && this.fromParent.modo === 'proforma'){
              
              facturaOp = result.factura;
              console.log("result:", facturaOp);
              this.recalcularFactura(facturaOp);
            }
            /* this.procesarDatosParaTabla();
            this.cerrarTabla(i) */
            
          },
          (reason) => {}
        );
      }
    }

    getTarifaGral(idTarifa: number):ConIdType<TarifaGralCliente> | undefined{
      let tarifasGral: ConIdType<TarifaGralCliente>[];
      let tarifa: ConIdType<TarifaGralCliente> | undefined;
      let coleccion: string = this.fromParent.tipo === 'clientes' ? 'tarifasGralCliente' : this.fromParent.tipo === 'choferes' ? 'tarifasGralChofer' : 'tarifasGralProveedor'
      
      tarifasGral = this.storageService.loadInfo(coleccion);
      tarifa = tarifasGral.find((tarf:ConIdType<TarifaGralCliente>)=> {return tarf.idTarifa === idTarifa});
      return tarifa;      
    }

    getTarifaEsp(idTarifa: number):ConIdType<TarifaGralCliente> | undefined{
      let tarifasGral: ConIdType<TarifaGralCliente>[];
      let tarifa: ConIdType<TarifaGralCliente> | undefined;
      let coleccion: string = this.fromParent.tipo === 'clientes' ? 'tarifasEspCliente' : this.fromParent.tipo === 'choferes' ? 'tarifasEspChofer' : 'tarifasEspProveedor'

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

    buscarOperacion(facturaOp: ConIdType<FacturaOp>){
      this.dbFirebase
      .obtenerTarifaIdTarifa("operaciones",facturaOp.idOperacion, "idOperacion")
      .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
      .subscribe(data => {      
          this.operacion = data;
          ////////console.log("OPERACION: ", this.operacion);
          this.openModalTarifa(facturaOp)
      });    
    }

    recalcularFactura(facturaOp: ConIdType<FacturaOp>){
      this.facOp /// estas son las facturaOp de la factura
      this.factura // esta es la proforma
      facturaOp // esta es la factura editada
      console.log("0)this.facOp: ", this.facOp);
      this.facOp = this.facOp.filter(factura=>factura.idFacturaOp !== facturaOp.idFacturaOp);
      console.log("1)this.facOp con elemnto eliminado: ", this.facOp);
      this.facOp.push(facturaOp);
      console.log("2)this.facOp con elemento agregado: ", this.facOp);
      this.actualizarProforma()
     /*  let nuevaFacOp!: ConIdType<FacturaOp>
      let coleccion: string = this.fromParent.tipo === 'clientes' ? 'facturaOpCliente' : this.fromParent.tipo === 'choferes' ? 'facturaOpChofer' : 'facturaOpProveedor'
      this.dbFirebase
      .obtenerTarifaIdTarifa(coleccion,facturaOp.idFacturaOp, "idFacturaOp")
      .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
      .subscribe(data => {      
          nuevaFacOp = data;
          console.log("1)nuevaFacOp: ", nuevaFacOp);
          this.facOp = this.facOp.filter(factura=>factura.idFacturaOp !== facturaOp.idFacturaOp);
          console.log("2)this.facOp con elemnto eliminado: ", this.facOp);
          this.facOp.push(nuevaFacOp);
          console.log("2)this.facOp con elemento agregado: ", this.facOp);
          this.actualizarProforma();
      });   */
    
      
    }

    actualizarProforma(){
      console.log("3)factura antes: ",this.factura );
      
      let valores: Valores = {totalTarifaBase:0, totalAcompaniante:0, totalkmMonto:0, total:0, descuentoTotal: this.factura.valores.descuentoTotal};
      this.facOp.forEach((f:FacturaOp)=>{
        valores.totalTarifaBase += f.valores.tarifaBase;
        valores.totalAcompaniante += f.valores.acompaniante;
        valores.totalkmMonto += f.valores.kmMonto;          
        valores.total += f.valores.total;          
      });
      
      valores.total -= valores.descuentoTotal;
      this.factura.valores = valores;
      console.log("4)factura desp: ",this.factura );
      let idFactura: number; 
      switch(this.fromParent.tipo){
        case 'clientes':
          idFactura = this.factura.idFacturaCliente;
          break;
        case 'choferes':
          idFactura = this.factura.idFacturaChofer;
          break;
        case 'proveedores':
          idFactura = this.factura.idFacturaProveedor;
          break;
        default:
          idFactura = 0;
          break;
      }
      console.log("5)idFactura", idFactura);
      
      let msj: string = this.fromParent.tipo === 'clientes' ? `Alta de Factura de Cliente ${this.factura.razonSocial}` : this.fromParent.tipo === 'choferes' ? `Alta de Factura de Chofer ${this.factura.apellido} ${this.factura.nombre}` : this.fromParent.tipo === 'proveedores' ? `Alta de Factura de Proveedor ${this.factura.razonSocial}` : '';
      let{id,type, ...proforma} = this.factura;

      this.storageService.updateItem("proforma", proforma, idFactura, "EDICION", msj, this.factura.id );
      
    }





}
