import { Component, Input } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { FacturaCliente } from 'src/app/interfaces/factura-cliente';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
import { TarifaCliente } from 'src/app/interfaces/tarifa-cliente';
import { FacturacionClienteService } from 'src/app/servicios/facturacion/facturacion-cliente/facturacion-cliente.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import * as ExcelJS from 'exceljs';
import * as FileSaver from 'file-saver';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { PdfService } from 'src/app/servicios/informes/pdf/pdf.service';

@Component({
  selector: 'app-liq-cliente',
  templateUrl: './liq-cliente.component.html',
  styleUrls: ['./liq-cliente.component.scss']
})
export class LiqClienteComponent {

  @Input() fechasConsulta?: any = {
    fechaDesde: 0,
    fechaHasta: 0,
  };

  btnConsulta:boolean = false;
  searchText!:string;
  searchText2!:string;
  componente: string = "facturaCliente";
  $facturasOpCliente: any;
  date:any = new Date();
  primerDia: any = new Date(this.date.getFullYear(), this.date.getMonth() , 1).toISOString().split('T')[0];
  ultimoDia:any = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).toISOString().split('T')[0];  
  datosTablaCliente: any[] = [];
  mostrarTablaCliente: boolean[] = [];
  tablaDetalle: any[] = [];
  tituloFacOpCliente: string = "facturaOpCliente";
  facturasLiquidadasCliente: any[] = []; // Nuevo array para almacenar las facturas liquidadas
  totalFacturasLiquidadasCliente: number = 0; // Variable para almacenar el total de las facturas liquidadas
  totalFacturasLiquidadasChofer: number = 0 ; // Variable para almacenar el total de las facturas liquidadas
  razonSocFac!: string ;
  form!: any;
  facturaCliente!: FacturaCliente;  
  facturaEditada!: FacturaOpCliente;
  facturasPorCliente: Map<number, FacturaOpCliente[]> = new Map<number, FacturaOpCliente[]>();
  indiceSeleccionado!:number;
  idOperaciones: number [] = [];
  facDetallada!: FacturaOpCliente;
  ultimaTarifa!: TarifaCliente|any;
  tarifaEditForm: any;
  swichForm:any;
  edicion:boolean = false;
  tarifaEspecial: boolean = false;

  
  constructor(private storageService: StorageService, private fb: FormBuilder, private facOpClienteService: FacturacionClienteService, private excelServ: ExcelService, private pdfServ: PdfService){
    // Inicializar el array para que todos los botones muestren la tabla cerrada al principio
    this.mostrarTablaCliente = new Array(this.datosTablaCliente.length).fill(false);
    
    this.form = this.fb.group({      
      detalle: [""],       
    });

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


    this.swichForm = this.fb.group({
      tarifaEspecial: [false],   
    })
  }

  ngOnInit(): void {
      
    //this.storageService.getByDateValue(this.tituloFacOpCliente, "fecha", this.primerDia, this.ultimoDia, "consultasFacOpCliente");
    this.storageService.consultasFacOpCliente$.subscribe(data => {
      this.$facturasOpCliente = data;
      this.procesarDatosParaTabla()
    });
    
    //this.consultaMes(); 
  }

  procesarDatosParaTabla() {
    const clientesMap = new Map<number, any>();

    if(this.$facturasOpCliente !== null){
      console.log("Facturas OP CLiente: ", this.$facturasOpCliente);
      this.$facturasOpCliente.forEach((factura: FacturaOpCliente) => {
        if (!clientesMap.has(factura.idCliente)) {
          clientesMap.set(factura.idCliente, {
            idCliente: factura.idCliente,
            razonSocial: factura.operacion.cliente.razonSocial,
            cantOp: 0,
            opSinFacturar: 0,
            opFacturadas: 0,
            total: 0
          });
        }
  
        const cliente = clientesMap.get(factura.idCliente);
        cliente.cantOp++;
        if (factura.liquidacion) {
          cliente.opFacturadas += factura.total;
        } else {
          cliente.opSinFacturar += factura.total;
        }
        cliente.total += factura.total;
      });
  
      this.datosTablaCliente = Array.from(clientesMap.values());
      console.log("Datos para la tabla: ", this.datosTablaCliente); 
    }

    
    
  }
 
  liquidarFac(factura: FacturaOpCliente){
    if(typeof factura.total !== "number" || factura.total === 0){
      alert("error")
    } else{
      console.log("esta es la FACTURA: ", factura);
      factura.liquidacion = true;
      this.storageService.updateItem(this.tituloFacOpCliente, factura)
      this.procesarDatosParaTabla();     
    }
  }

  cancelarliquidacion(factura: FacturaOpCliente) {
    factura.liquidacion = false;
    this.storageService.updateItem(this.tituloFacOpCliente, factura)
    this.procesarDatosParaTabla();     
  }

  mostrarMasDatos(index: number, cliente:any) {   
   // Cambiar el estado del botón en la posición indicada
   this.mostrarTablaCliente[index] = !this.mostrarTablaCliente[index];
   //console.log("CLIENTE: ", cliente);

   // Obtener el id del cliente utilizando el índice proporcionado
   let clienteId = this.datosTablaCliente[index].idCliente;

   // Filtrar las facturas según el id del cliente y almacenarlas en el mapa
   let facturasCliente = this.$facturasOpCliente.filter((factura: FacturaOpCliente) => {
       return factura.idCliente === clienteId;
   });
   this.facturasPorCliente.set(clienteId, facturasCliente);

   console.log("FACTURAS DEL CLIENTE: ", facturasCliente);  

  }

  cerrarTabla(index: number){
    this.mostrarTablaCliente[index] = !this.mostrarTablaCliente[index];
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

  liquidarFacCliente(idCliente: any, razonSocial: string, index: number){
    // Obtener las facturas del cliente
    let facturasIdCliente:any = this.facturasPorCliente.get(idCliente);
    this.razonSocFac = razonSocial;
    // Filtrar las facturas con liquidacion=true y guardarlas en un nuevo array
    this.facturasLiquidadasCliente = facturasIdCliente.filter((factura: FacturaOpCliente) => {
        return factura.liquidacion === true;
    });

    // Calcular el total sumando los montos de las facturas liquidadas
    this.totalFacturasLiquidadasCliente = 0;
    this.facturasLiquidadasCliente.forEach((factura: FacturaOpCliente) => {
      this.totalFacturasLiquidadasCliente += factura.total;
    });

    this.totalFacturasLiquidadasChofer = 0;
    this.facturasLiquidadasCliente.forEach((factura: FacturaOpCliente) => {
      this.totalFacturasLiquidadasChofer += factura.montoFacturaChofer;
    });

    this.indiceSeleccionado = index;
    console.log("Facturas liquidadas del cliente", razonSocial + ":", this.facturasLiquidadasCliente);
    //console.log("Total de las facturas liquidadas:", this.totalFacturasLiquidadas);
    //console.log("indice: ", this.indiceSeleccionado);
    
  }
  

  editarDetalle(factura:FacturaOpCliente){
    this.facturaEditada = factura;
    //console.log(this.facturaEditada);
    this.form.patchValue({
      detalle: factura.operacion.observaciones,      
    });    
  }

  guardarDetalle(){    
    //console.log(this.facturaEditada);
    this.facturaEditada.operacion.observaciones = this.form.value.detalle;
    //console.log(this.facturaEditada.operacion.observaciones);
    this.storageService.updateItem("facturaOpCliente", this.facturaEditada);


  }

  onSubmit(titulo:string) {
    //console.log(this.facturasLiquidadas);
    //console.log(this.form.value);
    if(this.facturasLiquidadasCliente.length > 0){

      console.log(this.facturasLiquidadasCliente);
      
      this.facturasLiquidadasCliente.forEach((factura: FacturaOpCliente) => {
        /* idOperaciones.push(factura.operacion.idOperacion) */
        
        this.idOperaciones.push(factura.operacion.idOperacion)
      });
 
      console.log("ID OPERACIONES: ", this.idOperaciones);
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

      console.log("FACTURA CLIENTE: ", this.facturaCliente);
      
      this.addItem(this.facturaCliente, this.componente);
      this.form.reset();
      //this.$tarifasChofer = null;
      //this.ngOnInit();
      this.eliminarFacturasOp();
      
      if(titulo === "excel"){
        //this.excelServ.exportToExcelCliente(this.facturaCliente, this.facturasLiquidadasCliente);
      }else if (titulo === "pdf"){
        this.pdfServ.exportToPdfCliente(this.facturaCliente, this.facturasLiquidadasCliente);
      }
    
    
    }else{
      alert("no hay facturas")
    }
    
    

  }


  

  addItem(item:any, componente:string): void {   
    this.storageService.addItem(componente, item);     
   
  } 

  eliminarFacturasOp(){
    this.idOperaciones = [];
    this.facturasLiquidadasCliente.forEach((factura: FacturaOpCliente) => {
      this.addItem(factura, "facOpLiqCliente");
      this.removeItem(factura);
    }); 
    /* this.facturaChofer.operaciones.forEach((factura: FacturaOpChofer) => {
      this.removeItem(factura);
    });  */
    this.cerrarTabla(this.indiceSeleccionado);
    this.ngOnInit(); 
    /* this.facturaCliente.operaciones.forEach((factura: FacturaOpCliente) => {
      this.removeItem(factura);
    });
    this.cerrarTabla(this.indiceSeleccionado);
    this.ngOnInit(); */
  }

  removeItem(item:any){
    this.storageService.deleteItem("facturaOpCliente", item);    
  }

  editarFacturaOpChofer(factura: FacturaOpCliente){
    this.facDetallada = factura;
    console.log(this.facDetallada);
    let tarifaAplicada: any;
    this.ultimaTarifa = this.facOpClienteService.obtenerTarifaCliente(factura)
    console.log("ULTIMA tarifa: ", this.ultimaTarifa);
    //this.tarifaEspecial = factura.operacion.tarifaEspecial
    this.armarTarifa(factura);
    
  } 

  eliminarFacturaOpChofer(factura:FacturaOpCliente, indice:number){
    this.removeItem(factura);
    this.cerrarTabla(indice)
    this.ngOnInit(); 
  }

  armarTarifa(factura: FacturaOpCliente){
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
      tarifaEspecial: factura.operacion.tarifaEspecial,
    });
    
    this.swichForm.patchValue({
      tarifaEspecial: factura.operacion.tarifaEspecial,
    })
    console.log(factura.operacion.tarifaEspecial);
    
    console.log(this.swichForm.value.tarifaEspecial);      
    this.facturaEditada = factura;
    
  } 

  modificarTarifa(){
    this.edicion = !this.edicion;
  } 

  cerrarEdicion(){
    this.edicion = false;
  } 

  modificaTarifaEspecial(){
    //this.tarifaEspecial= !this.tarifaEspecial;
    //console.log(this.tarifaEspecial); 
    const switchValue = !this.tarifaEditForm.get('tarifaEspecial').value;
    console.log("Estado del switch:", switchValue);
    
  }  

 

 onSubmitEdit(){
    this.nuevaTarifa()
    this.storageService.addItem("tarifasCliente", this.ultimaTarifa);     
    let nuevaFacOpChofer = this.facOpClienteService.actualizarFacOp(this.facturaEditada, this.ultimaTarifa);    
    console.log("nueva FACOPCLIENTE",nuevaFacOpChofer);
    this.facturaEditada.operacion = nuevaFacOpChofer.operacion;
    this.facturaEditada.valorJornada = nuevaFacOpChofer.valorJornada;
    this.facturaEditada.adicional = nuevaFacOpChofer.adicional;
    this.facturaEditada.total = nuevaFacOpChofer.total;
    this.edicion = false;
    this.facturaEditada.idTarifa = this.ultimaTarifa.idTarifaCliente;
    
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

    console.log("NUEVA TARIFA", this.ultimaTarifa);
    this.facturaEditada.operacion.tarifaEspecial = this.tarifaEditForm.value.tarifaEspecial;
    console.log("NUEVA operacion con nueva TARIFA", this.facturaEditada);
    
    
  }

}
