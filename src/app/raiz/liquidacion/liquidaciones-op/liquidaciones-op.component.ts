import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, take, takeUntil } from 'rxjs';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { InformeOp } from 'src/app/interfaces/informe-op';
import { Operacion } from 'src/app/interfaces/operacion';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { PdfService } from 'src/app/servicios/informes/pdf/pdf.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';
import { ResumenOpLiquidadasComponent } from '../modales/resumen-op-liquidadas/resumen-op-liquidadas.component';
import { InformeLiq } from 'src/app/interfaces/informe-liq';
import { BuscarTarifaService } from 'src/app/servicios/buscarTarifa/buscar-tarifa.service';
import { EditarTarifaOpComponent } from '../modales/editar-tarifa-op/editar-tarifa-op.component';
import { ModalBajaComponent } from 'src/app/shared/modal-baja/modal-baja.component';
import { TableroService } from 'src/app/servicios/tablero/tablero.service';

@Component({
  selector: 'app-liquidaciones-op',
  standalone:false, 
  templateUrl: './liquidaciones-op.component.html',
  styleUrl: './liquidaciones-op.component.scss'
})
export class LiquidacionesOpComponent implements OnInit {

  @Input() fechasConsulta?: any = {
    fechaDesde: 0,
    fechaHasta: 0,
  };
  
  llamadaOrigen: string = "";
  componente: string = "";
  componenteBaja: string = "";
  compInformeLiquidacion: string = 'resumenLiq';
  private destroy$ = new Subject<void>();
  choferes!: ConIdType<Chofer>[];
  clientes!: ConIdType<Cliente>[];
  proveedores!: ConIdType<Proveedor>[]; 
  btnConsulta: boolean = false;
  informesOp: ConId<InformeOp>[] = [];
  datosTabla: any[] = [];
  opAbiertas!: ConId<Operacion>[];
  isLoading: boolean = false;
  proformas: ConId<any> [] = [];
  informesDetalladoPorObjeto: Map<number, InformeOp[]> = new Map<number, InformeOp[]>();
  mostrarTabla: boolean[] = [];
  informesLiquidados: any[] = []; // Nuevo array para almacenar las facturas liquidadas
  razonSocFac!: string ;
  totalInformesLiquidados: number = 0; // Variable para almacenar el total de las facturas liquidadas
  totalInformesLiquidadosContraParte: number = 0 ; // Variable para almacenar el total de las facturas liquidadas
  indiceSeleccionado!:number;
  informeDeLiquidacion!: InformeLiq;
  informeDetallado!: ConId<InformeOp>;
  operacion!:ConId<Operacion>;
  tarifaAplicada:any;
  ordenColumna: string = '';
  ordenAscendente: boolean = true;
  columnaOrdenada: string = '';
  searchText!:string;
  searchText2!:string;
  searchText3!:string;

  ///////////////////////VARIABLES POR ERROR DE DUPLICADAS///////////////////////////////////////////
  $facturasOpDuplicadas: ConId<InformeOp>[] = [];
  $facLiqOpDuplicadas: ConId<InformeOp>[] = [];  
  objetoEditado: ConId<InformeOp>[] = [];  
  facturaOpsNoAsignadas: any[] = []
  constructor(
    private router: Router, 
    private storageService: StorageService,
    private excelServ: ExcelService, 
    private pdfServ: PdfService, 
    private modalService: NgbModal, 
    private dbFirebase: DbFirestoreService,
    private buscarTarifaServ: BuscarTarifaService,
    private tableroServ: TableroService
  ){}

