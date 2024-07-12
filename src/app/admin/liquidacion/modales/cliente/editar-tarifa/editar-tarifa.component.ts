import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FacturaCliente } from 'src/app/interfaces/factura-cliente';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
import { TarifaCliente } from 'src/app/interfaces/tarifa-cliente';
import { FacturacionClienteService } from 'src/app/servicios/facturacion/facturacion-cliente/facturacion-cliente.service';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { PdfService } from 'src/app/servicios/informes/pdf/pdf.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-editar-tarifa',
  templateUrl: './editar-tarifa.component.html',
  styleUrls: ['./editar-tarifa.component.scss']
})
export class EditarTarifaComponent implements OnInit {
  @Input() fromParent: any;
  facDetallada!: FacturaOpCliente;
  ultimaTarifa!: TarifaCliente|any;
  edicion:boolean = false;
  tarifaEditForm: any;
  swichForm:any;
  facturaCliente!: FacturaCliente;  
  facturaEditada!: FacturaOpCliente;

  constructor(private storageService: StorageService, private fb: FormBuilder, private facOpClienteService: FacturacionClienteService, private excelServ: ExcelService, private pdfServ: PdfService, private modalService: NgbModal, public activeModal: NgbActiveModal){
    this.tarifaEditForm = this.fb.group({
      utilitario:[""],
      furgon:[""],
      furgonGrande:[""],
      chasisLiviano:[""],
      chasis:[""],
      balancin:[""],
      semiRemolqueLocal:[""],
      portacontenedores:[""],  
      acompaniante: [""],     
      concepto:[""],
      valor:[""],
      distanciaPrimerSector: [""],
      valorPrimerSector:[""],
      distanciaIntervalo:[""],
      valorIntervalo:[""],
      tarifaEspecial: [false],   
    })


 /*    this.swichForm = this.fb.group({
      tarifaEspecial: [false],   
    }) */
  }
  
  ngOnInit(): void {   
    //console.log(this.fromParent);    
    this.facDetallada = this.fromParent;
    //this.ultimaTarifa = this.fromParent.tarifaAplicada;
    this.storageService.historialTarifasClientes$.subscribe(data => {      
      let tarifas = data;
      this.ultimaTarifa = tarifas[0];
      this.armarTarifa();
    })
    //this.armarTarifa();
  }

  armarTarifa(){
    this.tarifaEditForm.patchValue({
      utilitario: this.ultimaTarifa.cargasGenerales.utilitario,
      furgon: this.ultimaTarifa.cargasGenerales.furgon,
      furgonGrande: this.ultimaTarifa.cargasGenerales.furgonGrande,
      chasisLiviano: this.ultimaTarifa.cargasGenerales.chasisLiviano,
      chasis: this.ultimaTarifa.cargasGenerales.chasis,
      balancin: this.ultimaTarifa.cargasGenerales.balancin,
      semiRemolqueLocal: this.ultimaTarifa.cargasGenerales.semiRemolqueLocal,
      portacontenedores: this.ultimaTarifa.cargasGenerales.portacontenedores,
      acompaniante: this.ultimaTarifa.adicionales.acompaniante,
      concepto: this.ultimaTarifa.tarifaEspecial.concepto,
      valor: this.ultimaTarifa.tarifaEspecial.valor,
      distanciaPrimerSector: this.ultimaTarifa.adicionales.adicionalKm.primerSector.distancia,
      valorPrimerSector: this.ultimaTarifa.adicionales.adicionalKm.primerSector.valor,
      distanciaIntervalo:this.ultimaTarifa.adicionales.adicionalKm.sectoresSiguientes.intervalo,
      valorIntervalo:this.ultimaTarifa.adicionales.adicionalKm.sectoresSiguientes.valor,
      tarifaEspecial: this.facDetallada.operacion.tarifaEspecial,
    });
    
/*     this.swichForm.patchValue({
      tarifaEspecial: this.facDetallada.operacion.tarifaEspecial,
    }) */
    ////console.log()(factura.operacion.tarifaEspecial);
    
    ////console.log()(this.swichForm.value.tarifaEspecial);      
    this.facturaEditada = this.facDetallada;
    
  } 

  cerrarEdicion(){
    this.edicion = false;
  } 

  onSubmitEdit(){
    this.nuevaTarifa()
    console.log("llamada al storage desde liq-cliente, addItem");
    this.storageService.addItem("tarifasCliente", this.ultimaTarifa);     
    let nuevaFacOpChofer = this.facOpClienteService.actualizarFacOp(this.facturaEditada, this.ultimaTarifa);    
    ////console.log()("nueva FACOPCLIENTE",nuevaFacOpChofer);
    this.facturaEditada.operacion = nuevaFacOpChofer.operacion;
    this.facturaEditada.valorJornada = nuevaFacOpChofer.valorJornada;
    this.facturaEditada.adicional = nuevaFacOpChofer.adicional;
    this.facturaEditada.total = nuevaFacOpChofer.total;
    this.edicion = false;
    this.facturaEditada.idTarifa = this.ultimaTarifa.idTarifaCliente;
    console.log("llamada al storage desde liq-cliente, updateItem");
    this.storageService.updateItem("facturaOpCliente", this.facturaEditada);   
    this.ngOnInit()  
  } 

  nuevaTarifa(){
    this.ultimaTarifa = {
      id:null,
      idTarifaCliente:new Date().getTime(),
      idCliente: this.ultimaTarifa.idCliente,
      fecha: new Date().toISOString().split('T')[0],    
      cargasGenerales:{
        utilitario: this.tarifaEditForm.value.utilitario,
        furgon: this.tarifaEditForm.value.furgon,
        furgonGrande: this.tarifaEditForm.value.furgonGrande,
        chasisLiviano: this.tarifaEditForm.value.chasisLiviano,
        chasis: this.tarifaEditForm.value.chasis,
        balancin: this.tarifaEditForm.value.balancin,
        semiRemolqueLocal: this.tarifaEditForm.value.semiRemolqueLocal,
        portacontenedores: this.tarifaEditForm.value.portacontenedores,
      },
      adicionales:{
        acompaniante: this.tarifaEditForm.value.acompaniante,
        adicionalKm:{
          primerSector: {
            distancia: this.tarifaEditForm.value.distanciaPrimerSector,
            valor: this.tarifaEditForm.value.valorPrimerSector,
        },
        sectoresSiguientes:{
            intervalo: this.tarifaEditForm.value.distanciaIntervalo,
            valor: this.tarifaEditForm.value.valorIntervalo,
        }
        }
      },
      tarifaEspecial:{
        concepto: this.tarifaEditForm.value.concepto,
        valor: this.tarifaEditForm.value.valor,
      },
    };

    ////console.log()("NUEVA TARIFA", this.ultimaTarifa);
    this.facturaEditada.operacion.tarifaEspecial = this.tarifaEditForm.value.tarifaEspecial;
    ////console.log()("NUEVA operacion con nueva TARIFA", this.facturaEditada);
    
    
  }

  modificaTarifaEspecial(){
    //this.tarifaEspecial= !this.tarifaEspecial;
    ////console.log()(this.tarifaEspecial); 
    const switchValue = !this.tarifaEditForm.get('tarifaEspecial').value;
    ////console.log()("Estado del switch:", switchValue);
    
  }  

  modificarTarifa(){
    this.edicion = !this.edicion;
  } 

  

}
