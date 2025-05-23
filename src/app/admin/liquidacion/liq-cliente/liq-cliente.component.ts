import { Component, Input } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { FacturaCliente } from 'src/app/interfaces/factura-cliente';

import { FacturacionClienteService } from 'src/app/servicios/facturacion/facturacion-cliente/facturacion-cliente.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { PdfService } from 'src/app/servicios/informes/pdf/pdf.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { Subject, take, takeUntil } from 'rxjs';
import { Chofer } from 'src/app/interfaces/chofer';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { Cliente } from 'src/app/interfaces/cliente';
import { FacturaOp } from 'src/app/interfaces/factura-op';
import { Operacion } from 'src/app/interfaces/operacion';
import Swal from 'sweetalert2';
import { FacturarOpComponent } from '../modales/facturar-op/facturar-op.component';
import { EditarTarifaOpComponent } from '../modales/editar-tarifa-op/editar-tarifa-op.component';
import { TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { ModalBajaComponent } from 'src/app/shared/modal-baja/modal-baja.component';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
import { LiquidacionService } from 'src/app/servicios/liquidacion/liquidacion.service';


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
  titulo: string = "facturaOpCliente"
  btnConsulta:boolean = false;
  searchText!:string;
  searchText2!:string;
  searchText3!:string;
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
  
  facturasPorCliente: Map<number, FacturaOp[]> = new Map<number, FacturaOp[]>();
  indiceSeleccionado!:number;
  idOperaciones: number [] = [];
  facDetallada!: ConId<FacturaOp>;
  ultimaTarifa!: TarifaGralCliente |  undefined;
  tarifaAplicada!: any;
  tarifaEditForm: any;
  swichForm:any;
  edicion:boolean = false;
  tarifaEspecial: boolean = false;
  $choferes!: ConIdType<Chofer>[];
  $clientes!: ConIdType<Cliente>[];
  $proveedores!: ConIdType<Proveedor>[]; 
  operacion!:ConId<Operacion>;
  ////////////////////////////////
  ordenColumna: string = '';
  ordenAscendente: boolean = true;
  columnaOrdenada: string = '';
  private destroy$ = new Subject<void>()
  opAbiertas!: ConId<Operacion>[];
  $facturasOpDuplicadas: ConId<FacturaOp>[] = [];
  $facturasOpChofer: ConId<FacturaOp>[] = []; // Array de facturas de choferes
  $facturasOpChoferDuplicadas: ConId<FacturaOp>[] = []; // Array para guardar facturas de choferes duplicadas
  $facturasOpProveedor: ConId<FacturaOp>[] = []; // Array de facturas de choferes
  $facLiqOpDuplicadas: ConId<FacturaOp>[] = [];
  isLoading: boolean = false;


  constructor(private storageService: StorageService, private excelServ: ExcelService, private pdfServ: PdfService, private modalService: NgbModal, private dbFirebase: DbFirestoreService, private liqService: LiquidacionService){
    // Inicializar el array para que todos los botones muestren la tabla cerrada al principio
    this.mostrarTablaCliente = new Array(this.datosTablaCliente.length).fill(false);
   
  }

  ngOnInit(): void {

    this.storageService.getObservable<ConIdType<Chofer>>("choferes")
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data => {
      this.$choferes = data;
      this.$choferes = this.$choferes.sort((a, b) => a.apellido.localeCompare(b.apellido)); // Ordena por el nombre del chofer
    });
    this.storageService.getObservable<ConIdType<Cliente>>("clientes")
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data => {
      this.$clientes = data;
      this.$clientes = this.$clientes.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
    }); 
    this.storageService.getObservable<ConIdType<Proveedor>>("proveedores")
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data => {
      this.$proveedores = data;
      this.$proveedores = this.$proveedores.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
    });  

    this.storageService.fechasConsulta$
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data => {
      this.fechasConsulta = data;
      ////console.log("LIQ CLIENTES: fechas consulta: ",this.fechasConsulta);
      //this.storageService.getByDateValue(this.titulo, "fecha", this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta, "consultasFacOpCliente");
      this.storageService.syncChangesDateValue<FacturaOp>(this.titulo, "fecha", this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta, "desc");
      this.btnConsulta = true;
       //this.storageService.getByDateValue(this.tituloFacOpCliente, "fecha", this.primerDia, this.ultimoDia, "consultasFacOpCliente");
      this.storageService.getObservable<ConId<FacturaOp>>("facturaOpCliente")
        .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
        .subscribe(data => {
          this.$facturasOpCliente = data;
          console.log("1)", this.$facturasOpCliente );
          if(this.$facturasOpCliente){
            ////console.log("?????????????");                   
            this.procesarDatosParaTabla();
            this.verificarDuplicados();
          } else {
            this.mensajesError("error: facturaOpCliente", "error")
          }
          
      });
    });
      
    //this.consultaMes(); 
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  verificarDuplicados() {
    const seenIds = new Set<number>();

    this.$facturasOpCliente = this.$facturasOpCliente.filter((factura:ConId<FacturaOp>) => {
        if (seenIds.has(factura.idOperacion)) {
            this.$facturasOpDuplicadas.push(factura);
            return false; // Eliminar del array original
        } else {
            seenIds.add(factura.idOperacion);
            return true; // Mantener en el array original
        }
    });    
    console.log("this.$facturasOpChofer", this.$facturasOpCliente);
    console.log("duplicadas", this.$facturasOpDuplicadas);
    //this.verificarDuplicadosFacturadas()
}