  ngOnInit(): void {
    // Obtenemos la URL completa y dividimos los segmentos para obtener el módulo de origen
    const urlSegments = this.router.url.split('/');
    //console.log('urlSegments:', urlSegments);
    if (urlSegments.length > 1) {
      this.llamadaOrigen = urlSegments[2]; // Esto será 'clientes' o 'choferes'
      //console.log('Módulo origen:', this.llamadaOrigen);
    }
    this.componente = this.llamadaOrigen === 'cliente' ? 'informesOpClientes' : this.llamadaOrigen === 'chofer' ? 'informesOpChoferes' : 'informesOpProveedores';
    this.componenteBaja = this.llamadaOrigen === 'cliente' ? 'infOpLiqClientes' : this.llamadaOrigen === 'chofer' ? 'infOpLiqChoferes' : 'infOpLiqProveedores';    
    this.storageService.getObservable<ConIdType<Chofer>>("choferes")
      .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
      .subscribe(data => {
        this.choferes = data;
        this.choferes = this.choferes.sort((a, b) => a.apellido.localeCompare(b.apellido)); // Ordena por el nombre del chofer
      });
      this.storageService.getObservable<ConIdType<Cliente>>("clientes")
      .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
      .subscribe(data => {
        this.clientes = data;
        this.clientes = this.clientes.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
      }); 
      this.storageService.getObservable<ConIdType<Proveedor>>("proveedores")
      .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
      .subscribe(data => {
        this.proveedores = data;
        this.proveedores = this.proveedores.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
      });  
  
      this.storageService.fechasConsulta$
      .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
      .subscribe(data => {
        this.fechasConsulta = data;
        
        this.storageService.syncChangesDateValue<InformeOp>(this.componente, "fecha", this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta, "desc");
        this.btnConsulta = true;
        
        this.storageService.getObservable<ConId<InformeOp>>(this.componente)
          .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
          .subscribe(data => {
            this.informesOp = data;
            //console.log("1)", this.informesOp );
            if(this.informesOp){
              //////////console.log("?????????????");                   
              this.procesarDatosParaTabla();
              this.verificarDuplicados();
            } else {
              this.mensajesError("error: facturaOpCliente", "error")
            }
            
        });
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  procesarDatosParaTabla() {
    const informesMap = new Map<number, any>();    

    if(this.informesOp !== null){
      //////////////console.log()("Facturas OP CLiente: ", this.$facturasOpCliente);
      this.informesOp.forEach((inf: InformeOp) => {
        let idObjeto = this.llamadaOrigen === 'cliente' ? inf.idCliente : this.llamadaOrigen === 'chofer' ? inf.idChofer : inf.idProveedor;
        if (!informesMap.has(idObjeto)) {
          informesMap.set(idObjeto, {
            id: idObjeto,
            razonSocial: this.getRazonSocial(idObjeto),
            opCerradas: 0,
            opAbiertas: 0,
            opSinFacturar: 0,
            opFacturadas: 0,
            total: 0,
            aPagar: 0,
            aCobrar: 0,
            ganancia: 0,
          });
        }
      
        const objInf = informesMap.get(idObjeto);
        objInf.opCerradas++;
        if (inf.liquidacion) {
          objInf.opFacturadas += inf.valores.total;
        } else {
          objInf.opSinFacturar += inf.valores.total;
        }
        objInf.total += inf.valores.total;
        if(this.llamadaOrigen === 'cliente'){
          objInf.aPagar += inf.contraParteMonto;   
          objInf.ganancia = 100-((objInf.aPagar*100)/objInf.total);
        } else {
          objInf.aCobrar += inf.contraParteMonto;   
          objInf.ganancia = 100-((objInf.total*100)/objInf.aCobrar);
        }       
        
        
      });      
  
      this.datosTabla = Array.from(informesMap.values());
      this.datosTabla = this.datosTabla.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
      ////console.log("Datos para la tabla: ", this.datosTablaCliente); 
      this.dbFirebase.getAllByDateValueField<Operacion>('operaciones', 'fecha', this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta, "estado.abierta", true).subscribe(data=>{      
        if(data){
          this.opAbiertas = data;
          this.opAbiertas = this.opAbiertas.filter((op:Operacion)=> op.estado.abierta)
          //////////console.log("this.opAbiertas", this.opAbiertas.length);    
          this.datosTabla.forEach(c=>{
            c.opAbiertas = this.getOpAbiertas(c.id)
          })        
        }      
        });      
      }
    //console.log("this.datosTabla: ", this.datosTabla);
      
  }
  
  getOpAbiertas(id:number){
    if(this.opAbiertas !== undefined){
      let cantOpAbiertas = this.opAbiertas.filter((op:Operacion)=>{
        let idObjeto = this.llamadaOrigen === 'cliente' ? op.cliente.idCliente : this.llamadaOrigen === 'chofer' ? op.chofer.idChofer : op.chofer.idProveedor;
        return idObjeto === id
      })
    
      return cantOpAbiertas.length
    } else{
      return 0 
    }
  
  }

  getRazonSocial(id:number):string{
    let razonSocial = this.llamadaOrigen === 'cliente' ? this.getCliente(id) : this.llamadaOrigen === 'chofer' ? this.getChofer(id) : this.getProveedor(id);
    return razonSocial;
  }

  getCliente(id: number): string{
    let cliente = this.clientes.find((cliente:Cliente)=>{
      return cliente.idCliente === id;
    })
    if(cliente){
      return cliente.razonSocial;
    } else {
      return `Cliente dado de baja. idCliente ${id}`;
    }
  }

  getChofer(id: number):string{
    let chofer = this.choferes.find((chofer:Chofer)=>{
      return chofer.idChofer === id;
    })
    if(chofer){
      return chofer.apellido + " " + chofer.nombre; 
    } else {
      return `Chofer dado de baja. idChofer ${id}`;
    }
  
  }

  getProveedor(id: number):string{
    let proveedor = this.proveedores.find((proveedor:Proveedor)=>{
      return proveedor.idProveedor === id;
    })
    if(proveedor){
      return proveedor.razonSocial;
    } else {
      return `Proveedor dado de baja. idProveedor ${id}`;
    }
  }

  mostrarMasDatos(index: number) {   
    // Cambiar el estado del botón en la posición indicada
    this.mostrarTabla[index] = !this.mostrarTabla[index];   

    // Obtener el id del objeto utilizando el índice proporcionado
    let objId = this.datosTabla[index].id;
      //////console.log("clienteId: ", clienteId);
      
    // Filtrar las informes según el id del objeto y almacenarlas en el mapa
    let informesObjetoId = this.informesOp.filter((inf: InformeOp) => {
        let idObjeto = this.llamadaOrigen === 'cliente' ? inf.idCliente : this.llamadaOrigen === 'chofer' ? inf.idChofer : inf.idProveedor;
        return idObjeto === objId;
    });
    this.informesDetalladoPorObjeto.set(objId, informesObjetoId);
    //////console.log("FACTURAS DEL CLIENTE: ", facturasCliente);
    //this.buscarOpConProformas(facturasCliente, clienteId)     
  }

  liquidarBoleano(informe: InformeOp) {
    informe.liquidacion = !informe.liquidacion;    
    this.procesarDatosParaTabla();
  }

  selectAllCheckboxes(event: any, id: number): void {
    //let isChecked = (event.target as HTMLInputElement).checked;
    const seleccion = event.target.checked;
    //////////console.log("1)", seleccion); 
    let informesObjeto = this.informesDetalladoPorObjeto.get(id);
    //////////console.log("2)", facturasCliente);
      informesObjeto?.forEach((inf: InformeOp) => {
        if(!inf.proforma && !inf.contraParteProforma){
          inf.liquidacion = seleccion;
        }
        
        //////////console.log("3)", factura.liquidacion);
      
      });   
      //////////console.log("primera tabla: ", this.datosTablaCliente);
      let objeto = this.datosTabla.find((obj:any)=>{
        return obj.id === id
      });
      //////////console.log("1) cliente: ", cliente);
      if(seleccion){
        objeto.opFacturadas = 0
        informesObjeto?.forEach((factura: InformeOp) => {                  
            objeto.opFacturadas += factura.valores.total;
            objeto.opSinFacturar = 0;
          });   
      } else {
        objeto.opSinFacturar = 0;
        objeto.opFacturadas = 0;
        informesObjeto?.forEach((factura: InformeOp) => {                
          objeto.opFacturadas += (factura.proforma ? factura.valores.total : 0);
          objeto.opSinFacturar += (!factura.proforma ? factura.valores.total : 0);
        });   
      }
  
      //////////console.log("2) cliente: ", cliente);
    
  }  
  
  cerrarTabla(index: number){
    this.mostrarTabla[index] = !this.mostrarTabla[index];
  }

  getQuincena(fecha: any | Date): string {
    // Convierte la fecha a objeto Date
    const [year, month, day] = fecha.split('-').map(Number);
  
    // Crear la fecha asegurando que tome la zona horaria local
    const date = new Date(year, month - 1, day); // mes - 1 porque los meses en JavaScript son 0-indexed
  
    // Determinar si está en la primera o segunda quincena
    if (day <= 15) {
      return '1<sup> ra</sup>';
    } else {
      return '2<sup> da</sup>';
    }
  }

  liquidarInformesObjeto(objInf: any, index: number){
    // Obtener las facturas del cliente
    
    //console.log("objInf: ", objInf);
    let informesSeleccionados = this.informesOp.filter((inf: InformeOp) => {
        let idObjeto = this.llamadaOrigen === 'cliente' ? inf.idCliente : this.llamadaOrigen === 'chofer' ? inf.idChofer : inf.idProveedor;
        return idObjeto === objInf.id;
    });

    let alertaProforma = informesSeleccionados.some((f: ConId<InformeOp>)=>{ return f.contraParteProforma})
    //console.log("alertaProforma", alertaProforma);
    if(alertaProforma && this.llamadaOrigen === 'cliente'){
      Swal.fire({
          icon: "warning",
          title: "¡Atención!",
          text: "El cliente tiene operaciones asignadas a una proforma de Chofer. Las mismas no se incluyen en la liquidación",
          //footer: '<a href="#">Why do I have this issue?</a>'
        });
    }

    //console.log("informesSeleccionados: ", informesSeleccionados);
    
    if(objInf.opAbiertas > 0){
        Swal.fire({
          icon: "warning",
          title: "¡Atención!",
          text: `El ${this.llamadaOrigen} tiene operaciones abiertas que corresponden al periodo que se esta facturando`,
          //footer: '<a href="#">Why do I have this issue?</a>'
        });
    }

    
    
    
    let informesIdObjeto:any = this.informesDetalladoPorObjeto.get(objInf.id);
    this.razonSocFac = objInf.razonSocial;
    // Filtrar las facturas con liquidacion=true y guardarlas en un nuevo array
    this.informesLiquidados = informesIdObjeto.filter((informe: InformeOp) => {
        return informe.liquidacion === true && informe.proforma === false;
    });

    if(this.informesLiquidados.length > 0){
      //////////console.log("1: ",this.facturasLiquidadasCliente);
      // Calcular el total sumando los montos de las facturas liquidadas
      this.totalInformesLiquidados = 0;
      this.informesLiquidados.forEach((informe: InformeOp) => {
        this.totalInformesLiquidados += informe.valores.total;
      });
  
      this.indiceSeleccionado = index;
      this.buscarOpConProformas(this.informesLiquidados, objInf.id)
      //////////console.log("3) Facturas liquidadas del cliente", cliente.razonSocial + ":", this.facturasLiquidadasCliente);
      //////////console.log("Total de las facturas liquidadas:", this.totalFacturasLiquidadasCliente);
      ////////////console.log("indice: ", this.indiceSeleccionado);
      this.openModalLiquidacion();
    } else {
      this.mensajesError("Debe seleccionar una factura para liquidar", "error")
    }
  
     
  }

  //// CREO QUE YA NO SE USA
  buscarOpConProformas(facturasOpCliente: ConId<InformeOp>[], id:number){
    ////console.log("FACTURAS DEL CLIENTE: ", facturasOpCliente);
    ////console.log("clienteId: ", id);
    //let idObjeto = this.llamadaOrigen === 'cliente' ? 'cliente.idCliente' : this.llamadaOrigen === 'chofer' ? 'chofer.idChofer' : 'chofer.idProveedor';
    this.dbFirebase.buscarColeccionRangoFechaIdCampo<Operacion>('operaciones', this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta, "cliente.idCliente", id, "estado.proformaCh", true).subscribe(data=>{      
      let opProformas: ConId<Operacion>[] = []  
      if(data){
          opProformas = data;          
          ////console.log("opProformas", opProformas);    
          
        }      
    });      
  }

  openModalLiquidacion(): void {   
    //this.facturasLiquidadasCliente
    //this.totalFacturasLiquidadasChofer
    //this.totalFacturasLiquidadasCliente

    this.indiceSeleccionado
    {
      const modalRef = this.modalService.open(ResumenOpLiquidadasComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'xl', 
        //backdrop:"static" 
      });
      
    let info = {
        origen:this.llamadaOrigen,
        facturas: this.informesLiquidados,
        total: this.totalInformesLiquidados,
        //totalChofer: this.totalFacturasLiquidadasChofer,
      }; 
      //////console.log("info: ",info);
      
      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
          //console.log(result);
          
          if(result.modo === "cerrar" || result.modo === "proforma"){
            let titulo = result.titulo
            this.informeDeLiquidacion = result.factura;            
            let accion: string = result.accion;
            if(result.modo === "cerrar"){                            
              this.procesarFacturacion(titulo, accion);              
            }
            if(result.modo === "proforma"){
              this.procesarProforma(titulo, accion);             
            }                       

          } 
          
          },
        (reason) => {}
      );
    }
  }

