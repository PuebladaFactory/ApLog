import { Component, Input } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { FacturaCliente } from 'src/app/interfaces/factura-cliente';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
import { TarifaCliente } from 'src/app/interfaces/tarifa-cliente';
import { FacturacionClienteService } from 'src/app/servicios/facturacion/facturacion-cliente/facturacion-cliente.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { PdfService } from 'src/app/servicios/informes/pdf/pdf.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EditarTarifaComponent } from '../modales/cliente/editar-tarifa/editar-tarifa.component';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { take } from 'rxjs';
import { Chofer } from 'src/app/interfaces/chofer';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { Cliente } from 'src/app/interfaces/cliente';
import { FacturaOp } from 'src/app/interfaces/factura-op';
import { Operacion } from 'src/app/interfaces/operacion';
import Swal from 'sweetalert2';
import { FacturarOpComponent } from '../modales/facturar-op/facturar-op.component';

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
  facturasPorCliente: Map<number, FacturaOp[]> = new Map<number, FacturaOp[]>();
  indiceSeleccionado!:number;
  idOperaciones: number [] = [];
  facDetallada!: FacturaOp;
  ultimaTarifa!: TarifaCliente|any;
  tarifaEditForm: any;
  swichForm:any;
  edicion:boolean = false;
  tarifaEspecial: boolean = false;
  $choferes!: Chofer[];
  $clientes!: Cliente[];
  $proveedores!: Proveedor[]; 
  operacion!:Operacion;

  
  constructor(private storageService: StorageService, private fb: FormBuilder, private facOpClienteService: FacturacionClienteService, private excelServ: ExcelService, private pdfServ: PdfService, private modalService: NgbModal, private dbFirebase: DbFirestoreService){
    // Inicializar el array para que todos los botones muestren la tabla cerrada al principio
    this.mostrarTablaCliente = new Array(this.datosTablaCliente.length).fill(false);
    
   /*  this.form = this.fb.group({      
      detalle: [""],       
    }); */

  }

  ngOnInit(): void {

    this.storageService.choferes$.subscribe(data => {
      this.$choferes = data;
    });
    this.storageService.clientes$.subscribe(data => {
      this.$clientes = data;
    }); 
    this.storageService.proveedores$.subscribe(data => {
      this.$proveedores = data;
    });  

    this.storageService.fechasConsulta$.subscribe(data => {
      this.fechasConsulta = data;
      console.log("LIQ CLIENTES: fechas consulta: ",this.fechasConsulta);
      this.storageService.getByDateValue(this.titulo, "fecha", this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta, "consultasFacOpCliente");
      this.btnConsulta = true;
       //this.storageService.getByDateValue(this.tituloFacOpCliente, "fecha", this.primerDia, this.ultimoDia, "consultasFacOpCliente");
      this.storageService.consultasFacOpCliente$
        //.pipe(take(1))
        .subscribe(data => {
          this.$facturasOpCliente = data;
          console.log("1)", this.$facturasOpCliente );
          if(this.$facturasOpCliente !== undefined){
            console.log("?????????????");            
            this.procesarDatosParaTabla()
          } else {
            console.log("");            
          }
          
      });
    });
      
   
    
    //this.consultaMes(); 
  }

  procesarDatosParaTabla() {
    const clientesMap = new Map<number, any>();

    if(this.$facturasOpCliente !== null){
      ////console.log()("Facturas OP CLiente: ", this.$facturasOpCliente);
      this.$facturasOpCliente.forEach((factura: FacturaOp) => {
        if (!clientesMap.has(factura.idCliente)) {
          clientesMap.set(factura.idCliente, {
            idCliente: factura.idCliente,
            razonSocial: this.getCliente(factura.idCliente),
            cantOp: 0,
            opSinFacturar: 0,
            opFacturadas: 0,
            total: 0,
            aPagar: 0,
          });
        }
     
        const cliente = clientesMap.get(factura.idCliente);
        cliente.cantOp++;
        if (factura.liquidacion) {
          cliente.opFacturadas += factura.valores.total;
        } else {
          cliente.opSinFacturar += factura.valores.total;
        }
        cliente.total += factura.valores.total;
        cliente.aPagar += factura.contraParteMonto;        
        
      });
  
      this.datosTablaCliente = Array.from(clientesMap.values());
      ////console.log()("Datos para la tabla: ", this.datosTablaCliente); 
    }
    
  }

  getCliente(idCliente: number){
    let cliente: Cliente []
    cliente = this.$clientes.filter((cliente:Cliente)=>{
      return cliente.idCliente === idCliente
    })

    return cliente[0].razonSocial;

  }

  getChofer(idChofer: number){
    let chofer: Chofer []
    chofer = this.$choferes.filter((chofer:Chofer)=>{
      return chofer.idChofer === idChofer
    })

    return chofer[0].apellido + " " + chofer[0].nombre;
  }

  getProveedor(proveedor: Proveedor){
    
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
 
// Modifica liquidarFac para solo actualizar el estado y hacer cualquier procesamiento adicional
liquidarFac(factura: FacturaOp) {
  factura.liquidacion = !factura.liquidacion;
  //console.log("Estado de liquidación cambiado:", factura.liquidacion);
  //this.storageService.updateItem(this.tituloFacOpCliente, factura);
  this.procesarDatosParaTabla();
}

selectAllCheckboxes(event: any, idCliente: number): void {
  //let isChecked = (event.target as HTMLInputElement).checked;
  const seleccion = event.target.checked;
  console.log("1)", seleccion); 
  let facturasCliente = this.facturasPorCliente.get(idCliente);
  console.log("2)", facturasCliente);
    facturasCliente?.forEach((factura: FacturaOp) => {
      factura.liquidacion = seleccion;
      console.log("3)", factura.liquidacion);
     
    });   
    console.log("primera tabla: ", this.datosTablaCliente);
    let cliente = this.datosTablaCliente.find((cliente:any)=>{
      return cliente.idCliente === idCliente
    });
    console.log("1) cliente: ", cliente);
    facturasCliente?.forEach((factura: FacturaOp) => {
      if (factura.liquidacion) {
        cliente.opFacturadas += factura.valores.total;
        cliente.opSinFacturar -= factura.valores.total;
      } else {
        cliente.opSinFacturar += factura.valores.total;
        cliente.opFacturadas -= factura.valores.total;
      }
     
    });   
    console.log("2) cliente: ", cliente);
   
}
 

  mostrarMasDatos(index: number, cliente:any) {   
   // Cambiar el estado del botón en la posición indicada
   this.mostrarTablaCliente[index] = !this.mostrarTablaCliente[index];
   //console.log("CLIENTE: ", cliente);

   // Obtener el id del cliente utilizando el índice proporcionado
   let clienteId = this.datosTablaCliente[index].idCliente;
    console.log("clienteId: ", clienteId);
    
   // Filtrar las facturas según el id del cliente y almacenarlas en el mapa
   let facturasCliente = this.$facturasOpCliente.filter((factura: FacturaOp) => {
       return factura.idCliente === clienteId;
   });
   this.facturasPorCliente.set(clienteId, facturasCliente);
   console.log("FACTURAS DEL CLIENTE: ", facturasCliente);  
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

  liquidarFacCliente(idCliente: any, razonSocial: string, index: number){
    // Obtener las facturas del cliente
    //console.log("1: ",this.facturasLiquidadasCliente);
    
    let facturasIdCliente:any = this.facturasPorCliente.get(idCliente);
    this.razonSocFac = razonSocial;
    // Filtrar las facturas con liquidacion=true y guardarlas en un nuevo array
    this.facturasLiquidadasCliente = facturasIdCliente.filter((factura: FacturaOp) => {
        return factura.liquidacion === true;
    });

    if(this.facturasLiquidadasCliente.length > 0){
      console.log("1: ",this.facturasLiquidadasCliente);
      // Calcular el total sumando los montos de las facturas liquidadas
      this.totalFacturasLiquidadasCliente = 0;
      this.facturasLiquidadasCliente.forEach((factura: FacturaOp) => {
        this.totalFacturasLiquidadasCliente += factura.valores.total;
      });
  
      this.indiceSeleccionado = index;
      console.log("3) Facturas liquidadas del cliente", razonSocial + ":", this.facturasLiquidadasCliente);
      console.log("Total de las facturas liquidadas:", this.totalFacturasLiquidadasCliente);
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
    this.facturasLiquidadasCliente.forEach((factura: FacturaOp) => {
      console.log("llamada al storage desde liq-cliente, addItem");
      this.addItem(factura, "facOpLiqCliente");
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
    console.log("llamada al storage desde liq-cliente, deleteItem");
    this.storageService.deleteItem("facturaOpCliente", item);    
  }

  editarFacturaOpCliente(factura: FacturaOp){   
    this.facDetallada = factura;   
    this.buscarTarifa();    
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
        origen:"clientes",
        facturas: this.facturasLiquidadasCliente,
        total: this.totalFacturasLiquidadasCliente,
        //totalChofer: this.totalFacturasLiquidadasChofer,
      }; 
      //console.log()(info);
      
      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
          console.log(result);
          
          if(result.modo === "cerrar"){
            this.facturaCliente = result.factura;            
            this.addItem(this.facturaCliente, this.componente);            
            if(result.titulo === "excel"){
            this.excelServ.exportToExcelCliente(this.facturaCliente, this.facturasLiquidadasCliente, this.$clientes, this.$choferes);
            }else if (result.titulo === "pdf"){
            this.pdfServ.exportToPdfCliente(this.facturaCliente, this.facturasLiquidadasCliente, this.$clientes, this.$choferes);        
            }
            this.eliminarFacturasOp();
          } 
          },
        (reason) => {}
      );
    }
  }

  buscarTarifa() {
  //console.log("A)",this.facDetallada);
  
  if(this.facDetallada.tarifaTipo.general){
    this.dbFirebase
    .obtenerTarifaIdTarifa("tarifasGralCliente",this.facDetallada.idTarifa, "idTarifa")
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
            this.openModalTarifa()
        });        
    });
  }
  if(this.facDetallada.tarifaTipo.especial){
    this.dbFirebase
    .obtenerTarifaIdTarifa("tarifasEspCliente",this.facDetallada.idTarifa, "idTarifa")
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
            this.openModalTarifa()
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
        this.openModalTarifa()
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
            this.openModalTarifa()
        });        
    });
  }

   
  
  }

  openModalTarifa(): void {   
   
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
        op: this.operacion,     
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