verificarDuplicadosFacturadas(){
  /* this.dbFirebase.getByDateValue("facOpLiqCliente", "fecha", this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta)
  .pipe(take(1)) // Detener la suscripción cuando sea necesario
  .subscribe(data=>{
    let $facturasLiqCliente: any [] = data;
    const idsLiqCliente = new Set($facturasLiqCliente.map(factura => factura.idOperacion));

  // Recorremos el array facturasOpCliente
  this.$facLiqOpDuplicadas = this.$facturasOpCliente.filter((facturaOp:FacturaOp) => {
    // Verificamos si el idOperacion de la factura actual está en el Set
    return idsLiqCliente.has(facturaOp.idOperacion);
  });

  
  console.log("facLiqOpDuplicadas", this.$facLiqOpDuplicadas);

  }) */
  this.$facturasOpCliente.forEach((facturaOp:FacturaOp) => {
    this.dbFirebase.getMostRecentId("facOpLiqCliente", "idFacturaOp", "idOperacion", facturaOp.idOperacion)
    .pipe(take(1))
    .subscribe(data=>{
      if(data.length > 0){
        console.log("hay data", data);
        let facOp: any = data[0];
        this.$facLiqOpDuplicadas.push(facOp)
      } else {
        console.log("no hay data", data);        
      }
    })
  })
  console.log("facLiqOpDuplicadas", this.$facLiqOpDuplicadas);
}

deleteDuplicadas(){
  console.log("cantidad facLiqOpDuplicadas", this.$facLiqOpDuplicadas.length);
  this.$facLiqOpDuplicadas.forEach((facDupli: ConId<FacturaOp>)=>{    
    this.dbFirebase.delete(this.titulo, facDupli.id)
})
}
  

  procesarDatosParaTabla() {
    const clientesMap = new Map<number, any>();    

    if(this.$facturasOpCliente !== null){
      ////////console.log()("Facturas OP CLiente: ", this.$facturasOpCliente);
      this.$facturasOpCliente.forEach((factura: FacturaOp) => {
        if (!clientesMap.has(factura.idCliente)) {
          clientesMap.set(factura.idCliente, {
            idCliente: factura.idCliente,
            razonSocial: this.getCliente(factura.idCliente),
            opCerradas: 0,
            opAbiertas: 0,
            opSinFacturar: 0,
            opFacturadas: 0,
            total: 0,
            aPagar: 0,
            ganancia: 0,
          });
        }
     
        const cliente = clientesMap.get(factura.idCliente);
        cliente.opCerradas++;
        if (factura.liquidacion) {
          cliente.opFacturadas += factura.valores.total;
        } else {
          cliente.opSinFacturar += factura.valores.total;
        }
        cliente.total += factura.valores.total;
        cliente.aPagar += factura.contraParteMonto;   
        cliente.ganancia = 100-((cliente.aPagar*100)/cliente.total);
        
        
      });      
  
      this.datosTablaCliente = Array.from(clientesMap.values());
      this.datosTablaCliente = this.datosTablaCliente.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
      //////console.log("Datos para la tabla: ", this.datosTablaCliente); 
      this.dbFirebase.getAllByDateValueField<Operacion>('operaciones', 'fecha', this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta, "estado.abierta", true).subscribe(data=>{      
        if(data){
          this.opAbiertas = data;
          this.opAbiertas = this.opAbiertas.filter((op:Operacion)=> op.estado.abierta)
          ////console.log("this.opAbiertas", this.opAbiertas.length);    
          this.datosTablaCliente.forEach(c=>{
            c.opAbiertas = this.getOpAbiertas(c.idCliente)
          })        
        }      
      });      
    }
    
  }

  getOpAbiertas(idCliente:number){
    if(this.opAbiertas !== undefined){
      let cantOpAbiertas = this.opAbiertas.filter((op:Operacion)=>{return op.cliente.idCliente === idCliente})
    
      return cantOpAbiertas.length
    } else{
      return 0 
    }
  
  }

  getCliente(idCliente: number){
    let cliente: Cliente []
    cliente = this.$clientes.filter((cliente:Cliente)=>{
      return cliente.idCliente === idCliente
    })
    if(cliente[0]){
      return cliente[0].razonSocial;
    } else {
      return `Cliente dado de baja. idChofer ${idCliente}`;
    }



  }

  getChofer(idChofer: number){
    let chofer: Chofer []
    chofer = this.$choferes.filter((chofer:Chofer)=>{
      return chofer.idChofer === idChofer
    })
    if(chofer[0]){
      return chofer[0].apellido + " " + chofer[0].nombre; 
    } else {
      return `Chofer dado de baja. idChofer ${idChofer}`;
    }
  
  }

  getProveedor(proveedor: Proveedor){
    
  }


 limpiarValorFormateado(valorFormateado: string): number {
  // Elimina el punto de miles y reemplaza la coma por punto para que sea un valor numérico válido
    return parseFloat(valorFormateado.replace(/\./g, '').replace(',', '.'));
  }
 
