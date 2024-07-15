import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { take } from 'rxjs';
import { FacturaOpChofer } from 'src/app/interfaces/factura-op-chofer';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
import { FacturaOpProveedor } from 'src/app/interfaces/factura-op-proveedor';
import { TarifaChofer } from 'src/app/interfaces/tarifa-chofer';
import { TarifaCliente } from 'src/app/interfaces/tarifa-cliente';
import { TarifaProveedor } from 'src/app/interfaces/tarifa-proveedor';
import { BuscarTarifaService } from 'src/app/servicios/buscarTarifa/buscar-tarifa.service';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-modal-detalle',
  templateUrl: './modal-detalle.component.html',
  styleUrls: ['./modal-detalle.component.scss']
})
export class ModalDetalleComponent implements OnInit {
  @Input() fromParent: any;
  data!:any;
  tarifaClienteAplicada!: TarifaCliente;
  tarifaChoferAplicada!: TarifaChofer;
  tarifaProveedorAplicada!: TarifaProveedor;
  montoCategoriaCliente!: number;
  montoCategoriaProveedor!: number;
  totalFacturaCliente!:number;
  totalFacturaChofer!:number;
  totalFacturaProveedor!:number;
  $tarifasClientes!: TarifaCliente[];
  $tarifasChoferes!: TarifaChofer[];
  $tarifasProveedores!: TarifaProveedor[];

  constructor(public activeModal: NgbActiveModal, private buscarTarifaServ: BuscarTarifaService, private storageService:StorageService, private dbFirebase: DbFirestoreService){}

  ngOnInit(): void {
    this.data = this.fromParent.factura;
    /* console.log(this.data); */
    console.log("0)", this.fromParent);
    //console.log("modo: ", this.fromParent.modo)
    switch(this.fromParent.modo){
      case "clientes":
        this.tarifaClienteAplicada = this.data.tarifaCliente;
        this.tarifaChoferAplicada = this.data.tarifaChofer;
        this.montoCategoriaCliente = this.data.valorJornada;          
        this.totalFacturaCliente = this.data.total;
        this.totalFacturaChofer = this.data.montoFacturaChofer;
        console.log("alcanza?");
        
       /*  this.storageService.getByFieldValue("tarifasCliente","idTarifaCliente",this.data.idTarifa);
        if(this.data.operacion.chofer.proveedor === "monotributista"){
          this.storageService.getByFieldValue("facOpLiqChofer","operacion.idOperacion",this.data.operacion.idOperacion);    
        } else if (this.data.operacion.chofer.proveedor !== "monotributista"){
          this.storageService.getByFieldValue("facOpLiqProveedor","operacion.idOperacion",this.data.operacion.idOperacion);    
        }        
        this.buscarTarifaClienteId();
        this.buscarTarifaChoferOp();  */
     /*    this.dbFirebase
          .obtenerTarifaIdTarifa("tarifasCliente",this.data.idTarifa, "idTarifa")
          .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
          .subscribe(data => {      
              this.tarifaChoferAplicada = data;
              if(this.data.operacion.chofer.proveedor === "monotributista"){
                console.log("1)");
                  
                this.buscarFacturaOpChofer();
              } else if (this.data.operacion.chofer.proveedor !== "monotributista"){
                this.storageService.getByFieldValue("facOpLiqProveedor","operacion.idOperacion",this.data.operacion.idOperacion);    
              }        
          }); */
        break
      case "choferes":
        this.storageService.getByFieldValue("tarifasChofer","idTarifa",this.data.idTarifa);
        this.storageService.getByFieldValue("facOpLiqCliente","operacion.idOperacion",this.data.operacion.idOperacion);    
        this.buscarTarifaChoferId();
        this.buscarTarifaClienteOp(); 
        break
      case "proveedores":
        this.storageService.getByFieldValue("tarifasProveedor","idTarifaProveedor",this.data.idTarifa);
        this.storageService.getByFieldValue("facOpLiqCliente","operacion.idOperacion",this.data.operacion.idOperacion);    
        this.buscarTarifaProveedorId();
        this.buscarTarifaClienteOp();
        /* this.buscarTarifaChoferId()
        this.buscarTarifaClienteOp()  */
        break
      default:
        alert("error")
        break
    }

    this.storageService.historialTarifasClientes$.subscribe(data => {
      this.$tarifasClientes = data;
      ////console.log("modal tarifa: ", this.$tarifasClientes);
      
    })
   /*  if(this.fromParent.modo === "clientes"){
      this.buscarTarifaClienteId()
      this.buscarTarifaChoferOp() 
    }
    if(this.fromParent.modo === "choferes"){
      this.buscarTarifaChoferId()
      this.buscarTarifaClienteOp() 
    }
    if(this.fromParent.modo === "proveedores"){
      this.buscarTarifaChoferId()
      this.buscarTarifaClienteOp() 
    } */
    
  }

