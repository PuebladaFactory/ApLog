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
    /* //console.log(this.data); */
    //console.log("0)", this.fromParent);
    ////console.log("modo: ", this.fromParent.modo);
    this.storageService.tarifaClienteHistorial$.subscribe(data => {
      this.tarifaClienteAplicada = data[0]
    });
    this.storageService.tarifaChoferHistorial$.subscribe(data => {
      this.tarifaChoferAplicada = data[0]
    });
    this.storageService.tarifaProveedorHistorial$.subscribe(data => {
      this.tarifaProveedorAplicada = data[0]
    });

    switch(this.fromParent.modo){
      case "clientes":
        
        this.montoCategoriaCliente = this.data.valorJornada;          
        this.totalFacturaCliente = this.data.total;
        if(this.data.operacion.chofer.proveedor === "monotributista"){
          this.totalFacturaChofer = this.data.montoFacturaChofer;
        }else {
          this.totalFacturaProveedor = this.data.montoFacturaChofer;
          //console.log("6) historial clientes/modal/total factura PROVEEDOR: ", this.totalFacturaChofer);
          this.montoCategoriaProveedor = this.buscarTarifaServ.buscarCategoriaProveedor(this.tarifaProveedorAplicada, this.data.operacion.chofer.vehiculo.categoria);
        }
       
        break
      case "choferes":
      
        this.totalFacturaChofer = this.data.total;     
        //console.log("1) categoria cliente: ", this.montoCategoriaCliente);
        this.totalFacturaCliente = this.data.montoFacturaCliente;
        //console.log("2) total: ", this.totalFacturaCliente);
        this.totalFacturaCliente = this.data.montoFacturaCliente;
        //console.log("6) historial clientes/modal/total factura cliente: ", this.totalFacturaCliente);
        this.montoCategoriaCliente = this.buscarTarifaServ.buscarCategoriaCliente(this.tarifaClienteAplicada, this.data.operacion.chofer.vehiculo.categoria);;
        //console.log("7) monto categoria cliente: ", this.montoCategoriaCliente);
        break
      case "proveedores":

        this.montoCategoriaProveedor = this.data.valorJornada;
        //console.log("1) historial clientes/modal/monto categoria proveedor: ", this.montoCategoriaProveedor);
        this.totalFacturaProveedor = this.data.total;
        //console.log("2) historial clientes/modal/total factura proveedor: ", this.totalFacturaProveedor);
        this.totalFacturaCliente = this.data.montoFacturaCliente;
        //console.log("6) historial clientes/modal/total factura cliente: ", this.totalFacturaCliente);
        this.montoCategoriaCliente = this.buscarTarifaServ.buscarCategoriaCliente(this.tarifaClienteAplicada, this.data.operacion.chofer.vehiculo.categoria);;
        //console.log("7) monto categoria cliente: ", this.montoCategoriaCliente);
        break
      default:
        alert("error")
        break
    }

    this.storageService.historialTarifasClientes$.subscribe(data => {
      this.$tarifasClientes = data;
      //////console.log("modal tarifa: ", this.$tarifasClientes);      
    })

  }

  closeModal() {
    this.activeModal.close();    
  }

  comprobarNumber(parametro: any): boolean{
    return (typeof parametro === 'number')
  }

}
