import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FacturaChofer } from 'src/app/interfaces/factura-chofer';
import { FacturaOpChofer } from 'src/app/interfaces/factura-op-chofer';
import { FacturacionChoferService } from 'src/app/servicios/facturacion/facturacion-chofer/facturacion-chofer.service';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { PdfService } from 'src/app/servicios/informes/pdf/pdf.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-editar-tarifa-chofer',
  templateUrl: './editar-tarifa-chofer.component.html',
  styleUrls: ['./editar-tarifa-chofer.component.scss']
})
export class EditarTarifaChoferComponent implements OnInit {
  @Input() fromParent: any;
  facDetallada!: FacturaOpChofer;
  ultimaTarifa!:any;
  edicion:boolean = false;
  tarifaEditForm!:any;
  swichForm!:any;
  facturaChofer!: FacturaChofer;  
  facturaEditada!: FacturaOpChofer;  

  constructor(private storageService: StorageService, private fb: FormBuilder, private facOpChoferService: FacturacionChoferService, private excelServ: ExcelService, private pdfServ: PdfService, public activeModal: NgbActiveModal){
    this.tarifaEditForm = this.fb.group({
      valorJornada: [""],            
      publicidad: [""], 
      acompaniante: [""],
      concepto:[""],
      valor:[""],
      distanciaPrimerSector: [""],
      valorPrimerSector:[""],
      distanciaIntervalo:[""],
      valorIntervalo:[""],
      tarifaEspecial: [false],   
    })

    this.swichForm = this.fb.group({
      tarifaEspecial: [false],   
    })
    
  }
  ngOnInit(): void {
   console.log(this.fromParent);    
   this.facDetallada = this.fromParent;
   //this.ultimaTarifa = this.fromParent.tarifaAplicada;
   this.storageService.historialTarifas$.subscribe(data => {
    //this.$tarifas = data.filter((tarifa: { idTarifa: number; }) => tarifa.idTarifa === factura.idTarifa);
    let tarifas = data;
    this.ultimaTarifa = tarifas[0];
    this.armarTarifa();
  });

   //this.armarTarifa();
  }

  armarTarifa(){
    this.tarifaEditForm.patchValue({
      valorJornada: this.ultimaTarifa.valorJornada,
      publicidad: this.ultimaTarifa.publicidad,
      acompaniante: this.ultimaTarifa.acompaniante,
      concepto: this.ultimaTarifa.tarifaEspecial.concepto,
      valor: this.ultimaTarifa.tarifaEspecial.valor,
      distanciaPrimerSector: this.ultimaTarifa.km.primerSector.distancia,
      valorPrimerSector: this.ultimaTarifa.km.primerSector.valor,
      distanciaIntervalo: this.ultimaTarifa.km.sectoresSiguientes.intervalo,
      valorIntervalo: this.ultimaTarifa.km.sectoresSiguientes.valor,
      tarifaEspecial: this.facDetallada.operacion.tarifaEspecial,
    });
 /*    this.swichForm.patchValue({
      tarifaEspecial: this.facDetallada.operacion.tarifaEspecial,
    }) */
    //console.log()(factura.operacion.tarifaEspecial);
    
    //console.log()(this.swichForm.value.tarifaEspecial);      
    this.facturaEditada = this.facDetallada;
    
  }

  cerrarEdicion(){
    this.edicion = false;
  }

  modificarTarifa(){
    this.edicion = !this.edicion;
  }

  modificaTarifaEspecial(){
    /*   this.tarifaEspecial= !this.tarifaEspecial;
      //console.log()(this.tarifaEspecial); */
      const switchValue = !this.swichForm.get('tarifaEspecial').value;
      //console.log()("Estado del switch:", switchValue);
      
    } 

  onSubmitEdit(){
    this.nuevaTarifa()
    console.log("llamada al storage desde liq-chofer, ademItem");
    this.storageService.addItem("tarifasChofer", this.ultimaTarifa);     
    let nuevaFacOpChofer = this.facOpChoferService.actualizarFacOp(this.facturaEditada, this.ultimaTarifa);    
    //console.log()("nueva FACOPCHOFER",nuevaFacOpChofer);
    this.facturaEditada.operacion = nuevaFacOpChofer.operacion;
    this.facturaEditada.valorJornada = nuevaFacOpChofer.valorJornada;
    this.facturaEditada.adicional = nuevaFacOpChofer.adicional;
    this.facturaEditada.total = nuevaFacOpChofer.total;
    this.edicion = false;
    this.facturaEditada.idTarifa = this.ultimaTarifa.idTarifa;
    console.log("llamada al storage desde liq-chofer, updateItem");
    this.storageService.updateItem("facturaOpChofer", this.facturaEditada);   
    this.ngOnInit()  
  }

  nuevaTarifa(){
    this.ultimaTarifa = {
      id:null,
      idTarifa:new Date().getTime(),
      valorJornada: this.tarifaEditForm.value.valorJornada,
      km:{
        primerSector: {
          distancia: this.tarifaEditForm.value.distanciaPrimerSector,
          valor: this.tarifaEditForm.value.valorPrimerSector,
      },
      sectoresSiguientes:{
          intervalo: this.tarifaEditForm.value.distanciaIntervalo,
          valor: this.tarifaEditForm.value.valorPrimerSector,
      }
      },
      publicidad: this.tarifaEditForm.value.publicidad,
      idChofer: this.ultimaTarifa.idChofer,
      fecha: new Date().toISOString().split('T')[0],    
      acompaniante: this.tarifaEditForm.value.acompaniante,
      //tEspecial: boolean;
      tarifaEspecial:{
        concepto: this.tarifaEditForm.value.concepto,
        valor: this.tarifaEditForm.value.valor,
      } 
    }    
    //console.log()("NUEVA TARIFA", this.ultimaTarifa);
    this.facturaEditada.operacion.tarifaEspecial = this.tarifaEditForm.value.tarifaEspecial;
    //console.log()("NUEVA operacion con nueva TARIFA", this.facturaEditada);

  }

}
