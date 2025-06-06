import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, take, takeUntil } from 'rxjs';
import { FacturaProveedor } from 'src/app/interfaces/factura-proveedor';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { PdfService } from 'src/app/servicios/informes/pdf/pdf.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { FacturaOp } from 'src/app/interfaces/factura-op';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { Operacion } from 'src/app/interfaces/operacion';
import Swal from 'sweetalert2';
import { FacturarOpComponent } from '../modales/facturar-op/facturar-op.component';
import { EditarTarifaOpComponent } from '../modales/editar-tarifa-op/editar-tarifa-op.component';
import { ModalBajaComponent } from 'src/app/shared/modal-baja/modal-baja.component';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
import { LiquidacionService } from 'src/app/servicios/liquidacion/liquidacion.service';

@Component({
    selector: 'app-liq-proveedor',
    templateUrl: './liq-proveedor.component.html',
    styleUrls: ['./liq-proveedor.component.scss'],
    standalone: false
})
export class LiqProveedorComponent implements OnInit {

  @Input() fechasConsulta?: any = {
    fechaDesde: 0,
    fechaHasta: 0,
  };

  titulo: string = "facturaOpProveedor"
  btnConsulta:boolean = false;
  searchText!:string;
  searchText2!:string;
  searchText3!:string;
  componente: string = "facturaProveedor";
  $facturasOpProveedor!: ConId<FacturaOp>[];
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
  facturaEditada!: ConId<FacturaOp>;
  facturasPorProveedor: Map<number, FacturaOp[]> = new Map<number, FacturaOp[]>();
  indiceSeleccionado!:number
  ultimaTarifa!:any;
  tarifaEditForm: any;
  swichForm:any;
  edicion:boolean = false;
  tarifaEspecial: boolean = false;
  idOperaciones: number [] = [];
  facDetallada!: ConId<FacturaOp>;
  tarifaAplicada!:any
  $choferes!: ConIdType<Chofer>[];
  $clientes!: ConIdType<Cliente>[];
  $proveedores!: ConIdType<Proveedor>[]; 
  operacion!:ConId<Operacion>;
  ////////////////////////////////
  ordenColumna: string = '';
  ordenAscendente: boolean = true;
  columnaOrdenada: string = '';
  private destroy$ = new Subject<void>();
  opAbiertas!: ConId<Operacion>[];
  $facturasOpDuplicadas: ConId<FacturaOp>[] = [];
  $facLiqOpDuplicadas: ConId<FacturaOp>[] = [];
  isLoading: boolean = false;
  
  constructor(private storageService: StorageService, private fb: FormBuilder, private excelServ: ExcelService, private pdfServ: PdfService, private modalService: NgbModal, private dbFirebase: DbFirestoreService, private liqService: LiquidacionService){
    // Inicializar el array para que todos los botones muestren la tabla cerrada al principio
    this.mostrarTablaProveedor = new Array(this.datosTablaProveedor.length).fill(false);
   
  }

