import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FacturaChofer } from 'src/app/interfaces/factura-chofer';

import { Operacion } from 'src/app/interfaces/operacion';
import { FacturacionChoferService } from 'src/app/servicios/facturacion/facturacion-chofer/facturacion-chofer.service';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { PdfService } from 'src/app/servicios/informes/pdf/pdf.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { Subject, take, takeUntil } from 'rxjs';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { FacturaOp } from 'src/app/interfaces/factura-op';
import Swal from 'sweetalert2';
import { FacturarOpComponent } from '../modales/facturar-op/facturar-op.component';
import { EditarTarifaOpComponent } from '../modales/editar-tarifa-op/editar-tarifa-op.component';
import { ModalBajaComponent } from 'src/app/shared/modal-baja/modal-baja.component';
import { ConId, ConIdType } from 'src/app/interfaces/conId';


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

  
  titulo: string = "facturaOpChofer"
  btnConsulta:boolean = false;
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
  
  facturasPorChofer: Map<number, FacturaOp[]> = new Map<number, FacturaOp[]>();
  indiceSeleccionado!:number
  ultimaTarifa!:any;
  tarifaEditForm: any;
  swichForm:any;
  edicion:boolean = false;
  tarifaEspecial: boolean = false;
  idOperaciones: number [] = [];
  facDetallada!: ConId<FacturaOp>;
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
  
  constructor(private storageService: StorageService, private fb: FormBuilder, private facOpChoferService: FacturacionChoferService, private excelServ: ExcelService, private pdfServ: PdfService, private modalService: NgbModal, private dbFirebase: DbFirestoreService){
    // Inicializar el array para que todos los botones muestren la tabla cerrada al principio
    this.mostrarTablaChofer = new Array(this.datosTablaChofer.length).fill(false);  
  }

  ngOnInit(): void {

    this.storageService.getObservable<ConIdType<Chofer>>("choferes")
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data => {      
      if(data){
        this.$choferes = data;
        this.$choferes = this.$choferes.sort((a, b) => a.apellido.localeCompare(b.apellido)); // Ordena por el nombre del chofer
      } else {
        this.mensajesError("error: choferes");
      }
    });
    this.storageService.getObservable<ConIdType<Cliente>>("clientes")
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data => {      
      if(data){
        this.$clientes = data;
        this.$clientes = this.$clientes.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
      } else {
        this.mensajesError("error: clientes");
      }
    }); 
    this.storageService.getObservable<ConIdType<Proveedor>>("proveedores")
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data => {
      if(data){
        this.$proveedores = data;
        this.$proveedores = this.$proveedores.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
      } else {
        this.mensajesError("error: proveedores");
      }
      
    });

    this.storageService.fechasConsulta$
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data => {
      this.fechasConsulta = data;
      //console.log("LIQ CLIENTES: fechas consulta: ",this.fechasConsulta);
      //his.storageService.getByDateValue(this.titulo, "fecha", this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta, "consultasFacOpChofer");
      this.storageService.syncChangesDateValue<FacturaOp>(this.titulo, "fecha", this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta, "desc");
      this.btnConsulta = true;
       //this.storageService.getByDateValue(this.tituloFacOpCliente, "fecha", this.primerDia, this.ultimoDia, "consultasFacOpCliente");
      this.storageService.getObservable<ConId<FacturaOp>>("facturaOpChofer")
        .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
        .subscribe(data => {
          this.$facturasOpChofer = data;
          console.log("1)", this.$facturasOpChofer );
          if(this.$facturasOpChofer){
            //console.log("?????????????");            
            this.procesarDatosParaTabla();            
            this.verificarDuplicados();
          } else {
            this.mensajesError("error: facturaOpChofer")            
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

    this.$facturasOpChofer = this.$facturasOpChofer.filter((factura:ConId<FacturaOp>) => {
        if (seenIds.has(factura.idOperacion)) {
            this.$facturasOpDuplicadas.push(factura);
            return false; // Eliminar del array original
        } else {
            seenIds.add(factura.idOperacion);
            return true; // Mantener en el array original
        }
    });
    console.log("this.$facturasOpChofer", this.$facturasOpChofer);
    console.log("duplicadas", this.$facturasOpDuplicadas);
    
}
  
  procesarDatosParaTabla() {
    const choferesMap = new Map<number, any>();

    if(this.$facturasOpChofer !== null){
      //////console.log()("Facturas OP Chofer: ", this.$facturasOpChofer);
      
      this.$facturasOpChofer.forEach((factura: FacturaOp) => {
        if (!choferesMap.has(factura.idChofer)) {
          choferesMap.set(factura.idChofer, {
            idChofer: factura.idChofer,
            apellido:  this.getChofer(factura.idChofer),
            opCerradas: 0,
            opAbiertas: 0,
            opSinFacturar: 0,
            opFacturadas: 0,
            total: 0,
            aCobrar: 0,
            ganancia:0,
          });
        }
  
        const chofer = choferesMap.get(factura.idChofer);
        chofer.opCerradas++;
        if (factura.liquidacion) {
          chofer.opFacturadas += factura.valores.total;
        } else {
          chofer.opSinFacturar += factura.valores.total;
        }
        chofer.total += factura.valores.total;
        chofer.aCobrar += factura.contraParteMonto;   
        chofer.ganancia = 100-((chofer.total*100)/chofer.aCobrar);
        
      });
  
      this.datosTablaChofer = Array.from(choferesMap.values());
      this.datosTablaChofer = this.datosTablaChofer.sort((a, b) => a.apellido.localeCompare(b.apellido)); // Ordena por el nombre del chofer
      this.dbFirebase.getAllByDateValueField<Operacion>('operaciones', 'fecha', this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta, "estado.abierta", true).subscribe(data=>{      
        if(data){
          this.opAbiertas = data;
          this.opAbiertas = this.opAbiertas.filter((op:Operacion)=> op.estado.abierta)
          //console.log("this.opAbiertas", this.opAbiertas.length);    
          this.datosTablaChofer.forEach(c=>{
            c.opAbiertas = this.getOpAbiertas(c.idChofer)
          })        
        }      
      });    
      //////console.log()("Datos para la tabla: ", this.datosTablaChofer); 
    }
    
  }

    getOpAbiertas(idChofer:number){
      if(this.opAbiertas !== undefined){
        let cantOpAbiertas = this.opAbiertas.filter((op:Operacion)=>{return op.chofer.idChofer === idChofer})
      
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
  
  selectAllCheckboxes(event: any, idChofer: number): void {
    //let isChecked = (event.target as HTMLInputElement).checked;
    const seleccion = event.target.checked;
    //console.log("1)", seleccion); 
    let facturasChofer = this.facturasPorChofer.get(idChofer);
    //console.log("2)", facturasChofer);
      facturasChofer?.forEach((factura: FacturaOp) => {
        if(!factura.proforma){
          factura.liquidacion = seleccion;
        }
        
        //console.log("3)", factura.liquidacion);
       
      });   
      //console.log("primera tabla: ", this.datosTablaChofer);
      let chofer = this.datosTablaChofer.find((chofer:any)=>{
        return chofer.idChofer === idChofer
      });
      //console.log("1) cliente: ", chofer);
      if(seleccion){
        chofer.opFacturadas = 0
        facturasChofer?.forEach((factura: FacturaOp) => {                  
            chofer.opFacturadas += factura.valores.total;
            chofer.opSinFacturar = 0;
          });   
      } else {
        chofer.opSinFacturar = 0;
        chofer.opFacturadas = 0;
        facturasChofer?.forEach((factura: FacturaOp) => {                
          chofer.opFacturadas += (factura.proforma ? factura.valores.total : 0);
          chofer.opSinFacturar += (!factura.proforma ? factura.valores.total : 0);
        });   
      }

      /* facturasChofer?.forEach((factura: FacturaOp) => {
        if (factura.liquidacion) {
          chofer.opFacturadas += factura.valores.total;
          chofer.opSinFacturar -= factura.valores.total;
        } else {
          chofer.opSinFacturar += factura.valores.total;
          chofer.opFacturadas -= factura.valores.total;
        }
       
      });    */
      //console.log("2) cliente: ", chofer);
     
  }

  mostrarMasDatos(index: number) {   
   // Cambiar el estado del botón en la posición indicada
   this.mostrarTablaChofer[index] = !this.mostrarTablaChofer[index];
   ////////console.log()("Chofer: ", chofer);

   // Obtener el id del cliente utilizando el índice proporcionado
   let choferId = this.datosTablaChofer[index].idChofer;

   // Filtrar las facturas según el id del cliente y almacenarlas en el mapa
   let facturasChofer = this.$facturasOpChofer.filter((factura: FacturaOp) => {
       return factura.idChofer === choferId;
   });
   this.facturasPorChofer.set(choferId, facturasChofer);

   //console.log("FACTURAS DEL CHOFER: ", facturasChofer);  

  }

  cerrarTabla(index: number){
    this.mostrarTablaChofer[index] = !this.mostrarTablaChofer[index];
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
  

  liquidarFacChofer(chofer: any, index: number){
    // Obtener las facturas del cliente
    ////console.log("IDCHOFER: ", chofer.idChofer);

    if(chofer.opAbiertas > 0){
       Swal.fire({
          icon: "warning",
          title: "¡Atención!",
          text: "El chofer tiene operaciones abiertas que corresponden al periodo que se esta facturando",
          //footer: '<a href="#">Why do I have this issue?</a>'
        });
    }
    
    let facturasIdChofer:any = this.facturasPorChofer.get(chofer.idChofer);    
    //////////console.log()("FACTURAS POR CHOFER: ", facturasIdChofer );
    this.apellido = chofer.apellido;
    ////////console.log()("APELLIDO: ", this.apellido);
    
    // Filtrar las facturas con liquidacion=true y guardarlas en un nuevo array
    this.facturasLiquidadasChofer = facturasIdChofer.filter((factura: FacturaOp) => {
        return factura.liquidacion === true && factura.proforma === false;
    });

   

    this.indiceSeleccionado = index;   
 
    if(this.facturasLiquidadasChofer.length > 0){
      //console.log("1: ",this.facturasLiquidadasChofer);
      // Calcular el total sumando los montos de las facturas liquidadas
      this.totalFacturasLiquidadasChofer = 0;
      this.facturasLiquidadasChofer.forEach((factura: FacturaOp) => {
        this.totalFacturasLiquidadasChofer += factura.valores.total;
      });
  
      this.indiceSeleccionado = index;
      //console.log("3) Facturas liquidadas del cliente", chofer.apellido + ":", this.facturasLiquidadasChofer);
      //console.log("Total de las facturas liquidadas:", this.totalFacturasLiquidadasChofer);
      ////console.log("indice: ", this.indiceSeleccionado);
      this.openModalLiquidacion();
    } else {
      this.mensajesError("Debe seleccionar una factura para liquidar")
    }
  }

  mensajesError(msj:string){
    Swal.fire({
      icon: "error",
      //title: "Oops...",
      text: `${msj}`
      //footer: `${msj}`
    });
  }


  addItem(item:any, componente:string, idItem:number, accion:string): void {   
    console.log("llamada al storage desde liq-cliente, addItem");
    this.storageService.addItem(componente, item, idItem, accion, accion === "INTERNA" ? "" : `Alta de Factura de Chofer ${item.apellido} ${item.nombre}`);        

  } 

  eliminarFacturasOp(){
    this.idOperaciones = [];
    this.facturasLiquidadasChofer.forEach((factura: FacturaOp) => {

      console.log("llamada al storage desde liq-chofer, addItem");
      this.addItem(factura, "facOpLiqChofer", factura.idFacturaOp, "INTERNA");

      this.editarOperacionesFac(factura)
      
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

  editarOperacionesFac(factura:FacturaOp){
    factura.idOperacion
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
          facCliente: op.estado.facCliente,
          facChofer: true,
          facturada: op.estado.facCliente ? true : false,
        }
        let{id, ...opp}=op
        this.storageService.updateItem("operaciones", opp, op.idOperacion, "Liquidar", `Operación de Chofer ${op.chofer.apellido} ${op.chofer.nombre} Liquidada`, op.id);
        this.removeItem(factura);
    });

  }

  removeItem(item:any){
    console.log("llamada al storage desde liq-chofer, deleteItem");
    this.storageService.deleteItem("facturaOpChofer", item, item.idFacturaOp, "INTERNA", "");    
  }

  editarFacturaOpCliente(factura: ConId<FacturaOp>, i:number){   
    this.facDetallada = factura;   
    this.buscarTarifa(i);    
  }

  eliminarFacturaOpCliente(factura:FacturaOp, indice:number){
    this.removeItem(factura);
    //this.cerrarTabla(indice)
    //this.ngOnInit(); 
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
        origen:"choferes",   
        facturas: this.facturasLiquidadasChofer,
        total: this.totalFacturasLiquidadasChofer,
        //totalChofer: this.totalFacturasLiquidadasChofer,
      }; 
      ////console.log()(info);
      
      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
          //console.log(result);

          if(result.modo === "cerrar" || result.modo === "proforma"){
            let titulo = result.titulo
            this.facturaChofer = result.factura;
            let accion: string = result.accion;
            if(result.modo === "cerrar"){
              this.addItem(this.facturaChofer, this.componente, this.facturaChofer.idFacturaChofer, "ALTA");
            }

            if(result.modo === "proforma"){
              this.addItem(this.facturaChofer, "proforma", this.facturaChofer.idFacturaChofer, "ALTA");
              this.facturasLiquidadasChofer.forEach((factura:FacturaOp)=>{
                this.actualizarFacOp(factura);        
              })              
            }     
            
            
            Swal.fire({
                title: `¿Desea imprimir el detalle del Chofer?`,
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
                      this.excelServ.exportToExcelChofer(this.facturaChofer, this.facturasLiquidadasChofer, this.$clientes, this.$choferes, accion);
                    }else if (titulo === "pdf"){
                      this.pdfServ.exportToPdfChofer(this.facturaChofer, this.facturasLiquidadasChofer, this.$clientes, this.$choferes);        
                    } 
                }
              });   
            
              if(result.modo === "cerrar"){
                this.eliminarFacturasOp();
              }
            
              this.mostrarMasDatos(this.indiceSeleccionado);
          }
          
          
        },
        (reason) => {}
      );
    }
  }

  buscarTarifa(i:number) {
    //console.log("A)",this.facDetallada);
    
    if(this.facDetallada.tarifaTipo.general){
      this.dbFirebase
      .obtenerTarifaIdTarifa("tarifasGralChofer",this.facDetallada.idTarifa, "idTarifa")
      .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
      .subscribe(data => {      
          this.ultimaTarifa = data;
          //console.log("TARIFA APLICADA: ", this.ultimaTarifa);
          this.dbFirebase
          .obtenerTarifaIdTarifa("operaciones",this.facDetallada.idOperacion, "idOperacion")
          .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
          .subscribe(data => {      
              this.operacion = data;
              //console.log("OPERACION: ", this.operacion);
              this.openModalTarifa(i)
          });        
      });
    }
    if(this.facDetallada.tarifaTipo.especial){
      this.dbFirebase
      .obtenerTarifaIdTarifa("tarifasEspChofer",this.facDetallada.idTarifa, "idTarifa")
      .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
      .subscribe(data => {      
          this.ultimaTarifa = data;
          //console.log("TARIFA APLICADA: ", this.ultimaTarifa);
          this.dbFirebase
          .obtenerTarifaIdTarifa("operaciones",this.facDetallada.idOperacion, "idOperacion")
          .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
          .subscribe(data => {      
              this.operacion = data;
              //console.log("OPERACION: ", this.operacion);
              this.openModalTarifa(i)
          });        
      });
    }
    if(this.facDetallada.tarifaTipo.eventual){
      this.ultimaTarifa = {};
      //console.log("TARIFA APLICADA: ", this.ultimaTarifa);
      this.dbFirebase
      .obtenerTarifaIdTarifa("operaciones",this.facDetallada.idOperacion, "idOperacion")
      .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
      .subscribe(data => {      
          this.operacion = data;
          //console.log("OPERACION: ", this.operacion);
          this.openModalTarifa(i)
      });     
      
    }
    if(this.facDetallada.tarifaTipo.personalizada){
      this.dbFirebase
      .obtenerTarifaIdTarifa("tarifasPersCliente",this.facDetallada.idTarifa, "idTarifa")
      .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
      .subscribe(data => {      
          this.ultimaTarifa = data;
          //console.log("TARIFA APLICADA: ", this.ultimaTarifa);
          this.dbFirebase
          .obtenerTarifaIdTarifa("operaciones",this.facDetallada.idOperacion, "idOperacion")
          .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
          .subscribe(data => {      
              this.operacion = data;
              //console.log("OPERACION: ", this.operacion);
              this.openModalTarifa(i)
          });        
      });
    }
  
     
    
    }

    openModalTarifa(i:number): void {   
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
        const modalRef = this.modalService.open(EditarTarifaOpComponent, {
          windowClass: 'myCustomModalClass',
          centered: true,
          size: 'lg',           
          //backdrop:"static" 
        });
        
      let origen: string = "choferes"  
  
       let info = {
          factura: this.facDetallada,
          tarifaAplicada: this.ultimaTarifa,   
          op: this.operacion,   
          origen: origen,  
        }; 
        //console.log(info); 
        
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
      this.datosTablaChofer.sort((a, b) => {
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
        .obtenerTarifaIdTarifa("facturaOpChofer",factura.idOperacion, "idOperacion")
        .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
        .subscribe(data => {      
            facOp = data;
            console.log("facOp: ", facOp);
            facOp.proforma = true;
            facOp.liquidacion = true;
            let {id, ...fac} = facOp
            let chofer = this.getChofer(fac.idChofer)
            this.storageService.updateItem("facturaOpChofer", fac, fac.idFacturaOp, "PROFORMA", `Proforma para operación de Cliente ${chofer} `, facOp.id);
            //this.removeItem(factura);
        });
        
      }


}