  closeModal() {
    this.activeModal.close();    
  }

  comprobarNumber(parametro: any): boolean{
    return (typeof parametro === 'number')
  }

  ////METODOS CUANDO SE LLAMA DE HiSTORIAL CLIENTES
  buscarTarifaClienteId(){
    ////console.log("modal tarifa: ", this.$tarifasClientes);
    
    this.montoCategoriaCliente = this.data.valorJornada;
    //console.log("1) historial clientes/modal/monto categoria cliente: ", this.montoCategoriaCliente);
    this.totalFacturaCliente = this.data.total;
    //console.log("2) historial clientes/modal/total factura cliente: ", this.totalFacturaCliente);
    
    this.storageService.historialTarifasClientes$.subscribe(data => {
      this.$tarifasClientes = data;
      this.tarifaClienteAplicada = this.$tarifasClientes[0];  
    }); 
    //this.tarifaClienteAplicada = this.buscarTarifaServ.buscarTarifaClienteId();    
    //console.log("3) historial clientes/modal/tarifa CLIENTE aplicada: ", this.tarifaClienteAplicada);
  }

  buscarTarifaChoferOp(){
    if(this.data.operacion.chofer.proveedor === "monotributista"){
      //this.storageService.getByFieldValue("facOpLiqChofer","operacion.idOperacion",this.data.operacion.idOperacion)
      this.storageService.facOpLiqChofer$.subscribe(data => {
          let facOpLiqChofer = data;
          let idTarifa = facOpLiqChofer[0].idTarifa
          console.log("4)", idTarifa);
          this.storageService.getByFieldValue("tarifasChofer", "idTarifa", idTarifa);
          this.storageService.historialTarifas$.subscribe(data => {
            this.$tarifasChoferes = data;
            this.tarifaChoferAplicada = this.$tarifasChoferes[0];  
            console.log("5) historial clientes/modal/tarifa CHOFER aplicada: ", this.tarifaChoferAplicada);
            this.totalFacturaChofer = this.data.montoFacturaChofer;
            console.log("6) historial clientes/modal/total factura chofer: ", this.totalFacturaChofer);
          }); 
      })
     
    } else if (this.data.operacion.chofer.proveedor !== "monotributista"){
      this.storageService.facOpLiqProveedor$.subscribe(data => {
        let facOpLiqProveedor = data;
        let idTarifa = facOpLiqProveedor[0].idTarifa
        console.log("4)", idTarifa);
        this.storageService.getByFieldValue("tarifasProveedor", "idTarifaProveedor", idTarifa);
        this.storageService.historialTarifasProveedores$.subscribe(data => {
          this.$tarifasProveedores = data;
          console.log("4.5) todas tarifas proveedor: ", this.$tarifasProveedores)
          this.tarifaProveedorAplicada = this.$tarifasProveedores[0];  
          console.log("5) historial clientes/modal/tarifa PROVEEDOR aplicada: ", this.tarifaProveedorAplicada);
          this.totalFacturaProveedor = this.data.montoFacturaChofer;
          console.log("6) historial clientes/modal/total factura PROVEEDOR: ", this.totalFacturaChofer);
          this.montoCategoriaProveedor = this.buscarTarifaServ.buscarCategoriaProveedor(this.tarifaProveedorAplicada, this.data.operacion.chofer.vehiculo.categoria);
      //////console.log()(this.montoCategoriaProveedor);
        }); 
      })
      
    }    
  }

    buscarFacturaOpChofer(){
      let facOpChofer!: FacturaOpChofer;
      console.log("2)idoperacion: ", this.data.operacion.idOperacion);
      this.dbFirebase
          .obtenerTarifaIdTarifa("facOpLiqChofer",this.data.operacion.idOperacion, "operacion.idOperacion")
          .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
          .subscribe(data => {      
              facOpChofer = data;  
              console.log("3)facOpChofer: ", facOpChofer);
                            
              this.buscarTarifaChofer(facOpChofer.idTarifa);
          });
    }

    buscarTarifaChofer(id:number){
      console.log("3.5)idTarifa: ", id);
      
      this.dbFirebase
      .obtenerTarifaIdTarifa("tarifasChofer",id, "idTarifa")
      .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
      .subscribe(data => {      
          this.tarifaChoferAplicada = data;              
          console.log("4) TARIFA CHOFER APLICADA: ", this.tarifaChoferAplicada);
          
          this.calculosCliente()
      });
        
    }

    calculosCliente(){  
      this.tarifaClienteAplicada = this.data.tarifaCliente;
      this.tarifaChoferAplicada = this.data.tarifaChofer;
      this.montoCategoriaCliente = this.data.valorJornada;          
      this.totalFacturaCliente = this.data.total;
      this.totalFacturaChofer = this.data.montoFacturaChofer;
    }
    