  procesarFacturacion(titulo:string, accion:string) {
    this.isLoading = true;
    
    this.dbFirebase.procesarLiquidacion(this.informesLiquidados, this.llamadaOrigen, this.componenteBaja, this.componente, this.informeDeLiquidacion, this.compInformeLiquidacion)
    .then((result) => {
      this.isLoading = false;
      //////console.log("resultado: ", result);
      if(result.exito){
        this.storageService.logMultiplesOp(this.informeDeLiquidacion.operaciones, "LIQUIDAR", "operaciones", `Operación del ${this.llamadaOrigen} ${this.informeDeLiquidacion.entidad.razonSocial} Liquidada`,result.exito)
        this.storageService.logSimple(this.informeDeLiquidacion.idInfLiq,"ALTA", this.compInformeLiquidacion, `Alta de Factura del ${this.llamadaOrigen} ${this.informeDeLiquidacion.entidad.razonSocial}`, result.exito )
        Swal.fire({
            icon: "success",
            //title: "Oops...",
            text: 'La liquidación se procesó con éxito.',
            confirmButtonColor: "#3085d6",
            confirmButtonText: "Confirmar",
            //footer: `${msj}`
          }).then(() => {
              Swal.fire({
                title: `¿Desea imprimir el detalle de la liquidación?`,
                //text: "You won't be able to revert this!",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: "Confirmar",
                cancelButtonText: "Cancelar"
              }).then((result) => {
                if (result.isConfirmed) {  
                  if(titulo === "excel"){
                        this.excelServ.exportToExcelInforme(this.informeDeLiquidacion, this.informesLiquidados, this.clientes, this.choferes, accion);
                  }else if (titulo === "pdf"){
                    this.pdfServ.exportToPdfInforme(this.informeDeLiquidacion, this.informesLiquidados, this.clientes, this.choferes, accion);        
                  }
/*                   
                  switch (this.llamadaOrigen){
                    case 'cliente':
                      if(titulo === "excel"){
                        this.excelServ.exportToExcelInforme(this.informeDeLiquidacion, this.informesLiquidados, this.clientes, this.choferes, accion);
                      }else if (titulo === "pdf"){
                        this.pdfServ.exportToPdfInforme(this.informeDeLiquidacion, this.informesLiquidados, this.clientes, this.choferes, accion);        
                      }
                      break;
                    case 'chofer':
                      if(titulo === "excel"){
                        this.excelServ.exportToExcelInforme(this.informeDeLiquidacion, this.informesLiquidados, this.clientes, this.choferes, accion);
                      }else if (titulo === "pdf"){
                        this.pdfServ.exportToPdfInforme(this.informeDeLiquidacion, this.informesLiquidados, this.clientes, this.choferes, accion);        
                      } 
                      break;
                    case 'proveedor':
                      if(titulo === "excel"){
                          this.excelServ.exportToExcelInforme(this.informeDeLiquidacion, this.informesLiquidados, this.clientes, this.choferes, accion);
                        }else if (titulo === "pdf"){          
                          this.pdfServ.exportToPdfInforme(this.informeDeLiquidacion, this.informesLiquidados, this.clientes, this.choferes, accion);
                      }
                      break;  
                    default:
                      this.mensajesError("Error en la impresion de la liquidación", "error");
                  }   */ 
                        
                }
              }); 
          });
        this.mostrarMasDatos(this.indiceSeleccionado);
        this.procesarDatosParaTabla();
      } else {
        this.storageService.logMultiplesOp(this.informeDeLiquidacion.operaciones, "LIQUIDAR", "operaciones", `Operación del ${this.llamadaOrigen} ${this.informeDeLiquidacion.entidad.razonSocial} Liquidada`,result.exito)
        this.storageService.logSimple(this.informeDeLiquidacion.idInfLiq,"ALTA", this.compInformeLiquidacion, `Alta de Factura del ${this.llamadaOrigen} ${this.informeDeLiquidacion.entidad.razonSocial}`, result.exito )
        this.mensajesError(`Ocurrió un error al procesar la facturación: ${result.mensaje}`, "error");
      }
      
      
    })
    .catch((error) => {
      this.isLoading = false;
      console.error(error);
      this.mensajesError('Ocurrió un error al procesar la facturación.', "error");
    });
      
  }

