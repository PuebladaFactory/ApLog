import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FacturaCliente } from 'src/app/interfaces/factura-cliente';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { PdfService } from 'src/app/servicios/informes/pdf/pdf.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-liquidacion-op',
  templateUrl: './liquidacion-op.component.html',
  styleUrls: ['./liquidacion-op.component.scss']
})
export class LiquidacionOpComponent implements OnInit{
  @Input() fromParent: any;
  form:any;
  facturasLiquidadasCliente: any[] = []; // Nuevo array para almacenar las facturas liquidadas
  totalFacturasLiquidadasChofer: number = 0 ; // Variable para almacenar el total de las facturas liquidadas
  totalFacturasLiquidadasCliente: number = 0 ; // Variable para almacenar el total de las facturas liquidadas
  facturaEditada!: FacturaOpCliente;
  facturaCliente!: FacturaCliente;  
  idOperaciones: number [] = [];
  componente: string = "facturaCliente";
  mostrarTablaCliente: boolean[] = [];
  indiceSeleccionado!:number;
  edicion: boolean[] = [];

  constructor(private storageService: StorageService, private fb: FormBuilder, private excelServ: ExcelService, private pdfServ: PdfService, public activeModal: NgbActiveModal){
    
    
    this.form = this.fb.group({      
      detalle: [""],       
    });
    
  }
  
  ngOnInit(): void {
    ////console.log()("0) ", this.fromParent);
    
    this.facturasLiquidadasCliente = this.fromParent.facturas;
    console.log("1): ", this.facturasLiquidadasCliente);    
    this.totalFacturasLiquidadasCliente = this.fromParent.totalCliente;
    console.log("2): ", this.totalFacturasLiquidadasCliente);
    this.totalFacturasLiquidadasChofer = this.fromParent.totalChofer;
    console.log("3): ", this.totalFacturasLiquidadasChofer);
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

  editarDetalle(factura:FacturaOpCliente, i:number){
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
    if(this.facturasLiquidadasCliente.length > 0){

      ////console.log()(this.facturasLiquidadasCliente);
      
      this.facturasLiquidadasCliente.forEach((factura: FacturaOpCliente) => {
        /* idOperaciones.push(factura.operacion.idOperacion) */
        
        this.idOperaciones.push(factura.operacion.idOperacion)
      });
 
      ////console.log()("ID OPERACIONES: ", this.idOperaciones);
      //this.facturaChofer.operaciones = idOperaciones;

      this.facturaCliente = {
        id: null,
        fecha: new Date().toISOString().split('T')[0],
        idFacturaCliente: new Date().getTime(),
        idCliente: this.facturasLiquidadasCliente[0].idCliente,
        razonSocial: this.facturasLiquidadasCliente[0].operacion.cliente.razonSocial,
        operaciones: this.idOperaciones,
        total: this.totalFacturasLiquidadasCliente,
        cobrado:false,
        montoFacturaChofer: this.totalFacturasLiquidadasChofer
      }

      //console.log()("FACTURA CLIENTE: ", this.facturaCliente);
      let respuesta = {
        factura: this.facturaCliente,
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