// Modifica liquidarFac para solo actualizar el estado y hacer cualquier procesamiento adicional
liquidarFac(factura: FacturaOp) {
  factura.liquidacion = !factura.liquidacion;
  //////console.log("Estado de liquidación cambiado:", factura.liquidacion);
  //this.storageService.updateItem(this.tituloFacOpCliente, factura);
  this.procesarDatosParaTabla();
}

selectAllCheckboxes(event: any, idCliente: number): void {
  //let isChecked = (event.target as HTMLInputElement).checked;
  const seleccion = event.target.checked;
  ////console.log("1)", seleccion); 
  let facturasCliente = this.facturasPorCliente.get(idCliente);
  ////console.log("2)", facturasCliente);
    facturasCliente?.forEach((factura: FacturaOp) => {
      if(!factura.proforma){
        factura.liquidacion = seleccion;
      }
      
      ////console.log("3)", factura.liquidacion);
     
    });   
    ////console.log("primera tabla: ", this.datosTablaCliente);
    let cliente = this.datosTablaCliente.find((cliente:any)=>{
      return cliente.idCliente === idCliente
    });
    ////console.log("1) cliente: ", cliente);
    if(seleccion){
      cliente.opFacturadas = 0
      facturasCliente?.forEach((factura: FacturaOp) => {                  
          cliente.opFacturadas += factura.valores.total;
          cliente.opSinFacturar = 0;
        });   
    } else {
      cliente.opSinFacturar = 0;
      cliente.opFacturadas = 0;
      facturasCliente?.forEach((factura: FacturaOp) => {                
        cliente.opFacturadas += (factura.proforma ? factura.valores.total : 0);
        cliente.opSinFacturar += (!factura.proforma ? factura.valores.total : 0);
      });   
    }
    /* facturasCliente?.forEach((factura: FacturaOp) => {
      if (factura.liquidacion) {
        cliente.opFacturadas += factura.valores.total;
        cliente.opSinFacturar -= factura.valores.total;
      } else {
        cliente.opSinFacturar += factura.valores.total;
        cliente.opFacturadas -= factura.valores.total;
      }
     
    });    */
    ////console.log("2) cliente: ", cliente);
   
}
 

  mostrarMasDatos(index: number) {   
   // Cambiar el estado del botón en la posición indicada
   this.mostrarTablaCliente[index] = !this.mostrarTablaCliente[index];
   //////console.log("CLIENTE: ", cliente);

   // Obtener el id del cliente utilizando el índice proporcionado
   let clienteId = this.datosTablaCliente[index].idCliente;
    ////console.log("clienteId: ", clienteId);
    
   // Filtrar las facturas según el id del cliente y almacenarlas en el mapa
   let facturasCliente = this.$facturasOpCliente.filter((factura: FacturaOp) => {
       return factura.idCliente === clienteId;
   });
   this.facturasPorCliente.set(clienteId, facturasCliente);
   ////console.log("FACTURAS DEL CLIENTE: ", facturasCliente);  
  }

  cerrarTabla(index: number){
    this.mostrarTablaCliente[index] = !this.mostrarTablaCliente[index];
  }

  // Modifica la función getQuincena para que acepte una fecha como parámetro
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

   liquidarFacCliente(cliente: any, index: number){
    // Obtener las facturas del cliente
    //////console.log("1: ",this.facturasLiquidadasCliente);

    if(cliente.opAbiertas > 0){
        Swal.fire({
          icon: "warning",
          title: "¡Atención!",
          text: "El cliente tiene operaciones abiertas que corresponden al periodo que se esta facturando",
          //footer: '<a href="#">Why do I have this issue?</a>'
        });
    }
    
    let facturasIdCliente:any = this.facturasPorCliente.get(cliente.idCliente);
    this.razonSocFac = cliente.razonSocial;
    // Filtrar las facturas con liquidacion=true y guardarlas en un nuevo array
    this.facturasLiquidadasCliente = facturasIdCliente.filter((factura: FacturaOp) => {
        return factura.liquidacion === true && factura.proforma === false;
    });

    if(this.facturasLiquidadasCliente.length > 0){
      ////console.log("1: ",this.facturasLiquidadasCliente);
      // Calcular el total sumando los montos de las facturas liquidadas
      this.totalFacturasLiquidadasCliente = 0;
      this.facturasLiquidadasCliente.forEach((factura: FacturaOp) => {
        this.totalFacturasLiquidadasCliente += factura.valores.total;
      });
  
      this.indiceSeleccionado = index;
      ////console.log("3) Facturas liquidadas del cliente", cliente.razonSocial + ":", this.facturasLiquidadasCliente);
      ////console.log("Total de las facturas liquidadas:", this.totalFacturasLiquidadasCliente);
      //////console.log("indice: ", this.indiceSeleccionado);
      this.openModalLiquidacion();
    } else {
      this.mensajesError("Debe seleccionar una factura para liquidar", "error")
    }

   
  }

  mensajesError(msj:string, resultado:string){
    Swal.fire({
      icon: resultado === 'error' ? "error" : "success",
      //title: "Oops...",
      text: `${msj}`
      //footer: `${msj}`
    });
  }
  



  addItem(item:any, componente:string, idItem:number, accion:string): void {   
    console.log("llamada al storage desde liq-cliente, addItem");
    this.storageService.addItem(componente, item, idItem, accion, accion === "INTERNA" ? "" : componente === 'proforma' ? `Proforma de Cliente ${item.razonSocial}` : `Alta de Factura de Cliente ${item.razonSocial}`);        

  } 

  eliminarFacturasOp(){
    this.idOperaciones = [];
    this.facturasLiquidadasCliente.forEach((factura: FacturaOp) => {

      console.log("llamada al storage desde liq-cliente, addItem");
      this.addItem(factura, "facOpLiqCliente", factura.idFacturaOp, "INTERNA");

      this.editarOperacionesFac(factura)
      
    }); 
    /* this.facturaChofer.operaciones.forEach((factura: FacturaOpChofer) => {
      this.removeItem(factura);
    });  */
    /* this.cerrarTabla(this.indiceSeleccionado);
    this.ngOnInit();  */
    /* this.facturaCliente.operaciones.forEach((factura: FacturaOpCliente) => {
      this.removeItem(factura);
    });
    this.cerrarTabla(this.indiceSeleccionado);
    this.ngOnInit(); */
  }

  editarOperacionesFac(factura:FacturaOp){
    //factura.idOperacion
    let op:ConId<Operacion>;
    this.dbFirebase
    .obtenerTarifaIdTarifa("operaciones",factura.idOperacion, "idOperacion")
    .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
    .subscribe(data => {      
        op = data;
        console.log("OP LIQUIDADA: ", op);
        op.estado = {
          abierta: false,
          cerrada: false,
          facCliente: true,
          facChofer: op.estado.facChofer,
          facturada: op.estado.facChofer ? true : false,
        }
        if(op.estado.facturada){
          op.estado.facCliente = false;  
          op.estado.facChofer = false;
        }
        let {id, ...opp} = op
        this.storageService.updateItem("operaciones", opp, op.idOperacion, "LIQUIDAR", `Operación de Cliente ${op.cliente.razonSocial} Liquidada`, op.id);
        this.removeItem(factura);
    });

  }

  removeItem(item:any){

    console.log("llamada al storage desde liq-cliente, deleteItem");
    this.storageService.deleteItem("facturaOpCliente", item, item.idFacturaOp, "INTERNA", "");    

  }

  editarFacturaOpCliente(factura: ConId<FacturaOp>, i: number){   
    this.facDetallada = factura;   
    this.buscarTarifa(i);    
  } 



  openModalLiquidacion(): void {   
    //this.facturasLiquidadasCliente
    //this.totalFacturasLiquidadasChofer
    //this.totalFacturasLiquidadasCliente

    this.indiceSeleccionado
    {
      const modalRef = this.modalService.open(FacturarOpComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'xl', 
        //backdrop:"static" 
      });
      
    let info = {
        origen:"clientes",
        facturas: this.facturasLiquidadasCliente,
        total: this.totalFacturasLiquidadasCliente,
        //totalChofer: this.totalFacturasLiquidadasChofer,
      }; 
      console.log("info: ",info);
      
      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
          ////console.log(result);
          
          if(result.modo === "cerrar" || result.modo === "proforma"){
            let titulo = result.titulo
            this.facturaCliente = result.factura;            
            let accion: string = result.accion;
            if(result.modo === "cerrar"){
              
              //this.liqService.liquidarFacOpCliente(this.facturaCliente, this.facturasLiquidadasCliente);
              this.procesarFacturacion(titulo, accion)
              
            }
            if(result.modo === "proforma"){
              this.addItem(this.facturaCliente, "proforma", this.facturaCliente.idFacturaCliente, "ALTA");
              this.facturasLiquidadasCliente.forEach((factura:FacturaOp)=>{
                this.actualizarFacOp(factura);        
              })              
            }                       

           

                /* if(result.modo === "cerrar"){
                  this.eliminarFacturasOp();
                } */
                /* this.mostrarMasDatos(this.indiceSeleccionado);
                this.procesarDatosParaTabla() */
          } 
          this.mostrarMasDatos(this.indiceSeleccionado);
          this.procesarDatosParaTabla()
          },
        (reason) => {}
      );
    }
  }

  procesarFacturacion(titulo:string, accion:string) {
  this.isLoading = true;
  
  this.dbFirebase.procesarLiquidacion(this.facturasLiquidadasCliente, "clientes", "facOpLiqCliente", "facturaOpCliente", this.facturaCliente, "facturaCliente")
    .then((result) => {
      this.isLoading = false;
      console.log("resultado: ", result);
      if(result.exito){
          Swal.fire({
                icon: "success",
                //title: "Oops...",
                text: 'La liquidación se procesó con éxito.',
                confirmButtonColor: "#3085d6",
                confirmButtonText: "Confirmar",
                //footer: `${msj}`
              }).then(() => {
                  Swal.fire({
                    title: `¿Desea imprimir el detalle del Cliente?`,
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
                          this.excelServ.exportToExcelCliente(this.facturaCliente, this.facturasLiquidadasCliente, this.$clientes, this.$choferes, accion);
                        }else if (titulo === "pdf"){
                          this.pdfServ.exportToPdfCliente(this.facturaCliente, this.facturasLiquidadasCliente, this.$clientes, this.$choferes, accion);        
                        }      
                    }
                  }); 
              });
      } else {
        this.mensajesError(`Ocurrió un error al procesar la facturación: ${result.mensaje}`, "error");
      }
      
     /* 
       Swal.fire({
                  title: `¿Desea imprimir el detalle del Cliente?`,
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
                        this.excelServ.exportToExcelCliente(this.facturaCliente, this.facturasLiquidadasCliente, this.$clientes, this.$choferes, accion);
                      }else if (titulo === "pdf"){
                        this.pdfServ.exportToPdfCliente(this.facturaCliente, this.facturasLiquidadasCliente, this.$clientes, this.$choferes, accion);        
                      }      
                  }
                });    */
    })
    .catch((error) => {
      this.isLoading = false;
      //console.error(error);
      //this.mensajesError('Ocurrió un error al procesar la facturación.', "error");
    });
}

  buscarTarifa(i:number ) {
    
    let coleccionHistorialTarfGral: string = 'historialTarifasGralCliente';
    let coleccionHistorialTarfEsp: string = 'historialTarifasEspCliente';
    let tarifaGral:ConIdType<TarifaGralCliente> | undefined;
    let tarifaEsp:ConIdType<TarifaGralCliente> | undefined;
    let tarifaPers:ConIdType<TarifaPersonalizadaCliente> | undefined;
    if(this.facDetallada.tarifaTipo.general){
      tarifaGral = this.getTarifaGral(this.facDetallada.idTarifa);
      console.log("1)this.tarifaGral", tarifaGral);      
      if(tarifaGral === undefined){
        this.dbFirebase
        .obtenerTarifaIdTarifa(coleccionHistorialTarfGral,this.facDetallada.idTarifa, "idTarifa")
        .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
        .subscribe(data => {      
            this.tarifaAplicada = data;
           console.log("1.5) TARIFA APLICADA: ", this.tarifaAplicada);           
        });
      } else {
        this.tarifaAplicada = tarifaGral;        
      }
      this.buscarOperacion(i);     
      
    }
  if(this.facDetallada.tarifaTipo.especial){
    tarifaEsp = this.getTarifaEsp(this.facDetallada.idTarifa);
    console.log("1)this.tarifaEsp", tarifaEsp);      
    if(tarifaEsp === undefined){
      this.dbFirebase
      .obtenerTarifaIdTarifa(coleccionHistorialTarfEsp,this.facDetallada.idTarifa, "idTarifa")
      .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
      .subscribe(data => {      
          this.tarifaAplicada = data;
         console.log("1.5) TARIFA APLICADA: ", this.tarifaAplicada);           
      });
    } else {
      this.tarifaAplicada = tarifaEsp;        
    }
    this.buscarOperacion(i);
    
    }
    if(this.facDetallada.tarifaTipo.eventual){
      this.tarifaAplicada = {};
      console.log("1)TARIFA APLICADA: ", this.tarifaAplicada);
      this.buscarOperacion(i);
      
    }
    if(this.facDetallada.tarifaTipo.personalizada){
      tarifaPers = this.getTarifaPers(this.facDetallada.idTarifa);
      console.log("1)this.tarifaPers", tarifaPers);
      if(tarifaPers === undefined){
        this.dbFirebase
        .obtenerTarifaIdTarifa('tarifasPersCliente',this.facDetallada.idTarifa, "idTarifa")
        .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
        .subscribe(data => {      
            this.tarifaAplicada = data;
           console.log("1.5) TARIFA APLICADA: ", this.tarifaAplicada);           
        });
      } else {
        this.tarifaAplicada = tarifaPers;        
      }
      this.buscarOperacion(i);   
      
    }        
    
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
      
    let origen = "clientes";

     let info = {
        factura: this.facDetallada,
        tarifaAplicada: this.tarifaAplicada,   
        op: this.operacion,     
        origen: origen,
        componente:"liquidacion",
      }; 
      ////console.log(info); 
      
      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
          this.procesarDatosParaTabla();
          this.cerrarTabla(i)
        },
        (reason) => {}
      );
    }
  }

  ordenar(columna: string): void {
    if (this.ordenColumna === columna) {
      this.ordenAscendente = !this.ordenAscendente;
    } else {
      this.ordenColumna = columna;
      this.ordenAscendente = true;
    }
    this.datosTablaCliente.sort((a, b) => {
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


  bajaOp(factura:FacturaOp, indice:number){
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
              .obtenerTarifaIdTarifa("operaciones", factura.idOperacion, "idOperacion")
              .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
              .subscribe(data => {      
                  this.operacion = data;
                  //console.log("OPERACION: ", this.operacion);
                  this.openModalBaja(factura, indice)
              });               
          }
        });

    
  }

  openModalBaja(factura:FacturaOp, indice:number){
    {
      const modalRef = this.modalService.open(ModalBajaComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        scrollable: true, 
        size: 'sm',     
      });       
      console.log("factura",factura);
      let info = {
        modo: "liquidaciones",
        item: this.operacion,
      }  
      
      
      modalRef.componentInstance.fromParent = info;
    
      modalRef.result.then(
        (result) => {
          console.log("result", result);
          if(result !== undefined){   
            
              if(this.operacion.chofer.idProveedor === 0){
                //BAJA DE FACTURA OP CHOFER
                this.dbFirebase.obtenerTarifaMasReciente("facturaOpChofer", factura.contraParteId, "idFacturaOp", "idFacturaOp").subscribe(data => {
                  if(data){
                    let facturaContraParte = data
                    console.log("facturaContraParte: ", factura);
                    this.storageService.deleteItem("facturaOpChofer", facturaContraParte, factura.contraParteId, "INTERNA", "");        
                  }
                  
                })
                
              } else {
                //BAJA DE FACTURA OP PROVEEDOR
                this.dbFirebase.obtenerTarifaMasReciente("facturaOpProveedor", factura.contraParteId, "idFacturaOp", "idFacturaOp").subscribe(data => {
                  if(data){
                    let facturaContraParte = data
                    console.log("facturaContraParte: ", factura);
                    this.storageService.deleteItem("facturaOpProveedor", facturaContraParte, factura.contraParteId, "INTERNA", "");    
                  }
                  
                })
                
              }

              //BAJA DE FACTURA OP CLIENTE
              this.removeItem(factura);              
              
              //BAJA DE OP
              this.storageService.deleteItemPapelera("operaciones", this.operacion, this.operacion.idOperacion, "Baja", `Baja de operacion ${this.operacion.idOperacion} desde Liquidaciones`, result);    
              
              this.cerrarTabla(indice)
              this.ngOnInit(); 
              //////////////////


              ////////console.log("llamada al storage desde op-abiertas, deleteItem");

              ////////console.log("consultas Op: " , this.$consultasOp);
              Swal.fire({
              title: "Confirmado",
              text: "La operación ha sido dada de baja",
              icon: "success"
              });
          }
          
        },
        (reason) => {}
      );
    }
  }

  actualizarFacOp(factura: FacturaOp){
    
    let facOp:ConId<FacturaOp>;
    this.dbFirebase
    .obtenerTarifaIdTarifa("facturaOpCliente",factura.idOperacion, "idOperacion")
    .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
    .subscribe(data => {      
        facOp = data;
        console.log("facOp: ", facOp);
        facOp.proforma = true;
        facOp.liquidacion = true;
        let {id, ...fac} = facOp
        let cliente = this.getCliente(fac.idCliente)
        this.storageService.updateItem("facturaOpCliente", fac, fac.idFacturaOp, "PROFORMA", `Proforma para operación de Cliente ${cliente} `, facOp.id);
        //this.removeItem(factura);
    });
    
  }

   getTarifaGral(idTarifa: number):ConIdType<TarifaGralCliente> | undefined{
        let tarifasGral: ConIdType<TarifaGralCliente>[];
        let tarifa: ConIdType<TarifaGralCliente> | undefined;
        let coleccion: string = 'tarifasGralCliente';
        
        tarifasGral = this.storageService.loadInfo(coleccion);
        tarifa = tarifasGral.find((tarf:ConIdType<TarifaGralCliente>)=> {return tarf.idTarifa === idTarifa});
        return tarifa;      
      }
  
      getTarifaEsp(idTarifa: number):ConIdType<TarifaGralCliente> | undefined{
        let tarifasGral: ConIdType<TarifaGralCliente>[];
        let tarifa: ConIdType<TarifaGralCliente> | undefined;
        let coleccion: string = 'tarifasEspCliente';
  
        tarifasGral = this.storageService.loadInfo(coleccion);
        tarifa = tarifasGral.find((tarf:ConIdType<TarifaGralCliente>)=> {return tarf.idTarifa === idTarifa});
        return tarifa;                
      }
  
      getTarifaPers(idTarifa: number):ConIdType<TarifaPersonalizadaCliente> | undefined{
        let tarifasPersonalizada: ConIdType<TarifaPersonalizadaCliente>[];
        let tarifa: ConIdType<TarifaPersonalizadaCliente> | undefined;
        
  
        tarifasPersonalizada = this.storageService.loadInfo('tarifasPersCliente');
        tarifa = tarifasPersonalizada.find((tarf:ConIdType<TarifaPersonalizadaCliente>)=> {return tarf.idTarifa === idTarifa});
        return tarifa;                
      }
  
      buscarOperacion(i:number){
        this.dbFirebase
        .obtenerTarifaIdTarifa("operaciones",this.facDetallada.idOperacion, "idOperacion")
        .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
        .subscribe(data => {      
            this.operacion = data;
            console.log("2) OPERACION: ", this.operacion);
            this.openModalTarifa(i)
        });    
      }


}