  procesarProforma(titulo:string, accion:string){
    this.isLoading = true;

    this.dbFirebase.procesarProforma(this.informesLiquidados, this.llamadaOrigen, this.componente, this.informeDeLiquidacion, "proforma")
    .then((result) => {
      this.isLoading = false;
      //////console.log("resultado: ", result);
      if(result.exito){
          this.storageService.logMultiplesOp(this.informeDeLiquidacion.operaciones, "PROFORMA", "operaciones", `Proforma de operación del Cliente ${this.informeDeLiquidacion.entidad.razonSocial}`,result.exito)
          this.storageService.logSimple(this.informeDeLiquidacion.idInfLiq,"ALTA", "proforma", `Alta de Proforma del ${this.llamadaOrigen} ${this.informeDeLiquidacion.entidad.razonSocial}`, result.exito )
          Swal.fire({
                icon: "success",
                //title: "Oops...",
                text: 'La proforma se generó con éxito.',
                confirmButtonColor: "#3085d6",
                confirmButtonText: "Confirmar",
                //footer: `${msj}`
              }).then(() => {
                  Swal.fire({
                    title: `¿Desea imprimir la proforma del ${this.llamadaOrigen}?`,
                    //text: "You won't be able to revert this!",
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonColor: "#3085d6",
                    cancelButtonColor: "#d33",
                    confirmButtonText: "Confirmar",
                    cancelButtonText: "Cancelar"
                  }).then((result) => {
                      if (result.isConfirmed) {     
                        switch (this.llamadaOrigen){
                          case 'cliente':
                            if(titulo === "excel"){
                              this.excelServ.exportToExcelInforme(this.informeDeLiquidacion, this.informesLiquidados, this.clientes, this.choferes, accion);
                            }else if (titulo === "pdf"){
                              this.pdfServ.exportToPdfInforme(this.informeDeLiquidacion, this.informesLiquidados, this.clientes, this.choferes, accion);        
                            }
                            break;
                          case 'chofer':
                            if(titulo === "excel"){
                              this.excelServ.exportToExcelInforme(this.informeDeLiquidacion, this.informesLiquidados, this.clientes, this.choferes, accion);
                            }else if (titulo === "pdf"){
                              this.pdfServ.exportToPdfInforme(this.informeDeLiquidacion, this.informesLiquidados, this.clientes, this.choferes, accion);        
                            } 
                            break;
                          case 'proveedor':
                            if(titulo === "excel"){
                                this.excelServ.exportToExcelInforme(this.informeDeLiquidacion, this.informesLiquidados, this.clientes, this.choferes, accion);
                              }else if (titulo === "pdf"){          
                                this.pdfServ.exportToPdfInforme(this.informeDeLiquidacion, this.informesLiquidados, this.clientes, this.choferes, accion);
                            }
                            break;  
                          default:
                        this.mensajesError("Error en la impresion de la liquidación", "error");
                        }   
                      }
                  }); 
              });
              //this.mostrarMasDatos(this.indiceSeleccionado);
              //this.procesarDatosParaTabla()
      } else {
        this.storageService.logMultiplesOp(this.informeDeLiquidacion.operaciones, "PROFORMA", "operaciones", `Proforma de operación del Cliente ${this.informeDeLiquidacion.entidad.razonSocial}`,result.exito)
        this.storageService.logSimple(this.informeDeLiquidacion.idInfLiq,"ALTA", "proforma", `Alta de Proforma del ${this.llamadaOrigen} ${this.informeDeLiquidacion.entidad.razonSocial}`, result.exito )
        this.mensajesError(`Ocurrió un error al procesar la proforma: ${result.mensaje}`, "error");
        //this.mostrarMasDatos(this.indiceSeleccionado);
        //this.procesarDatosParaTabla()
      }
      
    
    })
    .catch((error) => {
      this.isLoading = false;
      console.error(error);
      this.mensajesError('Ocurrió un error al procesar la proforma.', "error");
    });
  }

