import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FacturaOpProveedor } from 'src/app/interfaces/factura-op-proveedor';
import { FacturaProveedor } from 'src/app/interfaces/factura-proveedor';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-liquidacion-op-proveedor',
  templateUrl: './liquidacion-op-proveedor.component.html',
  styleUrls: ['./liquidacion-op-proveedor.component.scss']
})
export class LiquidacionOpProveedorComponent implements OnInit {

  @Input() fromParent: any;
  form:any;
  facturasLiquidadasProveedor: any[] = []; // Nuevo array para almacenar las facturas liquidadas
  totalFacturasLiquidadasProveedor: number = 0 ; // Variable para almacenar el total de las facturas liquidadas
  totalFacturasLiquidadasCliente: number = 0 ; // Variable para almacenar el total de las facturas liquidadas
  facturaEditada!: FacturaOpProveedor;
  facturaProveedor!: FacturaProveedor;  
  idOperaciones: number [] = [];
  componente: string = "facturaProveedor";
  mostrarTablaCliente: boolean[] = [];
  indiceSeleccionado!:number;
  edicion: boolean[] = [];

  constructor(private storageService: StorageService, private fb: FormBuilder, public activeModal: NgbActiveModal){
    
    
    this.form = this.fb.group({      
      detalle: [""],       
    });
    
  }
  
  ngOnInit(): void {
    console.log("0) ", this.fromParent);
    
    this.facturasLiquidadasProveedor = this.fromParent.facturas;
    console.log("1): ", this.facturasLiquidadasProveedor);    
    this.totalFacturasLiquidadasCliente = this.fromParent.totalCliente;
    console.log("2): ", this.totalFacturasLiquidadasCliente);
    this.totalFacturasLiquidadasProveedor = this.fromParent.totalProveedor;
    console.log("3): ", this.totalFacturasLiquidadasProveedor);
  }

   // Modifica la función getQuincena para que acepte una fecha como parámetro
   getQuincena(fecha: string | Date): string {
    // Convierte la fecha a objeto Date
    const fechaObj = new Date(fecha);
    // Obtiene el día del mes
    const dia = fechaObj.getDate();
    // Determina si la fecha está en la primera o segunda quincena
    if (dia <= 15) {
      return '1° quincena';
    } else {
      return '2° quincena';
    }
  }

  closeModal() {
    this.activeModal.close();    
  }

  guardarDetalle(i:number){    
    this.edicion[i] = false;
    //console.log()("1: ",this.form.value.detalle);
    this.facturaEditada.operacion.observaciones = this.form.value.detalle;
    //console.log()(this.facturaEditada.operacion.observaciones);
    console.log("llamada al storage desde liq modal-informes-cliente, updateItem");      
    this.storageService.updateItem("facturaOpCliente", this.facturaEditada);


  }

  editarDetalle(factura:FacturaOpProveedor, i:number){
    console.log("editar: ",factura, i);
    
    this.edicion[i] = true;
    this.facturaEditada = factura;
    console.log(this.facturaEditada);
    this.form.patchValue({
      detalle: factura.operacion.observaciones,      
    });    
  }

  onSubmit(titulo:string) {
    ////console.log()(this.facturasLiquidadas);
    ////console.log()(this.form.value);
    if(this.facturasLiquidadasProveedor.length > 0){

      ////console.log()(this.facturasLiquidadasCliente);
      
      this.facturasLiquidadasProveedor.forEach((factura: FacturaOpProveedor) => {
        /* idOperaciones.push(factura.operacion.idOperacion) */
        
        this.idOperaciones.push(factura.operacion.idOperacion)
      });
 
      ////console.log()("ID OPERACIONES: ", this.idOperaciones);
      //this.facturaChofer.operaciones = idOperaciones;

      this.facturaProveedor = {
        id: null,
        fecha: new Date().toISOString().split('T')[0],
        idFacturaProveedor: new Date().getTime(),
        idProveedor: this.facturasLiquidadasProveedor[0].idProveedor,
        razonSocial: this.facturasLiquidadasProveedor[0].operacion.cliente.razonSocial,
        operaciones: this.idOperaciones,
        total: this.totalFacturasLiquidadasProveedor,
        cobrado:false,
        montoFacturaCliente: this.totalFacturasLiquidadasCliente
      }

      //console.log()("FACTURA CLIENTE: ", this.facturaCliente);
      let respuesta = {
        factura: this.facturaProveedor,
        titulo: titulo,
      }

      this.activeModal.close(respuesta);
    
    }else{
      alert("no hay facturas")
    }
    
    

  }

  cancelarEdicion(i:number){
    this.edicion[i] = false;
  }


}
