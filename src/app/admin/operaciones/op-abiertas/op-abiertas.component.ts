import { Component, Input, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ColumnMode, SelectionType, SortType } from '@swimlane/ngx-datatable';
import { take } from 'rxjs';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { FacturaOpChofer } from 'src/app/interfaces/factura-op-chofer';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
import { FacturaOpProveedor } from 'src/app/interfaces/factura-op-proveedor';
import { Operacion, TarifaEventual } from 'src/app/interfaces/operacion';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { TarifaChofer } from 'src/app/interfaces/tarifa-chofer';
import { TarifaCliente } from 'src/app/interfaces/tarifa-cliente';
import { TarifaProveedor } from 'src/app/interfaces/tarifa-proveedor';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { FacturacionChoferService } from 'src/app/servicios/facturacion/facturacion-chofer/facturacion-chofer.service';
import { FacturacionClienteService } from 'src/app/servicios/facturacion/facturacion-cliente/facturacion-cliente.service';
import { FacturacionProveedorService } from 'src/app/servicios/facturacion/facturacion-proveedor/facturacion-proveedor.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';
import { ModalOpAbiertaComponent } from '../modal-op-abierta/modal-op-abierta.component';

@Component({
  selector: 'app-op-abiertas',
  templateUrl: './op-abiertas.component.html',
  styleUrls: ['./op-abiertas.component.scss']
})
export class OpAbiertasComponent implements OnInit {
  @Input() fechasConsulta: any = {
    fechaDesde: 0,
    fechaHasta: 0,
  };
  @Input() btnConsulta:boolean = false;
  detalleOp!: Operacion;
  componente: string = "operacionesActivas";      
  titulo: string = "consultasOpActivas";  
  date:any = new Date();
  primerDia: any = new Date(this.date.getFullYear(), this.date.getMonth() , 1).toISOString().split('T')[0];
  ultimoDia:any = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).toISOString().split('T')[0];
  $opActivas!: Operacion[];
  $consultasOp!: Operacion [];
  $proveedores!: Proveedor[];
  facturar: boolean = false;
  opForm: any;
  opCerrada!: Operacion;
  facturaChofer!: FacturaOpChofer;
  facturaProveedor!: FacturaOpProveedor; 
  facturaCliente!: FacturaOpCliente;  
  opEditar!: Operacion;
  clienteSeleccionado!: Cliente;
  choferSeleccionado!: Chofer;
  acompaniante: boolean = false;
  form:any;
  $clientes: any;
  $choferes: any;
  tarifaEspecial!:boolean;
  tEspecial!: TarifaEventual | null;
  ultimaTarifaChofer!:TarifaChofer;
  ultimaTarifaCliente!:TarifaCliente;
  ultimaTarifaProveedor!:TarifaProveedor;
  proveedorOp!: Proveedor;
  //////////////////////////////////////////////////////////////////////////////////////
  @ViewChild('tablaClientes') table: any;  
  rows: any[] = [];
  filteredRows: any[] = [];
  paginatedRows: any[] = [];
  allColumns = [
//    { prop: '', name: '', selected: true, flexGrow:1  },
    { prop: 'fecha', name: 'Fecha', selected: true, flexGrow:2  },          
    { prop: 'idOperacion', name: 'Id Op', selected: true, flexGrow:2  },
    { prop: 'cliente', name: 'Cliente', selected: true, flexGrow:2 },
    { prop: 'chofer', name: 'Chofer', selected: true, flexGrow:2  },
    { prop: 'categoria', name: 'Categoria', selected: true, flexGrow:2  },    
    { prop: 'acompaniante', name: 'Acompañante', selected: true, flexGrow:2  },    
    { prop: 'tarifaEspecial', name: 'Tarifa Especial', selected: true, flexGrow:2  },    
    { prop: 'observaciones', name: 'Observaciones', selected: true, flexGrow:3  },  
    
  ];
  visibleColumns = this.allColumns.filter(column => column.selected);
  selected = [];
  count = 0;
  limit = 20;
  offset = 0;
  sortType = SortType.multi; // Aquí usamos la enumeración SortType
  selectionType = SelectionType.checkbox; // Aquí usamos la enumeración SelectionType
  ColumnMode = ColumnMode;  
  encapsulation!: ViewEncapsulation.None;
  ajustes: boolean = false;
  firstFilter = '';
  secondFilter = '';

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////

  constructor(private fb: FormBuilder, private storageService: StorageService, private facOpChoferService: FacturacionChoferService, private facOpClienteService: FacturacionClienteService, private facOpProveedorService: FacturacionProveedorService, private dbFirebase: DbFirestoreService, private modalService: NgbModal) {
    this.opForm = this.fb.group({
        km: [''],       
        remito: [''],       
    });
    this.form = this.fb.group({      
      fecha: [""],    
      observaciones: [""],      
      choferConcepto: [''],
      choferValor: [''],
      clienteConcepto: [''],
      clienteValor: [''],
    })
   }
  
  ngOnInit(): void {     
      this.storageService.choferes$.subscribe(data => {
        this.$choferes = data;
      });
    
      this.storageService.clientes$.subscribe(data => {
        this.$clientes = data;
      });    
     
      this.storageService.opActivas$.subscribe(data => {
        this.$opActivas = data;
        this.armarTabla();
      });  

      this.storageService.consultasOpActivas$.subscribe(data => {
        this.$consultasOp = data;
        this.armarTabla();
      });   
      
      this.storageService.proveedores$.subscribe(data => {
        this.$proveedores = data;
      });
  }
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
armarTabla() {
  ////console.log("consultasOp: ", this.$consultasOp );
  let indice = 0
  if(!this.btnConsulta){
    this.rows = this.$opActivas.map((op) => ({
      indice: indice ++,
      fecha: op.fecha,
      idOperacion: op.idOperacion,
      cliente: op.cliente.razonSocial,
      chofer: `${op.chofer.apellido} ${op.chofer.nombre}`,
      //categoria: op.chofer.vehiculo.categorias,
      categoria: [],
      acompaniante: `${op.acompaniante ? "Si" : "No"}` ,
      tarifaEspecial: `${op.tarifaEventual ? "Si" : "No"}` ,
      observaciones: op.observaciones,
      
    }));
  } else {
    this.rows = this.$consultasOp.map((op) => ({
      indice: indice ++,
      fecha: op.fecha,
      idOperacion: op.idOperacion,
      cliente: op.cliente.razonSocial,
      chofer: `${op.chofer.apellido} ${op.chofer.nombre}`,
      //categoria: op.chofer.vehiculo.categorias,
      categoria: [],
      acompaniante: `${op.acompaniante ? "Si" : "No"}` ,
      tarifaEspecial: `${op.tarifaEventual ? "Si" : "No"}` ,
      observaciones: op.observaciones,
      
    }));
  }  
  ////console.log("Rows: ", this.rows); // Verifica que `this.rows` tenga datos correctos
  this.applyFilters(); // Aplica filtros y actualiza filteredRows
}