  async editarInformeOp(informe: ConId<InformeOp>, i: number) {   
    this.informeDetallado = informe;   
    await this.buscarTarifa(i);    
  }

  async buscarTarifa(i: number) {
    this.tarifaAplicada = await this.buscarTarifaServ.buscarTarifa(this.informeDetallado, this.llamadaOrigen);
    //console.log("this.tarifaAplicada", this.tarifaAplicada);
    
    this.buscarOperacion(i);
  }

  buscarOperacion(i:number){
    this.dbFirebase
    .obtenerTarifaIdTarifa("operaciones",this.informeDetallado.idOperacion, "idOperacion")
    .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
    .subscribe(data => {      
        this.operacion = data;
        //////console.log("2) OPERACION: ", this.operacion);
        this.openModalTarifa(i)
    });    
  }

  openModalTarifa(i:number): void {   
    
    this.indiceSeleccionado
    {
      const modalRef = this.modalService.open(EditarTarifaOpComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'lg', 
        //backdrop:"static" 
      });
      
    let origen = this.llamadaOrigen;

      let info = {
        factura: this.informeDetallado,
        tarifaAplicada: this.tarifaAplicada,   
        op: this.operacion,     
        origen: origen,
        componente:"liquidacion",
      }; 
      //////////console.log(info); 
      
      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
          //console.log("result", result);
          
          this.procesarDatosParaTabla();
          //this.cerrarTabla(i)
          let idinformeDetallado = this.llamadaOrigen === 'cliente' ? this.informeDetallado.idCliente : this.llamadaOrigen === 'chofer' ? this.informeDetallado.idChofer : this.informeDetallado.idProveedor;
          let informesObjetoId = this.informesOp.filter((inf: InformeOp) => {
              let idObjeto = this.llamadaOrigen === 'cliente' ? inf.idCliente : this.llamadaOrigen === 'chofer' ? inf.idChofer : inf.idProveedor;
              return idObjeto === idinformeDetallado;
          });
          this.informesDetalladoPorObjeto.set(idinformeDetallado, informesObjetoId);
        },
        (reason) => {}
      );
    }
  }

  bajaInformeOp(informeOp:InformeOp, indice:number){
    Swal.fire({
      title: "¿Desea anular la operación?",
      //text: "No se podrá revertir esta acción",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {        
        this.dbFirebase
          .obtenerTarifaIdTarifa("operaciones", informeOp.idOperacion, "idOperacion")
          .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
          .subscribe(data => {      
              this.operacion = data;
              ////////console.log("OPERACION: ", this.operacion);
              this.openModalBaja(informeOp, indice)
          });               
      }
    });    
  }
  
  async openModalBaja(informeOp:InformeOp, indice:number){
    {
      const modalRef = this.modalService.open(ModalBajaComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        scrollable: true, 
        size: 'sm',     
      });       
      //////console.log("factura",factura);
      let info = {
        modo: "liquidaciones",
        item: this.operacion,
      }  
      
      
      modalRef.componentInstance.fromParent = info;
      try {
        const motivo = await modalRef.result;
        if(!motivo) return
        this.isLoading = true;  
        let coleccionContraParte = this.llamadaOrigen === 'cliente' &&  this.operacion.chofer.idProveedor === 0 ? 'informesOpChoferes' : this.llamadaOrigen === 'cliente' &&  this.operacion.chofer.idProveedor !== 0 ? 'informesOpProveedores' : 'informesOpClientes';
        const resultado = await this.dbFirebase.eliminarOperacionEInformes(this.operacion,this.componente, coleccionContraParte);
        if (resultado.success) {
          await this.tableroServ.anularOpEnTablero(this.operacion)
          await this.storageService.addSimpleLogPapelera("operaciones",this.operacion,this.operacion.idOperacion, "BAJA",'Baja de operación desde Liquidaciones', motivo)
          this.isLoading = false;
          Swal.fire({
          title: "Confirmado",
          text: "La operación ha sido anulada",
          icon: "success"
        });
        this.cerrarTabla(indice)
        this.ngOnInit(); 
        
        } else {
          this.isLoading = false;
          Swal.fire({
          title: "Error",
          text: `${resultado.mensaje}`,
          icon: "error"
        });
        }      

      } catch (e) {
        console.warn("El modal fue cancelado o falló:", e);
      }

    }
  }

  removeItem(item:any){
    //////console.log("llamada al storage desde liq-cliente, deleteItem");
    this.storageService.deleteItem(this.componente, item, item.idInfLiq, "INTERNA", "");    
  }

  ordenar(columna: string): void {
    if (this.ordenColumna === columna) {
      this.ordenAscendente = !this.ordenAscendente;
    } else {
      this.ordenColumna = columna;
      this.ordenAscendente = true;
    }
    this.datosTabla.sort((a, b) => {
      const valorA = a[columna];
      const valorB = b[columna];
      if (typeof valorA === 'string') {
        return this.ordenAscendente
          ? valorA.localeCompare(valorB)
          : valorB.localeCompare(valorA);
      } else {
        return this.ordenAscendente ? valorA - valorB : valorB - valorA;
      }
    });
  }

  mensajesError(msj:string, resultado:string){
    Swal.fire({
      icon: resultado === 'error' ? "error" : "success",
      //title: "Oops...",
      text: `${msj}`
      //footer: `${msj}`
    });
  }
