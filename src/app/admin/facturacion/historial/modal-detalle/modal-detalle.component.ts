import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
import { TarifaChofer } from 'src/app/interfaces/tarifa-chofer';
import { TarifaCliente } from 'src/app/interfaces/tarifa-cliente';
import { TarifaProveedor } from 'src/app/interfaces/tarifa-proveedor';
import { BuscarTarifaService } from 'src/app/servicios/buscar-tarifa/buscar-tarifa.service';

@Component({
  selector: 'app-modal-detalle',
  templateUrl: './modal-detalle.component.html',
  styleUrls: ['./modal-detalle.component.scss']
})
export class ModalDetalleComponent implements OnInit {
  @Input() fromParent: any;
  data!:FacturaOpCliente;
  tarifaClienteAplicada!: TarifaCliente;
  tarifaChoferAplicada!: TarifaChofer;
  tarifaProveedorAplicada!: TarifaProveedor;

  constructor(public activeModal: NgbActiveModal, private buscarTarifaServ: BuscarTarifaService){}

  ngOnInit(): void {
    this.data = this.fromParent.item;
    console.log(this.data);
    if(this.fromParent.modo === "clientes"){
      this.buscarTarifaClienteId()
      this.buscarTarifaChoferOp() 
    }
    
  }

  closeModal() {
    this.activeModal.close();    
  }

  buscarTarifaClienteId(){
    this.tarifaClienteAplicada = this.buscarTarifaServ.buscarTarifaCliente(this.data.idTarifa)
    //console.log("modal/tarifa CLIENTE aplicada: ", this.tarifaClienteAplicada);
    
  }

  buscarTarifaChoferOp(){
    if(this.data.operacion.chofer.proveedor === "monotributista"){
      this.tarifaChoferAplicada = this.buscarTarifaServ.buscarTarifaChofer(this.data.operacion)
      console.log("modal/tarifa CHOFER aplicada: ", this.tarifaChoferAplicada);
    } else if (this.data.operacion.chofer.proveedor !== "monotributista"){
      this.tarifaProveedorAplicada = this.buscarTarifaServ.buscarTarifaProveedor(this.data.operacion)
      console.log("modal/tarifa PROVEEDOR aplicada: ", this.tarifaProveedorAplicada);
    }

    
  }
  

}
