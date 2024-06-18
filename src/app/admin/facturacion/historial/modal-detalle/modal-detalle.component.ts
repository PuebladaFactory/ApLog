import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FacturaOpChofer } from 'src/app/interfaces/factura-op-chofer';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
import { FacturaOpProveedor } from 'src/app/interfaces/factura-op-proveedor';
import { TarifaChofer } from 'src/app/interfaces/tarifa-chofer';
import { TarifaCliente } from 'src/app/interfaces/tarifa-cliente';
import { TarifaProveedor } from 'src/app/interfaces/tarifa-proveedor';
import { BuscarTarifaService } from 'src/app/servicios/buscarTarifa/buscar-tarifa.service';

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

  constructor(public activeModal: NgbActiveModal, private buscarTarifaServ: BuscarTarifaService){}

  ngOnInit(): void {
    this.data = this.fromParent.item;
    //console.log()(this.data);
    switch(this.fromParent.modo){
      case "clientes":
        this.buscarTarifaClienteId();
        this.buscarTarifaChoferOp(); 
        break
      case "choferes":
        this.buscarTarifaChoferId();
        this.buscarTarifaClienteOp(); 
        break
      case "proveedores":
        this.buscarTarifaProveedorId();
        this.buscarTarifaClienteOp();
        /* this.buscarTarifaChoferId()
        this.buscarTarifaClienteOp()  */
        break
      default:
        alert("error")
        break
    }
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
    this.tarifaClienteAplicada = this.buscarTarifaServ.buscarTarifaClienteId(this.data.idTarifa)
   // //console.log()("historial clientes/modal/tarifa CLIENTE aplicada: ", this.tarifaClienteAplicada);
    this.montoCategoriaCliente = this.data.valorJornada
    this.totalFacturaCliente = this.data.total
  }

  buscarTarifaChoferOp(){
    if(this.data.operacion.chofer.proveedor === "monotributista"){
      this.tarifaChoferAplicada = this.buscarTarifaServ.buscarTarifaChofer(this.data.operacion)
      ////console.log()("historial clientes/modal/tarifa CHOFER aplicada: ", this.tarifaChoferAplicada);
      this.totalFacturaChofer = this.data.montoFacturaChofer
    } else if (this.data.operacion.chofer.proveedor !== "monotributista"){
      this.tarifaProveedorAplicada = this.buscarTarifaServ.buscarTarifaProveedor(this.data.operacion)
     // //console.log()("historial clientes/modal/tarifa PROVEEDOR aplicada: ", this.tarifaProveedorAplicada);
      this.montoCategoriaProveedor = this.buscarTarifaServ.buscarCategoriaProveedor(this.tarifaProveedorAplicada, this.data.operacion.chofer.vehiculo.categoria);
      ////console.log()(this.montoCategoriaProveedor);
      
    }    
  }


  ////METODOS CUANDO SE LLAMA DE HiSTORIAL CHOFERES
  buscarTarifaChoferId(){
    this.tarifaChoferAplicada = this.buscarTarifaServ.buscarTarifaChoferId(this.data.idTarifa)
   // //console.log()("historial choferes/modal/tarifa chofer: ", this.tarifaChoferAplicada);
    this.totalFacturaChofer = this.data.total
     
     ////console.log()("categoria cliente: ", this.montoCategoriaCliente);
    this.totalFacturaCliente = this.data.montoFacturaCliente;
    ////console.log()("total: ", this.totalFacturaCliente);
  }

  buscarTarifaClienteOp(){
    this.tarifaClienteAplicada = this.buscarTarifaServ.buscarTarifaCliente(this.data.operacion)
    //console.log()("historial choferes/modal/tarifa cliente: ", this.tarifaClienteAplicada);
    this.montoCategoriaCliente = this.buscarTarifaServ.buscarCategoriaCliente(this.tarifaClienteAplicada, this.data.operacion.chofer.vehiculo.categoria);;
    //console.log()("monto categoria cliente: ", this.montoCategoriaCliente);
    this.totalFacturaCliente = this.data.montoFacturaCliente;
  }

    ////METODOS CUANDO SE LLAMA DE HiSTORIAL PROVEEDORES
    buscarTarifaProveedorId(){
      this.tarifaProveedorAplicada = this.buscarTarifaServ.buscarTarifaProveedorId(this.data.idTarifa)
      //console.log()("historial proveedores/modal/tarifa PROVEEDOR aplicada: ", this.tarifaProveedorAplicada);
      this.montoCategoriaProveedor = this.data.valorJornada
      this.totalFacturaProveedor = this.data.total
    }

    
  

}
