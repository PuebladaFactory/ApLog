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
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalInformesClienteComponent } from '../modal-informes-cliente/modal-informes-cliente.component';
import { LiquidacionOpComponent } from '../modales/cliente/liquidacion-op/liquidacion-op.component';
import { EditarTarifaComponent } from '../modales/cliente/editar-tarifa/editar-tarifa.component';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { take } from 'rxjs';

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

  
  constructor(private storageService: StorageService, private fb: FormBuilder, private facOpClienteService: FacturacionClienteService, private excelServ: ExcelService, private pdfServ: PdfService, private modalService: NgbModal, private dbFirebase: DbFirestoreService){
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
      //console.log("1)", this.$facturasOpCliente );
      
      this.procesarDatosParaTabla()
    });
    
    //this.consultaMes(); 
  }

  procesarDatosParaTabla() {
    const clientesMap = new Map<number, any>();

    if(this.$facturasOpCliente !== null){
      ////console.log()("Facturas OP CLiente: ", this.$facturasOpCliente);
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
        
      /*   if(factura.operacion.tarifaEspecial){
          const cliente = clientesMap.get(factura.idCliente);
          cliente.cantOp++;
          if (factura.liquidacion) {
            cliente.opFacturadas += factura.total;
          } else {
            cliente.opSinFacturar += factura.total;
          }
          cliente.total += factura.total;  
        } */
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
      ////console.log()("Datos para la tabla: ", this.datosTablaCliente); 
    }

    
    
  }
 
  liquidarFac(factura: FacturaOpCliente){
    if(typeof factura.total !== "number" || factura.total === 0){
      alert("error")
    } else{
      ////console.log()("esta es la FACTURA: ", factura);
      factura.liquidacion = true;
      console.log("llamada al storage desde liq-cliente, updateItem");
      this.storageService.updateItem(this.tituloFacOpCliente, factura)
      this.procesarDatosParaTabla();     
    }
  }

  cancelarliquidacion(factura: FacturaOpCliente) {
    factura.liquidacion = false;
    console.log("llamada al storage desde liq-cliente, updateItem");
    this.storageService.updateItem(this.tituloFacOpCliente, factura)
    this.procesarDatosParaTabla();     
  }

  mostrarMasDatos(index: number, cliente:any) {   
   // Cambiar el estado del botón en la posición indicada
   this.mostrarTablaCliente[index] = !this.mostrarTablaCliente[index];
   ////console.log()("CLIENTE: ", cliente);

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
    ////console.log()("1: ",this.facturasLiquidadasCliente.length);
    
    let facturasIdCliente:any = this.facturasPorCliente.get(idCliente);
    this.razonSocFac = razonSocial;
    // Filtrar las facturas con liquidacion=true y guardarlas en un nuevo array
    this.facturasLiquidadasCliente = facturasIdCliente.filter((factura: FacturaOpCliente) => {
        return factura.liquidacion === true;
    });
    ////console.log()("2: ",this.facturasLiquidadasCliente);
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
    ////console.log()("3) Facturas liquidadas del cliente", razonSocial + ":", this.facturasLiquidadasCliente);
    ////console.log()("Total de las facturas liquidadas:", this.totalFacturasLiquidadas);
    ////console.log()("indice: ", this.indiceSeleccionado);
    this.openModalLiquidacion();
  }
  


  addItem(item:any, componente:string): void {   
    console.log("llamada al storage desde liq-cliente, addItem");
    this.storageService.addItem(componente, item);     
   
  } 

  eliminarFacturasOp(){
    this.idOperaciones = [];
    this.facturasLiquidadasCliente.forEach((factura: FacturaOpCliente) => {
      console.log("llamada al storage desde liq-cliente, addItem");
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
    console.log("llamada al storage desde liq-cliente, deleteItem");
    this.storageService.deleteItem("facturaOpCliente", item);    
  }

  editarFacturaOpChofer(factura: FacturaOpCliente){
   /*  this.storageService.historialTarifasClientes$.subscribe(data => {      
      this.ultimaTarifa = data;
      //this.openModalTarifa();
    }) */
    
    
    this.facDetallada = factura;
    ////console.log()(this.facDetallada);
    //let tarifaAplicada: any;
    //this.ultimaTarifa = this.facOpClienteService.obtenerTarifaCliente(factura)
   
    
    ////console.log()("ULTIMA tarifa: ", this.ultimaTarifa);
    //this.tarifaEspecial = factura.operacion.tarifaEspecial
    //this.armarTarifa(factura);
    this.buscarTarifa();
    //this.openModalTarifa();
  } 

  eliminarFacturaOpChofer(factura:FacturaOpCliente, indice:number){
    this.removeItem(factura);
    this.cerrarTabla(indice)
    this.ngOnInit(); 
  }


  openModalLiquidacion(): void {   
    //this.facturasLiquidadasCliente
    //this.totalFacturasLiquidadasChofer
    //this.totalFacturasLiquidadasCliente

    this.indiceSeleccionado
    {
      const modalRef = this.modalService.open(LiquidacionOpComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'lg', 
        //backdrop:"static" 
      });
      
    let info = {      
        facturas: this.facturasLiquidadasCliente,
        totalCliente: this.totalFacturasLiquidadasCliente,
        totalChofer: this.totalFacturasLiquidadasChofer,
      }; 
      //console.log()(info);
      
      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
          
          this.facturaCliente = result.factura;
//        this.selectCrudOp(result.op, result.item);
        //this.mostrarMasDatos(row);
         //console.log()("resultado:" ,this.facturaCliente);
         this.addItem(this.facturaCliente, this.componente);
         //this.form.reset();
        //this.$tarifasChofer = null;
        //this.ngOnInit();
        this.eliminarFacturasOp();
      
        if(result.titulo === "excel"){
        this.excelServ.exportToExcelCliente(this.facturaCliente, this.facturasLiquidadasCliente);
        }else if (result.titulo === "pdf"){
        this.pdfServ.exportToPdfCliente(this.facturaCliente, this.facturasLiquidadasCliente);
        }
        },
        (reason) => {}
      );
    }
  }

  buscarTarifa() {
    this.dbFirebase
    .obtenerTarifaIdTarifa("tarifasCliente",this.facDetallada.idTarifa, "idTarifa")
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
/*     this.storageService.historialTarifasClientes$.subscribe(data => {      
      this.ultimaTarifa = data;
      //this.openModalTarifa();
    }) */
    //this.facOpClienteService.obtenerTarifaCliente(this.facDetallada)
    this.indiceSeleccionado
    {
      const modalRef = this.modalService.open(EditarTarifaComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'lg', 
        //backdrop:"static" 
      });
      

     let info = {
        factura: this.facDetallada,
        tarifaAplicada: this.ultimaTarifa,        
      }; 
      console.log(info); 
      
      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
          

        },
        (reason) => {}
      );
    }
  }

}
