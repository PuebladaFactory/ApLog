import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { take } from 'rxjs';
import { FacturaOpProveedor } from 'src/app/interfaces/factura-op-proveedor';
import { FacturaProveedor } from 'src/app/interfaces/factura-proveedor';
import { TarifaProveedor } from 'src/app/interfaces/tarifa-proveedor';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { FacturacionProveedorService } from 'src/app/servicios/facturacion/facturacion-proveedor/facturacion-proveedor.service';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { PdfService } from 'src/app/servicios/informes/pdf/pdf.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { EditarTarifaProveedorComponent } from '../modales/proveedor/editar-tarifa-proveedor/editar-tarifa-proveedor.component';
import { LiquidacionOpProveedorComponent } from '../modales/proveedor/liquidacion-op-proveedor/liquidacion-op-proveedor.component';
import { FacturaOp } from 'src/app/interfaces/factura-op';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { Operacion } from 'src/app/interfaces/operacion';
import Swal from 'sweetalert2';

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

  titulo: string = "facturaOpProveedor"
  btnConsulta:boolean = false;
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
  facturaEditada!: FacturaOp;
  facturasPorProveedor: Map<number, FacturaOp[]> = new Map<number, FacturaOp[]>();
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
  
  
  constructor(private storageService: StorageService, private fb: FormBuilder, private facOpProveedorService: FacturacionProveedorService, private excelServ: ExcelService, private pdfServ: PdfService, private modalService: NgbModal, private dbFirebase: DbFirestoreService){
    // Inicializar el array para que todos los botones muestren la tabla cerrada al principio
    this.mostrarTablaProveedor = new Array(this.datosTablaProveedor.length).fill(false);
   
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
      console.log("LIQ proveedor: fechas consulta: ",this.fechasConsulta);
      this.storageService.getByDateValue(this.titulo, "fecha", this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta, "consultasFacOpProveedor");
      this.btnConsulta = true;
       //this.storageService.getByDateValue(this.tituloFacOpCliente, "fecha", this.primerDia, this.ultimoDia, "consultasFacOpCliente");
      this.storageService.consultasFacOpProveedor$
        //.pipe(take(1))
        .subscribe(data => {
          this.$facturasOpProveedor = data;
          console.log("1)", this.$facturasOpProveedor );
          if(this.$facturasOpProveedor !== undefined){
            console.log("?????????????");            
            this.procesarDatosParaTabla()
          } else {
            console.log("");            
          }
          
      });
    });
      
  }

  
  procesarDatosParaTabla() {
    const proveedoresMap = new Map<number, any>();

    if(this.$facturasOpProveedor !== null){
      ////console.log()("Facturas OP Chofer: ", this.$facturasOpChofer);
      
      this.$facturasOpProveedor.forEach((factura: FacturaOp) => {
        if (!proveedoresMap.has(factura.idProveedor)) {
          proveedoresMap.set(factura.idProveedor, {
            idProveedor: factura.idProveedor,
            razonSocial:  this.getProveedor(factura.idProveedor),
            cantOp: 0,
            opSinFacturar: 0,
            opFacturadas: 0,
            total: 0,
            aCobrar: 0,
          });
        }
  
        const proveedor = proveedoresMap.get(factura.idProveedor);
        proveedor.cantOp++;
        if (factura.liquidacion) {
          proveedor.opFacturadas += factura.valores.total;
        } else {
          proveedor.opSinFacturar += factura.valores.total;
        }
        proveedor.total += factura.valores.total;
        proveedor.aCobrar += factura.contraParteMonto;   
        
      });
  
      this.datosTablaProveedor = Array.from(proveedoresMap.values());
      ////console.log()("Datos para la tabla: ", this.datosTablaChofer); 
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

  getProveedor(idProveedor: number){
    let proveedor: Proveedor []
    proveedor = this.$proveedores.filter((proveedor:Proveedor)=>{
      return proveedor.idProveedor === idProveedor;
    })

    return proveedor[0].razonSocial
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

  liquidarFac(factura: FacturaOp) {
    factura.liquidacion = !factura.liquidacion;
    //console.log("Estado de liquidación cambiado:", factura.liquidacion);
    //this.storageService.updateItem(this.tituloFacOpCliente, factura);
    this.procesarDatosParaTabla();
  }
  
  selectAllCheckboxes(event: any, idProveedor: number): void {
    //let isChecked = (event.target as HTMLInputElement).checked;
    const seleccion = event.target.checked;
    console.log("1)", seleccion); 
    let facturasProveedor = this.facturasPorProveedor.get(idProveedor);
    console.log("2)", facturasProveedor);
      facturasProveedor?.forEach((factura: FacturaOp) => {
        factura.liquidacion = seleccion;
        console.log("3)", factura.liquidacion);
       
      });   
      console.log("primera tabla: ", this.datosTablaProveedor);
      let proveedor = this.datosTablaProveedor.find((proveedor:any)=>{
        return proveedor.idProveedor === idProveedor
      });
      console.log("1) cliente: ", proveedor);
      facturasProveedor?.forEach((factura: FacturaOp) => {
        if (factura.liquidacion) {
          proveedor.opFacturadas += factura.valores.total;
          proveedor.opSinFacturar -= factura.valores.total;
        } else {
          proveedor.opSinFacturar += factura.valores.total;
          proveedor.opFacturadas -= factura.valores.total;
        }
       
      });   
      console.log("2) cliente: ", proveedor);
     
  }

  mostrarMasDatos(index: number, chofer:any) {   
   // Cambiar el estado del botón en la posición indicada
   this.mostrarTablaProveedor[index] = !this.mostrarTablaProveedor[index];
   //////console.log()("Chofer: ", chofer);

   // Obtener el id del cliente utilizando el índice proporcionado
   let proveedorId = this.datosTablaProveedor[index].idProveedor;

   // Filtrar las facturas según el id del cliente y almacenarlas en el mapa
   let facturasProveedor = this.$facturasOpProveedor.filter((factura: FacturaOp) => {
       return factura.idProveedor === proveedorId;
   });
   this.facturasPorProveedor.set(proveedorId, facturasProveedor);

   ////console.log()("FACTURAS DEL CHOFER: ", facturasChofer);  

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

  liquidarFacProveedor(idProveedor: any, apellido: string, index: number){
    // Obtener las facturas del cliente
    //////console.log()("IDCHOFER: ", idChofer);
    
    let facturasIdProveedor:any = this.facturasPorProveedor.get(idProveedor);    
    ////////console.log()("FACTURAS POR CHOFER: ", facturasIdChofer );
    

    this.razonSocial = apellido;
    //////console.log()("APELLIDO: ", this.apellido);
    
    // Filtrar las facturas con liquidacion=true y guardarlas en un nuevo array
    this.facturasLiquidadasProveedor = facturasIdProveedor.filter((factura: FacturaOp) => {
        return factura.liquidacion === true;
    });

   

    this.indiceSeleccionado = index;
   
    
    if(this.facturasLiquidadasProveedor.length > 0){
      console.log("1: ",this.facturasLiquidadasProveedor);
      // Calcular el total sumando los montos de las facturas liquidadas
      this.totalFacturasLiquidadasProveedor = 0;
      this.facturasLiquidadasProveedor.forEach((factura: FacturaOp) => {
        this.totalFacturasLiquidadasProveedor += factura.valores.total;
      });
  
      this.indiceSeleccionado = index;
      console.log("3) Facturas liquidadas del proveedor", apellido + ":", this.facturasLiquidadasProveedor);
      console.log("Total de las facturas liquidadas:", this.totalFacturasLiquidadasProveedor);
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
    this.facturasLiquidadasProveedor.forEach((factura: FacturaOp) => {
      console.log("llamada al storage desde liq-proveedor, addItem");
      this.addItem(factura, "facOpLiqProveedor");
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
    console.log("llamada al storage desde liq-Proveedor, deleteItem");
    this.storageService.deleteItem("facturaOpProveedor", item);    
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
      const modalRef = this.modalService.open(LiquidacionOpProveedorComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'lg', 
        //backdrop:"static" 
      });
      
    let info = {      
        facturas: this.facturasLiquidadasProveedor,
        totalProveedor: this.totalFacturasLiquidadasProveedor,
        //totalChofer: this.totalFacturasLiquidadasChofer,
      }; 
      //console.log()(info);
      
      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
          console.log(result);
          
          this.facturaProveedor = result.factura;

//        this.selectCrudOp(result.op, result.item);
        //this.mostrarMasDatos(row);
         //console.log()("resultado:" ,this.facturaCliente);
         this.addItem(this.facturaProveedor, this.componente);
         //this.form.reset();
        //this.$tarifasChofer = null;
        //this.ngOnInit();
        
      
        if(result.titulo === "excel"){
        this.excelServ.exportToExcelProveedor(this.facturaProveedor, this.facturasLiquidadasProveedor, this.$clientes, this.$choferes);
        }else if (result.titulo === "pdf"){          
        this.pdfServ.exportToPdfProveedor(this.facturaProveedor, this.facturasLiquidadasProveedor, this.$clientes, this.$choferes);
        }
        this.eliminarFacturasOp();
        },
        (reason) => {}
      );
    }
  }

  buscarTarifa() {
    console.log("A)",this.facDetallada);
    
    if(this.facDetallada.tarifaTipo.general){
      this.dbFirebase
      .obtenerTarifaIdTarifa("tarifasGralProveedor",this.facDetallada.idTarifa, "idTarifa")
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
    if(this.facDetallada.tarifaTipo.especial){
      this.dbFirebase
      .obtenerTarifaIdTarifa("tarifasEspProveedor",this.facDetallada.idTarifa, "idTarifa")
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
        const modalRef = this.modalService.open(EditarTarifaProveedorComponent, {
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