setPage(pageInfo: any) {
  this.offset = pageInfo.offset;
  this.updatePaginatedRows();
}

updatePaginatedRows() {
  const start = this.offset * this.limit;
  const end = start + this.limit;
  this.paginatedRows = this.filteredRows.slice(start, end);
}

onSort(event:any) {
  // Implementa la lógica de ordenamiento
}

onActivate(event: any) {
  // Implementa la lógica de activación de filas
}

onSelect(event: any) {
  // Implementa la lógica de selección de filas
}

updateFilter(event: any, filterType: string) {
  const val = event.target.value.toLowerCase();
  if (filterType === 'first') {
    this.firstFilter = val;
  } else if (filterType === 'second') {
    this.secondFilter = val;
  }
  this.applyFilters();
}

applyFilters() {
  this.filteredRows = this.rows.filter(row => {
    const firstCondition = Object.values(row).some(value => 
      String(value).toLowerCase().includes(this.firstFilter)
    );
    const secondCondition = Object.values(row).some(value => 
      String(value).toLowerCase().includes(this.secondFilter)
    );

    return firstCondition && secondCondition;
  });

  this.count = this.filteredRows.length; // Actualiza el conteo de filas
  this.setPage({ offset: this.offset }); // Actualiza los datos para la página actual
}

