import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FacturaChofer } from 'src/app/interfaces/factura-chofer';
import { FacturaOpChofer } from 'src/app/interfaces/factura-op-chofer';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
import { Operacion } from 'src/app/interfaces/operacion';
import { FacturacionChoferService } from 'src/app/servicios/facturacion/facturacion-chofer/facturacion-chofer.service';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { PdfService } from 'src/app/servicios/informes/pdf/pdf.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { EditarTarifaChoferComponent } from '../modales/chofer/editar-tarifa-chofer/editar-tarifa-chofer.component';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { take } from 'rxjs';
import { LiquidacionOpChoferComponent } from '../modales/chofer/liquidacion-op-chofer/liquidacion-op-chofer.component';

@Component({
  selector: 'app-liq-chofer',
  templateUrl: './liq-chofer.component.html',
  styleUrls: ['./liq-chofer.component.scss']
})
export class LiqChoferComponent implements OnInit {

  @Input() fechasConsulta?: any = {
    fechaDesde: 0,
    fechaHasta: 0,
  };

  //btnConsulta:boolean = false;
  searchText!:string;
  searchText2!:string;
  componente: string = "facturaChofer";
  $facturasOpChofer: any;
  date:any = new Date();
  primerDia: any = new Date(this.date.getFullYear(), this.date.getMonth() , 1).toISOString().split('T')[0];
  ultimoDia:any = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).toISOString().split('T')[0];  
  datosTablaChofer: any[] = [];
  mostrarTablaChofer: boolean[] = [];
  tablaDetalle: any[] = [];
  tituloFacOpChofer: string = "facturaOpChofer";
  facturasLiquidadasChofer: any[] = []; // Nuevo array para almacenar las facturas liquidadas
  totalFacturasLiquidadasChofer: number = 0; // Variable para almacenar el total de las facturas liquidadas
  totalFacturasLiquidadasCliente: number = 0; // Variable para almacenar el total de las facturas liquidadas
  apellido!: string ;
  form!: any;
  facturaChofer!: FacturaChofer;  
  facturaEditada!: FacturaOpChofer;
  facturasPorChofer: Map<number, FacturaOpChofer[]> = new Map<number, FacturaOpChofer[]>();
  indiceSeleccionado!:number
  ultimaTarifa!:any;
  tarifaEditForm: any;
  swichForm:any;
  edicion:boolean = false;
  tarifaEspecial: boolean = false;
  idOperaciones: number [] = [];
  facDetallada!: FacturaOpChofer
  
  constructor(private storageService: StorageService, private fb: FormBuilder, private facOpChoferService: FacturacionChoferService, private excelServ: ExcelService, private pdfServ: PdfService, private modalService: NgbModal, private dbFirebase: DbFirestoreService){
    // Inicializar el array para que todos los botones muestren la tabla cerrada al principio
    this.mostrarTablaChofer = new Array(this.datosTablaChofer.length).fill(false);
    this.form = this.fb.group({      
      detalle: [""],       
    })
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
    })

    this.swichForm = this.fb.group({
      tarifaEspecial: [false],   
    })
  }

  ngOnInit(): void {
      
    //this.storageService.getByDateValue(this.tituloFacOpChofer, "fecha", this.primerDia, this.ultimoDia, "consultasFacOpChofer");
    this.storageService.consultasFacOpChofer$.subscribe(data => {
      this.$facturasOpChofer = data;
      this.procesarDatosParaTabla()
      
      
    });
    
    //this.consultaMes(); 
  }

  
  
  procesarDatosParaTabla() {
    const choferesMap = new Map<number, any>();

    if(this.$facturasOpChofer !== null){
      ////console.log()("Facturas OP Chofer: ", this.$facturasOpChofer);
      
      this.$facturasOpChofer.forEach((factura: FacturaOpChofer) => {
        if (!choferesMap.has(factura.idChofer)) {
          choferesMap.set(factura.idChofer, {
            idChofer: factura.idChofer,
            apellido: `${factura.operacion.chofer.apellido} ${factura.operacion.chofer.nombre}`,
            cantOp: 0,
            opSinFacturar: 0,
            opFacturadas: 0,
            total: 0
          });
        }
  
        const chofer = choferesMap.get(factura.idChofer);
        chofer.cantOp++;
        if(typeof factura.total === "number"){
          if (factura.liquidacion) {
            chofer.opFacturadas += factura.total;
          } else {
            chofer.opSinFacturar += factura.total;
          }
          chofer.total += factura.total;
        }
        
      });
  
      this.datosTablaChofer = Array.from(choferesMap.values());
      ////console.log()("Datos para la tabla: ", this.datosTablaChofer); 
    }

    
    
  }
 
  liquidarFac(factura: FacturaOpChofer){
    if(typeof factura.total !== "number" || factura.total === 0){
      alert("error")
    } else{
      //console.log()("esta es la FACTURA: ", factura);
      factura.liquidacion = true;
      console.log("llamada al storage desde liq-chofer, updateItem");      
      this.storageService.updateItem(this.tituloFacOpChofer, factura)
      this.procesarDatosParaTabla();     
    }
    
  }

  cancelarliquidacion(factura: FacturaOpChofer) {
    factura.liquidacion = false;
    console.log("llamada al storage desde liq-chofer, updateItem");
    this.storageService.updateItem(this.tituloFacOpChofer, factura)
    this.procesarDatosParaTabla();     
  }

  mostrarMasDatos(index: number, chofer:any) {   
   // Cambiar el estado del botón en la posición indicada
   this.mostrarTablaChofer[index] = !this.mostrarTablaChofer[index];
   //////console.log()("Chofer: ", chofer);

   // Obtener el id del cliente utilizando el índice proporcionado
   let choferId = this.datosTablaChofer[index].idChofer;

   // Filtrar las facturas según el id del cliente y almacenarlas en el mapa
   let facturasChofer = this.$facturasOpChofer.filter((factura: FacturaOpChofer) => {
       return factura.idChofer === choferId;
   });
   this.facturasPorChofer.set(choferId, facturasChofer);

   ////console.log()("FACTURAS DEL CHOFER: ", facturasChofer);  

  }

  cerrarTabla(index: number){
    this.mostrarTablaChofer[index] = !this.mostrarTablaChofer[index];
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

  liquidarFacChofer(idChofer: any, apellido: string, index: number){
    // Obtener las facturas del cliente
    //////console.log()("IDCHOFER: ", idChofer);
    
    let facturasIdChofer:any = this.facturasPorChofer.get(idChofer);    
    ////////console.log()("FACTURAS POR CHOFER: ", facturasIdChofer );
    

    this.apellido = apellido;
    //////console.log()("APELLIDO: ", this.apellido);
    
    // Filtrar las facturas con liquidacion=true y guardarlas en un nuevo array
    this.facturasLiquidadasChofer = facturasIdChofer.filter((factura: FacturaOpChofer) => {
        return factura.liquidacion === true;
    });

    // Calcular el total sumando los montos de las facturas liquidadas
    this.totalFacturasLiquidadasChofer = 0;
    this.facturasLiquidadasChofer.forEach((factura: FacturaOpChofer) => {
      this.totalFacturasLiquidadasChofer += factura.total;
    });

    this.totalFacturasLiquidadasCliente = 0;
    this.facturasLiquidadasChofer.forEach((factura: FacturaOpChofer) => {
      this.totalFacturasLiquidadasCliente += factura.montoFacturaCliente;
    });

    this.indiceSeleccionado = index;
    //console.log()("Facturas liquidadas del cliente", apellido + ":", this.facturasLiquidadasChofer);
    //console.log()("Fecha", apellido + ":", this.facturasLiquidadasChofer[0].fecha);
    ////console.log()("Total de las facturas liquidadas chofer:", this.totalFacturasLiquidadasChofer);
    ////console.log()("Total de las facturas liquidadas cliente:", this.totalFacturasLiquidadasCliente);
    //////console.log()("indice: ", this.indiceSeleccionado);
    this.openModalLiquidacion();
  }
  

  editarDetalle(factura:FacturaOpChofer){
    this.facturaEditada = factura;
    //////console.log()(this.facturaEditada);
    this.form.patchValue({
      detalle: factura.operacion.observaciones,      
    });    
  }

  guardarDetalle(){    
    //////console.log()(this.facturaEditada);
    this.facturaEditada.operacion.observaciones = this.form.value.detalle;
    //////console.log()(this.facturaEditada.operacion.observaciones);
    console.log("llamada al storage desde liq-chofer, updateItem");
    this.storageService.updateItem("facturaOpChofer", this.facturaEditada);


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
      
      this.addItem(this.facturaChofer, this.componente);
      this.form.reset();
      //this.$tarifasChofer = null;    
      this.eliminarFacturasOp();
      //this.ngOnInit();
      if(titulo === "excel"){
        this.excelServ.exportToExcelChofer(this.facturaChofer, this.facturasLiquidadasChofer);
      }else if (titulo === "pdf"){
        this.pdfServ.exportToPdfChofer(this.facturaChofer, this.facturasLiquidadasChofer);
      }
      
      
    }else{
      alert("no hay facturas")
    }
    
    

  }

  addItem(item:any, componente:string): void {  
    console.log("llamada al storage desde liq-chofer, addItem"); 
    this.storageService.addItem(componente, item);     
    
  } 

  eliminarFacturasOp(){
    this.idOperaciones = [];
    this.facturasLiquidadasChofer.forEach((factura: FacturaOpChofer) => {
      console.log("llamada al storage desde liq-chofer, addItem");
      this.addItem(factura, "facOpLiqChofer");
      this.removeItem(factura);
    }); 
    /* this.facturaChofer.operaciones.forEach((factura: FacturaOpChofer) => {
      this.removeItem(factura);
    });  */
    this.cerrarTabla(this.indiceSeleccionado);
    this.ngOnInit(); 
  }

  removeItem(item:any){
    console.log("llamada al storage desde liq-chofer, deleteItem");
    this.storageService.deleteItem("facturaOpChofer", item);    
  }

  editarFacturaOpChofer(factura: FacturaOpChofer){
    this.ultimaTarifa = this.facOpChoferService.obtenerTarifaChofer(factura);
    this.facDetallada = factura;
    //console.log()(this.facDetallada);
    
    //console.log()("ULTIMA tarifa: ", this.ultimaTarifa);
    //this.tarifaEspecial = factura.operacion.tarifaEspecial
    //this.armarTarifa(factura);
    this.buscarTarifa();
    //this.openModalTarifa();
    
  }

  eliminarFacturaOpChofer(factura:FacturaOpChofer, indice:number){
    this.removeItem(factura);
    this.cerrarTabla(indice)
    this.ngOnInit(); 
  }

  armarTarifa(factura: FacturaOpChofer){
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
    });
    this.swichForm.patchValue({
      tarifaEspecial: factura.operacion.tarifaEspecial,
    })
    //console.log()(factura.operacion.tarifaEspecial);
    
    //console.log()(this.swichForm.value.tarifaEspecial);      
    this.facturaEditada = factura;
    
  }

  modificarTarifa(){
    this.edicion = !this.edicion;
  }

  cerrarEdicion(){
    this.edicion = false;
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
    this.facturaEditada.operacion.tarifaEspecial = this.swichForm.value.tarifaEspecial;
    //console.log()("NUEVA operacion con nueva TARIFA", this.facturaEditada);

  }

  openModalLiquidacion(): void {   
    //this.facturasLiquidadasCliente
    //this.totalFacturasLiquidadasChofer
    //this.totalFacturasLiquidadasCliente

    this.indiceSeleccionado
    {
      const modalRef = this.modalService.open(LiquidacionOpChoferComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'lg', 
        //backdrop:"static" 
      });
      
    let info = {      
        facturas: this.facturasLiquidadasChofer,
        totalCliente: this.totalFacturasLiquidadasCliente,
        totalChofer: this.totalFacturasLiquidadasChofer,
      }; 
      //console.log()(info);
      
      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
          
          this.facturaChofer = result.factura;
//        this.selectCrudOp(result.op, result.item);
        //this.mostrarMasDatos(row);
         //console.log()("resultado:" ,this.facturaCliente);
         this.addItem(this.facturaChofer, this.componente);
         //this.form.reset();
        //this.$tarifasChofer = null;
        //this.ngOnInit();
        this.eliminarFacturasOp();
      
        if(result.titulo === "excel"){
        this.excelServ.exportToExcelChofer(this.facturaChofer, this.facturasLiquidadasChofer);
        }else if (result.titulo === "pdf"){
        this.pdfServ.exportToPdfChofer(this.facturaChofer, this.facturasLiquidadasChofer);
        }
        },
        (reason) => {}
      );
    }
  }

  buscarTarifa() {
    this.dbFirebase
    .obtenerTarifaIdTarifa("tarifasChofer",this.facDetallada.idTarifa, "idTarifa")
    .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
    .subscribe(data => {      
        this.ultimaTarifa = data;
        console.log("TARIFA APLICADA: ", this.ultimaTarifa);
        this.openModalTarifa()
    });
  }

  openModalTarifa(): void {   
    //this.facturasLiquidadasCliente
    //this.totalFacturasLiquidadasChofer
    //this.totalFacturasLiquidadasCliente

    this.indiceSeleccionado
    {
      const modalRef = this.modalService.open(EditarTarifaChoferComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'md', 
        //backdrop:"static" 
      });
      

      let info = {
        factura: this.facDetallada,
        tarifaAplicada: this.ultimaTarifa,        
      };
      //console.log()(info);
      
      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
          

        },
        (reason) => {}
      );
    }
  }



}
