import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FacturaChofer } from 'src/app/interfaces/factura-chofer';
import { FacturaOpChofer } from 'src/app/interfaces/factura-op-chofer';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-liquidacion-op-chofer',
  templateUrl: './liquidacion-op-chofer.component.html',
  styleUrls: ['./liquidacion-op-chofer.component.scss']
})
export class LiquidacionOpChoferComponent implements OnInit {
  
  @Input() fromParent: any;
  form:any;
  facturasLiquidadasChofer: any[] = []; // Nuevo array para almacenar las facturas liquidadas
  totalFacturasLiquidadasChofer: number = 0 ; // Variable para almacenar el total de las facturas liquidadas
  totalFacturasLiquidadasCliente: number = 0 ; // Variable para almacenar el total de las facturas liquidadas
  facturaEditada!: FacturaOpChofer;
  facturaChofer!: FacturaChofer;  
  idOperaciones: number [] = [];
  componente: string = "facturaChofer";
  mostrarTablaCliente: boolean[] = [];
  indiceSeleccionado!:number;
  edicion: boolean[] = [];
  apellido!:string;

  constructor(private storageService: StorageService, private fb: FormBuilder, public activeModal: NgbActiveModal){
    
    
    this.form = this.fb.group({      
      detalle: [""],       
    });
    
  }

  ngOnInit(): void {
    console.log("0) ", this.fromParent);
    
    this.facturasLiquidadasChofer = this.fromParent.facturas;
    console.log("1): ", this.facturasLiquidadasChofer);    
    this.totalFacturasLiquidadasCliente = this.fromParent.totalCliente;
    console.log("2): ", this.totalFacturasLiquidadasCliente);
    this.totalFacturasLiquidadasChofer = this.fromParent.totalChofer;
    console.log("3): ", this.totalFacturasLiquidadasChofer);
  }

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

  editarDetalle(factura:FacturaOpChofer, i:number){
    console.log("editar: ",factura, i);
    
    this.edicion[i] = true;
    this.facturaEditada = factura;
    console.log(this.facturaEditada);
    this.form.patchValue({
      detalle: factura.operacion.observaciones,      
    });    
  }

  onSubmit(titulo:string) {
    ////console.log()("factura chofer antes: ", this.facturasLiquidadasChofer);
    //////console.log()(this.form.value);
    
    if(this.facturasLiquidadasChofer.length > 0){
      //console.log()(this.facturasLiquidadasChofer);
      
      this.facturasLiquidadasChofer.forEach((factura: FacturaOpChofer) => {
        /* idOperaciones.push(factura.operacion.idOperacion) */
        
        this.idOperaciones.push(factura.operacion.idOperacion)
      });
 
      //console.log()("ID OPERACIONES: ", this.idOperaciones);
      //this.facturaChofer.operaciones = idOperaciones;

      this.facturaChofer = {
        id: null,
        fecha: new Date().toISOString().split('T')[0],
        idFacturaChofer: new Date().getTime(),
        idChofer: this.facturasLiquidadasChofer[0].idChofer,
        apellido: this.facturasLiquidadasChofer[0].operacion.chofer.apellido,
        nombre: this.facturasLiquidadasChofer[0].operacion.chofer.nombre,
        operaciones: this.idOperaciones,        
        total: this.totalFacturasLiquidadasChofer,
        cobrado:false,
        montoFacturaCliente: this.totalFacturasLiquidadasCliente,
      } 

      //console.log()("FACTURA CHOFER: ", this.facturaChofer);
      
      //console.log()("FACTURA CLIENTE: ", this.facturaCliente);
      let respuesta = {
        factura: this.facturaChofer,
        titulo: titulo,
      }

      this.activeModal.close(respuesta);
      
      
    }else{
      alert("no hay facturas")
    }
    
    

  }

  guardarDetalle(i:number){    
    this.edicion[i] = false;
    //console.log()("1: ",this.form.value.detalle);
    this.facturaEditada.operacion.observaciones = this.form.value.detalle;
    //console.log()(this.facturaEditada.operacion.observaciones);
    console.log("llamada al storage desde liq modal-informes-cliente, updateItem");      
    this.storageService.updateItem("facturaOpChofer", this.facturaEditada);


  }

  cancelarEdicion(i:number){
    this.edicion[i] = false;
  }

  

}