toggleColumn(column: any) {
  if (column.prop !== '') { // Siempre muestra la columna del botón
    column.selected = !column.selected;
  }
  this.visibleColumns = this.allColumns.filter(col => col.selected);
}

toogleAjustes(){
  this.ajustes = !this.ajustes;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  seleccionarOp(op:any){    
    let seleccion = this.$opActivas.filter((operacion:Operacion)=>{
      return operacion.idOperacion === op.idOperacion
    })
    this.opEditar = seleccion[0];    
  }

  getMsg(msg: any) {
    this.btnConsulta = true;
    //////////console.log()("mensajeeee: ", msg);
    this.fechasConsulta = msg;
    ////console.log("mensajeeee: ", this.fechasConsulta);    
  }

  crearFacturaOp(op:any){
    this.seleccionarOp(op)
    this.facturar = true;
    this.opCerrada = this.detalleOp;
  }

  onSubmit(){
    Swal.fire({
      title: "¿Desea cerrar la operación?",
      text: "No se podrá revertir esta acción",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        this.facturarOperacion();
        ////console.log("1) ", this.$consultasOp);
        Swal.fire({
          title: "Confirmado",
          text: "La operación se ha cerrado",
          icon: "success"
        });
      }
    });       
   
  }

  facturarOperacion(){
    //////////console.log()(this.opForm.value);
    this.detalleOp.km = this.opForm.value.km,
    this.opCerrada.km = this.opForm.value.km;    
    //this.opCerrada.documentacion = this.opForm.remito;
    //this.opCerrada.documentacion = "";                      //le asigno un string vacio pq sino tira error al cargar en firestore
    
    
    this.bajaOperacionesActivas();
    ////console.log("consultas Op: " , this.$consultasOp);
    if(this.detalleOp.chofer.proveedor === "monotributista"){
      this.facturarOpChofer();
    } else{
      this.buscarProveedor();
    }
    this.btnConsulta = false
  }

  bajaOperacionesActivas(){
    ////console.log("llamada al storage desde op-abiertas, deleteItem");
    this.storageService.deleteItem("operacionesActivas", this.opCerrada);
  }

  facturarFalso(){
    this.facturar = false;
  }

  facturarOpChofer(){  
    this.obtenerUltTarifaChofer("tarifasChofer", "idChofer", this.opCerrada.chofer.idChofer, "idTarifa", )  
  }

  obtenerUltTarifaChofer(componente:string, campo:string, id:number, orden:string){
    this.dbFirebase
    .obtenerTarifaMasReciente(componente,id,campo, orden)
    .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
    .subscribe(data => {      
        this.ultimaTarifaChofer = data;
        this.generarFacturaChofer();
    });
  }

  generarFacturaChofer(){
    this.facturaChofer = this.facOpChoferService.facturarOpChofer(this.opCerrada, this.ultimaTarifaChofer); 
    this.opForm.reset();
    this.facturar = false; 
    this.facturarOpCliente();       
  }

  facturarOpProveedor(){  
    this.obtenerUltTarifaProveedor("tarifasProveedor", "idProveedor", this.proveedorOp.idProveedor, "idTarifa", )  
  }

  buscarProveedor(){ 
    let proveedor: any;
    let razonSocial = this.opCerrada.chofer.proveedor
    proveedor = this.$proveedores.filter(function (proveedor:any){
      return proveedor.razonSocial === razonSocial
    })
    this.proveedorOp = proveedor[0];
    this.facturarOpProveedor();
  }

  obtenerUltTarifaProveedor(componente:string, campo:string, id:number, orden:string){
    this.dbFirebase
    .obtenerTarifaMasReciente(componente,id,campo, orden)
    .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
    .subscribe(data => {      
        this.ultimaTarifaProveedor = data;
        this.generarFacturaProveedor();
    });
  }

  generarFacturaProveedor(){
    this.facturaProveedor = this.facOpProveedorService.facturarOpProveedor(this.opCerrada, this.ultimaTarifaProveedor, this.proveedorOp ); 
    this.opForm.reset();
    this.facturar = false; 
    this.facturarOpCliente();       
  }

  facturarOpCliente(){  
    this.obtenerUltTarifaCliente("tarifasCliente", "idCliente", this.opCerrada.cliente.idCliente, "idTarifa", )  
  }

  obtenerUltTarifaCliente(componente:string, campo:string, id:number, orden:string){
    this.dbFirebase
    .obtenerTarifaMasReciente(componente,id,campo, orden)
    .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
    .subscribe(data => {      
        this.ultimaTarifaCliente = data;
        this.generarFacturaCliente();
    });
  }

  generarFacturaCliente(){
    this.facturaCliente = this.facOpClienteService.facturarOpCliente(this.opCerrada, this.ultimaTarifaCliente); 
    this.opForm.reset();
    this.facturar = false; 
    this.armarFacturas();     
  }

  addItem(componente: string, item: any): void {
    ////console.log("llamada al storage desde op-abiertas, addItem");
    this.storageService.addItem(componente, item);     
  }

  armarFacturas(){
    
    if(this.detalleOp.chofer.proveedor === "monotributista"){      
      this.facturaCliente.montoFacturaChofer = this.facturaChofer.total.valueOf();      
      this.facturaChofer.montoFacturaCliente = this.facturaCliente.total.valueOf();
      this.addItem("facturaOpCliente", this.facturaCliente);
      this.addItem("facturaOpChofer", this.facturaChofer);
      
    } else{
      this.facturaCliente.montoFacturaChofer = this.facturaProveedor.total.valueOf();    
      this.facturaProveedor.montoFacturaCliente = this.facturaCliente.total.valueOf();
      
      this.addItem("facturaOpCliente", this.facturaCliente);
      this.addItem("facturaOpProveedor", this.facturaProveedor)
    }
  }
  
  eliminarOperacion(row: any){
    this.seleccionarOp(row)
    Swal.fire({
      title: "¿Cancelar la operación?",
      text: "No se podrá revertir esta acción",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        ////console.log("llamada al storage desde op-abiertas, deleteItem");
        this.storageService.deleteItem(this.componente, this.opEditar);
        ////console.log("consultas Op: " , this.$consultasOp);
        Swal.fire({
          title: "Confirmado",
          text: "La operación ha sido cancelada",
          icon: "success"
        });
      }
    });       
    
  }

  abrirVista(row:any) {
    this.seleccionarOp(row);   
    this.openModal(this.opEditar, "vista")
  }

  abrirEdicion(row:any):void {        
    this.seleccionarOp(row);   
    this.openModal(this.opEditar, "edicion");      
  }

  

  openModal(op:Operacion, modo:string){
    {
      const modalRef = this.modalService.open(ModalOpAbiertaComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'lg', 
        //backdrop:"static" 
      });      

    let info = {
        modo: modo,
        item: op,
      } 
      //console.log()(info); */
      
      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
          ////console.log()("ROOWW:" ,row);
          //this.storageService.getAllSorted("clientes", 'idCliente', 'asc')
//        this.selectCrudOp(result.op, result.item);
        //this.mostrarMasDatos(row);
        },
        (reason) => {}
      );
    }
  }
}