///////////////////////////////METODO POR ERROR DE DUPLICADAS//////////////////////////////////////////////////////////////////////////////////////

  verificarDuplicados() {
    const seenIds = new Set<number>();
    this.$facturasOpDuplicadas = [];
    this.informesOp = this.informesOp.filter((factura:ConId<InformeOp>) => {
        if (seenIds.has(factura.idOperacion)) {
            this.$facturasOpDuplicadas.push(factura);
            return false; // Eliminar del array original
        } else {
            seenIds.add(factura.idOperacion);
            return true; // Mantener en el array original
        }
    });    
    //////console.log("this.$facturasOpChofer", this.$facturasOpCliente);
    //////console.log("duplicadas", this.$facturasOpDuplicadas);
    //this.verificarDuplicadosFacturadas()
  }
  
  verificarDuplicadosFacturadas(){
  
    this.informesOp.forEach((facturaOp:InformeOp) => {
      this.dbFirebase.getMostRecentId(this.componente, "idFacturaOp", "idOperacion", facturaOp.idOperacion)
      .pipe(take(1))
      .subscribe(data=>{
        if(data.length > 0){
          //console.log("hay data", data);
          let facOp: any = data[0];
          this.$facLiqOpDuplicadas.push(facOp)
        } else {
          //console.log("no hay data", data);        
        }
      })
    })
    //////console.log("facLiqOpDuplicadas", this.$facLiqOpDuplicadas);
  }

  
  borrarDuplicadasEnLiquidacion(){
  
  this.isLoading = true;
  this.dbFirebase.eliminarMultiple(this.$facturasOpDuplicadas, this.componente).then(result=>{
    this.isLoading = false;
    if(result.exito){
      this.$facturasOpDuplicadas = []
      this.procesarDatosParaTabla();
      this.verificarDuplicados();
      alert("se eliminaron correctamente")
    }else {
      alert("error en la eliminacion")
    }
  })
  
  }
  
  mostrarDuplicadasEnLiquidacion(){
    console.log("this.$facturasOpDuplicadas", this.$facturasOpDuplicadas.length);
    
  }

