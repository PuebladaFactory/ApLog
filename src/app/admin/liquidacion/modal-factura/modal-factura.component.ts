import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FacturaOpChofer } from 'src/app/interfaces/factura-op-chofer';
import { FacturacionChoferService } from 'src/app/servicios/facturacion/facturacion-chofer/facturacion-chofer.service';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { PdfService } from 'src/app/servicios/informes/pdf/pdf.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ModalObsComponent } from '../modal-obs/modal-obs.component';
/* import { Otro } from 'src/app/interfaces/factura-chofer'; */

@Component({
  selector: 'app-modal-factura',
  templateUrl: './modal-factura.component.html',
  styleUrls: ['./modal-factura.component.scss']
})
export class ModalFacturaComponent  implements OnInit {

  @Input() fromParent: any;
  titulo!:string;
  item!:any;
  vistaChofer:boolean = false;
  vistaCliente:boolean = false;
  vistaProveedor:boolean = false;
  facturasLiquidadasChofer!: FacturaOpChofer[];
  facturaEditada!:any;
  form:any;
  subTotalFacturasLiquidadasChofer!:number;
  extrasForm:any;
  edicion:boolean = false;
  mostrarFormulario:boolean = false;
  formOtrosExtras:any;
/*   otroExtras!: Otro[]; */

  constructor(private storageService: StorageService, private fb: FormBuilder, private facOpChoferService: FacturacionChoferService, private excelServ: ExcelService, private pdfServ: PdfService,  private modalService: NgbModal, public activeModal: NgbActiveModal){
    
    this.form = this.fb.group({      
      detalle: [""],       
    })
    this.extrasForm = this.fb.group({
      combustible: [""],
      publicidad: [""],
    })
    this.formOtrosExtras = this.fb.group({
      concepto:[""],
      valor:[""],
    })

  }

  ngOnInit(): void {
    
    console.log('on init form', this.fromParent);
      this.titulo = this.fromParent.modo;
      this.item = this.fromParent.item;
      switch (this.titulo) {
        case 'facturasChofer': {
          this.vistaChofer=true;
          this.facturasLiquidadasChofer = this.item;
          this.subTotalFacturasLiquidadasChofer = 0;
          this.facturasLiquidadasChofer.forEach((factura: FacturaOpChofer) => {
            this.subTotalFacturasLiquidadasChofer += factura.total;
          });
          
         /*  alert("chofer") */
          break;
        }
        /* case 'Editar': {
          this.item = this.fromParent.item;
          this.configureForm(this.titulo, this.item);
          break;
        }
        case 'Mostrar': {
          this.item = this.fromParent.item;
          this.configureForm(this.titulo, this.item);
          this.soloVista = true;
          break;
        }
        case 'Eliminar': {
          this.item = this.fromParent.item;
          this.closeModal();
          break;
        } */
        default:{
          alert("ERROR")
          break
        }
      }
     
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

  editarDetalle(facturaChofer: any): void {
    // Abre el modalObsChofer usando NgbModal
    const modalRef = this.modalService.open(ModalObsComponent, {
      centered: true
    });

    // Pasar datos al modal
    modalRef.componentInstance.facturaChofer = facturaChofer;

    // Manejar el resultado del modal
    modalRef.result.then((result) => {
      if (result) {
        // Actualiza el detalle si es necesario
        facturaChofer.operacion.observaciones = result.detalle;
      }
    }).catch((error) => {
      console.error(error);
    });
  }

  guardarDetalle(){    
    ////console.log(this.facturaEditada);
    this.facturaEditada.operacion.observaciones = this.form.value.detalle;
    ////console.log(this.facturaEditada.operacion.observaciones);
    this.storageService.updateItem("facturaOpChofer", this.facturaEditada);


  }

  onSubmit() {
    //console.log("factura chofer antes: ", this.facturasLiquidadasChofer);
    ////console.log(this.form.value);
    
    if(this.facturasLiquidadasChofer.length > 0){
    /*   //console.log(this.facturasLiquidadasChofer);      
      this.facturasLiquidadasChofer.forEach((factura: FacturaOpChofer) => {
        this.idOperaciones.push(factura.operacion.idOperacion)
      });
 
      console.log("ID OPERACIONES: ", this.idOperaciones);
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
      console.log("FACTURA CHOFER: ", this.facturaChofer);      
      this.addItem(this.facturaChofer, this.componente);
      this.form.reset();
      //this.$tarifasChofer = null;    
      this.eliminarFacturasOp();
      //this.ngOnInit();
      //this.excelServ.exportToExcelChofer(this.facturaChofer, this.facturasLiquidadasChofer);
      this.pdfServ.exportToPdfChofer(this.facturaChofer, this.facturasLiquidadasChofer); */
     
    }else{
      alert("no hay facturas")
    }
    
    

  }

  onSubmitEdit(){

  }

  toggle() {
    this.mostrarFormulario = !this.mostrarFormulario;
    //console.log(this.form);
  }

/*   guardarOtros(){
    this.otroExtras.push(this.formOtrosExtras.value);
    this.formOtrosExtras.reset();
    this.mostrarFormulario = !this.mostrarFormulario;
  }

  eliminarOtros(indice:number){
    this.otroExtras.splice(indice, 1);    
  } */
}
