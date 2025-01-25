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
  facDetallada!: FacturaOp;
  $choferes!: Chofer[];
  $clientes!: Cliente[];
  $proveedores!: Proveedor[]; 
  operacion!:Operacion;
  ////////////////////////////////
  ordenColumna: string = '';
  ordenAscendente: boolean = true;
  columnaOrdenada: string = '';
  private destroy$ = new Subject<void>();
  opAbiertas!: Operacion[];
  
  constructor(private storageService: StorageService, private fb: FormBuilder, private facOpChoferService: FacturacionChoferService, private excelServ: ExcelService, private pdfServ: PdfService, private modalService: NgbModal, private dbFirebase: DbFirestoreService){
    // Inicializar el array para que todos los botones muestren la tabla cerrada al principio
    this.mostrarTablaChofer = new Array(this.datosTablaChofer.length).fill(false);  
  }

  ngOnInit(): void {

    this.storageService.choferes$
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data => {
      this.$choferes = data;
    });
    this.storageService.clientes$
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data => {
      this.$clientes = data;
    }); 
    this.storageService.proveedores$
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data => {
      this.$proveedores = data;
    });

    this.storageService.fechasConsulta$
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data => {
      this.fechasConsulta = data;
      console.log("LIQ CLIENTES: fechas consulta: ",this.fechasConsulta);
      this.storageService.getByDateValue(this.titulo, "fecha", this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta, "consultasFacOpChofer");
      this.btnConsulta = true;
       //this.storageService.getByDateValue(this.tituloFacOpCliente, "fecha", this.primerDia, this.ultimoDia, "consultasFacOpCliente");
      this.storageService.consultasFacOpChofer$
        .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
        .subscribe(data => {
          this.$facturasOpChofer = data;
          console.log("1)", this.$facturasOpChofer );
          if(this.$facturasOpChofer !== undefined){
            console.log("?????????????");            
            this.procesarDatosParaTabla()
          } else {
            console.log("");            
          }
          
      });
    });
      
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  procesarDatosParaTabla() {
    const choferesMap = new Map<number, any>();

    if(this.$facturasOpChofer !== null){
      ////console.log()("Facturas OP Chofer: ", this.$facturasOpChofer);
      
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
          console.log("this.opAbiertas", this.opAbiertas.length);    
          this.datosTablaChofer.forEach(c=>{
            c.opAbiertas = this.getOpAbiertas(c.idChofer)
          })        
        }      
      });    
      ////console.log()("Datos para la tabla: ", this.datosTablaChofer); 
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

    return chofer[0].apellido + " " + chofer[0].nombre;
  }

  getCliente(idCliente: number){
    let cliente: Cliente []
    cliente = this.$clientes.filter((cliente:Cliente)=>{
      return cliente.idCliente === idCliente
    })

    return cliente[0].razonSocial;

  } 


 limpiarValorFormateado(valorFormateado: string): number {
  // Elimina el punto de miles y reemplaza la coma por punto para que sea un valor numérico válido
    return parseFloat(valorFormateado.replace(/\./g, '').replace(',', '.'));
  }

  liquidarFac(factura: FacturaOp) {
    factura.liquidacion = !factura.liquidacion;
    //console.log("Estado de liquidación cambiado:", factura.liquidacion);
    //this.storageService.updateItem(this.tituloFacOpCliente, factura);
    this.procesarDatosParaTabla();
  }
  
  selectAllCheckboxes(event: any, idChofer: number): void {
    //let isChecked = (event.target as HTMLInputElement).checked;
    const seleccion = event.target.checked;
    console.log("1)", seleccion); 
    let facturasChofer = this.facturasPorChofer.get(idChofer);
    console.log("2)", facturasChofer);
      facturasChofer?.forEach((factura: FacturaOp) => {
        factura.liquidacion = seleccion;
        console.log("3)", factura.liquidacion);
       
      });   
      console.log("primera tabla: ", this.datosTablaChofer);
      let chofer = this.datosTablaChofer.find((chofer:any)=>{
        return chofer.idChofer === idChofer
      });
      console.log("1) cliente: ", chofer);
      if(seleccion){
        chofer.opFacturadas = 0
        facturasChofer?.forEach((factura: FacturaOp) => {                  
            chofer.opFacturadas += factura.valores.total;
            chofer.opSinFacturar = 0;
          });   
      } else {
        chofer.opSinFacturar = 0
        facturasChofer?.forEach((factura: FacturaOp) => {                
          chofer.opFacturadas = 0;
          chofer.opSinFacturar += factura.valores.total;
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
      console.log("2) cliente: ", chofer);
     
  }

  mostrarMasDatos(index: number, chofer:any) {   
   // Cambiar el estado del botón en la posición indicada
   this.mostrarTablaChofer[index] = !this.mostrarTablaChofer[index];
   //////console.log()("Chofer: ", chofer);

   // Obtener el id del cliente utilizando el índice proporcionado
   let choferId = this.datosTablaChofer[index].idChofer;

   // Filtrar las facturas según el id del cliente y almacenarlas en el mapa
   let facturasChofer = this.$facturasOpChofer.filter((factura: FacturaOp) => {
       return factura.idChofer === choferId;
   });
   this.facturasPorChofer.set(choferId, facturasChofer);

   console.log("FACTURAS DEL CHOFER: ", facturasChofer);  

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
    //console.log("IDCHOFER: ", chofer.idChofer);

    if(chofer.opAbiertas > 0){
       Swal.fire({
          icon: "warning",
          title: "¡Atención!",
          text: "El chofer tiene operaciones abiertas que corresponden al periodo que se esta facturando",
          //footer: '<a href="#">Why do I have this issue?</a>'
        });
    }
    
    let facturasIdChofer:any = this.facturasPorChofer.get(chofer.idChofer);    
    ////////console.log()("FACTURAS POR CHOFER: ", facturasIdChofer );
    this.apellido = chofer.apellido;
    //////console.log()("APELLIDO: ", this.apellido);
    
    // Filtrar las facturas con liquidacion=true y guardarlas en un nuevo array
    this.facturasLiquidadasChofer = facturasIdChofer.filter((factura: FacturaOp) => {
        return factura.liquidacion === true;
    });

   

    this.indiceSeleccionado = index;   
 
    if(this.facturasLiquidadasChofer.length > 0){
      console.log("1: ",this.facturasLiquidadasChofer);
      // Calcular el total sumando los montos de las facturas liquidadas
      this.totalFacturasLiquidadasChofer = 0;
      this.facturasLiquidadasChofer.forEach((factura: FacturaOp) => {
        this.totalFacturasLiquidadasChofer += factura.valores.total;
      });
  
      this.indiceSeleccionado = index;
      console.log("3) Facturas liquidadas del cliente", chofer.apellido + ":", this.facturasLiquidadasChofer);
      console.log("Total de las facturas liquidadas:", this.totalFacturasLiquidadasChofer);
      //console.log("indice: ", this.indiceSeleccionado);
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

  addItem(item:any, componente:string): void {   
    console.log("llamada al storage desde liq-cliente, addItem");
    this.storageService.addItem(componente, item);        
  } 

  eliminarFacturasOp(){
    this.idOperaciones = [];
    this.facturasLiquidadasChofer.forEach((factura: FacturaOp) => {
      console.log("llamada al storage desde liq-chofer, addItem");
      this.addItem(factura, "facOpLiqChofer");
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
    let op:Operacion;
    this.dbFirebase
    .obtenerTarifaIdTarifa("operaciones",factura.idOperacion, "idOperacion")
    .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
    .subscribe(data => {      
        op = data;
        console.log("OP: ", op);
        op.estado = {
          abierta: false,
          cerrada: false,
          facturada: true,
        }
        this.storageService.updateItem("operaciones", op);
        this.removeItem(factura);
    });

  }

  removeItem(item:any){
    console.log("llamada al storage desde liq-chofer, deleteItem");
    this.storageService.deleteItem("facturaOpChofer", item);    
  }

  editarFacturaOpCliente(factura: FacturaOp, i:number){   
    this.facDetallada = factura;   
    this.buscarTarifa(i);    
  }

  eliminarFacturaOpCliente(factura:FacturaOp, indice:number){
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
      //console.log()(info);
      
      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
          console.log(result);

          if(result.modo === "cerrar"){
            this.facturaChofer = result.factura;
            this.addItem(this.facturaChofer, this.componente);        
            if(result.titulo === "excel"){
            this.excelServ.exportToExcelChofer(this.facturaChofer, this.facturasLiquidadasChofer, this.$clientes, this.$choferes);
            }else if (result.titulo === "pdf"){
            this.pdfServ.exportToPdfChofer(this.facturaChofer, this.facturasLiquidadasChofer, this.$clientes, this.$choferes);        
            }
            this.eliminarFacturasOp();
          }
          
          
        },
        (reason) => {}
      );
    }
  }

  buscarTarifa(i:number) {
    console.log("A)",this.facDetallada);
    
    if(this.facDetallada.tarifaTipo.general){
      this.dbFirebase
      .obtenerTarifaIdTarifa("tarifasGralChofer",this.facDetallada.idTarifa, "idTarifa")
      .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
      .subscribe(data => {      
          this.ultimaTarifa = data;
          console.log("TARIFA APLICADA: ", this.ultimaTarifa);
          this.dbFirebase
          .obtenerTarifaIdTarifa("operaciones",this.facDetallada.idOperacion, "idOperacion")
          .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
          .subscribe(data => {      
              this.operacion = data;
              console.log("OPERACION: ", this.operacion);
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
          console.log("TARIFA APLICADA: ", this.ultimaTarifa);
          this.dbFirebase
          .obtenerTarifaIdTarifa("operaciones",this.facDetallada.idOperacion, "idOperacion")
          .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
          .subscribe(data => {      
              this.operacion = data;
              console.log("OPERACION: ", this.operacion);
              this.openModalTarifa(i)
          });        
      });
    }
    if(this.facDetallada.tarifaTipo.eventual){
      this.ultimaTarifa = {};
      console.log("TARIFA APLICADA: ", this.ultimaTarifa);
      this.dbFirebase
      .obtenerTarifaIdTarifa("operaciones",this.facDetallada.idOperacion, "idOperacion")
      .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
      .subscribe(data => {      
          this.operacion = data;
          console.log("OPERACION: ", this.operacion);
          this.openModalTarifa(i)
      });     
      
    }
    if(this.facDetallada.tarifaTipo.personalizada){
      this.dbFirebase
      .obtenerTarifaIdTarifa("tarifasPersCliente",this.facDetallada.idTarifa, "idTarifa")
      .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
      .subscribe(data => {      
          this.ultimaTarifa = data;
          console.log("TARIFA APLICADA: ", this.ultimaTarifa);
          this.dbFirebase
          .obtenerTarifaIdTarifa("operaciones",this.facDetallada.idOperacion, "idOperacion")
          .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
          .subscribe(data => {      
              this.operacion = data;
              console.log("OPERACION: ", this.operacion);
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
        console.log(info); 
        
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

    
  
}
