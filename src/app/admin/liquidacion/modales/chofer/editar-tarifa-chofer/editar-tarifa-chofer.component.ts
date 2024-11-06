import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { FacturaChofer } from 'src/app/interfaces/factura-chofer';
import { FacturaOp } from 'src/app/interfaces/factura-op';
import { FacturaOpChofer } from 'src/app/interfaces/factura-op-chofer';
import { Operacion } from 'src/app/interfaces/operacion';
import { TarifaChofer } from 'src/app/interfaces/tarifa-chofer';
import { TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
import { FacturacionChoferService } from 'src/app/servicios/facturacion/facturacion-chofer/facturacion-chofer.service';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { PdfService } from 'src/app/servicios/informes/pdf/pdf.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-editar-tarifa-chofer',
  templateUrl: './editar-tarifa-chofer.component.html',
  styleUrls: ['./editar-tarifa-chofer.component.scss']
})
export class EditarTarifaChoferComponent implements OnInit {
  @Input() fromParent: any;
  facDetallada!: FacturaOp;
  ultimaTarifa!: TarifaGralCliente;
  edicion:boolean = false;
  tarifaEditForm: any;
  swichForm:any;
  facturaCliente!: FacturaChofer;  
  facturaEditada!: FacturaOp;
  swich!: boolean;
  $choferes!: Chofer[];
  $clientes!: Cliente[];
  choferOp!: Chofer[];
  vehiculoOp!: Vehiculo[];
  operacion!: Operacion;
  tarifaPersonalizada!: TarifaPersonalizadaCliente;
  componente: string = "facturaOpChofer"

  constructor(private storageService: StorageService, private fb: FormBuilder, private facOpChoferService: FacturacionChoferService, private excelServ: ExcelService, private pdfServ: PdfService, public activeModal: NgbActiveModal){
    
  }
  ngOnInit(): void {   
    console.log("fromParent: ",this.fromParent);    
    this.facDetallada = this.fromParent.factura;
    //this.swich = this.facDetallada.operacion.tarifaEventual;    
    this.operacion = this.fromParent.op;
    if(!this.facDetallada.tarifaTipo.personalizada){
      this.ultimaTarifa = this.fromParent.tarifaAplicada;
    } else {
      this.tarifaPersonalizada = this.fromParent.tarifaAplicada;
    }

    this.storageService.choferes$.subscribe(data => {
      this.$choferes = data;
    });
    this.storageService.clientes$.subscribe(data => {
      this.$clientes = data;
    });
    this.getChofer();
   
  }

  getChofer(){
    this.choferOp = this.$choferes.filter((chofer:Chofer)=>{
      return chofer.idChofer === this.facDetallada.idChofer;
    })
    this.vehiculoOp = this.choferOp[0].vehiculo.filter((vehiculo:Vehiculo)=>{
      return vehiculo.dominio === this.operacion.patenteChofer
    })
    console.log("vehiculoOp: ", this.vehiculoOp);
  }

  formatearValor(valor: number) : any{
    let nuevoValor =  new Intl.NumberFormat('es-ES', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(valor);
   ////////console.log(nuevoValor);    
    //   `$${nuevoValor}`   
    return nuevoValor
 }

 limpiarValorFormateado(valorFormateado: string): number {
  // Elimina el punto de miles y reemplaza la coma por punto para que sea un valor numérico válido
    return parseFloat(valorFormateado.replace(/\./g, '').replace(',', '.'));
  }

  onSubmit(){
    //console.log("tarifa eventual: ", this.tarifaEventual, " valor: ", this.tEventual);
    //console.log("tarifa personalizada: ", this.tarifaPersonalizada, " valor: ", this.tPersonalizada);  
    //console.log("acompaniante: ", this.acompaniante);
    //console.log("a cobrar: ", this.op.aCobrar, " y a pagar: ", this.op.aPagar);
    if(this.facDetallada.tarifaTipo.eventual || this.facDetallada.tarifaTipo.personalizada){
      this.facDetallada.valores.tarifaBase = this.facDetallada.valores.total;
    }

    Swal.fire({
      title: "¿Desea guardar los cambios en la factura?",
      //text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        ////////console.log("op: ", this.op);
        this.updateItem();
        Swal.fire({
          title: "Confirmado",
          text: "Los cambios se han guardado.",
          icon: "success"
        }).then((result)=>{
          if (result.isConfirmed) {
            this.activeModal.close();
          }
        });   
        
      }
    });   
    console.log("factura EDITADA: ", this.facDetallada);
    
  
   }

   updateItem(){
    this.storageService.updateItem(this.componente, this.facDetallada);
    this.storageService.updateItem("operaciones", this.operacion);
   }

   mensajesError(msj:string){
    Swal.fire({
      icon: "error",
      //title: "Oops...",
      text: `${msj}`
      //footer: `${msj}`
    });
  }

}