  ngOnInit(): void {
     
    this.storageService.getObservable<ConIdType<Chofer>>("choferes")
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data => {
      this.$choferes = data;
      this.$choferes.sort((a, b) => a.apellido.localeCompare(b.apellido));
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
      //console.log("LIQ proveedor: fechas consulta: ",this.fechasConsulta);
      //this.storageService.getByDateValue(this.titulo, "fecha", this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta, "consultasFacOpProveedor");
      this.storageService.syncChangesDateValue<FacturaOp>(this.titulo, "fecha", this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta, "desc");      
      this.btnConsulta = true;
       //this.storageService.getByDateValue(this.tituloFacOpCliente, "fecha", this.primerDia, this.ultimoDia, "consultasFacOpCliente");
      this.storageService.getObservable<ConId<FacturaOp>>("facturaOpProveedor")
        .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
        .subscribe(data => {
          if(data){
            this.$facturasOpProveedor = data;
            //console.log("1)", this.$facturasOpProveedor );
            if(this.$facturasOpProveedor){
              //console.log("?????????????");                
              this.procesarDatosParaTabla();
              this.verificarDuplicados();
            } else {
              this.mensajesError("error: facturaOpProveedor", "error")         
            }
          }
          
          
      });
    });
      
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  verificarDuplicados() {
    const seenIds = new Set<number>();

    this.$facturasOpProveedor = this.$facturasOpProveedor.filter((factura:ConId<FacturaOp>) => {
        if (seenIds.has(factura.idOperacion)) {
            this.$facturasOpDuplicadas.push(factura);
            return false; // Eliminar del array original
        } else {
            seenIds.add(factura.idOperacion);
            return true; // Mantener en el array original
        }
    });
    console.log("this.$facturasOpChofer", this.$facturasOpProveedor);
    console.log("duplicadas", this.$facturasOpDuplicadas);
    
}

borrarDuplicadasEnLiquidacion(){
  console.log("cantidad facturasOpDuplicadas", this.$facturasOpDuplicadas.length);
  this.$facturasOpDuplicadas.forEach((facDupli: ConId<FacturaOp>)=>{    
    this.dbFirebase.delete(this.titulo, facDupli.id)
})
this.$facturasOpDuplicadas = []
this.procesarDatosParaTabla();
this.verificarDuplicados();
}

verificarDuplicadosFacturadas(){

  this.$facturasOpProveedor.forEach((facturaOp:FacturaOp) => {
    this.dbFirebase.getMostRecentId("facOpLiqProveedor", "idFacturaOp", "idOperacion", facturaOp.idOperacion)
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
    const proveedoresMap = new Map<number, any>();

    if(this.$facturasOpProveedor !== null){
      console.log("Facturas OP Proveedor: ", this.$facturasOpProveedor);
      
      this.$facturasOpProveedor.forEach((factura: FacturaOp) => {
        if (!proveedoresMap.has(factura.idProveedor)) {
          proveedoresMap.set(factura.idProveedor, {
            idProveedor: factura.idProveedor,
            razonSocial:  this.getProveedor(factura.idProveedor),
            opCerradas: 0,
            opAbiertas: 0,
            opSinFacturar: 0,
            opFacturadas: 0,
            total: 0,
            aCobrar: 0,
            ganancia: 0,
          });
        }
  
        const proveedor = proveedoresMap.get(factura.idProveedor);
        proveedor.opCerradas++;
        if (factura.liquidacion) {
          proveedor.opFacturadas += factura.valores.total;
        } else {
          proveedor.opSinFacturar += factura.valores.total;
        }
        proveedor.total += factura.valores.total;
        proveedor.aCobrar += factura.contraParteMonto;   
        proveedor.ganancia = 100-((proveedor.total*100)/proveedor.aCobrar);
        
      });
  
      this.datosTablaProveedor = Array.from(proveedoresMap.values());
      this.datosTablaProveedor = this.datosTablaProveedor.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
      //////console.log()("Datos para la tabla: ", this.datosTablaChofer); 
      this.dbFirebase.getAllByDateValueField<Operacion>('operaciones', 'fecha', this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta, "estado.abierta", true).subscribe(data=>{      
        if(data){
          this.opAbiertas = data;
          this.opAbiertas = this.opAbiertas.filter((op:Operacion)=> op.estado.abierta)
          //console.log("this.opAbiertas", this.opAbiertas.length);    
          this.datosTablaProveedor.forEach(p=>{
            p.opAbiertas = this.getOpAbiertas(p.idProveedor)
          })        
        }      
      });
    }
    
  }

  getOpAbiertas(idProveedor:number){
      if(this.opAbiertas !== undefined){
        let cantOpAbiertas = this.opAbiertas.filter((op:Operacion)=>{return op.chofer.idProveedor === idProveedor})      
        return cantOpAbiertas.length
      } else{
        return 0 
      }
    
    }

  getChofer(idChofer: number){
    let chofer: Chofer []
    chofer = this.$choferes.filter((chofer:Chofer)=>{
      return chofer.idChofer === idChofer;
    })
    if(chofer[0]){
      return chofer[0].apellido + " " + chofer[0].nombre; 
    } else {
      return `Chofer dado de baja. idChofer ${idChofer}`;
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

  getProveedor(idProveedor: number){
    let proveedor: Proveedor []
    proveedor = this.$proveedores.filter((proveedor:Proveedor)=>{
      return proveedor.idProveedor === idProveedor;
    })
    if(proveedor[0]){
      return proveedor[0].razonSocial;
    } else {
      return `Proveedor dado de baja. idChofer ${idProveedor}`;
    }

  }


 limpiarValorFormateado(valorFormateado: string): number {
  // Elimina el punto de miles y reemplaza la coma por punto para que sea un valor numérico válido
    return parseFloat(valorFormateado.replace(/\./g, '').replace(',', '.'));
  }

  liquidarFac(factura: FacturaOp) {
    factura.liquidacion = !factura.liquidacion;
    ////console.log("Estado de liquidación cambiado:", factura.liquidacion);
    //this.storageService.updateItem(this.tituloFacOpCliente, factura);
    this.procesarDatosParaTabla();
  }
  
  selectAllCheckboxes(event: any, idProveedor: number): void {
    //let isChecked = (event.target as HTMLInputElement).checked;
    const seleccion = event.target.checked;
    //console.log("1)", seleccion); 
    let facturasProveedor = this.facturasPorProveedor.get(idProveedor);
    //console.log("2)", facturasProveedor);
      facturasProveedor?.forEach((factura: FacturaOp) => {
        if(!factura.proforma){
          factura.liquidacion = seleccion;
        }
        
        //console.log("3)", factura.liquidacion);
       
      });   
      //console.log("primera tabla: ", this.datosTablaProveedor);
      let proveedor = this.datosTablaProveedor.find((proveedor:any)=>{
        return proveedor.idProveedor === idProveedor
      });
      //console.log("1) cliente: ", proveedor);
      if(seleccion){
        proveedor.opFacturadas = 0
        facturasProveedor?.forEach((factura: FacturaOp) => {                  
          proveedor.opFacturadas += factura.valores.total;
          proveedor.opSinFacturar = 0;
          });   
      } else {
        proveedor.opSinFacturar = 0;
        proveedor.opFacturadas = 0;
        facturasProveedor?.forEach((factura: FacturaOp) => {                          
          proveedor.opFacturadas += (factura.proforma ? factura.valores.total : 0);
          proveedor.opSinFacturar += (!factura.proforma ? factura.valores.total : 0);
        });   
      }
     /*  facturasProveedor?.forEach((factura: FacturaOp) => {
        if (factura.liquidacion) {
          proveedor.opFacturadas += factura.valores.total;
          proveedor.opSinFacturar -= factura.valores.total;
        } else {
          proveedor.opSinFacturar += factura.valores.total;
          proveedor.opFacturadas -= factura.valores.total;
        }
       
      });    */
      //console.log("2) cliente: ", proveedor);
     
  }

  mostrarMasDatos(index: number) {   
    console.log("paso por aca?");
    
   // Cambiar el estado del botón en la posición indicada
   this.mostrarTablaProveedor[index] = !this.mostrarTablaProveedor[index];
   ////////console.log()("Chofer: ", chofer);

   // Obtener el id del cliente utilizando el índice proporcionado
   let proveedorId = this.datosTablaProveedor[index].idProveedor;

   // Filtrar las facturas según el id del cliente y almacenarlas en el mapa
   let facturasProveedor = this.$facturasOpProveedor.filter((factura: FacturaOp) => {
       return factura.idProveedor === proveedorId;
   });
   this.facturasPorProveedor.set(proveedorId, facturasProveedor);

   //////console.log()("FACTURAS DEL CHOFER: ", facturasChofer);  

  }

  cerrarTabla(index: number){
    this.mostrarTablaProveedor[index] = !this.mostrarTablaProveedor[index];
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

  liquidarFacProveedor(proveedor: any, index: number){
    // Obtener las facturas del cliente
    ////////console.log()("IDCHOFER: ", idChofer);

    if(proveedor.opAbiertas > 0){
        Swal.fire({
          icon: "warning",
          title: "¡Atención!",
          text: "El proveedor tiene operaciones abiertas que corresponden al periodo que se esta facturando",
          //footer: '<a href="#">Why do I have this issue?</a>'
        });
    }
    
    let facturasIdProveedor:any = this.facturasPorProveedor.get(proveedor.idProveedor);    
    //////////console.log()("FACTURAS POR CHOFER: ", facturasIdChofer );
    

    this.razonSocial = proveedor.razonSocial;
    ////////console.log()("APELLIDO: ", this.apellido);
    
    // Filtrar las facturas con liquidacion=true y guardarlas en un nuevo array
    this.facturasLiquidadasProveedor = facturasIdProveedor.filter((factura: FacturaOp) => {
        return factura.liquidacion === true&& factura.proforma === false;
    });

   

    this.indiceSeleccionado = index;
   
    
    if(this.facturasLiquidadasProveedor.length > 0){
      //console.log("1: ",this.facturasLiquidadasProveedor);
      // Calcular el total sumando los montos de las facturas liquidadas
      this.totalFacturasLiquidadasProveedor = 0;
      this.facturasLiquidadasProveedor.forEach((factura: FacturaOp) => {
        this.totalFacturasLiquidadasProveedor += factura.valores.total;
      });
  
      this.indiceSeleccionado = index;
      //console.log("3) Facturas liquidadas del proveedor", proveedor.razonSocial + ":", this.facturasLiquidadasProveedor);
      //console.log("Total de las facturas liquidadas:", this.totalFacturasLiquidadasProveedor);
      ////console.log("indice: ", this.indiceSeleccionado);
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
    this.storageService.addItem(componente, item, idItem, accion, accion === "INTERNA" ? "" : `Alta de Factura de Proveedor ${item.razonSocial}`);        

  } 

  eliminarFacturasOp(){
    this.idOperaciones = [];
    this.facturasLiquidadasProveedor.forEach((factura: FacturaOp) => {

      console.log("llamada al storage desde liq-proveedor, addItem");
      this.addItem(factura, "facOpLiqProveedor", factura.idFacturaOp, "INTERNA");

      this.editarOperacionesFac(factura)
      
    }); 
    /* this.facturaChofer.operaciones.forEach((factura: FacturaOpChofer) => {
      this.removeItem(factura);
    });  */
   /*  this.cerrarTabla(this.indiceSeleccionado);
    this.ngOnInit();  */
    /* this.facturaCliente.operaciones.forEach((factura: FacturaOpCliente) => {
      this.removeItem(factura);
    });
    this.cerrarTabla(this.indiceSeleccionado);
    this.ngOnInit(); */
  }

  editarOperacionesFac(factura:FacturaOp){
    factura.idOperacion
    let op:ConId<Operacion>;
    this.dbFirebase
    .obtenerTarifaIdTarifa("operaciones",factura.idOperacion, "idOperacion")
    .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
    .subscribe(data => {      
        op = data;
        console.log("OP: ", op);
        op.estado = {
          abierta: false,
          cerrada: false,
          facCliente: op.estado.facCliente,
          facChofer: true,
          facturada: op.estado.facChofer ? true : false,
          proformaCl: false,
          proformaCh: false,
        }
        if(op.estado.facturada){
          op.estado.facCliente = false;  
          op.estado.facChofer = false;
        }
        let{id,...opp} = op
        this.storageService.updateItem("operaciones", opp, op.idOperacion, "LIQUIDAR", `Operacion de Proveedor ${this.getProveedor(op.chofer.idProveedor)} Liquidada`, op.id);
        this.removeItem(factura);
        console.log("paso x aca??");
        
    });

  }

  removeItem(item:any){

    console.log("llamada al storage desde liq-Proveedor, deleteItem");
    this.storageService.deleteItem("facturaOpProveedor", item, item.idFacturaOp, "INTERNA", "");    

  }

  editarFacturaOpCliente(factura: ConId<FacturaOp>, i:number){   
    this.facDetallada = factura;   
    this.buscarTarifa(i);    
  }



  openModalLiquidacion(): void {   
    //this.facturasLiquidadasCliente
    //this.totalFacturasLiquidadasChofer
    //this.totalFacturasLiquidadasCliente
    console.log("this.indiceSeleccionado", this.indiceSeleccionado);
    
    
    {
      const modalRef = this.modalService.open(FacturarOpComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'xl', 
        //backdrop:"static" 
      });
      
    let info = {    
        origen:"proveedores",     
        facturas: this.facturasLiquidadasProveedor,
        total: this.totalFacturasLiquidadasProveedor,
        //totalChofer: this.totalFacturasLiquidadasChofer,
      }; 
      ////console.log()(info);
      
      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
          console.log("resultado factura proveedor: ",result);
          if(result.modo === "cerrar" || result.modo === "proforma"){
            let titulo = result.titulo
            this.facturaProveedor = result.factura;
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
    
    this.dbFirebase.procesarLiquidacion(this.facturasLiquidadasProveedor, "proveedores", "facOpLiqProveedor", "facturaOpProveedor", this.facturaProveedor, "facturaProveedor")
      .then((result) => {
        this.isLoading = false;
        console.log("resultado: ", result);
        if(result.exito){
            this.storageService.logMultiplesOp(this.facturaProveedor.operaciones, "LIQUIDAR", "operaciones", `Operación del Proveedor ${this.facturaProveedor.razonSocial} Liquidada`,result.exito);
            this.storageService.logSimple(this.facturaProveedor.idFacturaProveedor,"ALTA", "facturaProveedor", `Alta de Factura del Proveedor ${this.facturaProveedor.razonSocial}`, result.exito );
            Swal.fire({
                  icon: "success",
                  //title: "Oops...",
                  text: 'La liquidación se procesó con éxito.',
                  confirmButtonColor: "#3085d6",
                  confirmButtonText: "Confirmar",
                  //footer: `${msj}`
                }).then(() => {
                  Swal.fire({
                    title: `¿Desea imprimir el detalle del Proveedor?`,
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
                          this.excelServ.exportToExcelProveedor(this.facturaProveedor, this.facturasLiquidadasProveedor, this.$clientes, this.$choferes, accion);
                        }else if (titulo === "pdf"){          
                          this.pdfServ.exportToPdfProveedor(this.facturaProveedor, this.facturasLiquidadasProveedor, this.$clientes, this.$choferes, accion);
                      }
                    }
                  });   
                });
                this.mostrarMasDatos(this.indiceSeleccionado);
                this.procesarDatosParaTabla()
        } else {
          this.storageService.logMultiplesOp(this.facturaProveedor.operaciones, "LIQUIDAR", "operaciones", `Operación del Proveedor ${this.facturaProveedor.razonSocial} Liquidada`,result.exito);
          this.storageService.logSimple(this.facturaProveedor.idFacturaProveedor,"ALTA", "facturaProveedor", `Alta de Factura del Proveedor ${this.facturaProveedor.razonSocial}`, result.exito );
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
       
          this.dbFirebase.procesarProforma(this.facturasLiquidadasProveedor, "proveedores", this.titulo, "facturaOpCliente", this.facturaProveedor, "proforma")
          .then((result) => {
            this.isLoading = false;
            //console.log("resultado: ", result);
            if(result.exito){
                this.storageService.logMultiplesOp(this.facturaProveedor.operaciones, "PROFORMA", "operaciones", `Proforma de operación del Proveedor ${this.facturaProveedor.razonSocial}`,result.exito);
                this.storageService.logSimple(this.facturaProveedor.idFacturaProveedor,"ALTA", "facturaProveedor", `Alta de Proforma del Proveedor ${this.facturaProveedor.razonSocial}`, result.exito );
                Swal.fire({
                      icon: "success",
                      //title: "Oops...",
                      text: 'La proforma se generó con éxito.',
                      confirmButtonColor: "#3085d6",
                      confirmButtonText: "Confirmar",
                      //footer: `${msj}`
                    }).then(() => {
                       Swal.fire({
                          title: `¿Desea imprimir la proforma del Proveedor?`,
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
                                this.excelServ.exportToExcelProveedor(this.facturaProveedor, this.facturasLiquidadasProveedor, this.$clientes, this.$choferes, accion);
                              }else if (titulo === "pdf"){          
                                this.pdfServ.exportToPdfProveedor(this.facturaProveedor, this.facturasLiquidadasProveedor, this.$clientes, this.$choferes, accion);
                            }
                          }
                        });                
                    });
                    //this.mostrarMasDatos(this.indiceSeleccionado);
                    //this.procesarDatosParaTabla()
            } else {
              this.storageService.logMultiplesOp(this.facturaProveedor.operaciones, "PROFORMA", "operaciones", `Proforma de operación del Proveedor ${this.facturaProveedor.razonSocial}`,result.exito);
                this.storageService.logSimple(this.facturaProveedor.idFacturaProveedor,"ALTA", "facturaProveedor", `Alta de Proforma del Proveedor ${this.facturaProveedor.razonSocial}`, result.exito );
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

 
  buscarTarifa(i:number ) {
    
    let coleccionHistorialTarfGral: string = 'historialTarifasGralProveedor';
    let coleccionHistorialTarfEsp: string = 'historialTarifasEspProveedor';
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
        
      
        let origen:string = "proveedores"
  
       let info = {
          factura: this.facDetallada,
          tarifaAplicada: this.tarifaAplicada,   
          op: this.operacion, 
          origen:origen,    
          componente:'liquidacion',
        }; 
        //console.log(info); 
        
        modalRef.componentInstance.fromParent = info;
        modalRef.result.then(
          (result) => {
            this.procesarDatosParaTabla();
            this.cerrarTabla(i);
  
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
      this.datosTablaProveedor.sort((a, b) => {
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
                //BAJA DE FACTURA OP CHOFER
                this.removeItem(factura);              
                
                //BAJA DE FACTURA OP CLIENTE
                this.dbFirebase.obtenerTarifaMasReciente("facturaOpCliente", factura.contraParteId, "idFacturaOp", "idFacturaOp").subscribe(data => {
                  if(data){
                    let facturaContraParte = data
                    console.log("facturaContraParte: ", factura);
                    this.storageService.deleteItem("facturaOpCliente", facturaContraParte, factura.contraParteId, "INTERNA", "");        
                  }
                  
                })
                
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
      .obtenerTarifaIdTarifa("facturaOpProveedor",factura.idOperacion, "idOperacion")
      .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
      .subscribe(data => {      
          facOp = data;
          console.log("facOp: ", facOp);
          facOp.proforma = true;
          facOp.liquidacion = false;
          let {id, ...fac} = facOp
          let proveedor = this.getProveedor(fac.idProveedor)
          this.storageService.updateItem("facturaOpProveedor", fac, fac.idFacturaOp, "PROFORMA", `Proforma para operación de Cliente ${proveedor} `, facOp.id);
          //this.removeItem(factura);
      });
      
    }

    getTarifaGral(idTarifa: number):ConIdType<TarifaGralCliente> | undefined{
      let tarifasGral: ConIdType<TarifaGralCliente>[];
      let tarifa: ConIdType<TarifaGralCliente> | undefined;
      let coleccion: string = 'tarifasGralProveedor';
      
      tarifasGral = this.storageService.loadInfo(coleccion);
      tarifa = tarifasGral.find((tarf:ConIdType<TarifaGralCliente>)=> {return tarf.idTarifa === idTarifa});
      return tarifa;      
    }

    getTarifaEsp(idTarifa: number):ConIdType<TarifaGralCliente> | undefined{
      let tarifasGral: ConIdType<TarifaGralCliente>[];
      let tarifa: ConIdType<TarifaGralCliente> | undefined;
      let coleccion: string = 'tarifasEspProveedor';

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

      borrarLiquidaciones(){
        this.isLoading = true;
        console.log("this.$facturasOpCliente", this.$facturasOpProveedor);
        this.dbFirebase.eliminarMultiple(this.$facturasOpProveedor, "facturaOpProveedor").then((result)=>{
          this.isLoading = false;
          if(result.exito){
            alert("se eliminaron correctamente")
          } else {
            alert(`error en la eliminación: ${result.mensaje}` )
          }
        })
      }

}