borrarLiquidaciones(){
  this.isLoading = true;
  //console.log("this.$facturasOpCliente", this.$facturasOpCliente);
  this.dbFirebase.eliminarMultiple(this.informesOp, "facturaOpCliente").then((result)=>{
    this.isLoading = false;
    if(result.exito){
      alert("se eliminaron correctamente")
    } else {
      alert(`error en la eliminación: ${result.mensaje}` )
    }
  })
}


  editarObjeto(){
    this.facturaOpsNoAsignadas.map((fac:any)=>{
      fac.contraParteProforma = false;
    })
    //console.log("facturaOpsNoAsignadas", this.facturaOpsNoAsignadas);
    
    
  }

  agregarCampo(facturaOp: any[]): ConId<InformeOp>[] {
    return facturaOp.map(facOp => {
      return {
        ...facOp,
        contraParteProforma: false,
      };
    });
  }

  actualizarObjeto(){
    this.isLoading = true
    this.dbFirebase.actualizarMultiple(this.facturaOpsNoAsignadas, "facturaOpCliente").then((result)=>{
      this.isLoading = false
      if(result.exito){
        alert("actualizado correctamente")
      } else {
        alert(`error actualizando. errr: ${result.mensaje}`)
      }
    })
  }
  
  guardarObjeto(){
    this.isLoading = true
    this.dbFirebase.guardarMultiple(this.objetoEditado, "informesOpClientes", "idOperacion", "operaciones").then((result)=>{
      this.isLoading = false
      if(result.exito){
        alert("actualizado correctamente")
      } else {
        alert(`error actualizando. errr: ${result.mensaje}`)
      }
    })
  }

  buscarObjetos(){
    this.objetoEditado= this.informesOp;
    //console.log("objetoEditado",this.objetoEditado );
  }

    
  filtrarObjeto(){
    //console.log("1)this.this.informesOp", this.informesOp);
    //this.objetoEditado= this.agregarCampo(this.$facturasOpCliente)
    //this.objetoEditado= this.$facturasOpCliente.filter((fac:InformeOp)=> {return fac.contraParteProforma})
    ////console.log("2)this.objetoEditado", this.objetoEditado);
    this.objetoEditado= this.informesOp;
    //console.log("2)this.objetoEditado", this.objetoEditado);
  }

  eliminarObjetos(){
    this.isLoading = true
    this.dbFirebase.eliminarMultiple(this.objetoEditado, this.componente).then((result)=>{
      this.isLoading = false
      if(result.exito){
        alert("eliminado correctamente")
      } else {
        alert(`error actualizando. errr: ${result.mensaje}`)
      }
    })
  } 
  


}
