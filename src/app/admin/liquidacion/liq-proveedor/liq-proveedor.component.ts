import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { FacturaOpProveedor } from 'src/app/interfaces/factura-op-proveedor';
import { FacturaProveedor } from 'src/app/interfaces/factura-proveedor';
import { TarifaProveedor } from 'src/app/interfaces/tarifa-proveedor';
import { FacturacionProveedorService } from 'src/app/servicios/facturacion/facturacion-proveedor/facturacion-proveedor.service';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { PdfService } from 'src/app/servicios/informes/pdf/pdf.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-liq-proveedor',
  templateUrl: './liq-proveedor.component.html',
  styleUrls: ['./liq-proveedor.component.scss']
})
export class LiqProveedorComponent implements OnInit {

  @Input() fechasConsulta?: any = {
    fechaDesde: 0,
    fechaHasta: 0,
  };

  //btnConsulta:boolean = false;
  searchText!:string;
  searchText2!:string;
  componente: string = "facturaProveedor";
  $facturasOpProveedor: any;
  date:any = new Date();
  primerDia: any = new Date(this.date.getFullYear(), this.date.getMonth() , 1).toISOString().split('T')[0];
  ultimoDia:any = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).toISOString().split('T')[0];  
  datosTablaProveedor: any[] = [];
  mostrarTablaProveedor: boolean[] = [];
  tablaDetalle: any[] = [];
  tituloFacOpProveedor: string = "facturaOpProveedor";
  facturasLiquidadasProveedor: any[] = []; // Nuevo array para almacenar las facturas liquidadas
  totalFacturasLiquidadasProveedor: number = 0; // Variable para almacenar el total de las facturas liquidadas
  totalFacturasLiquidadasCliente: number = 0; // Variable para almacenar el total de las facturas liquidadas
  razonSocial!: string ;
  form!: any;
  facturaProveedor!: FacturaProveedor;  
  facturaEditada!: FacturaOpProveedor;
  facturasPorProveedor: Map<number, FacturaOpProveedor[]> = new Map<number, FacturaOpProveedor[]>();
  indiceSeleccionado!:number;
  idOperaciones: number [] = [];
  facDetallada!: FacturaOpProveedor;
  ultimaTarifa!: TarifaProveedor|any;
  tarifaEditForm: any;
  swichForm:any;
  edicion:boolean = false;
  tarifaEspecial: boolean = false;
  
  
  constructor(private storageService: StorageService, private fb: FormBuilder, private facOpProveedorService: FacturacionProveedorService, private excelServ: ExcelService, private pdfServ: PdfService){
    // Inicializar el array para que todos los botones muestren la tabla cerrada al principio
    this.mostrarTablaProveedor = new Array(this.datosTablaProveedor.length).fill(false);
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
      
    //this.storageService.getByDateValue(this.tituloFacOpProveedor, "fecha", this.primerDia, this.ultimoDia, "consultasFacOpProveedor");
    this.storageService.consultasFacOpProveedor$.subscribe(data => {
      this.$facturasOpProveedor = data;
      this.procesarDatosParaTabla()
      
      
    });

    
    
    //this.consultaMes(); 
  }

  procesarDatosParaTabla() {
    const proveedoresMap = new Map<number, any>();

    if(this.$facturasOpProveedor !== null){
      //console.log("Facturas OP Proveedor: ", this.$facturasOpProveedor);
      
      this.$facturasOpProveedor.forEach((factura: FacturaOpProveedor) => {
        if (!proveedoresMap.has(factura.idChofer)) {
          proveedoresMap.set(factura.idChofer, {
            idProveedor: factura.idProveedor,
            razonSocial: factura.operacion.chofer.proveedor ,
            cantOp: 0,
            opSinFacturar: 0,
            opFacturadas: 0,
            total: 0
          });
        }
  
        const chofer = proveedoresMap.get(factura.idChofer);
        chofer.cantOp++;
        if (factura.liquidacion) {
          chofer.opFacturadas += factura.total;
        } else {
          chofer.opSinFacturar += factura.total;
        }
        chofer.total += factura.total;
      });
  
      this.datosTablaProveedor = Array.from(proveedoresMap.values());
      //console.log("Datos para la tabla: ", this.datosTablaProveedor); 
    }

    
    
  }
 
  liquidarFac(factura: FacturaOpProveedor){
    if(typeof factura.total !== "number" || factura.total === 0){
      alert("error")
    } else{
    //console.log("esta es la FACTURA: ", factura);
    factura.liquidacion = true;
    this.storageService.updateItem(this.tituloFacOpProveedor, factura)
    this.procesarDatosParaTabla();     
    }
  }

  cancelarliquidacion(factura: FacturaOpProveedor) {
    factura.liquidacion = false;
    this.storageService.updateItem(this.tituloFacOpProveedor, factura)
    this.procesarDatosParaTabla();     
  }

  mostrarMasDatos(index: number, proveedor:any) {   
   // Cambiar el estado del botón en la posición indicada
   this.mostrarTablaProveedor[index] = !this.mostrarTablaProveedor[index];
   //console.log("Proveedor: ", proveedor);

   // Obtener el id del cliente utilizando el índice proporcionado
   let proveedorId = this.datosTablaProveedor[index].idProveedor;


   // Filtrar las facturas según el id del cliente y almacenarlas en el mapa
   let facturasProveedor = this.$facturasOpProveedor.filter((factura: FacturaOpProveedor) => {
       return factura.idProveedor === proveedorId;
   });
   this.facturasPorProveedor.set(proveedorId, facturasProveedor);

   console.log("FACTURAS DEL PROVEEDOR: ", facturasProveedor);  

  }

  cerrarTabla(index: number){
    this.mostrarTablaProveedor[index] = !this.mostrarTablaProveedor[index];
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

  liquidarFacProveedor(idChofer: any, razonSocial: string, index: number){
    // Obtener las facturas del cliente
    //console.log("IDCHOFER: ", idChofer);
    
    let facturasIdChofer:any = this.facturasPorProveedor.get(idChofer);    
    ////console.log("FACTURAS POR CHOFER: ", facturasIdChofer );
    

    this.razonSocial = razonSocial;
    //console.log("razonSocial: ", this.razonSocial);
    
    // Filtrar las facturas con liquidacion=true y guardarlas en un nuevo array
    this.facturasLiquidadasProveedor = facturasIdChofer.filter((factura: FacturaOpProveedor) => {
        return factura.liquidacion === true;
    });

    // Calcular el total sumando los montos de las facturas liquidadas
    this.totalFacturasLiquidadasProveedor = 0;
    this.facturasLiquidadasProveedor.forEach((factura: FacturaOpProveedor) => {
      this.totalFacturasLiquidadasProveedor += factura.total;
    });

    this.totalFacturasLiquidadasCliente = 0;
    this.facturasLiquidadasProveedor.forEach((factura: FacturaOpProveedor) => {
      this.totalFacturasLiquidadasCliente += factura.montoFacturaCliente;
    });

    this.indiceSeleccionado = index;
    //console.log("Facturas liquidadas del cliente", razonSocial + ":", this.facturasLiquidadasProveedor);
    //console.log("Total de las facturas liquidadas:", this.totalFacturasLiquidadasProveedor);
    //console.log("indice: ", this.indiceSeleccionado);
    
  }
  

  editarDetalle(factura:FacturaOpProveedor){
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
    this.storageService.updateItem("FacturaOpProveedor", this.facturaEditada);


  }

  onSubmit() {
    //console.log(this.facturasLiquidadasProveedor);
    //console.log(this.form.value);
    if(this.facturasLiquidadasProveedor.length > 0){

      console.log(this.facturasLiquidadasProveedor);
      
      this.facturasLiquidadasProveedor.forEach((factura: FacturaOpProveedor) => {
        /* idOperaciones.push(factura.operacion.idOperacion) */
        
        this.idOperaciones.push(factura.operacion.idOperacion)
      });
 
      console.log("ID OPERACIONES: ", this.idOperaciones);
      //this.facturaChofer.operaciones = idOperaciones;

      this.facturaProveedor = {
        id: null,
        fecha: new Date().toISOString().split('T')[0],
        idFacturaProveedor: new Date().getTime(),
        idProveedor: this.facturasLiquidadasProveedor[0].idProveedor,
        razonSocial: this.facturasLiquidadasProveedor[0].operacion.chofer.proveedor,
        operaciones: this.idOperaciones,
        total: this.totalFacturasLiquidadasProveedor,
        cobrado:false,
        montoFacturaCliente: this.totalFacturasLiquidadasCliente,
      }

      //console.log("FACTURA PROVEEDOR: ", this.facturaProveedor);
      
      this.addItem(this.facturaProveedor, this.componente);
      this.form.reset();
      //this.$tarifasChofer = null;
      //this.ngOnInit();
      this.eliminarFacturasOp();
      this.excelServ.exportToExcelProveedor(this.facturaProveedor, this.facturasLiquidadasProveedor);
      this.pdfServ.exportToPdfProveedor(this.facturaProveedor, this.facturasLiquidadasProveedor);
    }else{
      alert("no hay facturas")
    }
    
    

  }

  addItem(item:any, componente:string): void {   
    this.storageService.addItem(componente, item);     
    
  } 

  eliminarFacturasOp(){
    this.idOperaciones = [];
    this.facturasLiquidadasProveedor.forEach((factura: FacturaOpProveedor) => {
      this.addItem(factura, "facOpLiqProveedor");
      this.removeItem(factura);
    }); 
    /* this.facturaProveedor.operaciones.forEach((factura: FacturaOpProveedor) => {
      this.removeItem(factura);
    }); */
    this.cerrarTabla(this.indiceSeleccionado);
    this.ngOnInit();
  }

  removeItem(item:any){
    this.storageService.deleteItem("facturaOpProveedor", item);    
  }

  editarFacturaOpProveedor(factura: FacturaOpProveedor){
    this.facDetallada = factura;
    console.log(this.facDetallada);
    let tarifaAplicada: any;
    this.ultimaTarifa = this.facOpProveedorService.obtenerTarifaProveedor(factura)
    console.log("ULTIMA tarifa: ", this.ultimaTarifa);
    //this.tarifaEspecial = factura.operacion.tarifaEspecial
    this.armarTarifa(factura);
    
  } 

  eliminarFacturaOpChofer(factura:FacturaOpProveedor, indice:number){
    this.removeItem(factura);
    this.cerrarTabla(indice)
    this.ngOnInit(); 
  }

  armarTarifa(factura: FacturaOpProveedor){
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
    const switchValue = !this.swichForm.get('tarifaEspecial').value;
    console.log("Estado del switch:", switchValue);
    
  }  

  onSubmitEdit(){
    this.nuevaTarifa()
    this.storageService.addItem("tarifasProveedor", this.ultimaTarifa);     
    let nuevaFacOpProveedor = this.facOpProveedorService.actualizarFacOp(this.facturaEditada, this.ultimaTarifa);    
    console.log("nueva FACOPCLIENTE",nuevaFacOpProveedor);
    this.facturaEditada.operacion = nuevaFacOpProveedor.operacion;
    this.facturaEditada.valorJornada = nuevaFacOpProveedor.valorJornada;
    this.facturaEditada.adicional = nuevaFacOpProveedor.adicional;
    this.facturaEditada.total = nuevaFacOpProveedor.total;
    this.edicion = false;
    this.facturaEditada.idTarifa = this.ultimaTarifa.idTarifaProveedor;
    console.log("factura op ACTUALIZADA: ", this.facturaEditada);
    
    this.storageService.updateItem("facturaOpProveedor", this.facturaEditada);   
    this.ngOnInit()  
  } 

  nuevaTarifa(){
    this.ultimaTarifa = {
      id:null,
      idTarifaProveedor:new Date().getTime(),
      idProveedor: this.ultimaTarifa.idProveedor,
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

    }

    console.log("NUEVA TARIFA", this.ultimaTarifa);
    this.facturaEditada.operacion.tarifaEspecial = this.tarifaEditForm.value.tarifaEspecial;
    console.log("NUEVA operacion con nueva TARIFA", this.facturaEditada);
    
  }

}
