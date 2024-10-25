import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { FacturaCliente } from 'src/app/interfaces/factura-cliente';
import { FacturaOp } from 'src/app/interfaces/factura-op';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
import { Operacion } from 'src/app/interfaces/operacion';
import { TarifaCliente } from 'src/app/interfaces/tarifa-cliente';
import { TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
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
  facDetallada!: FacturaOp;
  ultimaTarifa!: TarifaGralCliente;
  edicion:boolean = false;
  tarifaEditForm: any;
  swichForm:any;
  facturaCliente!: FacturaCliente;  
  facturaEditada!: FacturaOp;
  swich!: boolean;
  $choferes!: Chofer[];
  choferOp!: Chofer[];
  vehiculoOp!: Vehiculo[];
  operacion!: Operacion;
  tarifaPersonalizada!: TarifaPersonalizadaCliente;

  constructor(private storageService: StorageService, private fb: FormBuilder, private facOpClienteService: FacturacionClienteService, private excelServ: ExcelService, private pdfServ: PdfService, private modalService: NgbModal, public activeModal: NgbActiveModal){
   
    this.swichForm = this.fb.group({
      tarifaEspecial: [false],   
    })
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
    this.getChofer();
    //this.ultimaTarifa = this.fromParent.tarifaAplicada;
    /* this.storageService.historialTarifasClientes$.subscribe(data => {      
      let tarifas = data;
      this.ultimaTarifa = tarifas[0];
      this.armarTarifa();
    }) */
    this.armarTarifa();
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
    
    console.log("factura EDITADA: ", this.facDetallada);
    
  
   }

  armarTarifa(){
   /*  this.tarifaEditForm.patchValue({
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
      tarifaEspecial: this.facDetallada.operacion.tarifaEventual,
    });
    
    this.swichForm.patchValue({
      tarifaEspecial: this.facDetallada.operacion.tarifaEventual,
    })
    ////console.log()(factura.operacion.tarifaEspecial);
    
    ////console.log()(this.swichForm.value.tarifaEspecial);       */
    this.facturaEditada = this.facDetallada;
    
  } 

  cerrarEdicion(){
    this.edicion = false;
  } 

  onSubmitEdit(){
    /* this.nuevaTarifa()
    console.log("llamada al storage desde liq-cliente, addItem");
    this.storageService.addItem("tarifasCliente", this.ultimaTarifa);     
    let nuevaFacOpChofer = this.facOpClienteService.actualizarFacOp(this.facturaEditada, this.ultimaTarifa);    
    ////console.log()("nueva FACOPCLIENTE",nuevaFacOpChofer);
    //this.facturaEditada.operacion = nuevaFacOpChofer.operacion;
    this.facturaEditada.valorJornada = nuevaFacOpChofer.valorJornada;
    this.facturaEditada.adicional = nuevaFacOpChofer.adicional;
    this.facturaEditada.total = nuevaFacOpChofer.total;
    
    //this.facturaEditada.idTarifa = this.ultimaTarifa.idTarifaCliente;
    //console.log("llamada al storage desde liq-cliente, updateItem");
    console.log("!!!!!!!!!! FACTURA EDITADA LPM",this.facturaEditada);
    this.storageService.updateItem("facturaOpCliente", this.facturaEditada); 
    this.activeModal.close()
    this.edicion = false;
    this.ngOnInit()   */
  } 

  nuevaTarifa(){
   /*  this.ultimaTarifa = {
      id:null,
      idTarifa:new Date().getTime(),
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
    if(this.swichForm.get('tarifaEspecial').value){
      this.armarTarifaEspecial();
    }     
    ////console.log()("NUEVA TARIFA", this.ultimaTarifa);
    //this.facturaEditada.operacion.tarifaEspecial = this.tarifaEditForm.value.tarifaEspecial;
    ////console.log()("NUEVA operacion con nueva TARIFA", this.facturaEditada);
    console.log("swich: ", this.swichForm.get('tarifaEspecial').value);
    
    //this.facturaEditada.operacion.tarifaEventual = this.swich;
    this.facturaEditada.idTarifa = this.ultimaTarifa.idTarifa */
    
  }

  modificaTarifaEspecial(){
    //this.tarifaEspecial= !this.tarifaEspecial;
    ////console.log()(this.tarifaEspecial); 
    this.swich = !this.tarifaEditForm.get('tarifaEspecial').value;
    console.log("Estado del switch:", this.swich);
    
  }  

  modificarTarifa(){
    this.edicion = !this.edicion;
  } 

  armarTarifaEspecial(){
    //this.facturaEditada.operacion.tEventual.chofer.concepto = this.tarifaEditForm.value.concepto;
    //this.facturaEditada.operacion.tEventual.chofer.valor = this.tarifaEditForm.value.valor;
  }

  

}