  ////METODOS CUANDO SE LLAMA DE HiSTORIAL CHOFERES
  buscarTarifaChoferId(){
    //this.tarifaChoferAplicada = this.buscarTarifaServ.buscarTarifaChoferId(this.data.idTarifa)
    
    this.totalFacturaChofer = this.data.total;     
    console.log("1) categoria cliente: ", this.montoCategoriaCliente);
    this.totalFacturaCliente = this.data.montoFacturaCliente;
    console.log("2) total: ", this.totalFacturaCliente);
    this.storageService.historialTarifas$.subscribe(data => {
      this.$tarifasChoferes = data;
      this.tarifaChoferAplicada = this.$tarifasChoferes[0];  
      console.log("3) historial choferes/modal/tarifa chofer: ", this.tarifaChoferAplicada);
    }); 
  }

  buscarTarifaClienteOp(){
    this.storageService.facOpLiqCliente$.subscribe(data => {
      let facOpLiqCliente = data;
      let idTarifa = facOpLiqCliente[0].idTarifa
      console.log("4)", idTarifa);
      this.storageService.getByFieldValue("tarifasCliente", "idTarifaCliente", idTarifa);
          this.storageService.historialTarifasClientes$.subscribe(data => {
            this.$tarifasClientes = data;
            this.tarifaClienteAplicada = this.$tarifasClientes[0];  
            console.log("5) historial clientes/modal/tarifa CLIENTE aplicada: ", this.tarifaClienteAplicada);
            this.totalFacturaCliente = this.data.montoFacturaCliente;
            console.log("6) historial clientes/modal/total factura cliente: ", this.totalFacturaCliente);
            this.montoCategoriaCliente = this.buscarTarifaServ.buscarCategoriaCliente(this.tarifaClienteAplicada, this.data.operacion.chofer.vehiculo.categoria);;
            console.log("7) monto categoria cliente: ", this.montoCategoriaCliente);
          }); 
    })
    //this.tarifaClienteAplicada = this.buscarTarifaServ.buscarTarifaCliente(this.data.operacion)
    ////console.log()("historial choferes/modal/tarifa cliente: ", this.tarifaClienteAplicada);
    //this.montoCategoriaCliente = this.buscarTarifaServ.buscarCategoriaCliente(this.tarifaClienteAplicada, this.data.operacion.chofer.vehiculo.categoria);;
    ////console.log()("monto categoria cliente: ", this.montoCategoriaCliente);
    //this.totalFacturaCliente = this.data.montoFacturaCliente;
  }

    ////METODOS CUANDO SE LLAMA DE HiSTORIAL PROVEEDORES
    buscarTarifaProveedorId(){
      //this.tarifaProveedorAplicada = this.buscarTarifaServ.buscarTarifaProveedorId(this.data.idTarifa)
      ////console.log()("historial proveedores/modal/tarifa PROVEEDOR aplicada: ", this.tarifaProveedorAplicada);
      this.montoCategoriaProveedor = this.data.valorJornada;
      console.log("1) historial clientes/modal/monto categoria proveedor: ", this.montoCategoriaProveedor);
      this.totalFacturaProveedor = this.data.total;
      console.log("2) historial clientes/modal/total factura proveedor: ", this.totalFacturaProveedor);
      this.storageService.historialTarifasProveedores$.subscribe(data => {
        console.log("2.5",data);        
        this.$tarifasProveedores = data;
        console.log("2.75",this.$tarifasProveedores); 
        this.tarifaProveedorAplicada = this.$tarifasProveedores[0];  
        console.log("3) historial clientes/modal/tarifa PROVEEDOR aplicada: ", this.tarifaProveedorAplicada);        
      }); 
      //this.tarifaClienteAplicada = this.buscarTarifaServ.buscarTarifaClienteId();    
      //console.log("3) historial clientes/modal/tarifa CLIENTE aplicada: ", this.tarifaClienteAplicada);
      //////////////////////////////////////////////////////////
      
    /* this.montoCategoriaCliente = this.data.valorJornada;
    console.log("1) historial clientes/modal/monto categoria cliente: ", this.montoCategoriaCliente);
    this.totalFacturaCliente = this.data.total;
    console.log("2) historial clientes/modal/total factura cliente: ", this.totalFacturaCliente);
    
    this.storageService.historialTarifasClientes$.subscribe(data => {
      this.$tarifasClientes = data;
      this.tarifaClienteAplicada = this.$tarifasClientes[0];  
    }); 
    //this.tarifaClienteAplicada = this.buscarTarifaServ.buscarTarifaClienteId();    
    console.log("3) historial clientes/modal/tarifa CLIENTE aplicada: ", this.tarifaClienteAplicada); */
    }

    
  

}
