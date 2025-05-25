import { Component, ElementRef, HostListener, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { ColumnMode, SelectionType, SortType } from '@swimlane/ngx-datatable';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Operacion } from 'src/app/interfaces/operacion';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';

import { ModalFacturacionComponent } from '../modal-facturacion/modal-facturacion.component';
import { CargaMultipleComponent } from '../carga-multiple/carga-multiple.component';
import { ModalOpAltaComponent } from '../modal-op-alta/modal-op-alta.component';
import { Subject, take, takeUntil } from 'rxjs';
import { ModalBajaComponent } from 'src/app/shared/modal-baja/modal-baja.component';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { FacturacionOpService } from 'src/app/servicios/facturacion/facturacion-op/facturacion-op.service';



@Component({
  selector: 'app-tablero-op',
  templateUrl: './tablero-op.component.html',
  styleUrls: ['./tablero-op.component.scss']
})
export class TableroOpComponent implements OnInit {


  btnConsulta:boolean = false;
  modo : string = "operaciones"
  componente:string = "operaciones"  
  public buttonName: any = 'Consultar Operaciones';  
  public buttonNameAlta: any = 'Alta de Operación';  
  public buttonNameManual: any = 'Carga Manual';  
  tarifaEventual: boolean = false;
  tarifaPersonalizada: boolean = false;
  vehiculosChofer:boolean = false;
  titulo: string = "operaciones";
  $clientes!: ConIdType<Cliente>[];
  $choferes!: ConIdType<Chofer>[];
  cantPorPagina: boolean = false;
  $proveedores!: ConIdType<Proveedor>[];
  $opActivas!: ConId<Operacion>[];
  $opFiltradas!: ConId<Operacion>[];
  opEditar!: ConId<Operacion>;
  date:any = new Date();
  primerDia: any = new Date(this.date.getFullYear(), this.date.getMonth() , 1).toISOString().split('T')[0];
  ultimoDia:any = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).toISOString().split('T')[0];
  facturar: boolean = false;
  fechasConsulta!: any;
  ultTarifaGralCliente!: ConIdType<TarifaGralCliente>;
  ultTarifaGralChofer!: ConIdType<TarifaGralCliente>;
  estadoFiltrado: string ="Todo"
  operacionesFiltrado!: Operacion[];
  ///////////////////////  TABLA  ////////////////////////////////////////////////////
  rows: any[] = [];
  filteredRows: any[] = [];
  paginatedRows: any[] = [];
  allColumns = [
//    { prop: '', name: '', selected: true, flexGrow:1  },
    { prop: 'fecha', name: 'Fecha', selected: true, flexGrow:2  },        
    { prop: 'estado', name: 'Estado', selected: true, flexGrow:2  },        
    { prop: 'idOperacion', name: 'Id Op', selected: false, flexGrow:2  },
    { prop: 'cliente', name: 'Cliente', selected: true, flexGrow:2 },
    { prop: 'chofer', name: 'Chofer', selected: true, flexGrow:2  },    
    { prop: 'categoria', name: 'Categoria', selected: true, flexGrow:2  },    
    { prop: 'patente', name: 'Patente', selected: false, flexGrow:2  },   
    { prop: 'acompaniante', name: 'Acomp', selected: false, flexGrow:2  },    
    { prop: 'tarifa', name: 'Tarifa', selected: false, flexGrow:2  },   
    { prop: 'aCobrar', name: 'A Cobrar', selected: true, flexGrow: 2, comparator: this.currencyComparator },
    { prop: 'aPagar', name: 'A Pagar', selected: true, flexGrow: 2, comparator: this.currencyComparator },
    { prop: 'hojaRuta', name: 'Hoja de Ruta', selected: true, flexGrow:2  }, 
    { prop: 'proveedor', name: 'Proveedor', selected: false, flexGrow:2  },
    { prop: 'observaciones', name: 'Observaciones', selected: true, flexGrow:3  },  
    
  ];
  visibleColumns = this.allColumns.filter(column => column.selected);
  selected = [];
  count = 0;
  limit = 1000;
  offset = 0;
  sortType = SortType.multi; // Aquí usamos la enumeración SortType
  selectionType = SelectionType.checkbox; // Aquí usamos la enumeración SelectionType
  ColumnMode = ColumnMode;  
  encapsulation!: ViewEncapsulation.None;
  ajustes: boolean = false;
  firstFilter = '';
  secondFilter = '';
  filtrosClientes = '';
  filtrosChoferes = '';
  /////////////////////////////////////////////////////////////////////
  rango!: string [];
  private destroy$ = new Subject<void>(); // Subject para manejar la destrucción
  respuestaOp!:any;
  clientesFiltrados!: Cliente[];
  choferesFiltrados!: Chofer[];
  estadosDisponibles = [
    { key: 'abierta', label: 'Abierta' },
    { key: 'cerrada', label: 'Cerrada' },
    { key: 'facCliente', label: 'Cliente Facturado' },
    { key: 'facChofer', label: 'Chofer Facturado' },
    { key: 'facturada', label: 'Facturada' }
  ];
  estadoSeleccionado: { [key: string]: boolean } = {
    abierta: false,
    cerrada: false,
    facCliente: false,
    facChofer: false,
    facturada: false
  };
  operacionesDemo!: ConId<Operacion>[];
  opFiltradas!: ConId<Operacion>[];
  isLoading: boolean = false;
  
  constructor(private storageService: StorageService, private modalService: NgbModal, private dbFirebase: DbFirestoreService, private el: ElementRef, private excelServ: ExcelService,
  private facturacionOpServ: FacturacionOpService
  ){}
  
  ngOnInit(): void {
   /*  this.storageService.opTarEve$
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data=>{
      let datos = data
      this.tarifaEventual = datos[0];
      
    });
    this.storageService.opTarPers$
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data=>{
      let datos = data
      this.tarifaPersonalizada = datos[0];
    });

    this.storageService.vehiculosChofer$
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data=>{
      let datos = data
      this.vehiculosChofer = datos[0];

    }); */
    this.loadColumnSelection();
    let limite = this.storageService.loadInfo("pageLimitOp");
    this.limit = limite.length === 0 ? 1000 : limite[0];
    this.rango = this.storageService.loadInfo("formatoSeleccionado");
    ////console.log("rango en tableroOp: ", this.rango);
    
    
    
    this.storageService.getObservable<ConIdType<Chofer>>("choferes")
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      this.$choferes = data;
      this.$choferes = this.$choferes.sort((a, b) => a.apellido.localeCompare(b.apellido)); // Ordena por el nombre del chofer
    });
  
    this.storageService.getObservable<ConIdType<Cliente>>("clientes")
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      this.$clientes = data;
      this.$clientes = this.$clientes.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
    });   
    
    this.storageService.getObservable<ConIdType<Proveedor>>("proveedores")
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      this.$proveedores = data;
    });
   
    //¿PORQUE?
    this.storageService.getObservable<ConId<Operacion>>('operaciones')
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      if(data){
        ////console.log("1)aca??: ");      
        this.$opActivas = data;
        //this.$opActivas = this.actualizarEstadoOp(data);
        //this.$opActivas = this.agregarMultiplicador(data);
        //this.$opActivas = this.$opActivas.sort((a, b) => a.fecha.getTime() - b.fecha.getTime()); // Ordena por el nombre del chofer
        console.log("this.$opActivas", this.$opActivas);        
        /* this.$opActivas.forEach(op=>{
              this.dbFirebase.update("operaciones", op)
        }) */
        //this.armarTabla();
        this.consultarOp()
        
      }      
    });  

    /* this.storageService.consultasOp$
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      this.$consultasOp = data;
      //this.armarTabla();
      this.filtrarEstado(this.estadoFiltrado)
    });    */
   

    
    
     
  }


/*   actualizarEstadoOp(operaciones: Operacion[]): Operacion[] {
    return operaciones.map(operacion => {
      // Si el estado no tiene las nuevas propiedades, las inicializamos
      if (!operacion.estado.facCliente && !operacion.estado.facChofer) {
        operacion.estado = {
          ...operacion.estado,
          facCliente: operacion.estado.facturada ? true : false, // Inicializamos como false o según la lógica de tu aplicación
          facChofer: false,  // Inicializamos como false o según la lógica de tu aplicación
          facturada: false // Mantenemos el valor existente de facturada
        };
      }
      return operacion;
    });
  } */

  agregarMultiplicador(operaciones: Operacion[]): Operacion[] {
    return operaciones.map(operacion => {
      // Si el estado no tiene las nuevas propiedades, las inicializamos
      if (!operacion.multiplicadorCliente && !operacion.multiplicadorChofer) {
        operacion = {
          ...operacion,
          multiplicadorCliente: 1,
          multiplicadorChofer: 1,
        };
      }
      return operacion;
    });
  }

  ngOnDestroy(): void {
    // Completa el Subject para cancelar todas las suscripciones
    this.destroy$.next();
    this.destroy$.complete();
  }


  loadColumnSelection() {
    const savedSelection = localStorage.getItem('columnSelection');
    
    if (savedSelection) {
      this.allColumns = JSON.parse(savedSelection);
      this.visibleColumns = this.allColumns.filter(col => col.selected);
    } else {
      // Si no hay configuración guardada, aplicar la configuración estándar
      this.visibleColumns = this.allColumns.filter(col => col.selected);
    }
  }

  getMsg(e:any) {
    this.btnConsulta = e
    ////console.log("getMsg: ", this.btnConsulta);
    
      //this.btnConsulta = true;
    if(this.btnConsulta){
      ////console.log("2)aca??: ");            
      this.consultarOp()
      
    }

  }

  consultarOp(){
    const modoStorage = this.storageService.loadInfo("filtroOp");
    console.log("ngOnInit: modoStorage ", modoStorage);
    
    if (modoStorage) {
      modoStorage.forEach((key: string) => {
        this.estadoSeleccionado[key] = true;
      });
    }

    //this.aplicarFiltros();
    ////console.log("2)aca??: ");            
      this.storageService.respuestaOp$
        .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
        .subscribe(data => {
          if(data){
            ////console.log("respuestaOp data: ", data);
            
            this.respuestaOp = data
            this.fechasConsulta = this.respuestaOp[0].fechas;
            //console.log("fechasConsulta: ", this.fechasConsulta);
            this.rango = this.respuestaOp[0].rango
            //console.log("rango: ", this.rango);
            this.storageService.syncChangesDateValue<Operacion>(this.titulo, "fecha", this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta, 'desc');
            //this.storageService.listenForChangesDate<Operacion>(this.titulo, "fecha", this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta, 'desc');
            this.aplicarFiltros()
          }
          //////console.log("TABLERO OP: fechas consulta: ",this.fechasConsulta);      
          //this.getMsg()
      });
  }

  ///////////// TABLA //////////////////////////////////////////////////////////////////////////////////
  armarTabla() {
    let indice = 0
    let operaciones: Operacion [];    
    operaciones = this.$opFiltradas;
    this.rows = operaciones.map((op) => ({
      indice: indice ++,
      fecha: op.fecha,
      estado: op.estado.abierta ? "Abierta" : op.estado.cerrada ? "Cerrada" : op.estado.facturada  ? "Facturada" : op.estado.facCliente  ? "Cliente Fac" :  op.estado.facChofer  ? "Chofer Fac" : "Sin Datos",
      idOperacion: op.idOperacion,
      cliente: op.cliente.razonSocial,
      idCliente: op.cliente.idCliente,
      chofer: `${op.chofer.apellido} ${op.chofer.nombre}`,
      idChofer: op.chofer.idChofer,
      categoria: this.getCategoria(op),
      patente: op.patenteChofer,
      acompaniante: `${op.acompaniante ? "Si" : "No"}` ,
      tarifa: op.tarifaTipo.especial ? "Especial" : op.tarifaTipo.eventual ? "Eventual" : op.tarifaTipo.personalizada ? "Personalizada" : "General",
      aCobrar: this.formatearValor(op.valores.cliente.aCobrar),
      aPagar: this.formatearValor(op.valores.chofer.aPagar),    
      hojaRuta: op.hojaRuta,    
      proveedor: this.getProveedor(op.chofer.idProveedor),
      observaciones: op.observaciones,
      
    }));   

    ////////////console.log("Rows: ", this.rows); // Verifica que `this.rows` tenga datos correctos
    let filtrosTabla = this.storageService.loadInfo('filtrosTabla')
    //////console.log("filtrosTabla", filtrosTabla);    
    if(filtrosTabla.length > 0){
      this.firstFilter = filtrosTabla[0];
      this.secondFilter = filtrosTabla[1];
      this.filtrosClientes = filtrosTabla[2];      
      this.filtrosChoferes = filtrosTabla[3];            
    }
    this.applyFilters(); // Aplica filtros y actualiza filteredRows
  }

  formatearValor(valor: number) : any{
    let nuevoValor =  new Intl.NumberFormat('es-ES', { 
     minimumFractionDigits: 2, 
     maximumFractionDigits: 2 
   }).format(valor);

   return `$${nuevoValor}`
 }

 currencyComparator(a: string, b: string) {
  // Eliminar el símbolo de moneda y las comas, luego convertir a número
  //console.log("a inicial:", a);
  
  const valueA = parseFloat(a.replace(/[^0-9.-]+/g, ''));
  //console.log("a final:", valueA);
  const valueB = parseFloat(b.replace(/[^0-9.-]+/g, ''));
  
  // Comparar los valores numéricos
  if (valueA < valueB) return -1;
  if (valueA > valueB) return 1;
  return 0;
}
  
  setPage(pageInfo: any) {
    this.offset = pageInfo.offset;
    this.updatePaginatedRows();
  }
  
  updatePaginatedRows() {
    const start = this.offset * this.limit;
    const end = start + this.limit;
    this.paginatedRows = this.filteredRows.slice(start, end);
    this.storageService.setInfo("pageLimitOp", [this.limit]);
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
    this.storageService.setInfo('filtrosTabla',[this.firstFilter, this.secondFilter, this.filtrosClientes, this.filtrosChoferes])
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
      const thirdCondition = Object.values(row).some(value => 
        String(value).toLowerCase().includes(this.getCliente(this.filtrosClientes, "interna"))
      );    
      const fourthCondition = Object.values(row).some(value => 
        String(value).toLowerCase().includes(this.getChofer(this.filtrosChoferes, "interna"))
      );
  
      return firstCondition && secondCondition && thirdCondition && fourthCondition;
    });
  
    this.count = this.filteredRows.length; // Actualiza el conteo de filas
    this.setPage({ offset: this.offset }); // Actualiza los datos para la página actual
  }
  
  toggleColumn(column: any) {
    if (column.prop !== '') { // Siempre muestra la columna del botón
      column.selected = !column.selected;
    }
    this.visibleColumns = this.allColumns.filter(col => col.selected);
    // Guardar la configuración en el localStorage
    localStorage.setItem('columnSelection', JSON.stringify(this.allColumns));
  }
  
  toogleAjustes(){
    this.cantPorPagina= false;
    this.ajustes = !this.ajustes;
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  seleccionarOp(op:any){    
    //let seleccion = this.$opActivas.filter((operacion:Operacion)=>{
    let seleccion = this.$opFiltradas.filter((operacion:Operacion)=>{
      
      return operacion.idOperacion === op.idOperacion
    })
    this.opEditar = seleccion[0];    
  }


  abrirVista(row:any) {
    this.seleccionarOp(row);   
    this.openModal("vista")
  }

  abrirEdicion(row:any):void {        
    this.seleccionarOp(row);   
    this.openModal("edicion");      
  }

  eliminarOperacion(row: any){
    this.seleccionarOp(row)
    Swal.fire({
      title: "¿Desea dar de baja la operación?",
      //text: "No se podrá revertir esta acción",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        this.openModalBaja(row.idOperacion)    
      }
    });       
    
  }

  crearFacturaOp(op:any){
    this.seleccionarOp(op)
    this.facturar = true;
    this.openModal("cerrar")
    //this.opCerrada = this.detalleOp;
  }

  getCategoria(op: Operacion){
    let vehiculo
    vehiculo  = op.chofer.vehiculo.filter((vehiculo:Vehiculo)=>{
        return vehiculo.dominio === op.patenteChofer;
    });
    return vehiculo[0].categoria.nombre;
  }

  openModal(modo: string){
    {
      const modalRef = this.modalService.open(ModalFacturacionComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'lg', 
        //backdrop:"static" 
      });      

     let info = {
        modo: modo,
        item: this.opEditar,
      } 

      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
         
        },
        (reason) => {}
      );
    }
  }

  guardarFiltro(modo: string){
    console.log("modo", modo);    
    this.storageService.setInfo("filtroOp", [modo]);
    this.filtrarEstado()
  }

  filtrarEstado(){  
   
    let modo = "";
    let modoStorage = this.storageService.loadInfo("filtroOp");


    if(modoStorage[0] === undefined){
      modo = this.estadoFiltrado;
    } else {
      modo = modoStorage[0];
    }
    this.$opFiltradas = this.$opActivas;

    this.estadoFiltrado = modo;

    switch(modo){
      case "Todo":{
        ////console.log("ACCCAAA??");        
        this.$opFiltradas = this.$opActivas;
        
        this.armarTabla();
        break;
      };
      case "Abierta":{          
        this.$opFiltradas = this.$opActivas.filter((op:Operacion)=>{
          return op.estado.abierta === true; 
        });
        
        this.armarTabla();
        break;
      };
      case "Cerrada":{
        this.$opFiltradas = this.$opActivas.filter((op:Operacion)=>{
          return op.estado.cerrada === true; 
        });
        
        this.armarTabla();
        break;
      };
      case "Cliente Fac":{
        this.$opFiltradas = this.$opActivas.filter((op:Operacion)=>{
          return op.estado.facCliente === true; 
        });
        
        this.armarTabla();
        break;
      }
      case "Chofer Fac":{
        this.$opFiltradas = this.$opActivas.filter((op:Operacion)=>{
          return op.estado.facChofer === true; 
        });
        
        this.armarTabla();
        break;
      }
      case "Facturada":{
        this.$opFiltradas = this.$opActivas.filter((op:Operacion)=>{
          return op.estado.facturada === true; 
        });
        
        this.armarTabla();
        break;
      }
      default:{
          alert("error filtrado");
        break

      }
    }
    const idClientesEnOperaciones = this.$opFiltradas.map(op => op.cliente.idCliente);
    this.clientesFiltrados = this.$clientes.filter(cliente => 
      idClientesEnOperaciones.includes(cliente.idCliente)
    );
    const idChoferesEnOperaciones = this.$opFiltradas.map(op => op.chofer.idChofer);
    this.choferesFiltrados = this.$choferes.filter(chofer => 
      idChoferesEnOperaciones.includes(chofer.idChofer)
    );
  }

  limpiarFiltros(){
    
    
    this.estadoSeleccionado = {
      abierta: false,
      cerrada: false,
      facCliente: false,
      facChofer: false,
      facturada: false,      
    };

    this.storageService.setInfo("filtroOp", []);
    
    
    this.aplicarFiltros()

  }

  aplicarFiltros() {
    
    const seleccionados = Object.keys(this.estadoSeleccionado).filter(key => this.estadoSeleccionado[key]);
    console.log("seleccionados", seleccionados);
    
    if (seleccionados.length === 0) {
      // Si no hay filtros activos, mostramos todo
      this.$opFiltradas = this.$opActivas;
    } else {
      this.$opFiltradas = this.$opActivas.filter((op: Operacion) => {
        // Una operación pasa el filtro si cumple con **todos** los estados seleccionados
        return seleccionados.some(key => (op.estado as any)[key]);
      });
    }
  
    // Guardamos el estado en localStorage para persistir
    this.storageService.setInfo("filtroOp", seleccionados);
  
    // Re-armamos la tabla
    this.armarTabla();
  
    // (opcional) actualizar clientes/choferes filtrados
    const idClientesEnOperaciones = this.$opFiltradas.map(op => op.cliente.idCliente);
    this.clientesFiltrados = this.$clientes.filter(cliente => 
      idClientesEnOperaciones.includes(cliente.idCliente)
    );
    const idChoferesEnOperaciones = this.$opFiltradas.map(op => op.chofer.idChofer);
    this.choferesFiltrados = this.$choferes.filter(chofer => 
      idChoferesEnOperaciones.includes(chofer.idChofer)
    );
  }

  modalCargaMultiple(){
    {
      const modalRef = this.modalService.open(CargaMultipleComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'xl', 
        backdrop:"static" 
      });      

     /* let info = {
        modo: modo,
        item: this.opEditar,
      }  */

      
      //modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
         
        },
        (reason) => {}
      );
    }
  }

  modalAltaOp(){
    {
      const modalRef = this.modalService.open(ModalOpAltaComponent, {
        windowClass: 'custom-modal-top-right',        

        scrollable: true,    
        backdrop:"static"   

      });      
    
      modalRef.result.then(
        (result) => {
         
        },
        (reason) => {}
      );
    }
  }

  openModalBaja(idOp:number){
    {
      const modalRef = this.modalService.open(ModalBajaComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        scrollable: true, 
        size: 'sm',     
      });   
      
      let operacion:Operacion [] = this.$opActivas.filter(o => o.idOperacion === idOp);

      let info = {
        modo: "operaciones",
        item: operacion [0]
      }  
      //////console.log()(info); */
      
      modalRef.componentInstance.fromParent = info;
    
      modalRef.result.then(
        (result) => {
          console.log("result", result);
          if(result !== undefined){   
            ////////console.log("llamada al storage desde op-abiertas, deleteItem");
            this.storageService.deleteItemPapelera(this.componente, this.opEditar, this.opEditar.idOperacion, "BAJA", "Baja de Operación", result);
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

  getProveedor(idProveedor:number){
    if(this.$proveedores && idProveedor !== 0){
      let proveedor: Proveedor [] = this.$proveedores.filter(p => p.idProveedor === idProveedor);
      if(proveedor[0]){
        return proveedor[0].razonSocial;  
      } else {
        return "Proveedor dado de baja";
      }
      
    } else {
      return "No"
    }
  }

  toggleCantPag(){
    this.ajustes = false;
    this.cantPorPagina = !this.cantPorPagina;

  }

  filtrarClientes(idCliente: number){
    if(idCliente !== 0){
      this.filtrosClientes = idCliente.toString();      
      this.storageService.setInfo('filtrosTabla',[this.firstFilter, this.secondFilter, this.filtrosClientes, this.filtrosChoferes])
      //console.log("this.filtrosClientes", this.filtrosClientes);
    }else {      
      this.filtrosClientes = "";
      this.storageService.setInfo('filtrosTabla',[this.firstFilter, this.secondFilter, this.filtrosClientes, this.filtrosChoferes])
    }
    this.applyFilters()
  }

  getCliente(idCliente:string, modo:string){
    let id = Number(idCliente);  
    //console.log("id", id);
    let cliente = this.$clientes?.filter(c => c.idCliente === id);      
    if(id !== 0 && modo === "vista"){      
      return cliente[0].razonSocial;
    } else if(id !== 0 && modo === "interna") {      
      return cliente[0].idCliente.toString();
    } else{
      return "";
    }


    
  }

  filtrarChoferes(idChofer: number){    
    if(idChofer !== 0){      
      this.filtrosChoferes = idChofer.toString();
      this.storageService.setInfo('filtrosTabla',[this.firstFilter, this.secondFilter, this.filtrosClientes, this.filtrosChoferes]);
      //console.log("this.filtrosChoferes", this.filtrosChoferes);
    }else {      
      this.filtrosChoferes = "";
      this.storageService.setInfo('filtrosTabla',[this.firstFilter, this.secondFilter, this.filtrosClientes, this.filtrosChoferes]);
    }

    
    
    this.applyFilters()
  }

  getChofer(idChofer:string, modo:string){
    let id = Number(idChofer);  
    //console.log("id", id);
    let chofer = this.$choferes?.filter(c => c.idChofer === id);      
    if(id !== 0 && modo === "vista"){      
      return chofer[0].apellido + " " + chofer[0].nombre;
    } else if(id !== 0 && modo === "interna") {      
      return chofer[0].idChofer.toString();
    } else{
      return "";
    }
  }

  actualizarOp(){
    let id = 1736794593418
    let op: any[]
    let opActualizar: Operacion[]
    this.dbFirebase.getByFieldValue("operaciones","chofer.idProveedor", id ).subscribe(data=>{
      if(data){
        
        op = data
        console.log("op", op);
        opActualizar = op.filter((op:Operacion)=>{ return !op.estado.cerrada && !op.estado.abierta})
        
        opActualizar.forEach(op =>{
          op.estado.facChofer = true
        })
        console.log("opActualizar", opActualizar);
        /* opActualizar.forEach(op =>{
          this.dbFirebase.update("operaciones", op);
        }) */
      }
    })
    
    
  }

  descargarOp(){
    this.excelServ.generarInformeOperaciones(this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta,this.$opFiltradas)
  }

  restaurarOpAbiertas(){
    
    this.dbFirebase.getAll<Operacion>("operaciones")
    .pipe(take(1))
    .subscribe(data=>{
      if(data){
        
        this.operacionesDemo = data
        console.log("operaciones", this.operacionesDemo);
        this.operacionesDemo.forEach((op:ConId<Operacion>)=>{
         op.estado ={
            abierta: true,
            cerrada: false,
            facCliente: false,
            facChofer: false,
            facturada: false,
          }
         
         //op.km = Math.floor(Math.random() * (150 - 1 + 1)) + 1
         op.km = 0
         console.log("op: ", op);
         
         /*  let {id, ...opAc} = op;
          this.dbFirebase.update("operaciones", opAc, op.id); */

        })
        /* opActualizar.forEach(op =>{
          this.dbFirebase.update("operaciones", op);
        }) */
      }
    })
  }
  actualizarOperaciones(){
   
    this.operacionesDemo.forEach((op:ConId<Operacion>)=>{
     
      //this.facturacionOpServ.facturarOperacion(op);
      let {id, ...opAc} = op;
      this.dbFirebase.update("operaciones", opAc, op.id);

    })

  }

  
  asignarKmOp(){
    this.operacionesDemo.forEach((op:ConId<Operacion>)=>{
       
         op.km = Math.floor(Math.random() * (150 - 1 + 1)) + 1
         console.log("op: ", op);
         

        })
  }

  cerrarOperaciones(){
     this.operacionesDemo.forEach((op:ConId<Operacion>)=>{
      /* op.estado ={
        abierta: false,
        cerrada: true,
        facCliente: false,
        facChofer: false,
        facturada: false,
      } */
      this.facturacionOpServ.facturarOperacion(op);
      //let {id, ...opAc} = op;
      //this.dbFirebase.update("operaciones", opAc, op.id);

    })
  }

  borrarOperaciones(){
     this.operacionesDemo = this.$opActivas;
     console.log("op demo: ", this.operacionesDemo);
     
     this.operacionesDemo.forEach((op:ConId<Operacion>)=>{
      
      //let {id, ...opAc} = op;
      this.dbFirebase.delete("operaciones", op.id)

    })
  }

  buscarOp(){
    this.operacionesDemo = this.$opActivas;
    console.log("op demo: ", this.operacionesDemo);
  }

  filtrarOp(){
    /* this.opFiltradas = this.operacionesDemo.filter((op:ConId<Operacion>)=>{
      return op.estado.facChofer && op.estado.facCliente && op.estado.facturada
    }) */
    this.opFiltradas = this.operacionesDemo.filter((op:ConId<Operacion>)=>{
      return op.cliente.idCliente === 1736356938304
    })
    
    console.log("op opFiltradas: ", this.opFiltradas);
    
  }

  modificarOp(){
    this.opFiltradas.forEach((op:ConId<Operacion>)=>{
      op.estado = {
        abierta: false,
        cerrada: false,
        facCliente: false,
        facChofer: false,
        facturada: true,
      }
    })
    let opCorregidas: ConId<Operacion>[] = [];
    opCorregidas = this.opFiltradas.filter((op:ConId<Operacion>)=>{
      return op.estado.facChofer && op.estado.facCliente && op.estado.facturada
    })
    let op: ConId<Operacion>[] =  this.opFiltradas.filter((op:ConId<Operacion>)=>{
      return op.id === "OyDQzHi0z4kLknWsdk2M"
    })
    console.log("opCorregidas: ", opCorregidas)
    console.log("opFiltradas: ", this.opFiltradas)
    console.log("op: ", op)
  }

  guardarFacturadas(){
    this.isLoading = true;
    this.dbFirebase.actualizarMultiple(this.opFiltradas, "operaciones").then(
      (result:any)=>{
        this.isLoading = false;
        if(result.exito){
          alert("se actualizaron correctamente")
        } else {
          alert("error en la actualización")
        }
      }
    )
  }

  operacionesPf(){
    this.isLoading = true;
  let pfOp: any = [
  {
    "id": "hPhJoqdD4LAzmNFDv0xv",
    "fecha": "2025-04-30",
    "multiplicadorChofer": 1,
    "km": 87,
    "patenteChofer": "LCP568",
    "documentacion": null,
    "idOperacion": 1746207235135,
    "observaciones": "",
    "hojaRuta": "",
    "facturaCliente": 1746211398194,
    "tarifaTipo": {
      "personalizada": false,
      "general": true,
      "eventual": false,
      "especial": false
    },
    "facturaChofer": 1746211398194,
    "chofer": {
      "celularContacto": "1151465696",
      "direccion": {
        "municipio": "Lanús",
        "localidad": "Valentín Alsina",
        "provincia": "Buenos Aires",
        "domicilio": "Tuyuti 3003"
      },
      "nombre": "Adrian Ernesto",
      "idChofer": 1736791944623,
      "cuit": 20235231531,
      "condFiscal": "Monotributista - Factura C",
      "vehiculo": [
        {
          "tipoCombustible": [
            "Nafta"
          ],
          "marca": "Fiat",
          "satelital": "Stop Car",
          "tarjetaCombustible": true,
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "refrigeracion": null,
          "dominio": "LCP568",
          "modelo": "Fiorino",
          "segSat": true,
          "publicidad": false
        }
      ],
      "celularEmergencia": "1139103989",
      "email": "adrianvenegas7573@gmail.com",
      "apellido": "Venegas",
      "id": "rsFavZLKXlrRMuilBzCS",
      "idTarifa": 1745280075582,
      "idProveedor": 0,
      "tarifaTipo": {
        "especial": false,
        "personalizada": false,
        "eventual": false,
        "general": true
      },
      "fechaNac": "1973-09-10",
      "type": "added",
      "contactoEmergencia": "Mariana Podokian",
      "tarifaAsignada": true
    },
    "tarifaEventual": {
      "chofer": {
        "valor": 0,
        "concepto": ""
      },
      "cliente": {
        "concepto": "",
        "valor": 0
      }
    },
    "cliente": {
      "contactos": [
        {
          "puesto": "Jefe Logistica",
          "email": "juanpaz@andesmar.com.ar",
          "apellido": "Paz",
          "nombre": "Juan",
          "telefono": "1126439403"
        },
        {
          "apellido": "Marchetti",
          "puesto": "Encargado de Logistica",
          "nombre": "Ramiro",
          "telefono": "1133579699",
          "email": ""
        }
      ],
      "idCliente": 1736356938304,
      "tarifaAsignada": true,
      "condFiscal": "Responsable Inscripto - Factura A",
      "cuit": 30601502778,
      "type": "added",
      "razonSocial": "Andesmar Cargas SA",
      "id": "HPceY9retp6KCsNOPJia",
      "idTarifa": 1745279918277,
      "direccionFiscal": {
        "domicilio": "Rodriguez Peña 205",
        "localidad": "Luzuriaga",
        "provincia": "Mendoza",
        "municipio": "Maipú"
      },
      "tarifaTipo": {
        "eventual": false,
        "personalizada": false,
        "general": true,
        "especial": false
      },
      "direccionOperativa": {
        "provincia": "Buenos Aires",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "municipio": "Avellaneda",
        "localidad": "Avellaneda"
      }
    },
    "multiplicadorCliente": 1,
    "acompaniante": false,
    "tarifaPersonalizada": {
      "nombre": "",
      "aCobrar": 0,
      "categoria": 0,
      "aPagar": 0,
      "seccion": 0
    },
    "valores": {
      "cliente": {
        "acompValor": 0,
        "kmAdicional": 16000,
        "tarifaBase": 95000,
        "aCobrar": 111000
      },
      "chofer": {
        "tarifaBase": 72600,
        "acompValor": 0,
        "aPagar": 84920,
        "kmAdicional": 12320
      }
    },
    "estado": {
      "facturada": true,
      "facCliente": false,
      "abierta": false,
      "cerrada": false,
      "facChofer": false
    }
  },
  {
    "id": "YeLW4XfcquOUwMMJGmUA",
    "multiplicadorCliente": 1,
    "fecha": "2025-04-30",
    "cliente": {
      "type": "added",
      "id": "HPceY9retp6KCsNOPJia",
      "contactos": [
        {
          "email": "juanpaz@andesmar.com.ar",
          "nombre": "Juan",
          "apellido": "Paz",
          "puesto": "Jefe Logistica",
          "telefono": "1126439403"
        },
        {
          "nombre": "Ramiro",
          "apellido": "Marchetti",
          "puesto": "Encargado de Logistica",
          "email": "",
          "telefono": "1133579699"
        }
      ],
      "idCliente": 1736356938304,
      "idTarifa": 1745279918277,
      "condFiscal": "Responsable Inscripto - Factura A",
      "cuit": 30601502778,
      "tarifaAsignada": true,
      "razonSocial": "Andesmar Cargas SA",
      "direccionFiscal": {
        "localidad": "Luzuriaga",
        "provincia": "Mendoza",
        "municipio": "Maipú",
        "domicilio": "Rodriguez Peña 205"
      },
      "tarifaTipo": {
        "personalizada": false,
        "general": true,
        "especial": false,
        "eventual": false
      },
      "direccionOperativa": {
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda",
        "localidad": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda"
      }
    },
    "observaciones": "",
    "estado": {
      "abierta": false,
      "facturada": true,
      "facChofer": false,
      "cerrada": false,
      "facCliente": false
    },
    "tarifaPersonalizada": {
      "nombre": "",
      "seccion": 0,
      "categoria": 0,
      "aPagar": 0,
      "aCobrar": 0
    },
    "valores": {
      "chofer": {
        "aPagar": 141020,
        "kmAdicional": 14520,
        "acompValor": 0,
        "tarifaBase": 126500
      },
      "cliente": {
        "aCobrar": 195000,
        "acompValor": 0,
        "tarifaBase": 175000,
        "kmAdicional": 20000
      }
    },
    "km": 86,
    "documentacion": null,
    "facturaChofer": 1746211077797,
    "idOperacion": 1746207235133,
    "chofer": {
      "idTarifa": 1745280075582,
      "type": "added",
      "cuit": 20380305381,
      "contactoEmergencia": "",
      "email": "actualizar@gmail.com",
      "vehiculo": [
        {
          "tarjetaCombustible": true,
          "dominio": "HPP453",
          "modelo": "Transporter",
          "marca": "Volkswagen",
          "segSat": true,
          "categoria": {
            "catOrden": 2,
            "nombre": "Maxi"
          },
          "refrigeracion": null,
          "publicidad": false,
          "satelital": "Stop Car",
          "tipoCombustible": [
            "nafta"
          ]
        }
      ],
      " condFiscal": "",
      "tarifaAsignada": true,
      "celularEmergencia": "",
      "tarifaTipo": {
        "especial": false,
        "general": true,
        "eventual": false,
        "personalizada": false
      },
      "direccion": {
        "localidad": "",
        "domicilio": "Juncal 777 - Lanus",
        "provincia": "",
        " municipio": ""
      },
      "idProveedor": 0,
      "fechaNac": "1994-02-01",
      "id": "75TLs99t6qSNTuHessGQ",
      "apellido": "Quiroga",
      "nombre": "Ariel Omar",
      "idChofer": 1736730226989,
      "celularContacto": "1130719809"
    },
    "acompaniante": false,
    "multiplicadorChofer": 1,
    "patenteChofer": "HPP453",
    "tarifaEventual": {
      "chofer": {
        "concepto": "",
        "valor": 0
      },
      "cliente": {
        "valor": 0,
        "concepto": ""
      }
    },
    "tarifaTipo": {
      "personalizada": false,
      "especial": false,
      "eventual": false,
      "general": true
    },
    "facturaCliente": 1746211077797,
    "hojaRuta": ""
  },
  {
    "id": "WgwPTEyAqnhmPOB8LWRV",
    "estado": {
      "facturada": true,
      "cerrada": false,
      "facChofer": false,
      "facCliente": false,
      "abierta": false
    },
    "cliente": {
      "tarifaAsignada": true,
      "direccionOperativa": {
        "provincia": "Buenos Aires",
        "localidad": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "municipio": "Avellaneda"
      },
      "contactos": [
        {
          "puesto": "Jefe Logistica",
          "apellido": "Paz",
          "email": "juanpaz@andesmar.com.ar",
          "nombre": "Juan",
          "telefono": "1126439403"
        },
        {
          "puesto": "Encargado de Logistica",
          "telefono": "1133579699",
          "apellido": "Marchetti",
          "nombre": "Ramiro",
          "email": ""
        }
      ],
      "razonSocial": "Andesmar Cargas SA",
      "idCliente": 1736356938304,
      "id": "HPceY9retp6KCsNOPJia",
      "idTarifa": 1745279918277,
      "condFiscal": "Responsable Inscripto - Factura A",
      "direccionFiscal": {
        "municipio": "Maipú",
        "localidad": "Luzuriaga",
        "provincia": "Mendoza",
        "domicilio": "Rodriguez Peña 205"
      },
      "type": "added",
      "tarifaTipo": {
        "personalizada": false,
        "eventual": false,
        "general": true,
        "especial": false
      },
      "cuit": 30601502778
    },
    "tarifaTipo": {
      "especial": false,
      "general": true,
      "eventual": false,
      "personalizada": false
    },
    "fecha": "2025-04-30",
    "chofer": {
      "cuit": 20410488392,
      "tarifaTipo": {
        "eventual": false,
        "general": true,
        "personalizada": false,
        "especial": false
      },
      "email": "cristiannicolassoto1303@gmail.com",
      "idProveedor": 0,
      "id": "vIsDMqhm9hag6LXDt28I",
      "celularContacto": "1153499040",
      "idTarifa": 1745280075582,
      "vehiculo": [
        {
          "dominio": "AD071GH",
          "segSat": true,
          "modelo": "Fiorino",
          "categoria": {
            "nombre": "Mini",
            "catOrden": 1
          },
          "publicidad": false,
          "marca": "Fiat",
          "tarjetaCombustible": false,
          "tipoCombustible": [
            "Nafta"
          ],
          "satelital": "Stop Car",
          "refrigeracion": null
        }
      ],
      "tarifaAsignada": true,
      "nombre": "Christian Nicolas",
      "fechaNac": "1998-03-13",
      "type": "added",
      "celularEmergencia": "1123711081",
      "idChofer": 1736792086528,
      "apellido": "Soto",
      "direccion": {
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda",
        "localidad": "Sarandí",
        "domicilio": "Pasaje Cerviño 312"
      },
      "contactoEmergencia": "Lorena Soto",
      "condFiscal": "Monotributista - Factura C"
    },
    "km": 185,
    "valores": {
      "cliente": {
        "tarifaBase": 95000,
        "acompValor": 0,
        "kmAdicional": 56000,
        "aCobrar": 151000
      },
      "chofer": {
        "kmAdicional": 43120,
        "aPagar": 115720,
        "acompValor": 0,
        "tarifaBase": 72600
      }
    },
    "observaciones": "",
    "tarifaEventual": {
      "chofer": {
        "valor": 0,
        "concepto": ""
      },
      "cliente": {
        "valor": 0,
        "concepto": ""
      }
    },
    "multiplicadorCliente": 1,
    "patenteChofer": "AD071GH",
    "facturaChofer": 1746490362360,
    "idOperacion": 1746207235134,
    "tarifaPersonalizada": {
      "seccion": 0,
      "categoria": 0,
      "nombre": "",
      "aPagar": 0,
      "aCobrar": 0
    },
    "facturaCliente": 1746490362360,
    "multiplicadorChofer": 1,
    "hojaRuta": "",
    "documentacion": null,
    "acompaniante": false
  },
  {
    "id": "OYcgKrQ9Q7Gs6UC52iOU",
    "valores": {
      "cliente": {
        "aCobrar": 151000,
        "kmAdicional": 56000,
        "acompValor": 0,
        "tarifaBase": 95000
      },
      "chofer": {
        "acompValor": 0,
        "aPagar": 115720,
        "kmAdicional": 43120,
        "tarifaBase": 72600
      }
    },
    "observaciones": "",
    "tarifaPersonalizada": {
      "seccion": 0,
      "aCobrar": 0,
      "categoria": 0,
      "aPagar": 0,
      "nombre": ""
    },
    "idOperacion": 1746207235131,
    "acompaniante": false,
    "chofer": {
      "contactoEmergencia": "Maitena Rodríguez",
      "nombre": "Tomas Yamil",
      "condFiscal": "Monotributista - Factura C",
      "idChofer": 1736728211494,
      "email": "toma.f@hotmail.com",
      "cuit": 20443384900,
      "idTarifa": 1745280075582,
      "direccion": {
        "provincia": "Buenos Aires",
        "municipio": "Lanús",
        "localidad": "Lanús Oeste",
        "domicilio": "R. de Escalada  de San Martin 1483"
      },
      "vehiculo": [
        {
          "modelo": "Partner",
          "dominio": "OPB248",
          "publicidad": false,
          "satelital": "Stop Car",
          "tipoCombustible": [
            "Nafta"
          ],
          "marca": "Peugeot",
          "segSat": true,
          "tarjetaCombustible": false,
          "refrigeracion": null,
          "categoria": {
            "nombre": "Mini",
            "catOrden": 1
          }
        }
      ],
      "fechaNac": "2002-08-09",
      "id": "IYdOM7gOiBPrLRIukidg",
      "celularContacto": "1166620796",
      "type": "added",
      "tarifaTipo": {
        "general": true,
        "eventual": false,
        "especial": false,
        "personalizada": false
      },
      "tarifaAsignada": true,
      "idProveedor": 0,
      "celularEmergencia": "1139135361",
      "apellido": "Fernandez"
    },
    "tarifaEventual": {
      "chofer": {
        "concepto": "",
        "valor": 0
      },
      "cliente": {
        "concepto": "",
        "valor": 0
      }
    },
    "facturaChofer": 1746210243250,
    "tarifaTipo": {
      "especial": false,
      "eventual": false,
      "personalizada": false,
      "general": true
    },
    "km": 186,
    "facturaCliente": 1746210243250,
    "documentacion": null,
    "fecha": "2025-04-30",
    "multiplicadorCliente": 1,
    "multiplicadorChofer": 1,
    "estado": {
      "facturada": true,
      "facChofer": false,
      "cerrada": false,
      "abierta": false,
      "facCliente": false
    },
    "hojaRuta": "",
    "cliente": {
      "idTarifa": 1745279918277,
      "id": "HPceY9retp6KCsNOPJia",
      "tarifaAsignada": true,
      "type": "added",
      "direccionOperativa": {
        "provincia": "Buenos Aires",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "localidad": "Avellaneda",
        "municipio": "Avellaneda"
      },
      "contactos": [
        {
          "apellido": "Paz",
          "email": "juanpaz@andesmar.com.ar",
          "telefono": "1126439403",
          "puesto": "Jefe Logistica",
          "nombre": "Juan"
        },
        {
          "nombre": "Ramiro",
          "email": "",
          "apellido": "Marchetti",
          "puesto": "Encargado de Logistica",
          "telefono": "1133579699"
        }
      ],
      "condFiscal": "Responsable Inscripto - Factura A",
      "direccionFiscal": {
        "domicilio": "Rodriguez Peña 205",
        "provincia": "Mendoza",
        "localidad": "Luzuriaga",
        "municipio": "Maipú"
      },
      "razonSocial": "Andesmar Cargas SA",
      "cuit": 30601502778,
      "idCliente": 1736356938304,
      "tarifaTipo": {
        "eventual": false,
        "general": true,
        "especial": false,
        "personalizada": false
      }
    },
    "patenteChofer": "OPB248"
  },
  {
    "id": "LUUKkc0ATeQhzkbWUaqu",
    "facturaChofer": 1746209553214,
    "cliente": {
      "idTarifa": 1745279918277,
      "direccionOperativa": {
        "municipio": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "provincia": "Buenos Aires",
        "localidad": "Avellaneda"
      },
      "tarifaTipo": {
        "especial": false,
        "eventual": false,
        "general": true,
        "personalizada": false
      },
      "razonSocial": "Andesmar Cargas SA",
      "condFiscal": "Responsable Inscripto - Factura A",
      "id": "HPceY9retp6KCsNOPJia",
      "direccionFiscal": {
        "municipio": "Maipú",
        "domicilio": "Rodriguez Peña 205",
        "provincia": "Mendoza",
        "localidad": "Luzuriaga"
      },
      "contactos": [
        {
          "nombre": "Juan",
          "puesto": "Jefe Logistica",
          "telefono": "1126439403",
          "email": "juanpaz@andesmar.com.ar",
          "apellido": "Paz"
        },
        {
          "nombre": "Ramiro",
          "puesto": "Encargado de Logistica",
          "apellido": "Marchetti",
          "email": "",
          "telefono": "1133579699"
        }
      ],
      "tarifaAsignada": true,
      "type": "added",
      "idCliente": 1736356938304,
      "cuit": 30601502778
    },
    "tarifaEventual": {
      "cliente": {
        "concepto": "",
        "valor": 0
      },
      "chofer": {
        "valor": 0,
        "concepto": ""
      }
    },
    "valores": {
      "chofer": {
        "aPagar": 229200,
        "kmAdicional": 24200,
        "tarifaBase": 165000,
        "acompValor": 40000
      },
      "cliente": {
        "tarifaBase": 225000,
        "aCobrar": 307500,
        "acompValor": 50000,
        "kmAdicional": 32500
      }
    },
    "tarifaPersonalizada": {
      "seccion": 0,
      "categoria": 0,
      "aCobrar": 0,
      "aPagar": 0,
      "nombre": ""
    },
    "multiplicadorCliente": 1,
    "tarifaTipo": {
      "general": true,
      "personalizada": false,
      "especial": false,
      "eventual": false
    },
    "chofer": {
      "nombre": "Daniel Eduardo",
      "idTarifa": 1745280075582,
      "condFiscal": "Monotributista - Factura C",
      "idProveedor": 0,
      "contactoEmergencia": "Pareja",
      "type": "added",
      "email": "proserintsa@gmail.com",
      "cuit": 20171435472,
      "tarifaAsignada": true,
      "celularContacto": "1157361377",
      "celularEmergencia": "1132479708",
      "idChofer": 1736603977629,
      "id": "qwWzv5lrgsIxPVDgHybz",
      "fechaNac": "1964-08-17",
      "tarifaTipo": {
        "general": true,
        "eventual": false,
        "especial": false,
        "personalizada": false
      },
      "vehiculo": [
        {
          "satelital": "Stop Car",
          "publicidad": false,
          "tipoCombustible": [
            "Nafta"
          ],
          "tarjetaCombustible": true,
          "refrigeracion": null,
          "marca": "Ivecco",
          "categoria": {
            "catOrden": 3,
            "nombre": "Furgon"
          },
          "segSat": true,
          "dominio": "OEM143",
          "modelo": "Daily"
        }
      ],
      "direccion": {
        "municipio": "La Matanza",
        "provincia": "Buenos Aires",
        "localidad": "San Justo",
        "domicilio": "Derqui 3686"
      },
      "apellido": "Andrade"
    },
    "km": 98,
    "patenteChofer": "OEM143",
    "observaciones": "",
    "facturaCliente": 1746209553214,
    "fecha": "2025-04-30",
    "documentacion": null,
    "estado": {
      "facCliente": false,
      "cerrada": false,
      "facturada": true,
      "facChofer": false,
      "abierta": false
    },
    "acompaniante": true,
    "multiplicadorChofer": 1,
    "idOperacion": 1746207235130,
    "hojaRuta": ""
  },
  {
    "id": "4ZuG7KKMiur8eFif74KY",
    "facturaChofer": 1746482915112,
    "observaciones": "",
    "tarifaPersonalizada": {
      "seccion": 0,
      "categoria": 0,
      "aCobrar": 0,
      "nombre": "",
      "aPagar": 0
    },
    "tarifaTipo": {
      "personalizada": false,
      "especial": false,
      "eventual": false,
      "general": true
    },
    "cliente": {
      "cuit": 30601502778,
      "idCliente": 1736356938304,
      "tarifaAsignada": true,
      "condFiscal": "Responsable Inscripto - Factura A",
      "contactos": [
        {
          "nombre": "Juan",
          "apellido": "Paz",
          "email": "juanpaz@andesmar.com.ar",
          "telefono": "1126439403",
          "puesto": "Jefe Logistica"
        },
        {
          "nombre": "Ramiro",
          "telefono": "1133579699",
          "email": "",
          "puesto": "Encargado de Logistica",
          "apellido": "Marchetti"
        }
      ],
      "direccionOperativa": {
        "municipio": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "localidad": "Avellaneda",
        "provincia": "Buenos Aires"
      },
      "type": "added",
      "id": "HPceY9retp6KCsNOPJia",
      "tarifaTipo": {
        "especial": false,
        "eventual": false,
        "personalizada": false,
        "general": true
      },
      "razonSocial": "Andesmar Cargas SA",
      "idTarifa": 1745279918277,
      "direccionFiscal": {
        "localidad": "Luzuriaga",
        "municipio": "Maipú",
        "provincia": "Mendoza",
        "domicilio": "Rodriguez Peña 205"
      }
    },
    "facturaCliente": 1746482915111,
    "fecha": "2025-04-30",
    "km": 63,
    "valores": {
      "cliente": {
        "aCobrar": 103000,
        "acompValor": 0,
        "kmAdicional": 8000,
        "tarifaBase": 95000
      },
      "chofer": {
        "kmAdicional": 6160,
        "tarifaBase": 72600,
        "aPagar": 78760,
        "acompValor": 0
      }
    },
    "patenteChofer": "LUC928",
    "idOperacion": 1746207235132,
    "multiplicadorCliente": 1,
    "documentacion": null,
    "acompaniante": false,
    "tarifaEventual": {
      "chofer": {
        "valor": 0,
        "concepto": ""
      },
      "cliente": {
        "concepto": "",
        "valor": 0
      }
    },
    "multiplicadorChofer": 1,
    "estado": {
      "facturada": true,
      "facChofer": false,
      "cerrada": false,
      "facCliente": false,
      "abierta": false
    },
    "hojaRuta": "",
    "chofer": {
      "cuit": 20389286750,
      "direccion": {
        "provincia": "Buenos Aires",
        "domicilio": "Pje Rosa Acevedo 1049",
        "municipio": "Lanús",
        "localidad": "Lanús Oeste"
      },
      "fechaNac": "1996-03-07",
      "idTarifa": 1745280075582,
      "condFiscal": "Monotributista - Factura C",
      "tarifaTipo": {
        "personalizada": false,
        "especial": false,
        "eventual": false,
        "general": true
      },
      "idChofer": 1736727991651,
      "celularEmergencia": "1161671994",
      "tarifaAsignada": true,
      "vehiculo": [
        {
          "tarjetaCombustible": false,
          "tipoCombustible": [
            "Nafta"
          ],
          "modelo": "Partner",
          "publicidad": false,
          "segSat": true,
          "satelital": "Stop Car",
          "dominio": "LUC928",
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "marca": "Peugeot",
          "refrigeracion": null
        }
      ],
      "email": "fndzmatias@gmail.com",
      "nombre": "Matias Alberto",
      "celularContacto": "1133652485",
      "type": "added",
      "contactoEmergencia": "Stella",
      "apellido": "Fernandez",
      "id": "jhjDx7Yh3lf56iAFBWWp",
      "idProveedor": 0
    }
  },
  {
    "id": "y3JKjsX0OVDb1b8LlZ9Q",
    "facturaCliente": 1746211429086,
    "idOperacion": 1746015789834,
    "cliente": {
      "idCliente": 1736356938304,
      "direccionOperativa": {
        "municipio": "Avellaneda",
        "provincia": "Buenos Aires",
        "localidad": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda"
      },
      "idTarifa": 1745279918277,
      "tarifaAsignada": true,
      "condFiscal": "Responsable Inscripto - Factura A",
      "cuit": 30601502778,
      "razonSocial": "Andesmar Cargas SA",
      "contactos": [
        {
          "apellido": "Paz",
          "puesto": "Jefe Logistica",
          "nombre": "Juan",
          "telefono": "1126439403",
          "email": "juanpaz@andesmar.com.ar"
        },
        {
          "apellido": "Marchetti",
          "telefono": "1133579699",
          "puesto": "Encargado de Logistica",
          "email": "",
          "nombre": "Ramiro"
        }
      ],
      "id": "HPceY9retp6KCsNOPJia",
      "tarifaTipo": {
        "eventual": false,
        "especial": false,
        "general": true,
        "personalizada": false
      },
      "type": "modified",
      "direccionFiscal": {
        "provincia": "Mendoza",
        "domicilio": "Rodriguez Peña 205",
        "localidad": "Luzuriaga",
        "municipio": "Maipú"
      }
    },
    "fecha": "2025-04-29",
    "chofer": {
      "type": "modified",
      "id": "rsFavZLKXlrRMuilBzCS",
      "idProveedor": 0,
      "nombre": "Adrian Ernesto",
      "cuit": 20235231531,
      "apellido": "Venegas",
      "email": "adrianvenegas7573@gmail.com",
      "celularContacto": "1151465696",
      "celularEmergencia": "1139103989",
      "fechaNac": "1973-09-10",
      "tarifaAsignada": true,
      "condFiscal": "Monotributista - Factura C",
      "vehiculo": [
        {
          "satelital": "Stop Car",
          "segSat": true,
          "dominio": "LCP568",
          "tipoCombustible": [
            "Nafta"
          ],
          "tarjetaCombustible": true,
          "refrigeracion": null,
          "modelo": "Fiorino",
          "marca": "Fiat",
          "publicidad": false,
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          }
        }
      ],
      "idChofer": 1736791944623,
      "direccion": {
        "domicilio": "Tuyuti 3003",
        "localidad": "Valentín Alsina",
        "provincia": "Buenos Aires",
        "municipio": "Lanús"
      },
      "idTarifa": 1745280075582,
      "contactoEmergencia": "Mariana Podokian",
      "tarifaTipo": {
        "personalizada": false,
        "general": true,
        "especial": false,
        "eventual": false
      }
    },
    "estado": {
      "cerrada": false,
      "facChofer": false,
      "facturada": true,
      "facCliente": false,
      "abierta": false
    },
    "multiplicadorChofer": 1,
    "acompaniante": false,
    "facturaChofer": 1746211429086,
    "tarifaEventual": {
      "chofer": {
        "concepto": "",
        "valor": 0
      },
      "cliente": {
        "valor": 0,
        "concepto": ""
      }
    },
    "hojaRuta": "",
    "patenteChofer": "LCP568",
    "tarifaPersonalizada": {
      "nombre": "",
      "categoria": 0,
      "aCobrar": 0,
      "aPagar": 0,
      "seccion": 0
    },
    "documentacion": null,
    "tarifaTipo": {
      "personalizada": false,
      "general": true,
      "eventual": false,
      "especial": false
    },
    "multiplicadorCliente": 1,
    "observaciones": "",
    "km": 163,
    "valores": {
      "chofer": {
        "aPagar": 109560,
        "kmAdicional": 36960,
        "tarifaBase": 72600,
        "acompValor": 0
      },
      "cliente": {
        "tarifaBase": 95000,
        "kmAdicional": 48000,
        "aCobrar": 143000,
        "acompValor": 0
      }
    }
  },
  {
    "id": "vQHzDNVsvN3xoopSpCuY",
    "km": 105,
    "fecha": "2025-04-29",
    "estado": {
      "abierta": false,
      "facturada": true,
      "cerrada": false,
      "facChofer": false,
      "facCliente": false
    },
    "patenteChofer": "HPP453",
    "chofer": {
      "idChofer": 1736730226989,
      "tarifaAsignada": true,
      "idProveedor": 0,
      "apellido": "Quiroga",
      "contactoEmergencia": "",
      "celularContacto": "1130719809",
      "idTarifa": 1745280075582,
      "tarifaTipo": {
        "especial": false,
        "eventual": false,
        "personalizada": false,
        "general": true
      },
      "email": "actualizar@gmail.com",
      "id": "75TLs99t6qSNTuHessGQ",
      "fechaNac": "1994-02-01",
      "type": "modified",
      "direccion": {
        "localidad": "",
        " municipio": "",
        "domicilio": "Juncal 777 - Lanus",
        "provincia": ""
      },
      "cuit": 20380305381,
      "nombre": "Ariel Omar",
      " condFiscal": "",
      "vehiculo": [
        {
          "tarjetaCombustible": true,
          "modelo": "Transporter",
          "segSat": true,
          "dominio": "HPP453",
          "categoria": {
            "catOrden": 2,
            "nombre": "Maxi"
          },
          "refrigeracion": null,
          "marca": "Volkswagen",
          "satelital": "Stop Car",
          "tipoCombustible": [
            "nafta"
          ],
          "publicidad": false
        }
      ],
      "celularEmergencia": ""
    },
    "observaciones": "",
    "tarifaTipo": {
      "general": true,
      "especial": false,
      "eventual": false,
      "personalizada": false
    },
    "cliente": {
      "tarifaAsignada": true,
      "direccionOperativa": {
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "localidad": "Avellaneda"
      },
      "condFiscal": "Responsable Inscripto - Factura A",
      "tarifaTipo": {
        "especial": false,
        "general": true,
        "eventual": false,
        "personalizada": false
      },
      "idTarifa": 1745279918277,
      "idCliente": 1736356938304,
      "contactos": [
        {
          "apellido": "Paz",
          "telefono": "1126439403",
          "puesto": "Jefe Logistica",
          "nombre": "Juan",
          "email": "juanpaz@andesmar.com.ar"
        },
        {
          "puesto": "Encargado de Logistica",
          "email": "",
          "apellido": "Marchetti",
          "nombre": "Ramiro",
          "telefono": "1133579699"
        }
      ],
      "razonSocial": "Andesmar Cargas SA",
      "direccionFiscal": {
        "municipio": "Maipú",
        "provincia": "Mendoza",
        "localidad": "Luzuriaga",
        "domicilio": "Rodriguez Peña 205"
      },
      "cuit": 30601502778,
      "type": "modified",
      "id": "HPceY9retp6KCsNOPJia"
    },
    "tarifaEventual": {
      "cliente": {
        "valor": 0,
        "concepto": ""
      },
      "chofer": {
        "concepto": "",
        "valor": 0
      }
    },
    "facturaCliente": 1746211199039,
    "documentacion": null,
    "acompaniante": false,
    "multiplicadorCliente": 1,
    "facturaChofer": 1746211199039,
    "idOperacion": 1746015789832,
    "valores": {
      "cliente": {
        "tarifaBase": 175000,
        "kmAdicional": 30000,
        "aCobrar": 205000,
        "acompValor": 0
      },
      "chofer": {
        "acompValor": 0,
        "aPagar": 148280,
        "kmAdicional": 21780,
        "tarifaBase": 126500
      }
    },
    "hojaRuta": "",
    "multiplicadorChofer": 1,
    "tarifaPersonalizada": {
      "aPagar": 0,
      "nombre": "",
      "seccion": 0,
      "categoria": 0,
      "aCobrar": 0
    }
  },
  {
    "id": "XNBshV8XsGyrgh5s1ZfM",
    "acompaniante": false,
    "multiplicadorCliente": 1,
    "tarifaEventual": {
      "cliente": {
        "valor": 0,
        "concepto": ""
      },
      "chofer": {
        "valor": 0,
        "concepto": ""
      }
    },
    "documentacion": null,
    "estado": {
      "facChofer": false,
      "cerrada": false,
      "facCliente": false,
      "facturada": true,
      "abierta": false
    },
    "facturaChofer": 1746483152081,
    "hojaRuta": "",
    "valores": {
      "chofer": {
        "aPagar": 100320,
        "kmAdicional": 27720,
        "acompValor": 0,
        "tarifaBase": 72600
      },
      "cliente": {
        "aCobrar": 131000,
        "kmAdicional": 36000,
        "acompValor": 0,
        "tarifaBase": 95000
      }
    },
    "idOperacion": 1746483122087,
    "patenteChofer": "OPB248",
    "facturaCliente": 1746483152081,
    "tarifaPersonalizada": {
      "categoria": 0,
      "nombre": "",
      "seccion": 0,
      "aCobrar": 0,
      "aPagar": 0
    },
    "observaciones": "",
    "chofer": {
      "type": "modified",
      "cuit": 20443384900,
      "celularEmergencia": "1139135361",
      "idProveedor": 0,
      "direccion": {
        "municipio": "Lanús",
        "provincia": "Buenos Aires",
        "domicilio": "R. de Escalada  de San Martin 1483",
        "localidad": "Lanús Oeste"
      },
      "tarifaTipo": {
        "personalizada": false,
        "eventual": false,
        "general": true,
        "especial": false
      },
      "idChofer": 1736728211494,
      "contactoEmergencia": "Maitena Rodríguez",
      "vehiculo": [
        {
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "satelital": "Stop Car",
          "marca": "Peugeot",
          "tipoCombustible": [
            "Nafta"
          ],
          "modelo": "Partner",
          "publicidad": false,
          "dominio": "OPB248",
          "refrigeracion": null,
          "tarjetaCombustible": false,
          "segSat": true
        }
      ],
      "nombre": "Tomas Yamil",
      "id": "IYdOM7gOiBPrLRIukidg",
      "fechaNac": "2002-08-09",
      "email": "toma.f@hotmail.com",
      "condFiscal": "Monotributista - Factura C",
      "tarifaAsignada": true,
      "apellido": "Fernandez",
      "celularContacto": "1166620796",
      "idTarifa": 1745280075582
    },
    "tarifaTipo": {
      "personalizada": false,
      "especial": false,
      "general": true,
      "eventual": false
    },
    "fecha": "2025-04-29",
    "km": 139,
    "multiplicadorChofer": 1,
    "cliente": {
      "id": "HPceY9retp6KCsNOPJia",
      "idTarifa": 1745279918277,
      "type": "modified",
      "tarifaAsignada": true,
      "condFiscal": "Responsable Inscripto - Factura A",
      "idCliente": 1736356938304,
      "cuit": 30601502778,
      "contactos": [
        {
          "nombre": "Juan",
          "telefono": "1126439403",
          "puesto": "Jefe Logistica",
          "apellido": "Paz",
          "email": "juanpaz@andesmar.com.ar"
        },
        {
          "email": "",
          "telefono": "1133579699",
          "nombre": "Ramiro",
          "apellido": "Marchetti",
          "puesto": "Encargado de Logistica"
        }
      ],
      "direccionOperativa": {
        "localidad": "Avellaneda",
        "provincia": "Buenos Aires",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "municipio": "Avellaneda"
      },
      "tarifaTipo": {
        "eventual": false,
        "especial": false,
        "general": true,
        "personalizada": false
      },
      "direccionFiscal": {
        "municipio": "Maipú",
        "domicilio": "Rodriguez Peña 205",
        "provincia": "Mendoza",
        "localidad": "Luzuriaga"
      },
      "razonSocial": "Andesmar Cargas SA"
    }
  },
  {
    "id": "XK43PjmfydHUP4KV7O6Z",
    "observaciones": "",
    "acompaniante": false,
    "estado": {
      "facturada": true,
      "cerrada": false,
      "abierta": false,
      "facChofer": false,
      "facCliente": false
    },
    "fecha": "2025-04-29",
    "tarifaTipo": {
      "personalizada": false,
      "eventual": false,
      "general": true,
      "especial": false
    },
    "cliente": {
      "cuit": 30601502778,
      "direccionFiscal": {
        "domicilio": "Rodriguez Peña 205",
        "municipio": "Maipú",
        "localidad": "Luzuriaga",
        "provincia": "Mendoza"
      },
      "id": "HPceY9retp6KCsNOPJia",
      "condFiscal": "Responsable Inscripto - Factura A",
      "idCliente": 1736356938304,
      "razonSocial": "Andesmar Cargas SA",
      "contactos": [
        {
          "apellido": "Paz",
          "telefono": "1126439403",
          "nombre": "Juan",
          "email": "juanpaz@andesmar.com.ar",
          "puesto": "Jefe Logistica"
        },
        {
          "apellido": "Marchetti",
          "email": "",
          "puesto": "Encargado de Logistica",
          "nombre": "Ramiro",
          "telefono": "1133579699"
        }
      ],
      "idTarifa": 1745279918277,
      "tarifaTipo": {
        "general": true,
        "personalizada": false,
        "eventual": false,
        "especial": false
      },
      "tarifaAsignada": true,
      "type": "modified",
      "direccionOperativa": {
        "localidad": "Avellaneda",
        "municipio": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "provincia": "Buenos Aires"
      }
    },
    "valores": {
      "chofer": {
        "kmAdicional": 33880,
        "aPagar": 198880,
        "acompValor": 0,
        "tarifaBase": 165000
      },
      "cliente": {
        "kmAdicional": 45500,
        "acompValor": 0,
        "tarifaBase": 225000,
        "aCobrar": 270500
      }
    },
    "documentacion": null,
    "tarifaPersonalizada": {
      "categoria": 0,
      "aPagar": 0,
      "seccion": 0,
      "aCobrar": 0,
      "nombre": ""
    },
    "km": 120,
    "chofer": {
      "celularEmergencia": "1132479708",
      "celularContacto": "1157361377",
      "nombre": "Daniel Eduardo",
      "direccion": {
        "localidad": "San Justo",
        "domicilio": "Derqui 3686",
        "provincia": "Buenos Aires",
        "municipio": "La Matanza"
      },
      "tarifaAsignada": true,
      "fechaNac": "1964-08-17",
      "idTarifa": 1745280075582,
      "vehiculo": [
        {
          "satelital": "Stop Car",
          "modelo": "Daily",
          "marca": "Ivecco",
          "segSat": true,
          "publicidad": false,
          "categoria": {
            "catOrden": 3,
            "nombre": "Furgon"
          },
          "tarjetaCombustible": true,
          "tipoCombustible": [
            "Nafta"
          ],
          "dominio": "OEM143",
          "refrigeracion": null
        }
      ],
      "apellido": "Andrade",
      "condFiscal": "Monotributista - Factura C",
      "id": "qwWzv5lrgsIxPVDgHybz",
      "email": "proserintsa@gmail.com",
      "type": "modified",
      "tarifaTipo": {
        "especial": false,
        "personalizada": false,
        "eventual": false,
        "general": true
      },
      "contactoEmergencia": "Pareja",
      "idChofer": 1736603977629,
      "cuit": 20171435472,
      "idProveedor": 0
    },
    "facturaChofer": 1746209589187,
    "facturaCliente": 1746209589187,
    "tarifaEventual": {
      "cliente": {
        "concepto": "",
        "valor": 0
      },
      "chofer": {
        "valor": 0,
        "concepto": ""
      }
    },
    "hojaRuta": "",
    "multiplicadorChofer": 1,
    "patenteChofer": "OEM143",
    "multiplicadorCliente": 1,
    "idOperacion": 1746015789830
  },
  {
    "id": "IoUwfwuHmbXostWTvSQr",
    "patenteChofer": "AD071GH",
    "facturaCliente": 1746490381690,
    "fecha": "2025-04-29",
    "facturaChofer": 1746490381691,
    "acompaniante": false,
    "multiplicadorChofer": 1,
    "tarifaTipo": {
      "general": true,
      "eventual": false,
      "personalizada": false,
      "especial": false
    },
    "hojaRuta": "",
    "cliente": {
      "direccionFiscal": {
        "localidad": "Luzuriaga",
        "domicilio": "Rodriguez Peña 205",
        "municipio": "Maipú",
        "provincia": "Mendoza"
      },
      "id": "HPceY9retp6KCsNOPJia",
      "tarifaTipo": {
        "general": true,
        "especial": false,
        "personalizada": false,
        "eventual": false
      },
      "contactos": [
        {
          "puesto": "Jefe Logistica",
          "nombre": "Juan",
          "telefono": "1126439403",
          "email": "juanpaz@andesmar.com.ar",
          "apellido": "Paz"
        },
        {
          "puesto": "Encargado de Logistica",
          "email": "",
          "telefono": "1133579699",
          "nombre": "Ramiro",
          "apellido": "Marchetti"
        }
      ],
      "condFiscal": "Responsable Inscripto - Factura A",
      "idCliente": 1736356938304,
      "cuit": 30601502778,
      "razonSocial": "Andesmar Cargas SA",
      "idTarifa": 1745279918277,
      "direccionOperativa": {
        "domicilio": "General Gorriti 650 - Avellaneda",
        "localidad": "Avellaneda",
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda"
      },
      "tarifaAsignada": true,
      "type": "modified"
    },
    "tarifaPersonalizada": {
      "categoria": 0,
      "nombre": "",
      "aCobrar": 0,
      "aPagar": 0,
      "seccion": 0
    },
    "observaciones": "",
    "documentacion": null,
    "estado": {
      "cerrada": false,
      "facChofer": false,
      "facCliente": false,
      "facturada": true,
      "abierta": false
    },
    "tarifaEventual": {
      "chofer": {
        "concepto": "",
        "valor": 0
      },
      "cliente": {
        "valor": 0,
        "concepto": ""
      }
    },
    "km": 105,
    "multiplicadorCliente": 1,
    "valores": {
      "cliente": {
        "aCobrar": 119000,
        "acompValor": 0,
        "tarifaBase": 95000,
        "kmAdicional": 24000
      },
      "chofer": {
        "tarifaBase": 72600,
        "kmAdicional": 18480,
        "acompValor": 0,
        "aPagar": 91080
      }
    },
    "idOperacion": 1746015789833,
    "chofer": {
      "contactoEmergencia": "Lorena Soto",
      "id": "vIsDMqhm9hag6LXDt28I",
      "fechaNac": "1998-03-13",
      "celularEmergencia": "1123711081",
      "condFiscal": "Monotributista - Factura C",
      "nombre": "Christian Nicolas",
      "celularContacto": "1153499040",
      "vehiculo": [
        {
          "segSat": true,
          "modelo": "Fiorino",
          "tarjetaCombustible": false,
          "marca": "Fiat",
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "satelital": "Stop Car",
          "dominio": "AD071GH",
          "tipoCombustible": [
            "Nafta"
          ],
          "refrigeracion": null,
          "publicidad": false
        }
      ],
      "email": "cristiannicolassoto1303@gmail.com",
      "type": "modified",
      "tarifaAsignada": true,
      "tarifaTipo": {
        "especial": false,
        "personalizada": false,
        "eventual": false,
        "general": true
      },
      "direccion": {
        "provincia": "Buenos Aires",
        "domicilio": "Pasaje Cerviño 312",
        "municipio": "Avellaneda",
        "localidad": "Sarandí"
      },
      "apellido": "Soto",
      "idChofer": 1736792086528,
      "idProveedor": 0,
      "cuit": 20410488392,
      "idTarifa": 1745280075582
    }
  },
  {
    "id": "3WU9zhitJqQokilAIa1A",
    "facturaCliente": 1746210565119,
    "chofer": {
      "tarifaTipo": {
        "personalizada": false,
        "especial": false,
        "general": true,
        "eventual": false
      },
      "id": "jhjDx7Yh3lf56iAFBWWp",
      "apellido": "Fernandez",
      "celularEmergencia": "1161671994",
      "tarifaAsignada": true,
      "cuit": 20389286750,
      "contactoEmergencia": "Stella",
      "type": "modified",
      "condFiscal": "Monotributista - Factura C",
      "direccion": {
        "municipio": "Lanús",
        "localidad": "Lanús Oeste",
        "provincia": "Buenos Aires",
        "domicilio": "Pje Rosa Acevedo 1049"
      },
      "email": "fndzmatias@gmail.com",
      "idProveedor": 0,
      "idChofer": 1736727991651,
      "vehiculo": [
        {
          "satelital": "Stop Car",
          "refrigeracion": null,
          "modelo": "Partner",
          "tarjetaCombustible": false,
          "publicidad": false,
          "tipoCombustible": [
            "Nafta"
          ],
          "marca": "Peugeot",
          "categoria": {
            "nombre": "Mini",
            "catOrden": 1
          },
          "segSat": true,
          "dominio": "LUC928"
        }
      ],
      "nombre": "Matias Alberto",
      "fechaNac": "1996-03-07",
      "celularContacto": "1133652485",
      "idTarifa": 1745280075582
    },
    "facturaChofer": 1746210565119,
    "multiplicadorCliente": 1,
    "tarifaTipo": {
      "general": true,
      "personalizada": false,
      "especial": false,
      "eventual": false
    },
    "tarifaPersonalizada": {
      "aCobrar": 0,
      "aPagar": 0,
      "categoria": 0,
      "nombre": "",
      "seccion": 0
    },
    "valores": {
      "cliente": {
        "kmAdicional": 40000,
        "acompValor": 0,
        "aCobrar": 135000,
        "tarifaBase": 95000
      },
      "chofer": {
        "acompValor": 0,
        "aPagar": 103400,
        "kmAdicional": 30800,
        "tarifaBase": 72600
      }
    },
    "cliente": {
      "razonSocial": "Andesmar Cargas SA",
      "condFiscal": "Responsable Inscripto - Factura A",
      "contactos": [
        {
          "email": "juanpaz@andesmar.com.ar",
          "telefono": "1126439403",
          "puesto": "Jefe Logistica",
          "nombre": "Juan",
          "apellido": "Paz"
        },
        {
          "email": "",
          "telefono": "1133579699",
          "puesto": "Encargado de Logistica",
          "apellido": "Marchetti",
          "nombre": "Ramiro"
        }
      ],
      "id": "HPceY9retp6KCsNOPJia",
      "direccionOperativa": {
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "localidad": "Avellaneda"
      },
      "cuit": 30601502778,
      "type": "modified",
      "idCliente": 1736356938304,
      "idTarifa": 1745279918277,
      "tarifaTipo": {
        "general": true,
        "personalizada": false,
        "eventual": false,
        "especial": false
      },
      "direccionFiscal": {
        "municipio": "Maipú",
        "domicilio": "Rodriguez Peña 205",
        "provincia": "Mendoza",
        "localidad": "Luzuriaga"
      },
      "tarifaAsignada": true
    },
    "tarifaEventual": {
      "cliente": {
        "valor": 0,
        "concepto": ""
      },
      "chofer": {
        "valor": 0,
        "concepto": ""
      }
    },
    "km": 143,
    "multiplicadorChofer": 1,
    "acompaniante": false,
    "patenteChofer": "LUC928",
    "estado": {
      "facChofer": false,
      "facCliente": false,
      "abierta": false,
      "facturada": true,
      "cerrada": false
    },
    "fecha": "2025-04-29",
    "documentacion": null,
    "idOperacion": 1746015789831,
    "observaciones": "",
    "hojaRuta": ""
  },
  {
    "id": "qPyyuQBKOozzjgfzQs4R",
    "idOperacion": 1745929857272,
    "cliente": {
      "idTarifa": 1745279918277,
      "tarifaAsignada": true,
      "contactos": [
        {
          "puesto": "Jefe Logistica",
          "apellido": "Paz",
          "email": "juanpaz@andesmar.com.ar",
          "telefono": "1126439403",
          "nombre": "Juan"
        },
        {
          "telefono": "1133579699",
          "email": "",
          "nombre": "Ramiro",
          "puesto": "Encargado de Logistica",
          "apellido": "Marchetti"
        }
      ],
      "direccionOperativa": {
        "domicilio": "General Gorriti 650 - Avellaneda",
        "municipio": "Avellaneda",
        "localidad": "Avellaneda",
        "provincia": "Buenos Aires"
      },
      "idCliente": 1736356938304,
      "razonSocial": "Andesmar Cargas SA",
      "tarifaTipo": {
        "especial": false,
        "personalizada": false,
        "eventual": false,
        "general": true
      },
      "cuit": 30601502778,
      "direccionFiscal": {
        "provincia": "Mendoza",
        "localidad": "Luzuriaga",
        "municipio": "Maipú",
        "domicilio": "Rodriguez Peña 205"
      },
      "type": "modified",
      "id": "HPceY9retp6KCsNOPJia",
      "condFiscal": "Responsable Inscripto - Factura A"
    },
    "facturaChofer": 1745957206375,
    "acompaniante": false,
    "tarifaPersonalizada": {
      "categoria": 0,
      "seccion": 0,
      "aCobrar": 0,
      "aPagar": 0,
      "nombre": ""
    },
    "observaciones": "",
    "hojaRuta": "",
    "facturaCliente": 1745957206375,
    "multiplicadorCliente": 1,
    "estado": {
      "facChofer": false,
      "facCliente": false,
      "facturada": true,
      "abierta": false,
      "cerrada": false
    },
    "documentacion": null,
    "km": 162,
    "tarifaTipo": {
      "eventual": false,
      "general": true,
      "personalizada": false,
      "especial": false
    },
    "multiplicadorChofer": 1,
    "tarifaEventual": {
      "chofer": {
        "concepto": "",
        "valor": 0
      },
      "cliente": {
        "valor": 0,
        "concepto": ""
      }
    },
    "fecha": "2025-04-28",
    "chofer": {
      "type": "modified",
      "idProveedor": 0,
      "cuit": 20410488392,
      "celularEmergencia": "1123711081",
      "contactoEmergencia": "Lorena Soto",
      "idChofer": 1736792086528,
      "id": "vIsDMqhm9hag6LXDt28I",
      "direccion": {
        "domicilio": "Pasaje Cerviño 312",
        "municipio": "Avellaneda",
        "localidad": "Sarandí",
        "provincia": "Buenos Aires"
      },
      "apellido": "Soto",
      "vehiculo": [
        {
          "marca": "Fiat",
          "modelo": "Fiorino",
          "satelital": "Stop Car",
          "tarjetaCombustible": false,
          "tipoCombustible": [
            "Nafta"
          ],
          "publicidad": false,
          "dominio": "AD071GH",
          "segSat": true,
          "refrigeracion": null,
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          }
        }
      ],
      "tarifaTipo": {
        "personalizada": false,
        "general": true,
        "eventual": false,
        "especial": false
      },
      "fechaNac": "1998-03-13",
      "tarifaAsignada": true,
      "condFiscal": "Monotributista - Factura C",
      "idTarifa": 1745280075582,
      "celularContacto": "1153499040",
      "email": "cristiannicolassoto1303@gmail.com",
      "nombre": "Christian Nicolas"
    },
    "valores": {
      "cliente": {
        "aCobrar": 143000,
        "tarifaBase": 95000,
        "acompValor": 0,
        "kmAdicional": 48000
      },
      "chofer": {
        "acompValor": 0,
        "kmAdicional": 36960,
        "aPagar": 109560,
        "tarifaBase": 72600
      }
    },
    "patenteChofer": "AD071GH"
  },
  {
    "id": "omIGfeYwc1rUmo30942W",
    "multiplicadorChofer": 1,
    "observaciones": "",
    "multiplicadorCliente": 1,
    "documentacion": null,
    "facturaChofer": 1746211413827,
    "tarifaPersonalizada": {
      "categoria": 0,
      "nombre": "",
      "aPagar": 0,
      "aCobrar": 0,
      "seccion": 0
    },
    "tarifaEventual": {
      "cliente": {
        "valor": 0,
        "concepto": ""
      },
      "chofer": {
        "valor": 0,
        "concepto": ""
      }
    },
    "patenteChofer": "LCP568",
    "idOperacion": 1745929857273,
    "tarifaTipo": {
      "eventual": false,
      "especial": false,
      "personalizada": false,
      "general": true
    },
    "fecha": "2025-04-28",
    "acompaniante": false,
    "chofer": {
      "idProveedor": 0,
      "nombre": "Adrian Ernesto",
      "idChofer": 1736791944623,
      "id": "rsFavZLKXlrRMuilBzCS",
      "direccion": {
        "localidad": "Valentín Alsina",
        "provincia": "Buenos Aires",
        "domicilio": "Tuyuti 3003",
        "municipio": "Lanús"
      },
      "fechaNac": "1973-09-10",
      "email": "adrianvenegas7573@gmail.com",
      "condFiscal": "Monotributista - Factura C",
      "cuit": 20235231531,
      "type": "modified",
      "celularContacto": "1151465696",
      "idTarifa": 1745280075582,
      "celularEmergencia": "1139103989",
      "tarifaAsignada": true,
      "contactoEmergencia": "Mariana Podokian",
      "tarifaTipo": {
        "eventual": false,
        "especial": false,
        "personalizada": false,
        "general": true
      },
      "apellido": "Venegas",
      "vehiculo": [
        {
          "modelo": "Fiorino",
          "categoria": {
            "nombre": "Mini",
            "catOrden": 1
          },
          "tarjetaCombustible": true,
          "publicidad": false,
          "marca": "Fiat",
          "refrigeracion": null,
          "dominio": "LCP568",
          "tipoCombustible": [
            "Nafta"
          ],
          "segSat": true,
          "satelital": "Stop Car"
        }
      ]
    },
    "km": 94,
    "estado": {
      "facCliente": false,
      "facturada": true,
      "facChofer": false,
      "cerrada": false,
      "abierta": false
    },
    "valores": {
      "chofer": {
        "acompValor": 0,
        "tarifaBase": 72600,
        "aPagar": 88000,
        "kmAdicional": 15400
      },
      "cliente": {
        "aCobrar": 115000,
        "kmAdicional": 20000,
        "tarifaBase": 95000,
        "acompValor": 0
      }
    },
    "facturaCliente": 1746211413827,
    "hojaRuta": "",
    "cliente": {
      "type": "modified",
      "tarifaTipo": {
        "especial": false,
        "general": true,
        "personalizada": false,
        "eventual": false
      },
      "contactos": [
        {
          "apellido": "Paz",
          "nombre": "Juan",
          "telefono": "1126439403",
          "email": "juanpaz@andesmar.com.ar",
          "puesto": "Jefe Logistica"
        },
        {
          "apellido": "Marchetti",
          "telefono": "1133579699",
          "email": "",
          "nombre": "Ramiro",
          "puesto": "Encargado de Logistica"
        }
      ],
      "idTarifa": 1745279918277,
      "direccionFiscal": {
        "localidad": "Luzuriaga",
        "provincia": "Mendoza",
        "municipio": "Maipú",
        "domicilio": "Rodriguez Peña 205"
      },
      "id": "HPceY9retp6KCsNOPJia",
      "idCliente": 1736356938304,
      "razonSocial": "Andesmar Cargas SA",
      "direccionOperativa": {
        "municipio": "Avellaneda",
        "localidad": "Avellaneda",
        "provincia": "Buenos Aires",
        "domicilio": "General Gorriti 650 - Avellaneda"
      },
      "tarifaAsignada": true,
      "cuit": 30601502778,
      "condFiscal": "Responsable Inscripto - Factura A"
    }
  },
  {
    "id": "f4Y339kLLYtqoBSlU7nf",
    "hojaRuta": "",
    "tarifaTipo": {
      "personalizada": false,
      "especial": false,
      "eventual": false,
      "general": true
    },
    "multiplicadorCliente": 1,
    "km": 71,
    "patenteChofer": "LUC928",
    "documentacion": null,
    "idOperacion": 1745929857270,
    "chofer": {
      "celularContacto": "1133652485",
      "type": "modified",
      "email": "fndzmatias@gmail.com",
      "idTarifa": 1745280075582,
      "idChofer": 1736727991651,
      "tarifaTipo": {
        "eventual": false,
        "general": true,
        "personalizada": false,
        "especial": false
      },
      "direccion": {
        "provincia": "Buenos Aires",
        "municipio": "Lanús",
        "localidad": "Lanús Oeste",
        "domicilio": "Pje Rosa Acevedo 1049"
      },
      "cuit": 20389286750,
      "vehiculo": [
        {
          "categoria": {
            "nombre": "Mini",
            "catOrden": 1
          },
          "modelo": "Partner",
          "segSat": true,
          "tipoCombustible": [
            "Nafta"
          ],
          "marca": "Peugeot",
          "dominio": "LUC928",
          "refrigeracion": null,
          "tarjetaCombustible": false,
          "publicidad": false,
          "satelital": "Stop Car"
        }
      ],
      "nombre": "Matias Alberto",
      "contactoEmergencia": "Stella",
      "celularEmergencia": "1161671994",
      "fechaNac": "1996-03-07",
      "id": "jhjDx7Yh3lf56iAFBWWp",
      "idProveedor": 0,
      "tarifaAsignada": true,
      "condFiscal": "Monotributista - Factura C",
      "apellido": "Fernandez"
    },
    "facturaChofer": 1746210552079,
    "fecha": "2025-04-28",
    "tarifaPersonalizada": {
      "nombre": "",
      "seccion": 0,
      "categoria": 0,
      "aCobrar": 0,
      "aPagar": 0
    },
    "cliente": {
      "contactos": [
        {
          "apellido": "Paz",
          "nombre": "Juan",
          "email": "juanpaz@andesmar.com.ar",
          "telefono": "1126439403",
          "puesto": "Jefe Logistica"
        },
        {
          "email": "",
          "puesto": "Encargado de Logistica",
          "nombre": "Ramiro",
          "telefono": "1133579699",
          "apellido": "Marchetti"
        }
      ],
      "cuit": 30601502778,
      "idCliente": 1736356938304,
      "idTarifa": 1745279918277,
      "type": "modified",
      "direccionOperativa": {
        "domicilio": "General Gorriti 650 - Avellaneda",
        "municipio": "Avellaneda",
        "provincia": "Buenos Aires",
        "localidad": "Avellaneda"
      },
      "direccionFiscal": {
        "localidad": "Luzuriaga",
        "provincia": "Mendoza",
        "municipio": "Maipú",
        "domicilio": "Rodriguez Peña 205"
      },
      "tarifaAsignada": true,
      "id": "HPceY9retp6KCsNOPJia",
      "tarifaTipo": {
        "personalizada": false,
        "eventual": false,
        "general": true,
        "especial": false
      },
      "razonSocial": "Andesmar Cargas SA",
      "condFiscal": "Responsable Inscripto - Factura A"
    },
    "tarifaEventual": {
      "cliente": {
        "valor": 0,
        "concepto": ""
      },
      "chofer": {
        "concepto": "",
        "valor": 0
      }
    },
    "facturaCliente": 1746210552079,
    "multiplicadorChofer": 1,
    "acompaniante": false,
    "observaciones": "",
    "valores": {
      "chofer": {
        "kmAdicional": 9240,
        "acompValor": 0,
        "aPagar": 81840,
        "tarifaBase": 72600
      },
      "cliente": {
        "kmAdicional": 12000,
        "acompValor": 0,
        "tarifaBase": 95000,
        "aCobrar": 107000
      }
    },
    "estado": {
      "facChofer": false,
      "cerrada": false,
      "facturada": true,
      "facCliente": false,
      "abierta": false
    }
  },
  {
    "id": "aFFd2tQjp4tZvT9LSPX9",
    "patenteChofer": "OPB248",
    "tarifaTipo": {
      "eventual": false,
      "personalizada": false,
      "general": true,
      "especial": false
    },
    "hojaRuta": "",
    "tarifaPersonalizada": {
      "aPagar": 0,
      "aCobrar": 0,
      "seccion": 0,
      "nombre": "",
      "categoria": 0
    },
    "valores": {
      "cliente": {
        "kmAdicional": 16000,
        "acompValor": 0,
        "tarifaBase": 95000,
        "aCobrar": 111000
      },
      "chofer": {
        "aPagar": 84920,
        "kmAdicional": 12320,
        "acompValor": 0,
        "tarifaBase": 72600
      }
    },
    "multiplicadorCliente": 1,
    "facturaChofer": 1745954623342,
    "multiplicadorChofer": 1,
    "observaciones": "",
    "idOperacion": 1745929857269,
    "tarifaEventual": {
      "cliente": {
        "valor": 0,
        "concepto": ""
      },
      "chofer": {
        "valor": 0,
        "concepto": ""
      }
    },
    "cliente": {
      "idCliente": 1736356938304,
      "idTarifa": 1745279918277,
      "contactos": [
        {
          "nombre": "Juan",
          "apellido": "Paz",
          "telefono": "1126439403",
          "email": "juanpaz@andesmar.com.ar",
          "puesto": "Jefe Logistica"
        },
        {
          "telefono": "1133579699",
          "nombre": "Ramiro",
          "apellido": "Marchetti",
          "puesto": "Encargado de Logistica",
          "email": ""
        }
      ],
      "direccionFiscal": {
        "domicilio": "Rodriguez Peña 205",
        "localidad": "Luzuriaga",
        "municipio": "Maipú",
        "provincia": "Mendoza"
      },
      "type": "modified",
      "cuit": 30601502778,
      "razonSocial": "Andesmar Cargas SA",
      "condFiscal": "Responsable Inscripto - Factura A",
      "tarifaTipo": {
        "especial": false,
        "eventual": false,
        "personalizada": false,
        "general": true
      },
      "direccionOperativa": {
        "domicilio": "General Gorriti 650 - Avellaneda",
        "municipio": "Avellaneda",
        "provincia": "Buenos Aires",
        "localidad": "Avellaneda"
      },
      "id": "HPceY9retp6KCsNOPJia",
      "tarifaAsignada": true
    },
    "estado": {
      "facChofer": false,
      "facturada": true,
      "facCliente": false,
      "cerrada": false,
      "abierta": false
    },
    "km": 85,
    "facturaCliente": 1745954623342,
    "chofer": {
      "tarifaTipo": {
        "personalizada": false,
        "eventual": false,
        "general": true,
        "especial": false
      },
      "fechaNac": "2002-08-09",
      "celularEmergencia": "1139135361",
      "apellido": "Fernandez",
      "vehiculo": [
        {
          "dominio": "OPB248",
          "tipoCombustible": [
            "Nafta"
          ],
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "publicidad": false,
          "modelo": "Partner",
          "marca": "Peugeot",
          "satelital": "Stop Car",
          "tarjetaCombustible": false,
          "refrigeracion": null,
          "segSat": true
        }
      ],
      "idChofer": 1736728211494,
      "contactoEmergencia": "Maitena Rodríguez",
      "idTarifa": 1745280075582,
      "direccion": {
        "localidad": "Lanús Oeste",
        "domicilio": "R. de Escalada  de San Martin 1483",
        "provincia": "Buenos Aires",
        "municipio": "Lanús"
      },
      "cuit": 20443384900,
      "celularContacto": "1166620796",
      "idProveedor": 0,
      "id": "IYdOM7gOiBPrLRIukidg",
      "tarifaAsignada": true,
      "nombre": "Tomas Yamil",
      "email": "toma.f@hotmail.com",
      "condFiscal": "Monotributista - Factura C",
      "type": "modified"
    },
    "documentacion": null,
    "acompaniante": false,
    "fecha": "2025-04-28"
  },
  {
    "id": "7lnfo3I6S5pYfDly6FA2",
    "tarifaPersonalizada": {
      "categoria": 0,
      "aPagar": 0,
      "seccion": 0,
      "aCobrar": 0,
      "nombre": ""
    },
    "tarifaEventual": {
      "cliente": {
        "concepto": "",
        "valor": 0
      },
      "chofer": {
        "concepto": "",
        "valor": 0
      }
    },
    "km": 0,
    "facturaChofer": 1746211184349,
    "patenteChofer": "HPP453",
    "tarifaTipo": {
      "general": true,
      "eventual": false,
      "especial": false,
      "personalizada": false
    },
    "observaciones": "",
    "hojaRuta": "",
    "valores": {
      "cliente": {
        "kmAdicional": 0,
        "aCobrar": 175000,
        "tarifaBase": 175000,
        "acompValor": 0
      },
      "chofer": {
        "kmAdicional": 0,
        "aPagar": 126500,
        "acompValor": 0,
        "tarifaBase": 126500
      }
    },
    "fecha": "2025-04-28",
    "documentacion": null,
    "multiplicadorChofer": 1,
    "estado": {
      "cerrada": false,
      "facturada": true,
      "abierta": false,
      "facChofer": false,
      "facCliente": false
    },
    "chofer": {
      "vehiculo": [
        {
          "satelital": "Stop Car",
          "refrigeracion": null,
          "tarjetaCombustible": true,
          "categoria": {
            "nombre": "Maxi",
            "catOrden": 2
          },
          "tipoCombustible": [
            "nafta"
          ],
          "publicidad": false,
          "segSat": true,
          "marca": "Volkswagen",
          "dominio": "HPP453",
          "modelo": "Transporter"
        }
      ],
      " condFiscal": "",
      "celularEmergencia": "",
      "contactoEmergencia": "",
      "idChofer": 1736730226989,
      "tarifaAsignada": true,
      "celularContacto": "1130719809",
      "idTarifa": 1745280075582,
      "apellido": "Quiroga",
      "type": "modified",
      "fechaNac": "1994-02-01",
      "email": "actualizar@gmail.com",
      "cuit": 20380305381,
      "direccion": {
        "domicilio": "Juncal 777 - Lanus",
        "provincia": "",
        "localidad": "",
        " municipio": ""
      },
      "tarifaTipo": {
        "eventual": false,
        "personalizada": false,
        "general": true,
        "especial": false
      },
      "idProveedor": 0,
      "nombre": "Ariel Omar",
      "id": "75TLs99t6qSNTuHessGQ"
    },
    "acompaniante": false,
    "facturaCliente": 1746211184349,
    "multiplicadorCliente": 1,
    "idOperacion": 1745929857271,
    "cliente": {
      "direccionOperativa": {
        "domicilio": "General Gorriti 650 - Avellaneda",
        "municipio": "Avellaneda",
        "provincia": "Buenos Aires",
        "localidad": "Avellaneda"
      },
      "razonSocial": "Andesmar Cargas SA",
      "idCliente": 1736356938304,
      "tarifaAsignada": true,
      "contactos": [
        {
          "apellido": "Paz",
          "telefono": "1126439403",
          "email": "juanpaz@andesmar.com.ar",
          "puesto": "Jefe Logistica",
          "nombre": "Juan"
        },
        {
          "apellido": "Marchetti",
          "email": "",
          "nombre": "Ramiro",
          "telefono": "1133579699",
          "puesto": "Encargado de Logistica"
        }
      ],
      "cuit": 30601502778,
      "tarifaTipo": {
        "especial": false,
        "personalizada": false,
        "general": true,
        "eventual": false
      },
      "type": "modified",
      "condFiscal": "Responsable Inscripto - Factura A",
      "idTarifa": 1745279918277,
      "direccionFiscal": {
        "localidad": "Luzuriaga",
        "domicilio": "Rodriguez Peña 205",
        "provincia": "Mendoza",
        "municipio": "Maipú"
      },
      "id": "HPceY9retp6KCsNOPJia"
    }
  },
  {
    "id": "lEDPfoDjhdUC7WM92Fj9",
    "chofer": {
      "celularContacto": "1151465696",
      "cuit": 20235231531,
      "type": "modified",
      "idChofer": 1736791944623,
      "vehiculo": [
        {
          "tipoCombustible": [
            "Nafta"
          ],
          "satelital": "Stop Car",
          "refrigeracion": null,
          "modelo": "Fiorino",
          "publicidad": false,
          "tarjetaCombustible": true,
          "marca": "Fiat",
          "segSat": true,
          "dominio": "LCP568",
          "categoria": {
            "nombre": "Mini",
            "catOrden": 1
          }
        }
      ],
      "idTarifa": 1745280075582,
      "direccion": {
        "localidad": "Valentín Alsina",
        "domicilio": "Tuyuti 3003",
        "provincia": "Buenos Aires",
        "municipio": "Lanús"
      },
      "tarifaAsignada": true,
      "contactoEmergencia": "Mariana Podokian",
      "id": "rsFavZLKXlrRMuilBzCS",
      "email": "adrianvenegas7573@gmail.com",
      "condFiscal": "Monotributista - Factura C",
      "tarifaTipo": {
        "especial": false,
        "personalizada": false,
        "general": true,
        "eventual": false
      },
      "idProveedor": 0,
      "nombre": "Adrian Ernesto",
      "apellido": "Venegas",
      "celularEmergencia": "1139103989",
      "fechaNac": "1973-09-10"
    },
    "observaciones": "",
    "patenteChofer": "LCP568",
    "idOperacion": 1745849735767,
    "estado": {
      "facChofer": false,
      "facCliente": false,
      "cerrada": false,
      "abierta": false,
      "facturada": true
    },
    "documentacion": null,
    "tarifaEventual": {
      "chofer": {
        "valor": 0,
        "concepto": ""
      },
      "cliente": {
        "valor": 0,
        "concepto": ""
      }
    },
    "acompaniante": false,
    "facturaCliente": 1745888213940,
    "hojaRuta": "",
    "valores": {
      "chofer": {
        "acompValor": 0,
        "tarifaBase": 72600,
        "aPagar": 72600,
        "kmAdicional": 0
      },
      "cliente": {
        "kmAdicional": 0,
        "acompValor": 0,
        "aCobrar": 95000,
        "tarifaBase": 95000
      }
    },
    "fecha": "2025-04-25",
    "km": 42,
    "multiplicadorCliente": 1,
    "tarifaTipo": {
      "general": true,
      "personalizada": false,
      "especial": false,
      "eventual": false
    },
    "facturaChofer": 1745888213940,
    "multiplicadorChofer": 1,
    "tarifaPersonalizada": {
      "categoria": 0,
      "aPagar": 0,
      "aCobrar": 0,
      "seccion": 0,
      "nombre": ""
    },
    "cliente": {
      "tarifaAsignada": true,
      "cuit": 30601502778,
      "type": "modified",
      "idCliente": 1736356938304,
      "direccionFiscal": {
        "provincia": "Mendoza",
        "domicilio": "Rodriguez Peña 205",
        "localidad": "Luzuriaga",
        "municipio": "Maipú"
      },
      "direccionOperativa": {
        "municipio": "Avellaneda",
        "provincia": "Buenos Aires",
        "localidad": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda"
      },
      "condFiscal": "Responsable Inscripto - Factura A",
      "tarifaTipo": {
        "especial": false,
        "personalizada": false,
        "general": true,
        "eventual": false
      },
      "razonSocial": "Andesmar Cargas SA",
      "idTarifa": 1745279918277,
      "contactos": [
        {
          "apellido": "Paz",
          "email": "juanpaz@andesmar.com.ar",
          "puesto": "Jefe Logistica",
          "telefono": "1126439403",
          "nombre": "Juan"
        },
        {
          "nombre": "Ramiro",
          "apellido": "Marchetti",
          "email": "",
          "puesto": "Encargado de Logistica",
          "telefono": "1133579699"
        }
      ],
      "id": "HPceY9retp6KCsNOPJia"
    }
  },
  {
    "id": "f0IkU7LYa8QAYb82WNGc",
    "estado": {
      "facturada": true,
      "facCliente": false,
      "cerrada": false,
      "facChofer": false,
      "abierta": false
    },
    "multiplicadorChofer": 1,
    "fecha": "2025-04-25",
    "valores": {
      "chofer": {
        "aPagar": 100320,
        "acompValor": 0,
        "kmAdicional": 27720,
        "tarifaBase": 72600
      },
      "cliente": {
        "acompValor": 0,
        "tarifaBase": 95000,
        "aCobrar": 131000,
        "kmAdicional": 36000
      }
    },
    "km": 132,
    "tarifaEventual": {
      "cliente": {
        "valor": 0,
        "concepto": ""
      },
      "chofer": {
        "valor": 0,
        "concepto": ""
      }
    },
    "patenteChofer": "OPB248",
    "documentacion": null,
    "facturaCliente": 1745887009204,
    "cliente": {
      "condFiscal": "Responsable Inscripto - Factura A",
      "type": "modified",
      "direccionFiscal": {
        "localidad": "Luzuriaga",
        "municipio": "Maipú",
        "domicilio": "Rodriguez Peña 205",
        "provincia": "Mendoza"
      },
      "tarifaAsignada": true,
      "idCliente": 1736356938304,
      "cuit": 30601502778,
      "id": "HPceY9retp6KCsNOPJia",
      "contactos": [
        {
          "apellido": "Paz",
          "nombre": "Juan",
          "puesto": "Jefe Logistica",
          "telefono": "1126439403",
          "email": "juanpaz@andesmar.com.ar"
        },
        {
          "puesto": "Encargado de Logistica",
          "email": "",
          "telefono": "1133579699",
          "nombre": "Ramiro",
          "apellido": "Marchetti"
        }
      ],
      "razonSocial": "Andesmar Cargas SA",
      "idTarifa": 1745279918277,
      "tarifaTipo": {
        "eventual": false,
        "especial": false,
        "personalizada": false,
        "general": true
      },
      "direccionOperativa": {
        "localidad": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "municipio": "Avellaneda",
        "provincia": "Buenos Aires"
      }
    },
    "hojaRuta": "",
    "multiplicadorCliente": 1,
    "acompaniante": false,
    "chofer": {
      "direccion": {
        "domicilio": "R. de Escalada  de San Martin 1483",
        "localidad": "Lanús Oeste",
        "municipio": "Lanús",
        "provincia": "Buenos Aires"
      },
      "contactoEmergencia": "Maitena Rodríguez",
      "celularEmergencia": "1139135361",
      "idTarifa": 1745280075582,
      "type": "modified",
      "nombre": "Tomas Yamil",
      "tarifaAsignada": true,
      "id": "IYdOM7gOiBPrLRIukidg",
      "cuit": 20443384900,
      "celularContacto": "1166620796",
      "tarifaTipo": {
        "general": true,
        "especial": false,
        "eventual": false,
        "personalizada": false
      },
      "apellido": "Fernandez",
      "idProveedor": 0,
      "vehiculo": [
        {
          "satelital": "Stop Car",
          "segSat": true,
          "tipoCombustible": [
            "Nafta"
          ],
          "tarjetaCombustible": false,
          "modelo": "Partner",
          "publicidad": false,
          "marca": "Peugeot",
          "categoria": {
            "nombre": "Mini",
            "catOrden": 1
          },
          "refrigeracion": null,
          "dominio": "OPB248"
        }
      ],
      "email": "toma.f@hotmail.com",
      "fechaNac": "2002-08-09",
      "condFiscal": "Monotributista - Factura C",
      "idChofer": 1736728211494
    },
    "observaciones": "",
    "idOperacion": 1745849735763,
    "tarifaTipo": {
      "eventual": false,
      "especial": false,
      "personalizada": false,
      "general": true
    },
    "facturaChofer": 1745887009204,
    "tarifaPersonalizada": {
      "seccion": 0,
      "aCobrar": 0,
      "categoria": 0,
      "aPagar": 0,
      "nombre": ""
    }
  },
  {
    "id": "PlAcI1wJoESKFWMAiJJZ",
    "facturaCliente": 1746211163651,
    "acompaniante": false,
    "facturaChofer": 1746211163651,
    "chofer": {
      "celularContacto": "1130719809",
      "email": "actualizar@gmail.com",
      "type": "modified",
      "tarifaAsignada": true,
      "apellido": "Quiroga",
      "id": "75TLs99t6qSNTuHessGQ",
      " condFiscal": "",
      "idTarifa": 1745280075582,
      "idChofer": 1736730226989,
      "cuit": 20380305381,
      "idProveedor": 0,
      "tarifaTipo": {
        "general": true,
        "eventual": false,
        "personalizada": false,
        "especial": false
      },
      "fechaNac": "1994-02-01",
      "celularEmergencia": "",
      "direccion": {
        " municipio": "",
        "provincia": "",
        "domicilio": "Juncal 777 - Lanus",
        "localidad": ""
      },
      "nombre": "Ariel Omar",
      "vehiculo": [
        {
          "dominio": "HPP453",
          "modelo": "Transporter",
          "satelital": "Stop Car",
          "categoria": {
            "catOrden": 2,
            "nombre": "Maxi"
          },
          "refrigeracion": null,
          "publicidad": false,
          "marca": "Volkswagen",
          "tipoCombustible": [
            "nafta"
          ],
          "segSat": true,
          "tarjetaCombustible": true
        }
      ],
      "contactoEmergencia": ""
    },
    "idOperacion": 1745849735765,
    "km": 194,
    "cliente": {
      "contactos": [
        {
          "telefono": "1126439403",
          "apellido": "Paz",
          "puesto": "Jefe Logistica",
          "nombre": "Juan",
          "email": "juanpaz@andesmar.com.ar"
        },
        {
          "email": "",
          "telefono": "1133579699",
          "apellido": "Marchetti",
          "puesto": "Encargado de Logistica",
          "nombre": "Ramiro"
        }
      ],
      "idTarifa": 1745279918277,
      "id": "HPceY9retp6KCsNOPJia",
      "direccionOperativa": {
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "localidad": "Avellaneda"
      },
      "tarifaAsignada": true,
      "direccionFiscal": {
        "localidad": "Luzuriaga",
        "domicilio": "Rodriguez Peña 205",
        "provincia": "Mendoza",
        "municipio": "Maipú"
      },
      "condFiscal": "Responsable Inscripto - Factura A",
      "tarifaTipo": {
        "personalizada": false,
        "general": true,
        "especial": false,
        "eventual": false
      },
      "razonSocial": "Andesmar Cargas SA",
      "cuit": 30601502778,
      "idCliente": 1736356938304,
      "type": "modified"
    },
    "multiplicadorCliente": 1,
    "fecha": "2025-04-25",
    "tarifaTipo": {
      "eventual": false,
      "general": true,
      "especial": false,
      "personalizada": false
    },
    "estado": {
      "facCliente": false,
      "facturada": true,
      "facChofer": false,
      "cerrada": false,
      "abierta": false
    },
    "documentacion": null,
    "tarifaPersonalizada": {
      "categoria": 0,
      "aPagar": 0,
      "seccion": 0,
      "aCobrar": 0,
      "nombre": ""
    },
    "tarifaEventual": {
      "chofer": {
        "concepto": "",
        "valor": 0
      },
      "cliente": {
        "concepto": "",
        "valor": 0
      }
    },
    "hojaRuta": "",
    "observaciones": "",
    "valores": {
      "cliente": {
        "kmAdicional": 75000,
        "acompValor": 0,
        "tarifaBase": 175000,
        "aCobrar": 250000
      },
      "chofer": {
        "acompValor": 0,
        "aPagar": 180950,
        "kmAdicional": 54450,
        "tarifaBase": 126500
      }
    },
    "patenteChofer": "HPP453",
    "multiplicadorChofer": 1
  },
  {
    "id": "Hmd9JWzhH7Y71W4EefY6",
    "fecha": "2025-04-25",
    "documentacion": null,
    "km": 110,
    "idOperacion": 1745849735766,
    "tarifaPersonalizada": {
      "aCobrar": 0,
      "seccion": 0,
      "categoria": 0,
      "nombre": "",
      "aPagar": 0
    },
    "acompaniante": false,
    "chofer": {
      "direccion": {
        "domicilio": "Pasaje Cerviño 312",
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda",
        "localidad": "Sarandí"
      },
      "nombre": "Christian Nicolas",
      "idTarifa": 1745280075582,
      "idProveedor": 0,
      "id": "vIsDMqhm9hag6LXDt28I",
      "tarifaAsignada": true,
      "apellido": "Soto",
      "cuit": 20410488392,
      "tarifaTipo": {
        "general": true,
        "personalizada": false,
        "especial": false,
        "eventual": false
      },
      "fechaNac": "1998-03-13",
      "idChofer": 1736792086528,
      "celularContacto": "1153499040",
      "type": "modified",
      "condFiscal": "Monotributista - Factura C",
      "email": "cristiannicolassoto1303@gmail.com",
      "vehiculo": [
        {
          "segSat": true,
          "tarjetaCombustible": false,
          "tipoCombustible": [
            "Nafta"
          ],
          "modelo": "Fiorino",
          "satelital": "Stop Car",
          "marca": "Fiat",
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "refrigeracion": null,
          "dominio": "AD071GH",
          "publicidad": false
        }
      ],
      "contactoEmergencia": "Lorena Soto",
      "celularEmergencia": "1123711081"
    },
    "estado": {
      "abierta": false,
      "facCliente": false,
      "facChofer": false,
      "facturada": true,
      "cerrada": false
    },
    "multiplicadorCliente": 1,
    "facturaCliente": 1745888495370,
    "patenteChofer": "AD071GH",
    "tarifaTipo": {
      "eventual": false,
      "especial": false,
      "personalizada": false,
      "general": true
    },
    "multiplicadorChofer": 1,
    "hojaRuta": "",
    "cliente": {
      "cuit": 30601502778,
      "contactos": [
        {
          "nombre": "Juan",
          "email": "juanpaz@andesmar.com.ar",
          "apellido": "Paz",
          "puesto": "Jefe Logistica",
          "telefono": "1126439403"
        },
        {
          "telefono": "1133579699",
          "apellido": "Marchetti",
          "email": "",
          "nombre": "Ramiro",
          "puesto": "Encargado de Logistica"
        }
      ],
      "idCliente": 1736356938304,
      "tarifaAsignada": true,
      "condFiscal": "Responsable Inscripto - Factura A",
      "direccionFiscal": {
        "provincia": "Mendoza",
        "localidad": "Luzuriaga",
        "domicilio": "Rodriguez Peña 205",
        "municipio": "Maipú"
      },
      "type": "modified",
      "tarifaTipo": {
        "personalizada": false,
        "eventual": false,
        "general": true,
        "especial": false
      },
      "razonSocial": "Andesmar Cargas SA",
      "idTarifa": 1745279918277,
      "id": "HPceY9retp6KCsNOPJia",
      "direccionOperativa": {
        "municipio": "Avellaneda",
        "localidad": "Avellaneda",
        "provincia": "Buenos Aires",
        "domicilio": "General Gorriti 650 - Avellaneda"
      }
    },
    "tarifaEventual": {
      "chofer": {
        "valor": 0,
        "concepto": ""
      },
      "cliente": {
        "concepto": "",
        "valor": 0
      }
    },
    "observaciones": "",
    "valores": {
      "cliente": {
        "aCobrar": 119000,
        "acompValor": 0,
        "tarifaBase": 95000,
        "kmAdicional": 24000
      },
      "chofer": {
        "kmAdicional": 18480,
        "aPagar": 91080,
        "tarifaBase": 72600,
        "acompValor": 0
      }
    },
    "facturaChofer": 1745888495370
  },
  {
    "id": "3QjAHdc7jZE9dKm4Zhtw",
    "acompaniante": false,
    "multiplicadorChofer": 1,
    "estado": {
      "abierta": false,
      "facCliente": false,
      "facChofer": false,
      "cerrada": false,
      "facturada": true
    },
    "tarifaEventual": {
      "cliente": {
        "valor": 0,
        "concepto": ""
      },
      "chofer": {
        "concepto": "",
        "valor": 0
      }
    },
    "tarifaTipo": {
      "especial": false,
      "personalizada": false,
      "general": true,
      "eventual": false
    },
    "valores": {
      "cliente": {
        "tarifaBase": 95000,
        "kmAdicional": 40000,
        "acompValor": 0,
        "aCobrar": 135000
      },
      "chofer": {
        "kmAdicional": 30800,
        "aPagar": 103400,
        "acompValor": 0,
        "tarifaBase": 72600
      }
    },
    "facturaCliente": 1745887240278,
    "km": 142,
    "observaciones": "",
    "documentacion": null,
    "cliente": {
      "type": "modified",
      "direccionOperativa": {
        "domicilio": "General Gorriti 650 - Avellaneda",
        "provincia": "Buenos Aires",
        "localidad": "Avellaneda",
        "municipio": "Avellaneda"
      },
      "tarifaAsignada": true,
      "tarifaTipo": {
        "general": true,
        "eventual": false,
        "personalizada": false,
        "especial": false
      },
      "idTarifa": 1745279918277,
      "contactos": [
        {
          "nombre": "Juan",
          "puesto": "Jefe Logistica",
          "apellido": "Paz",
          "telefono": "1126439403",
          "email": "juanpaz@andesmar.com.ar"
        },
        {
          "telefono": "1133579699",
          "nombre": "Ramiro",
          "email": "",
          "apellido": "Marchetti",
          "puesto": "Encargado de Logistica"
        }
      ],
      "idCliente": 1736356938304,
      "condFiscal": "Responsable Inscripto - Factura A",
      "cuit": 30601502778,
      "direccionFiscal": {
        "municipio": "Maipú",
        "provincia": "Mendoza",
        "domicilio": "Rodriguez Peña 205",
        "localidad": "Luzuriaga"
      },
      "id": "HPceY9retp6KCsNOPJia",
      "razonSocial": "Andesmar Cargas SA"
    },
    "patenteChofer": "LUC928",
    "multiplicadorCliente": 1,
    "idOperacion": 1745849735764,
    "fecha": "2025-04-25",
    "hojaRuta": "",
    "chofer": {
      "email": "fndzmatias@gmail.com",
      "type": "modified",
      "tarifaAsignada": true,
      "condFiscal": "Monotributista - Factura C",
      "apellido": "Fernandez",
      "direccion": {
        "municipio": "Lanús",
        "localidad": "Lanús Oeste",
        "provincia": "Buenos Aires",
        "domicilio": "Pje Rosa Acevedo 1049"
      },
      "idTarifa": 1745280075582,
      "cuit": 20389286750,
      "contactoEmergencia": "Stella",
      "id": "jhjDx7Yh3lf56iAFBWWp",
      "fechaNac": "1996-03-07",
      "vehiculo": [
        {
          "segSat": true,
          "dominio": "LUC928",
          "marca": "Peugeot",
          "satelital": "Stop Car",
          "tarjetaCombustible": false,
          "categoria": {
            "nombre": "Mini",
            "catOrden": 1
          },
          "refrigeracion": null,
          "modelo": "Partner",
          "tipoCombustible": [
            "Nafta"
          ],
          "publicidad": false
        }
      ],
      "tarifaTipo": {
        "especial": false,
        "eventual": false,
        "personalizada": false,
        "general": true
      },
      "idProveedor": 0,
      "nombre": "Matias Alberto",
      "celularEmergencia": "1161671994",
      "idChofer": 1736727991651,
      "celularContacto": "1133652485"
    },
    "tarifaPersonalizada": {
      "seccion": 0,
      "nombre": "",
      "aPagar": 0,
      "categoria": 0,
      "aCobrar": 0
    },
    "facturaChofer": 1745887240278
  },
  {
    "id": "z9vtqqlkqbPF4FqCgiIy",
    "estado": {
      "abierta": false,
      "facCliente": false,
      "facChofer": false,
      "facturada": true,
      "cerrada": false
    },
    "patenteChofer": "OPB248",
    "observaciones": "",
    "acompaniante": false,
    "cliente": {
      "contactos": [
        {
          "nombre": "Juan",
          "apellido": "Paz",
          "telefono": "1126439403",
          "email": "juanpaz@andesmar.com.ar",
          "puesto": "Jefe Logistica"
        },
        {
          "email": "",
          "apellido": "Marchetti",
          "nombre": "Ramiro",
          "telefono": "1133579699",
          "puesto": "Encargado de Logistica"
        }
      ],
      "direccionOperativa": {
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda",
        "localidad": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda"
      },
      "id": "HPceY9retp6KCsNOPJia",
      "tarifaTipo": {
        "eventual": false,
        "personalizada": false,
        "general": true,
        "especial": false
      },
      "direccionFiscal": {
        "provincia": "Mendoza",
        "municipio": "Maipú",
        "localidad": "Luzuriaga",
        "domicilio": "Rodriguez Peña 205"
      },
      "idTarifa": 1745279918277,
      "razonSocial": "Andesmar Cargas SA",
      "type": "modified",
      "idCliente": 1736356938304,
      "condFiscal": "Responsable Inscripto - Factura A",
      "cuit": 30601502778,
      "tarifaAsignada": true
    },
    "facturaCliente": 1745887019272,
    "fecha": "2025-04-24",
    "km": 77,
    "tarifaPersonalizada": {
      "aPagar": 0,
      "categoria": 0,
      "seccion": 0,
      "aCobrar": 0,
      "nombre": ""
    },
    "facturaChofer": 1745887019272,
    "tarifaEventual": {
      "cliente": {
        "concepto": "",
        "valor": 0
      },
      "chofer": {
        "valor": 0,
        "concepto": ""
      }
    },
    "idOperacion": 1745588342971,
    "chofer": {
      "type": "modified",
      "apellido": "Fernandez",
      "idChofer": 1736728211494,
      "tarifaTipo": {
        "especial": false,
        "general": true,
        "personalizada": false,
        "eventual": false
      },
      "email": "toma.f@hotmail.com",
      "cuit": 20443384900,
      "condFiscal": "Monotributista - Factura C",
      "idTarifa": 1745280075582,
      "nombre": "Tomas Yamil",
      "id": "IYdOM7gOiBPrLRIukidg",
      "idProveedor": 0,
      "vehiculo": [
        {
          "marca": "Peugeot",
          "dominio": "OPB248",
          "segSat": true,
          "tarjetaCombustible": false,
          "tipoCombustible": [
            "Nafta"
          ],
          "publicidad": false,
          "refrigeracion": null,
          "modelo": "Partner",
          "satelital": "Stop Car",
          "categoria": {
            "nombre": "Mini",
            "catOrden": 1
          }
        }
      ],
      "fechaNac": "2002-08-09",
      "celularContacto": "1166620796",
      "contactoEmergencia": "Maitena Rodríguez",
      "celularEmergencia": "1139135361",
      "tarifaAsignada": true,
      "direccion": {
        "municipio": "Lanús",
        "domicilio": "R. de Escalada  de San Martin 1483",
        "provincia": "Buenos Aires",
        "localidad": "Lanús Oeste"
      }
    },
    "valores": {
      "cliente": {
        "aCobrar": 107000,
        "kmAdicional": 12000,
        "tarifaBase": 95000,
        "acompValor": 0
      },
      "chofer": {
        "kmAdicional": 9240,
        "tarifaBase": 72600,
        "aPagar": 81840,
        "acompValor": 0
      }
    },
    "hojaRuta": "",
    "tarifaTipo": {
      "general": true,
      "personalizada": false,
      "especial": false,
      "eventual": false
    },
    "multiplicadorCliente": 1,
    "multiplicadorChofer": 1,
    "documentacion": null
  },
  {
    "id": "r4oqD1Yz0J4biNIOsyau",
    "valores": {
      "chofer": {
        "tarifaBase": 72600,
        "kmAdicional": 49280,
        "aPagar": 121880,
        "acompValor": 0
      },
      "cliente": {
        "kmAdicional": 64000,
        "aCobrar": 159000,
        "acompValor": 0,
        "tarifaBase": 95000
      }
    },
    "multiplicadorCliente": 1,
    "tarifaTipo": {
      "personalizada": false,
      "especial": false,
      "eventual": false,
      "general": true
    },
    "patenteChofer": "AD071GH",
    "fecha": "2025-04-24",
    "tarifaPersonalizada": {
      "nombre": "",
      "categoria": 0,
      "seccion": 0,
      "aCobrar": 0,
      "aPagar": 0
    },
    "idOperacion": 1745588342974,
    "hojaRuta": "",
    "cliente": {
      "tarifaTipo": {
        "eventual": false,
        "especial": false,
        "personalizada": false,
        "general": true
      },
      "cuit": 30601502778,
      "tarifaAsignada": true,
      "contactos": [
        {
          "apellido": "Paz",
          "email": "juanpaz@andesmar.com.ar",
          "nombre": "Juan",
          "puesto": "Jefe Logistica",
          "telefono": "1126439403"
        },
        {
          "telefono": "1133579699",
          "email": "",
          "apellido": "Marchetti",
          "nombre": "Ramiro",
          "puesto": "Encargado de Logistica"
        }
      ],
      "type": "modified",
      "idCliente": 1736356938304,
      "id": "HPceY9retp6KCsNOPJia",
      "condFiscal": "Responsable Inscripto - Factura A",
      "direccionOperativa": {
        "municipio": "Avellaneda",
        "provincia": "Buenos Aires",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "localidad": "Avellaneda"
      },
      "direccionFiscal": {
        "municipio": "Maipú",
        "provincia": "Mendoza",
        "domicilio": "Rodriguez Peña 205",
        "localidad": "Luzuriaga"
      },
      "idTarifa": 1745279918277,
      "razonSocial": "Andesmar Cargas SA"
    },
    "multiplicadorChofer": 1,
    "tarifaEventual": {
      "chofer": {
        "concepto": "",
        "valor": 0
      },
      "cliente": {
        "valor": 0,
        "concepto": ""
      }
    },
    "facturaCliente": 1745888503055,
    "km": 204,
    "acompaniante": false,
    "observaciones": "",
    "facturaChofer": 1745888503055,
    "documentacion": null,
    "estado": {
      "cerrada": false,
      "facCliente": false,
      "abierta": false,
      "facChofer": false,
      "facturada": true
    },
    "chofer": {
      "cuit": 20410488392,
      "fechaNac": "1998-03-13",
      "idChofer": 1736792086528,
      "tarifaAsignada": true,
      "id": "vIsDMqhm9hag6LXDt28I",
      "vehiculo": [
        {
          "segSat": true,
          "tarjetaCombustible": false,
          "refrigeracion": null,
          "tipoCombustible": [
            "Nafta"
          ],
          "modelo": "Fiorino",
          "dominio": "AD071GH",
          "publicidad": false,
          "satelital": "Stop Car",
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "marca": "Fiat"
        }
      ],
      "celularEmergencia": "1123711081",
      "celularContacto": "1153499040",
      "condFiscal": "Monotributista - Factura C",
      "type": "modified",
      "email": "cristiannicolassoto1303@gmail.com",
      "contactoEmergencia": "Lorena Soto",
      "idTarifa": 1745280075582,
      "nombre": "Christian Nicolas",
      "tarifaTipo": {
        "personalizada": false,
        "eventual": false,
        "general": true,
        "especial": false
      },
      "apellido": "Soto",
      "direccion": {
        "municipio": "Avellaneda",
        "provincia": "Buenos Aires",
        "domicilio": "Pasaje Cerviño 312",
        "localidad": "Sarandí"
      },
      "idProveedor": 0
    }
  },
  {
    "id": "eZr17dl5Jg7nRj5Peix7",
    "facturaCliente": 1745887248786,
    "acompaniante": false,
    "facturaChofer": 1745887248786,
    "patenteChofer": "LUC928",
    "fecha": "2025-04-24",
    "observaciones": "",
    "cliente": {
      "direccionFiscal": {
        "municipio": "Maipú",
        "domicilio": "Rodriguez Peña 205",
        "provincia": "Mendoza",
        "localidad": "Luzuriaga"
      },
      "contactos": [
        {
          "telefono": "1126439403",
          "puesto": "Jefe Logistica",
          "apellido": "Paz",
          "email": "juanpaz@andesmar.com.ar",
          "nombre": "Juan"
        },
        {
          "email": "",
          "apellido": "Marchetti",
          "puesto": "Encargado de Logistica",
          "telefono": "1133579699",
          "nombre": "Ramiro"
        }
      ],
      "tarifaAsignada": true,
      "id": "HPceY9retp6KCsNOPJia",
      "idTarifa": 1745279918277,
      "tarifaTipo": {
        "personalizada": false,
        "general": true,
        "especial": false,
        "eventual": false
      },
      "razonSocial": "Andesmar Cargas SA",
      "idCliente": 1736356938304,
      "cuit": 30601502778,
      "direccionOperativa": {
        "domicilio": "General Gorriti 650 - Avellaneda",
        "municipio": "Avellaneda",
        "provincia": "Buenos Aires",
        "localidad": "Avellaneda"
      },
      "type": "modified",
      "condFiscal": "Responsable Inscripto - Factura A"
    },
    "valores": {
      "cliente": {
        "acompValor": 0,
        "aCobrar": 103000,
        "kmAdicional": 8000,
        "tarifaBase": 95000
      },
      "chofer": {
        "tarifaBase": 72600,
        "aPagar": 78760,
        "acompValor": 0,
        "kmAdicional": 6160
      }
    },
    "chofer": {
      "email": "fndzmatias@gmail.com",
      "condFiscal": "Monotributista - Factura C",
      "celularEmergencia": "1161671994",
      "celularContacto": "1133652485",
      "direccion": {
        "domicilio": "Pje Rosa Acevedo 1049",
        "localidad": "Lanús Oeste",
        "municipio": "Lanús",
        "provincia": "Buenos Aires"
      },
      "nombre": "Matias Alberto",
      "id": "jhjDx7Yh3lf56iAFBWWp",
      "tarifaAsignada": true,
      "idTarifa": 1745280075582,
      "vehiculo": [
        {
          "dominio": "LUC928",
          "segSat": true,
          "tarjetaCombustible": false,
          "refrigeracion": null,
          "publicidad": false,
          "tipoCombustible": [
            "Nafta"
          ],
          "marca": "Peugeot",
          "modelo": "Partner",
          "satelital": "Stop Car",
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          }
        }
      ],
      "contactoEmergencia": "Stella",
      "type": "modified",
      "idProveedor": 0,
      "fechaNac": "1996-03-07",
      "apellido": "Fernandez",
      "tarifaTipo": {
        "general": true,
        "eventual": false,
        "especial": false,
        "personalizada": false
      },
      "idChofer": 1736727991651,
      "cuit": 20389286750
    },
    "multiplicadorCliente": 1,
    "tarifaPersonalizada": {
      "aPagar": 0,
      "seccion": 0,
      "categoria": 0,
      "nombre": "",
      "aCobrar": 0
    },
    "tarifaEventual": {
      "chofer": {
        "concepto": "",
        "valor": 0
      },
      "cliente": {
        "valor": 0,
        "concepto": ""
      }
    },
    "multiplicadorChofer": 1,
    "documentacion": null,
    "estado": {
      "facturada": true,
      "facCliente": false,
      "abierta": false,
      "cerrada": false,
      "facChofer": false
    },
    "tarifaTipo": {
      "eventual": false,
      "especial": false,
      "personalizada": false,
      "general": true
    },
    "hojaRuta": "",
    "idOperacion": 1745588342972,
    "km": 66
  },
  {
    "id": "XBdY4gyhOU01pcSkRC4X",
    "tarifaEventual": {
      "chofer": {
        "concepto": "",
        "valor": 0
      },
      "cliente": {
        "concepto": "",
        "valor": 0
      }
    },
    "observaciones": "",
    "estado": {
      "facCliente": false,
      "facChofer": false,
      "facturada": true,
      "cerrada": false,
      "abierta": false
    },
    "chofer": {
      "cuit": 20235231531,
      "idChofer": 1736791944623,
      "celularContacto": "1151465696",
      "type": "modified",
      "id": "rsFavZLKXlrRMuilBzCS",
      "email": "adrianvenegas7573@gmail.com",
      "apellido": "Venegas",
      "tarifaAsignada": true,
      "vehiculo": [
        {
          "satelital": "Stop Car",
          "tarjetaCombustible": true,
          "refrigeracion": null,
          "segSat": true,
          "tipoCombustible": [
            "Nafta"
          ],
          "publicidad": false,
          "dominio": "LCP568",
          "categoria": {
            "nombre": "Mini",
            "catOrden": 1
          },
          "modelo": "Fiorino",
          "marca": "Fiat"
        }
      ],
      "celularEmergencia": "1139103989",
      "contactoEmergencia": "Mariana Podokian",
      "condFiscal": "Monotributista - Factura C",
      "fechaNac": "1973-09-10",
      "idProveedor": 0,
      "direccion": {
        "provincia": "Buenos Aires",
        "localidad": "Valentín Alsina",
        "domicilio": "Tuyuti 3003",
        "municipio": "Lanús"
      },
      "tarifaTipo": {
        "personalizada": false,
        "especial": false,
        "eventual": false,
        "general": true
      },
      "nombre": "Adrian Ernesto",
      "idTarifa": 1745280075582
    },
    "hojaRuta": "",
    "fecha": "2025-04-24",
    "documentacion": null,
    "acompaniante": false,
    "cliente": {
      "tarifaAsignada": true,
      "razonSocial": "Andesmar Cargas SA",
      "idCliente": 1736356938304,
      "cuit": 30601502778,
      "type": "modified",
      "tarifaTipo": {
        "personalizada": false,
        "general": true,
        "especial": false,
        "eventual": false
      },
      "contactos": [
        {
          "nombre": "Juan",
          "email": "juanpaz@andesmar.com.ar",
          "apellido": "Paz",
          "puesto": "Jefe Logistica",
          "telefono": "1126439403"
        },
        {
          "nombre": "Ramiro",
          "email": "",
          "puesto": "Encargado de Logistica",
          "apellido": "Marchetti",
          "telefono": "1133579699"
        }
      ],
      "direccionOperativa": {
        "provincia": "Buenos Aires",
        "localidad": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "municipio": "Avellaneda"
      },
      "id": "HPceY9retp6KCsNOPJia",
      "condFiscal": "Responsable Inscripto - Factura A",
      "direccionFiscal": {
        "domicilio": "Rodriguez Peña 205",
        "localidad": "Luzuriaga",
        "provincia": "Mendoza",
        "municipio": "Maipú"
      },
      "idTarifa": 1745279918277
    },
    "patenteChofer": "LCP568",
    "km": 95,
    "multiplicadorCliente": 1,
    "facturaChofer": 1745888224801,
    "valores": {
      "chofer": {
        "tarifaBase": 72600,
        "aPagar": 88000,
        "kmAdicional": 15400,
        "acompValor": 0
      },
      "cliente": {
        "aCobrar": 115000,
        "tarifaBase": 95000,
        "kmAdicional": 20000,
        "acompValor": 0
      }
    },
    "facturaCliente": 1745888224801,
    "multiplicadorChofer": 1,
    "tarifaTipo": {
      "eventual": false,
      "personalizada": false,
      "general": true,
      "especial": false
    },
    "idOperacion": 1745588342975,
    "tarifaPersonalizada": {
      "categoria": 0,
      "aPagar": 0,
      "aCobrar": 0,
      "nombre": "",
      "seccion": 0
    }
  },
  {
    "id": "OFXFIVbiimOWW1UW9p4K",
    "patenteChofer": "HPP453",
    "idOperacion": 1745588342973,
    "km": 85,
    "tarifaEventual": {
      "chofer": {
        "valor": 0,
        "concepto": ""
      },
      "cliente": {
        "concepto": "",
        "valor": 0
      }
    },
    "acompaniante": false,
    "tarifaPersonalizada": {
      "categoria": 0,
      "seccion": 0,
      "nombre": "",
      "aPagar": 0,
      "aCobrar": 0
    },
    "facturaChofer": 1746211149817,
    "cliente": {
      "cuit": 30601502778,
      "tarifaTipo": {
        "eventual": false,
        "especial": false,
        "personalizada": false,
        "general": true
      },
      "tarifaAsignada": true,
      "idCliente": 1736356938304,
      "type": "modified",
      "idTarifa": 1745279918277,
      "razonSocial": "Andesmar Cargas SA",
      "direccionOperativa": {
        "municipio": "Avellaneda",
        "provincia": "Buenos Aires",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "localidad": "Avellaneda"
      },
      "direccionFiscal": {
        "provincia": "Mendoza",
        "domicilio": "Rodriguez Peña 205",
        "municipio": "Maipú",
        "localidad": "Luzuriaga"
      },
      "condFiscal": "Responsable Inscripto - Factura A",
      "id": "HPceY9retp6KCsNOPJia",
      "contactos": [
        {
          "email": "juanpaz@andesmar.com.ar",
          "nombre": "Juan",
          "telefono": "1126439403",
          "apellido": "Paz",
          "puesto": "Jefe Logistica"
        },
        {
          "apellido": "Marchetti",
          "email": "",
          "telefono": "1133579699",
          "nombre": "Ramiro",
          "puesto": "Encargado de Logistica"
        }
      ]
    },
    "chofer": {
      "tarifaAsignada": true,
      "vehiculo": [
        {
          "refrigeracion": null,
          "marca": "Volkswagen",
          "tarjetaCombustible": true,
          "segSat": true,
          "modelo": "Transporter",
          "satelital": "Stop Car",
          "dominio": "HPP453",
          "tipoCombustible": [
            "nafta"
          ],
          "categoria": {
            "catOrden": 2,
            "nombre": "Maxi"
          },
          "publicidad": false
        }
      ],
      "nombre": "Ariel Omar",
      "type": "modified",
      " condFiscal": "",
      "apellido": "Quiroga",
      "direccion": {
        "domicilio": "Juncal 777 - Lanus",
        "provincia": "",
        " municipio": "",
        "localidad": ""
      },
      "celularEmergencia": "",
      "idChofer": 1736730226989,
      "tarifaTipo": {
        "personalizada": false,
        "eventual": false,
        "especial": false,
        "general": true
      },
      "idTarifa": 1745280075582,
      "fechaNac": "1994-02-01",
      "id": "75TLs99t6qSNTuHessGQ",
      "celularContacto": "1130719809",
      "cuit": 20380305381,
      "email": "actualizar@gmail.com",
      "contactoEmergencia": "",
      "idProveedor": 0
    },
    "valores": {
      "chofer": {
        "kmAdicional": 14520,
        "tarifaBase": 126500,
        "aPagar": 141020,
        "acompValor": 0
      },
      "cliente": {
        "acompValor": 0,
        "kmAdicional": 20000,
        "tarifaBase": 175000,
        "aCobrar": 195000
      }
    },
    "facturaCliente": 1746211149817,
    "documentacion": null,
    "observaciones": "",
    "hojaRuta": "",
    "fecha": "2025-04-24",
    "estado": {
      "cerrada": false,
      "facChofer": false,
      "facCliente": false,
      "abierta": false,
      "facturada": true
    },
    "tarifaTipo": {
      "especial": false,
      "general": true,
      "personalizada": false,
      "eventual": false
    },
    "multiplicadorChofer": 1,
    "multiplicadorCliente": 1
  },
  {
    "id": "lgG0WO3GEVXxV59COVc8",
    "patenteChofer": "LUC928",
    "estado": {
      "facChofer": false,
      "facturada": true,
      "facCliente": false,
      "cerrada": false,
      "abierta": false
    },
    "facturaCliente": 1745887257774,
    "facturaChofer": 1745887257775,
    "km": 61,
    "multiplicadorChofer": 1,
    "hojaRuta": "",
    "multiplicadorCliente": 1,
    "fecha": "2025-04-23",
    "documentacion": null,
    "valores": {
      "chofer": {
        "acompValor": 0,
        "aPagar": 78760,
        "kmAdicional": 6160,
        "tarifaBase": 72600
      },
      "cliente": {
        "acompValor": 0,
        "kmAdicional": 8000,
        "tarifaBase": 95000,
        "aCobrar": 103000
      }
    },
    "chofer": {
      "tarifaAsignada": true,
      "celularEmergencia": "1161671994",
      "idChofer": 1736727991651,
      "tarifaTipo": {
        "personalizada": false,
        "eventual": false,
        "general": true,
        "especial": false
      },
      "idProveedor": 0,
      "apellido": "Fernandez",
      "nombre": "Matias Alberto",
      "id": "jhjDx7Yh3lf56iAFBWWp",
      "cuit": 20389286750,
      "direccion": {
        "municipio": "Lanús",
        "domicilio": "Pje Rosa Acevedo 1049",
        "provincia": "Buenos Aires",
        "localidad": "Lanús Oeste"
      },
      "vehiculo": [
        {
          "tipoCombustible": [
            "Nafta"
          ],
          "segSat": true,
          "tarjetaCombustible": false,
          "categoria": {
            "nombre": "Mini",
            "catOrden": 1
          },
          "publicidad": false,
          "satelital": "Stop Car",
          "modelo": "Partner",
          "refrigeracion": null,
          "dominio": "LUC928",
          "marca": "Peugeot"
        }
      ],
      "email": "fndzmatias@gmail.com",
      "contactoEmergencia": "Stella",
      "type": "modified",
      "celularContacto": "1133652485",
      "idTarifa": 1745280075582,
      "fechaNac": "1996-03-07",
      "condFiscal": "Monotributista - Factura C"
    },
    "tarifaEventual": {
      "cliente": {
        "concepto": "",
        "valor": 0
      },
      "chofer": {
        "concepto": "",
        "valor": 0
      }
    },
    "tarifaTipo": {
      "especial": false,
      "personalizada": false,
      "eventual": false,
      "general": true
    },
    "tarifaPersonalizada": {
      "categoria": 0,
      "aCobrar": 0,
      "nombre": "",
      "aPagar": 0,
      "seccion": 0
    },
    "acompaniante": false,
    "cliente": {
      "direccionOperativa": {
        "municipio": "Avellaneda",
        "provincia": "Buenos Aires",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "localidad": "Avellaneda"
      },
      "direccionFiscal": {
        "municipio": "Maipú",
        "provincia": "Mendoza",
        "domicilio": "Rodriguez Peña 205",
        "localidad": "Luzuriaga"
      },
      "razonSocial": "Andesmar Cargas SA",
      "id": "HPceY9retp6KCsNOPJia",
      "type": "modified",
      "idTarifa": 1745279918277,
      "tarifaTipo": {
        "especial": false,
        "eventual": false,
        "general": true,
        "personalizada": false
      },
      "idCliente": 1736356938304,
      "condFiscal": "Responsable Inscripto - Factura A",
      "tarifaAsignada": true,
      "contactos": [
        {
          "email": "juanpaz@andesmar.com.ar",
          "telefono": "1126439403",
          "nombre": "Juan",
          "apellido": "Paz",
          "puesto": "Jefe Logistica"
        },
        {
          "apellido": "Marchetti",
          "telefono": "1133579699",
          "email": "",
          "puesto": "Encargado de Logistica",
          "nombre": "Ramiro"
        }
      ],
      "cuit": 30601502778
    },
    "idOperacion": 1745580009234,
    "observaciones": ""
  },
  {
    "id": "ZODGx8YgdXt791ksP7JS",
    "estado": {
      "facCliente": false,
      "facChofer": false,
      "abierta": false,
      "cerrada": false,
      "facturada": true
    },
    "patenteChofer": "AD071GH",
    "hojaRuta": "",
    "fecha": "2025-04-23",
    "multiplicadorCliente": 1,
    "valores": {
      "cliente": {
        "aCobrar": 115000,
        "tarifaBase": 95000,
        "acompValor": 0,
        "kmAdicional": 20000
      },
      "chofer": {
        "aPagar": 88000,
        "kmAdicional": 15400,
        "acompValor": 0,
        "tarifaBase": 72600
      }
    },
    "tarifaPersonalizada": {
      "aCobrar": 0,
      "seccion": 0,
      "categoria": 0,
      "aPagar": 0,
      "nombre": ""
    },
    "tarifaEventual": {
      "cliente": {
        "valor": 0,
        "concepto": ""
      },
      "chofer": {
        "valor": 0,
        "concepto": ""
      }
    },
    "facturaChofer": 1745888517374,
    "multiplicadorChofer": 1,
    "chofer": {
      "fechaNac": "1998-03-13",
      "celularContacto": "1153499040",
      "idProveedor": 0,
      "idTarifa": 1745280075582,
      "tarifaTipo": {
        "eventual": false,
        "especial": false,
        "general": true,
        "personalizada": false
      },
      "id": "vIsDMqhm9hag6LXDt28I",
      "apellido": "Soto",
      "idChofer": 1736792086528,
      "vehiculo": [
        {
          "modelo": "Fiorino",
          "dominio": "AD071GH",
          "publicidad": false,
          "tipoCombustible": [
            "Nafta"
          ],
          "segSat": true,
          "marca": "Fiat",
          "tarjetaCombustible": false,
          "categoria": {
            "nombre": "Mini",
            "catOrden": 1
          },
          "satelital": "Stop Car",
          "refrigeracion": null
        }
      ],
      "email": "cristiannicolassoto1303@gmail.com",
      "contactoEmergencia": "Lorena Soto",
      "nombre": "Christian Nicolas",
      "tarifaAsignada": true,
      "celularEmergencia": "1123711081",
      "type": "modified",
      "cuit": 20410488392,
      "direccion": {
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda",
        "domicilio": "Pasaje Cerviño 312",
        "localidad": "Sarandí"
      },
      "condFiscal": "Monotributista - Factura C"
    },
    "acompaniante": false,
    "cliente": {
      "tarifaTipo": {
        "personalizada": false,
        "general": true,
        "especial": false,
        "eventual": false
      },
      "contactos": [
        {
          "email": "juanpaz@andesmar.com.ar",
          "nombre": "Juan",
          "telefono": "1126439403",
          "puesto": "Jefe Logistica",
          "apellido": "Paz"
        },
        {
          "email": "",
          "nombre": "Ramiro",
          "apellido": "Marchetti",
          "telefono": "1133579699",
          "puesto": "Encargado de Logistica"
        }
      ],
      "condFiscal": "Responsable Inscripto - Factura A",
      "type": "modified",
      "id": "HPceY9retp6KCsNOPJia",
      "cuit": 30601502778,
      "idCliente": 1736356938304,
      "direccionOperativa": {
        "localidad": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda"
      },
      "direccionFiscal": {
        "domicilio": "Rodriguez Peña 205",
        "localidad": "Luzuriaga",
        "municipio": "Maipú",
        "provincia": "Mendoza"
      },
      "idTarifa": 1745279918277,
      "razonSocial": "Andesmar Cargas SA",
      "tarifaAsignada": true
    },
    "documentacion": null,
    "km": 92,
    "idOperacion": 1745580009236,
    "facturaCliente": 1745888517374,
    "observaciones": "",
    "tarifaTipo": {
      "eventual": false,
      "personalizada": false,
      "general": true,
      "especial": false
    }
  },
  {
    "id": "OivldKc9RYfHstMgTLJh",
    "fecha": "2025-04-23",
    "idOperacion": 1745580009235,
    "estado": {
      "facturada": true,
      "cerrada": false,
      "abierta": false,
      "facCliente": false,
      "facChofer": false
    },
    "patenteChofer": "HPP453",
    "facturaChofer": 1746211135881,
    "multiplicadorChofer": 1,
    "valores": {
      "cliente": {
        "kmAdicional": 35000,
        "aCobrar": 210000,
        "acompValor": 0,
        "tarifaBase": 175000
      },
      "chofer": {
        "aPagar": 151910,
        "tarifaBase": 126500,
        "acompValor": 0,
        "kmAdicional": 25410
      }
    },
    "tarifaPersonalizada": {
      "aCobrar": 0,
      "seccion": 0,
      "aPagar": 0,
      "nombre": "",
      "categoria": 0
    },
    "acompaniante": false,
    "multiplicadorCliente": 1,
    "facturaCliente": 1746211135881,
    "chofer": {
      " condFiscal": "",
      "type": "modified",
      "cuit": 20380305381,
      "idProveedor": 0,
      "fechaNac": "1994-02-01",
      "contactoEmergencia": "",
      "idChofer": 1736730226989,
      "apellido": "Quiroga",
      "nombre": "Ariel Omar",
      "idTarifa": 1745280075582,
      "id": "75TLs99t6qSNTuHessGQ",
      "celularEmergencia": "",
      "vehiculo": [
        {
          "tarjetaCombustible": true,
          "marca": "Volkswagen",
          "dominio": "HPP453",
          "refrigeracion": null,
          "categoria": {
            "nombre": "Maxi",
            "catOrden": 2
          },
          "publicidad": false,
          "satelital": "Stop Car",
          "segSat": true,
          "tipoCombustible": [
            "nafta"
          ],
          "modelo": "Transporter"
        }
      ],
      "email": "actualizar@gmail.com",
      "tarifaTipo": {
        "especial": false,
        "eventual": false,
        "personalizada": false,
        "general": true
      },
      "celularContacto": "1130719809",
      "direccion": {
        " municipio": "",
        "domicilio": "Juncal 777 - Lanus",
        "provincia": "",
        "localidad": ""
      },
      "tarifaAsignada": true
    },
    "tarifaTipo": {
      "general": true,
      "personalizada": false,
      "eventual": false,
      "especial": false
    },
    "observaciones": "",
    "cliente": {
      "idTarifa": 1745279918277,
      "direccionFiscal": {
        "domicilio": "Rodriguez Peña 205",
        "localidad": "Luzuriaga",
        "provincia": "Mendoza",
        "municipio": "Maipú"
      },
      "condFiscal": "Responsable Inscripto - Factura A",
      "type": "modified",
      "razonSocial": "Andesmar Cargas SA",
      "tarifaAsignada": true,
      "contactos": [
        {
          "nombre": "Juan",
          "email": "juanpaz@andesmar.com.ar",
          "apellido": "Paz",
          "telefono": "1126439403",
          "puesto": "Jefe Logistica"
        },
        {
          "email": "",
          "telefono": "1133579699",
          "nombre": "Ramiro",
          "puesto": "Encargado de Logistica",
          "apellido": "Marchetti"
        }
      ],
      "id": "HPceY9retp6KCsNOPJia",
      "cuit": 30601502778,
      "tarifaTipo": {
        "eventual": false,
        "personalizada": false,
        "general": true,
        "especial": false
      },
      "idCliente": 1736356938304,
      "direccionOperativa": {
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "localidad": "Avellaneda"
      }
    },
    "documentacion": null,
    "km": 114,
    "hojaRuta": "",
    "tarifaEventual": {
      "cliente": {
        "valor": 0,
        "concepto": ""
      },
      "chofer": {
        "concepto": "",
        "valor": 0
      }
    }
  },
  {
    "id": "H6884dkOL67k8Hbe4Dtk",
    "cliente": {
      "tarifaAsignada": true,
      "contactos": [
        {
          "apellido": "Paz",
          "telefono": "1126439403",
          "nombre": "Juan",
          "email": "juanpaz@andesmar.com.ar",
          "puesto": "Jefe Logistica"
        },
        {
          "nombre": "Ramiro",
          "email": "",
          "puesto": "Encargado de Logistica",
          "telefono": "1133579699",
          "apellido": "Marchetti"
        }
      ],
      "cuit": 30601502778,
      "condFiscal": "Responsable Inscripto - Factura A",
      "direccionOperativa": {
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda",
        "localidad": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda"
      },
      "id": "HPceY9retp6KCsNOPJia",
      "idCliente": 1736356938304,
      "idTarifa": 1745279918277,
      "tarifaTipo": {
        "personalizada": false,
        "general": true,
        "especial": false,
        "eventual": false
      },
      "type": "modified",
      "direccionFiscal": {
        "municipio": "Maipú",
        "provincia": "Mendoza",
        "domicilio": "Rodriguez Peña 205",
        "localidad": "Luzuriaga"
      },
      "razonSocial": "Andesmar Cargas SA"
    },
    "multiplicadorChofer": 1,
    "tarifaTipo": {
      "eventual": false,
      "general": true,
      "personalizada": false,
      "especial": false
    },
    "observaciones": "",
    "idOperacion": 1745580009237,
    "valores": {
      "cliente": {
        "acompValor": 0,
        "tarifaBase": 95000,
        "kmAdicional": 0,
        "aCobrar": 95000
      },
      "chofer": {
        "acompValor": 0,
        "kmAdicional": 0,
        "aPagar": 72600,
        "tarifaBase": 72600
      }
    },
    "facturaChofer": 1745888237773,
    "facturaCliente": 1745888237773,
    "patenteChofer": "LCP568",
    "tarifaEventual": {
      "cliente": {
        "valor": 0,
        "concepto": ""
      },
      "chofer": {
        "valor": 0,
        "concepto": ""
      }
    },
    "chofer": {
      "idProveedor": 0,
      "vehiculo": [
        {
          "tarjetaCombustible": true,
          "publicidad": false,
          "refrigeracion": null,
          "modelo": "Fiorino",
          "satelital": "Stop Car",
          "tipoCombustible": [
            "Nafta"
          ],
          "dominio": "LCP568",
          "marca": "Fiat",
          "segSat": true,
          "categoria": {
            "nombre": "Mini",
            "catOrden": 1
          }
        }
      ],
      "apellido": "Venegas",
      "type": "modified",
      "celularContacto": "1151465696",
      "tarifaAsignada": true,
      "condFiscal": "Monotributista - Factura C",
      "idChofer": 1736791944623,
      "nombre": "Adrian Ernesto",
      "contactoEmergencia": "Mariana Podokian",
      "tarifaTipo": {
        "personalizada": false,
        "especial": false,
        "eventual": false,
        "general": true
      },
      "id": "rsFavZLKXlrRMuilBzCS",
      "email": "adrianvenegas7573@gmail.com",
      "fechaNac": "1973-09-10",
      "idTarifa": 1745280075582,
      "celularEmergencia": "1139103989",
      "cuit": 20235231531,
      "direccion": {
        "provincia": "Buenos Aires",
        "municipio": "Lanús",
        "domicilio": "Tuyuti 3003",
        "localidad": "Valentín Alsina"
      }
    },
    "hojaRuta": "",
    "documentacion": null,
    "acompaniante": false,
    "km": 46,
    "multiplicadorCliente": 1,
    "estado": {
      "cerrada": false,
      "facturada": true,
      "facCliente": false,
      "facChofer": false,
      "abierta": false
    },
    "tarifaPersonalizada": {
      "categoria": 0,
      "nombre": "",
      "aPagar": 0,
      "seccion": 0,
      "aCobrar": 0
    },
    "fecha": "2025-04-23"
  },
  {
    "id": "9rCwc7OPuGdMfiP6hDxp",
    "acompaniante": true,
    "multiplicadorChofer": 1,
    "multiplicadorCliente": 1,
    "observaciones": "",
    "km": 98,
    "tarifaPersonalizada": {
      "nombre": "",
      "aCobrar": 0,
      "seccion": 0,
      "categoria": 0,
      "aPagar": 0
    },
    "valores": {
      "chofer": {
        "kmAdicional": 24200,
        "tarifaBase": 165000,
        "aPagar": 229200,
        "acompValor": 40000
      },
      "cliente": {
        "acompValor": 50000,
        "aCobrar": 307500,
        "kmAdicional": 32500,
        "tarifaBase": 225000
      }
    },
    "idOperacion": 1745580009233,
    "facturaChofer": 1745883228392,
    "documentacion": null,
    "cliente": {
      "razonSocial": "Andesmar Cargas SA",
      "contactos": [
        {
          "apellido": "Paz",
          "puesto": "Jefe Logistica",
          "telefono": "1126439403",
          "email": "juanpaz@andesmar.com.ar",
          "nombre": "Juan"
        },
        {
          "telefono": "1133579699",
          "puesto": "Encargado de Logistica",
          "nombre": "Ramiro",
          "apellido": "Marchetti",
          "email": ""
        }
      ],
      "tarifaTipo": {
        "personalizada": false,
        "eventual": false,
        "general": true,
        "especial": false
      },
      "idCliente": 1736356938304,
      "condFiscal": "Responsable Inscripto - Factura A",
      "direccionFiscal": {
        "localidad": "Luzuriaga",
        "municipio": "Maipú",
        "provincia": "Mendoza",
        "domicilio": "Rodriguez Peña 205"
      },
      "tarifaAsignada": true,
      "id": "HPceY9retp6KCsNOPJia",
      "idTarifa": 1745279918277,
      "cuit": 30601502778,
      "direccionOperativa": {
        "localidad": "Avellaneda",
        "provincia": "Buenos Aires",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "municipio": "Avellaneda"
      },
      "type": "modified"
    },
    "fecha": "2025-04-23",
    "estado": {
      "facturada": true,
      "facCliente": false,
      "abierta": false,
      "cerrada": false,
      "facChofer": false
    },
    "tarifaEventual": {
      "chofer": {
        "concepto": "",
        "valor": 0
      },
      "cliente": {
        "valor": 0,
        "concepto": ""
      }
    },
    "patenteChofer": "OEM143",
    "hojaRuta": "",
    "tarifaTipo": {
      "eventual": false,
      "especial": false,
      "personalizada": false,
      "general": true
    },
    "facturaCliente": 1745883228392,
    "chofer": {
      "tarifaTipo": {
        "personalizada": false,
        "especial": false,
        "eventual": false,
        "general": true
      },
      "tarifaAsignada": true,
      "condFiscal": "Monotributista - Factura C",
      "apellido": "Andrade",
      "celularEmergencia": "1132479708",
      "cuit": 20171435472,
      "id": "qwWzv5lrgsIxPVDgHybz",
      "vehiculo": [
        {
          "marca": "Ivecco",
          "tipoCombustible": [
            "Nafta"
          ],
          "tarjetaCombustible": true,
          "dominio": "OEM143",
          "refrigeracion": null,
          "publicidad": false,
          "segSat": true,
          "categoria": {
            "catOrden": 3,
            "nombre": "Furgon"
          },
          "satelital": "Stop Car",
          "modelo": "Daily"
        }
      ],
      "idProveedor": 0,
      "fechaNac": "1964-08-17",
      "type": "modified",
      "email": "proserintsa@gmail.com",
      "contactoEmergencia": "Pareja",
      "celularContacto": "1157361377",
      "idChofer": 1736603977629,
      "idTarifa": 1745280075582,
      "nombre": "Daniel Eduardo",
      "direccion": {
        "domicilio": "Derqui 3686",
        "municipio": "La Matanza",
        "localidad": "San Justo",
        "provincia": "Buenos Aires"
      }
    }
  },
  {
    "id": "sgHNhYz6Vd6DcrRIqnFn",
    "km": 76,
    "multiplicadorChofer": 1,
    "chofer": {
      "type": "modified",
      "nombre": "Matias Alberto",
      "email": "fndzmatias@gmail.com",
      "idProveedor": 0,
      "fechaNac": "1996-03-07",
      "direccion": {
        "domicilio": "Pje Rosa Acevedo 1049",
        "localidad": "Lanús Oeste",
        "municipio": "Lanús",
        "provincia": "Buenos Aires"
      },
      "contactoEmergencia": "Stella",
      "tarifaAsignada": true,
      "apellido": "Fernandez",
      "tarifaTipo": {
        "especial": false,
        "personalizada": false,
        "general": true,
        "eventual": false
      },
      "idTarifa": 1745280075582,
      "cuit": 20389286750,
      "celularEmergencia": "1161671994",
      "celularContacto": "1133652485",
      "id": "jhjDx7Yh3lf56iAFBWWp",
      "condFiscal": "Monotributista - Factura C",
      "idChofer": 1736727991651,
      "vehiculo": [
        {
          "dominio": "LUC928",
          "satelital": "Stop Car",
          "categoria": {
            "nombre": "Mini",
            "catOrden": 1
          },
          "modelo": "Partner",
          "refrigeracion": null,
          "marca": "Peugeot",
          "publicidad": false,
          "tarjetaCombustible": false,
          "tipoCombustible": [
            "Nafta"
          ],
          "segSat": true
        }
      ]
    },
    "idOperacion": 1745452385681,
    "cliente": {
      "idCliente": 1736356938304,
      "tarifaAsignada": true,
      "direccionFiscal": {
        "municipio": "Maipú",
        "domicilio": "Rodriguez Peña 205",
        "localidad": "Luzuriaga",
        "provincia": "Mendoza"
      },
      "type": "added",
      "direccionOperativa": {
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "localidad": "Avellaneda"
      },
      "tarifaTipo": {
        "personalizada": false,
        "general": true,
        "eventual": false,
        "especial": false
      },
      "idTarifa": 1745279918277,
      "contactos": [
        {
          "nombre": "Juan",
          "email": "juanpaz@andesmar.com.ar",
          "puesto": "Jefe Logistica",
          "telefono": "1126439403",
          "apellido": "Paz"
        },
        {
          "puesto": "Encargado de Logistica",
          "apellido": "Marchetti",
          "email": "",
          "nombre": "Ramiro",
          "telefono": "1133579699"
        }
      ],
      "cuit": 30601502778,
      "condFiscal": "Responsable Inscripto - Factura A",
      "id": "HPceY9retp6KCsNOPJia",
      "razonSocial": "Andesmar Cargas SA"
    },
    "acompaniante": false,
    "patenteChofer": "LUC928",
    "facturaChofer": 1745887275881,
    "facturaCliente": 1745887275881,
    "hojaRuta": "",
    "tarifaPersonalizada": {
      "aPagar": 0,
      "categoria": 0,
      "aCobrar": 0,
      "seccion": 0,
      "nombre": ""
    },
    "documentacion": null,
    "observaciones": "",
    "tarifaTipo": {
      "especial": false,
      "personalizada": false,
      "general": true,
      "eventual": false
    },
    "multiplicadorCliente": 1,
    "valores": {
      "cliente": {
        "kmAdicional": 12000,
        "aCobrar": 107000,
        "acompValor": 0,
        "tarifaBase": 95000
      },
      "chofer": {
        "aPagar": 81840,
        "kmAdicional": 9240,
        "acompValor": 0,
        "tarifaBase": 72600
      }
    },
    "tarifaEventual": {
      "chofer": {
        "concepto": "",
        "valor": 0
      },
      "cliente": {
        "concepto": "",
        "valor": 0
      }
    },
    "fecha": "2025-04-22",
    "estado": {
      "abierta": false,
      "facChofer": false,
      "cerrada": false,
      "facturada": true,
      "facCliente": false
    }
  },
  {
    "id": "iwjHb3weemDs8w0TscOn",
    "multiplicadorChofer": 1,
    "documentacion": null,
    "cliente": {
      "condFiscal": "Responsable Inscripto - Factura A",
      "tarifaTipo": {
        "eventual": false,
        "general": true,
        "especial": false,
        "personalizada": false
      },
      "contactos": [
        {
          "apellido": "Paz",
          "puesto": "Jefe Logistica",
          "nombre": "Juan",
          "telefono": "1126439403",
          "email": "juanpaz@andesmar.com.ar"
        },
        {
          "puesto": "Encargado de Logistica",
          "telefono": "1133579699",
          "nombre": "Ramiro",
          "apellido": "Marchetti",
          "email": ""
        }
      ],
      "direccionFiscal": {
        "municipio": "Maipú",
        "localidad": "Luzuriaga",
        "domicilio": "Rodriguez Peña 205",
        "provincia": "Mendoza"
      },
      "type": "added",
      "idCliente": 1736356938304,
      "razonSocial": "Andesmar Cargas SA",
      "idTarifa": 1745279918277,
      "cuit": 30601502778,
      "direccionOperativa": {
        "municipio": "Avellaneda",
        "localidad": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "provincia": "Buenos Aires"
      },
      "id": "HPceY9retp6KCsNOPJia",
      "tarifaAsignada": true
    },
    "tarifaEventual": {
      "chofer": {
        "valor": 0,
        "concepto": ""
      },
      "cliente": {
        "valor": 0,
        "concepto": ""
      }
    },
    "observaciones": "",
    "km": 94,
    "patenteChofer": "HPP453",
    "fecha": "2025-04-22",
    "facturaCliente": 1746211121789,
    "valores": {
      "chofer": {
        "aPagar": 144650,
        "tarifaBase": 126500,
        "kmAdicional": 18150,
        "acompValor": 0
      },
      "cliente": {
        "aCobrar": 200000,
        "kmAdicional": 25000,
        "acompValor": 0,
        "tarifaBase": 175000
      }
    },
    "hojaRuta": "",
    "estado": {
      "facChofer": false,
      "abierta": false,
      "facCliente": false,
      "facturada": true,
      "cerrada": false
    },
    "idOperacion": 1745452385682,
    "multiplicadorCliente": 1,
    "tarifaPersonalizada": {
      "aCobrar": 0,
      "categoria": 0,
      "aPagar": 0,
      "seccion": 0,
      "nombre": ""
    },
    "chofer": {
      "id": "75TLs99t6qSNTuHessGQ",
      "type": "modified",
      "idTarifa": 1745280075582,
      "celularContacto": "1130719809",
      "tarifaAsignada": true,
      "idChofer": 1736730226989,
      " condFiscal": "",
      "fechaNac": "1994-02-01",
      "vehiculo": [
        {
          "segSat": true,
          "refrigeracion": null,
          "publicidad": false,
          "tipoCombustible": [
            "nafta"
          ],
          "dominio": "HPP453",
          "tarjetaCombustible": true,
          "modelo": "Transporter",
          "satelital": "Stop Car",
          "marca": "Volkswagen",
          "categoria": {
            "nombre": "Maxi",
            "catOrden": 2
          }
        }
      ],
      "cuit": 20380305381,
      "apellido": "Quiroga",
      "contactoEmergencia": "",
      "direccion": {
        "localidad": "",
        "domicilio": "Juncal 777 - Lanus",
        " municipio": "",
        "provincia": ""
      },
      "idProveedor": 0,
      "tarifaTipo": {
        "eventual": false,
        "personalizada": false,
        "general": true,
        "especial": false
      },
      "nombre": "Ariel Omar",
      "celularEmergencia": "",
      "email": "actualizar@gmail.com"
    },
    "facturaChofer": 1746211121789,
    "acompaniante": false,
    "tarifaTipo": {
      "especial": false,
      "eventual": false,
      "personalizada": false,
      "general": true
    }
  },
  {
    "id": "hJKFidmsQusSUqI4rPW2",
    "chofer": {
      "cuit": 20410488392,
      "direccion": {
        "municipio": "Avellaneda",
        "localidad": "Sarandí",
        "provincia": "Buenos Aires",
        "domicilio": "Pasaje Cerviño 312"
      },
      "fechaNac": "1998-03-13",
      "idTarifa": 1745280075582,
      "tarifaTipo": {
        "personalizada": false,
        "especial": false,
        "eventual": false,
        "general": true
      },
      "condFiscal": "Monotributista - Factura C",
      "idChofer": 1736792086528,
      "celularEmergencia": "1123711081",
      "tarifaAsignada": true,
      "vehiculo": [
        {
          "refrigeracion": null,
          "publicidad": false,
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "marca": "Fiat",
          "satelital": "Stop Car",
          "tarjetaCombustible": false,
          "tipoCombustible": [
            "Nafta"
          ],
          "modelo": "Fiorino",
          "dominio": "AD071GH",
          "segSat": true
        }
      ],
      "email": "cristiannicolassoto1303@gmail.com",
      "nombre": "Christian Nicolas",
      "type": "modified",
      "celularContacto": "1153499040",
      "contactoEmergencia": "Lorena Soto",
      "apellido": "Soto",
      "id": "vIsDMqhm9hag6LXDt28I",
      "idProveedor": 0
    },
    "estado": {
      "facturada": true,
      "facChofer": false,
      "cerrada": false,
      "abierta": false,
      "facCliente": false
    },
    "tarifaPersonalizada": {
      "aPagar": 0,
      "nombre": "",
      "categoria": 0,
      "aCobrar": 0,
      "seccion": 0
    },
    "multiplicadorChofer": 1,
    "observaciones": "",
    "tarifaEventual": {
      "cliente": {
        "concepto": "",
        "valor": 0
      },
      "chofer": {
        "valor": 0,
        "concepto": ""
      }
    },
    "tarifaTipo": {
      "personalizada": false,
      "especial": false,
      "general": true,
      "eventual": false
    },
    "km": 142,
    "hojaRuta": "",
    "documentacion": null,
    "idOperacion": 1745452385683,
    "multiplicadorCliente": 1,
    "facturaCliente": 1745888528334,
    "cliente": {
      "direccionFiscal": {
        "domicilio": "Rodriguez Peña 205",
        "localidad": "Luzuriaga",
        "provincia": "Mendoza",
        "municipio": "Maipú"
      },
      "idCliente": 1736356938304,
      "cuit": 30601502778,
      "tarifaTipo": {
        "general": true,
        "especial": false,
        "personalizada": false,
        "eventual": false
      },
      "condFiscal": "Responsable Inscripto - Factura A",
      "type": "added",
      "razonSocial": "Andesmar Cargas SA",
      "idTarifa": 1745279918277,
      "direccionOperativa": {
        "domicilio": "General Gorriti 650 - Avellaneda",
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda",
        "localidad": "Avellaneda"
      },
      "id": "HPceY9retp6KCsNOPJia",
      "tarifaAsignada": true,
      "contactos": [
        {
          "telefono": "1126439403",
          "puesto": "Jefe Logistica",
          "apellido": "Paz",
          "email": "juanpaz@andesmar.com.ar",
          "nombre": "Juan"
        },
        {
          "email": "",
          "apellido": "Marchetti",
          "puesto": "Encargado de Logistica",
          "telefono": "1133579699",
          "nombre": "Ramiro"
        }
      ]
    },
    "acompaniante": false,
    "facturaChofer": 1745888528334,
    "fecha": "2025-04-22",
    "valores": {
      "cliente": {
        "tarifaBase": 95000,
        "aCobrar": 135000,
        "kmAdicional": 40000,
        "acompValor": 0
      },
      "chofer": {
        "acompValor": 0,
        "aPagar": 103400,
        "tarifaBase": 72600,
        "kmAdicional": 30800
      }
    },
    "patenteChofer": "AD071GH"
  },
  {
    "id": "fBDypO42V58aqNyjJFSD",
    "estado": {
      "abierta": false,
      "facChofer": false,
      "cerrada": false,
      "facturada": true,
      "facCliente": false
    },
    "multiplicadorChofer": 1,
    "tarifaTipo": {
      "general": true,
      "eventual": false,
      "personalizada": false,
      "especial": false
    },
    "tarifaPersonalizada": {
      "seccion": 0,
      "aCobrar": 0,
      "aPagar": 0,
      "nombre": "",
      "categoria": 0
    },
    "cliente": {
      "id": "HPceY9retp6KCsNOPJia",
      "direccionFiscal": {
        "domicilio": "Rodriguez Peña 205",
        "municipio": "Maipú",
        "localidad": "Luzuriaga",
        "provincia": "Mendoza"
      },
      "tarifaAsignada": true,
      "condFiscal": "Responsable Inscripto - Factura A",
      "cuit": 30601502778,
      "razonSocial": "Andesmar Cargas SA",
      "idTarifa": 1745279918277,
      "direccionOperativa": {
        "municipio": "Avellaneda",
        "localidad": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "provincia": "Buenos Aires"
      },
      "tarifaTipo": {
        "personalizada": false,
        "general": true,
        "eventual": false,
        "especial": false
      },
      "type": "added",
      "idCliente": 1736356938304,
      "contactos": [
        {
          "nombre": "Juan",
          "apellido": "Paz",
          "email": "juanpaz@andesmar.com.ar",
          "puesto": "Jefe Logistica",
          "telefono": "1126439403"
        },
        {
          "email": "",
          "puesto": "Encargado de Logistica",
          "nombre": "Ramiro",
          "telefono": "1133579699",
          "apellido": "Marchetti"
        }
      ]
    },
    "idOperacion": 1745452385684,
    "valores": {
      "cliente": {
        "acompValor": 0,
        "tarifaBase": 95000,
        "kmAdicional": 36000,
        "aCobrar": 131000
      },
      "chofer": {
        "kmAdicional": 27720,
        "tarifaBase": 72600,
        "aPagar": 100320,
        "acompValor": 0
      }
    },
    "multiplicadorCliente": 1,
    "acompaniante": false,
    "tarifaEventual": {
      "cliente": {
        "concepto": "",
        "valor": 0
      },
      "chofer": {
        "concepto": "",
        "valor": 0
      }
    },
    "hojaRuta": "",
    "facturaCliente": 1745888248096,
    "patenteChofer": "LCP568",
    "chofer": {
      "cuit": 20235231531,
      "idProveedor": 0,
      "id": "rsFavZLKXlrRMuilBzCS",
      "idTarifa": 1745280075582,
      "idChofer": 1736791944623,
      "condFiscal": "Monotributista - Factura C",
      "tarifaTipo": {
        "especial": false,
        "general": true,
        "personalizada": false,
        "eventual": false
      },
      "contactoEmergencia": "Mariana Podokian",
      "direccion": {
        "localidad": "Valentín Alsina",
        "domicilio": "Tuyuti 3003",
        "municipio": "Lanús",
        "provincia": "Buenos Aires"
      },
      "fechaNac": "1973-09-10",
      "type": "modified",
      "email": "adrianvenegas7573@gmail.com",
      "tarifaAsignada": true,
      "celularContacto": "1151465696",
      "vehiculo": [
        {
          "segSat": true,
          "refrigeracion": null,
          "satelital": "Stop Car",
          "tipoCombustible": [
            "Nafta"
          ],
          "categoria": {
            "nombre": "Mini",
            "catOrden": 1
          },
          "modelo": "Fiorino",
          "dominio": "LCP568",
          "marca": "Fiat",
          "tarjetaCombustible": true,
          "publicidad": false
        }
      ],
      "nombre": "Adrian Ernesto",
      "celularEmergencia": "1139103989",
      "apellido": "Venegas"
    },
    "observaciones": "",
    "km": 137,
    "documentacion": null,
    "fecha": "2025-04-22",
    "facturaChofer": 1745888248096
  },
  {
    "id": "GpG0wPpwcALyH6zGh2r0",
    "idOperacion": 1745452385680,
    "hojaRuta": "",
    "valores": {
      "chofer": {
        "kmAdicional": 43120,
        "tarifaBase": 72600,
        "acompValor": 0,
        "aPagar": 115720
      },
      "cliente": {
        "acompValor": 0,
        "tarifaBase": 95000,
        "kmAdicional": 56000,
        "aCobrar": 151000
      }
    },
    "tarifaEventual": {
      "cliente": {
        "valor": 0,
        "concepto": ""
      },
      "chofer": {
        "valor": 0,
        "concepto": ""
      }
    },
    "observaciones": "",
    "multiplicadorChofer": 1,
    "patenteChofer": "OPB248",
    "tarifaTipo": {
      "especial": false,
      "general": true,
      "personalizada": false,
      "eventual": false
    },
    "chofer": {
      "id": "IYdOM7gOiBPrLRIukidg",
      "idProveedor": 0,
      "tarifaTipo": {
        "personalizada": false,
        "eventual": false,
        "general": true,
        "especial": false
      },
      "contactoEmergencia": "Maitena Rodríguez",
      "idChofer": 1736728211494,
      "fechaNac": "2002-08-09",
      "idTarifa": 1745280075582,
      "tarifaAsignada": true,
      "cuit": 20443384900,
      "celularEmergencia": "1139135361",
      "celularContacto": "1166620796",
      "condFiscal": "Monotributista - Factura C",
      "direccion": {
        "provincia": "Buenos Aires",
        "localidad": "Lanús Oeste",
        "municipio": "Lanús",
        "domicilio": "R. de Escalada  de San Martin 1483"
      },
      "type": "modified",
      "vehiculo": [
        {
          "segSat": true,
          "satelital": "Stop Car",
          "refrigeracion": null,
          "modelo": "Partner",
          "publicidad": false,
          "tarjetaCombustible": false,
          "dominio": "OPB248",
          "tipoCombustible": [
            "Nafta"
          ],
          "marca": "Peugeot",
          "categoria": {
            "nombre": "Mini",
            "catOrden": 1
          }
        }
      ],
      "email": "toma.f@hotmail.com",
      "apellido": "Fernandez",
      "nombre": "Tomas Yamil"
    },
    "cliente": {
      "id": "HPceY9retp6KCsNOPJia",
      "razonSocial": "Andesmar Cargas SA",
      "cuit": 30601502778,
      "direccionFiscal": {
        "provincia": "Mendoza",
        "localidad": "Luzuriaga",
        "municipio": "Maipú",
        "domicilio": "Rodriguez Peña 205"
      },
      "type": "added",
      "idCliente": 1736356938304,
      "condFiscal": "Responsable Inscripto - Factura A",
      "tarifaTipo": {
        "especial": false,
        "personalizada": false,
        "general": true,
        "eventual": false
      },
      "direccionOperativa": {
        "localidad": "Avellaneda",
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda"
      },
      "idTarifa": 1745279918277,
      "tarifaAsignada": true,
      "contactos": [
        {
          "email": "juanpaz@andesmar.com.ar",
          "nombre": "Juan",
          "apellido": "Paz",
          "puesto": "Jefe Logistica",
          "telefono": "1126439403"
        },
        {
          "apellido": "Marchetti",
          "email": "",
          "telefono": "1133579699",
          "puesto": "Encargado de Logistica",
          "nombre": "Ramiro"
        }
      ]
    },
    "acompaniante": false,
    "facturaChofer": 1745887026049,
    "estado": {
      "facCliente": false,
      "facChofer": false,
      "facturada": true,
      "abierta": false,
      "cerrada": false
    },
    "multiplicadorCliente": 1,
    "km": 185,
    "tarifaPersonalizada": {
      "aPagar": 0,
      "aCobrar": 0,
      "seccion": 0,
      "nombre": "",
      "categoria": 0
    },
    "documentacion": null,
    "facturaCliente": 1745887026049,
    "fecha": "2025-04-22"
  },
  {
    "id": "wvY6rhZXVmC0PoNRa9f2",
    "tarifaEventual": {
      "cliente": {
        "valor": 0,
        "concepto": ""
      },
      "chofer": {
        "valor": 0,
        "concepto": ""
      }
    },
    "estado": {
      "abierta": false,
      "facChofer": false,
      "facturada": true,
      "cerrada": false,
      "facCliente": false
    },
    "fecha": "2025-04-21",
    "tarifaPersonalizada": {
      "categoria": 0,
      "aCobrar": 0,
      "seccion": 0,
      "nombre": "",
      "aPagar": 0
    },
    "multiplicadorCliente": 1,
    "observaciones": "",
    "hojaRuta": "",
    "acompaniante": false,
    "cliente": {
      "direccionOperativa": {
        "provincia": "Buenos Aires",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "localidad": "Avellaneda",
        "municipio": "Avellaneda"
      },
      "idCliente": 1736356938304,
      "condFiscal": "Responsable Inscripto - Factura A",
      "razonSocial": "Andesmar Cargas SA",
      "tarifaAsignada": true,
      "id": "HPceY9retp6KCsNOPJia",
      "cuit": 30601502778,
      "idTarifa": 1745279918277,
      "contactos": [
        {
          "puesto": "Jefe Logistica",
          "apellido": "Paz",
          "email": "juanpaz@andesmar.com.ar",
          "nombre": "Juan",
          "telefono": "1126439403"
        },
        {
          "email": "",
          "telefono": "1133579699",
          "puesto": "Encargado de Logistica",
          "nombre": "Ramiro",
          "apellido": "Marchetti"
        }
      ],
      "type": "modified",
      "tarifaTipo": {
        "general": true,
        "especial": false,
        "eventual": false,
        "personalizada": false
      },
      "direccionFiscal": {
        "provincia": "Mendoza",
        "municipio": "Maipú",
        "domicilio": "Rodriguez Peña 205",
        "localidad": "Luzuriaga"
      }
    },
    "patenteChofer": "LUC928",
    "chofer": {
      "nombre": "Matias Alberto",
      "email": "fndzmatias@gmail.com",
      "id": "jhjDx7Yh3lf56iAFBWWp",
      "contactoEmergencia": "Stella",
      "apellido": "Fernandez",
      "fechaNac": "1996-03-07",
      "idProveedor": 0,
      "type": "modified",
      "idChofer": 1736727991651,
      "vehiculo": [
        {
          "tipoCombustible": [
            "Nafta"
          ],
          "marca": "Peugeot",
          "satelital": "Stop Car",
          "segSat": true,
          "tarjetaCombustible": false,
          "dominio": "LUC928",
          "refrigeracion": null,
          "modelo": "Partner",
          "publicidad": false,
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          }
        }
      ],
      "celularContacto": "1133652485",
      "direccion": {
        "localidad": "Lanús Oeste",
        "provincia": "Buenos Aires",
        "municipio": "Lanús",
        "domicilio": "Pje Rosa Acevedo 1049"
      },
      "tarifaAsignada": true,
      "cuit": 20389286750,
      "condFiscal": "Monotributista - Factura C",
      "idTarifa": 1745280075582,
      "celularEmergencia": "1161671994",
      "tarifaTipo": {
        "general": true,
        "eventual": false,
        "personalizada": false,
        "especial": false
      }
    },
    "facturaChofer": 1745887267923,
    "idOperacion": 1745370062776,
    "facturaCliente": 1745887267923,
    "documentacion": null,
    "km": 154,
    "valores": {
      "chofer": {
        "aPagar": 106480,
        "tarifaBase": 72600,
        "kmAdicional": 33880,
        "acompValor": 0
      },
      "cliente": {
        "acompValor": 0,
        "kmAdicional": 44000,
        "aCobrar": 139000,
        "tarifaBase": 95000
      }
    },
    "multiplicadorChofer": 1,
    "tarifaTipo": {
      "especial": false,
      "general": true,
      "eventual": false,
      "personalizada": false
    }
  },
  {
    "id": "mRlqhDAL8umMujH7BpLW",
    "chofer": {
      "type": "modified",
      "tarifaTipo": {
        "general": true,
        "eventual": false,
        "especial": false,
        "personalizada": false
      },
      "fechaNac": "1994-02-01",
      "idChofer": 1736730226989,
      " condFiscal": "",
      "id": "75TLs99t6qSNTuHessGQ",
      "idProveedor": 0,
      "idTarifa": 1745280075582,
      "contactoEmergencia": "",
      "vehiculo": [
        {
          "segSat": true,
          "categoria": {
            "catOrden": 2,
            "nombre": "Maxi"
          },
          "satelital": "Stop Car",
          "dominio": "HPP453",
          "tipoCombustible": [
            "nafta"
          ],
          "modelo": "Transporter",
          "tarjetaCombustible": true,
          "refrigeracion": null,
          "publicidad": false,
          "marca": "Volkswagen"
        }
      ],
      "cuit": 20380305381,
      "celularContacto": "1130719809",
      "email": "actualizar@gmail.com",
      "direccion": {
        " municipio": "",
        "provincia": "",
        "domicilio": "Juncal 777 - Lanus",
        "localidad": ""
      },
      "apellido": "Quiroga",
      "tarifaAsignada": true,
      "celularEmergencia": "",
      "nombre": "Ariel Omar"
    },
    "hojaRuta": "",
    "facturaCliente": 1746211107241,
    "multiplicadorCliente": 1,
    "facturaChofer": 1746211107241,
    "patenteChofer": "HPP453",
    "valores": {
      "cliente": {
        "tarifaBase": 175000,
        "aCobrar": 195000,
        "acompValor": 0,
        "kmAdicional": 20000
      },
      "chofer": {
        "kmAdicional": 14520,
        "acompValor": 0,
        "tarifaBase": 126500,
        "aPagar": 141020
      }
    },
    "acompaniante": false,
    "cliente": {
      "tarifaAsignada": true,
      "idTarifa": 1745279918277,
      "condFiscal": "Responsable Inscripto - Factura A",
      "tarifaTipo": {
        "personalizada": false,
        "eventual": false,
        "general": true,
        "especial": false
      },
      "direccionFiscal": {
        "localidad": "Luzuriaga",
        "provincia": "Mendoza",
        "municipio": "Maipú",
        "domicilio": "Rodriguez Peña 205"
      },
      "direccionOperativa": {
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda",
        "localidad": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda"
      },
      "cuit": 30601502778,
      "contactos": [
        {
          "apellido": "Paz",
          "telefono": "1126439403",
          "puesto": "Jefe Logistica",
          "email": "juanpaz@andesmar.com.ar",
          "nombre": "Juan"
        },
        {
          "puesto": "Encargado de Logistica",
          "email": "",
          "apellido": "Marchetti",
          "nombre": "Ramiro",
          "telefono": "1133579699"
        }
      ],
      "razonSocial": "Andesmar Cargas SA",
      "id": "HPceY9retp6KCsNOPJia",
      "type": "modified",
      "idCliente": 1736356938304
    },
    "multiplicadorChofer": 1,
    "tarifaEventual": {
      "cliente": {
        "concepto": "",
        "valor": 0
      },
      "chofer": {
        "concepto": "",
        "valor": 0
      }
    },
    "observaciones": "",
    "idOperacion": 1745370062778,
    "km": 83,
    "estado": {
      "facturada": true,
      "abierta": false,
      "facCliente": false,
      "cerrada": false,
      "facChofer": false
    },
    "documentacion": null,
    "fecha": "2025-04-21",
    "tarifaPersonalizada": {
      "aPagar": 0,
      "categoria": 0,
      "aCobrar": 0,
      "seccion": 0,
      "nombre": ""
    },
    "tarifaTipo": {
      "especial": false,
      "eventual": false,
      "general": true,
      "personalizada": false
    }
  },
  {
    "id": "QXHCVfXo7Gks4VWxnXTm",
    "estado": {
      "abierta": false,
      "cerrada": false,
      "facturada": true,
      "facCliente": false,
      "facChofer": false
    },
    "chofer": {
      "apellido": "Soto",
      "celularEmergencia": "1123711081",
      "fechaNac": "1998-03-13",
      "idTarifa": 1745280075582,
      "contactoEmergencia": "Lorena Soto",
      "direccion": {
        "localidad": "Sarandí",
        "domicilio": "Pasaje Cerviño 312",
        "municipio": "Avellaneda",
        "provincia": "Buenos Aires"
      },
      "idProveedor": 0,
      "email": "cristiannicolassoto1303@gmail.com",
      "vehiculo": [
        {
          "satelital": "Stop Car",
          "tarjetaCombustible": false,
          "refrigeracion": null,
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "modelo": "Fiorino",
          "tipoCombustible": [
            "Nafta"
          ],
          "publicidad": false,
          "segSat": true,
          "dominio": "AD071GH",
          "marca": "Fiat"
        }
      ],
      "tarifaAsignada": true,
      "cuit": 20410488392,
      "id": "vIsDMqhm9hag6LXDt28I",
      "tarifaTipo": {
        "eventual": false,
        "general": true,
        "personalizada": false,
        "especial": false
      },
      "celularContacto": "1153499040",
      "condFiscal": "Monotributista - Factura C",
      "type": "modified",
      "nombre": "Christian Nicolas",
      "idChofer": 1736792086528
    },
    "facturaChofer": 1745888550144,
    "km": 33,
    "cliente": {
      "idCliente": 1736356938304,
      "tarifaAsignada": true,
      "direccionOperativa": {
        "domicilio": "General Gorriti 650 - Avellaneda",
        "localidad": "Avellaneda",
        "municipio": "Avellaneda",
        "provincia": "Buenos Aires"
      },
      "direccionFiscal": {
        "municipio": "Maipú",
        "domicilio": "Rodriguez Peña 205",
        "provincia": "Mendoza",
        "localidad": "Luzuriaga"
      },
      "contactos": [
        {
          "apellido": "Paz",
          "puesto": "Jefe Logistica",
          "email": "juanpaz@andesmar.com.ar",
          "nombre": "Juan",
          "telefono": "1126439403"
        },
        {
          "telefono": "1133579699",
          "email": "",
          "puesto": "Encargado de Logistica",
          "nombre": "Ramiro",
          "apellido": "Marchetti"
        }
      ],
      "idTarifa": 1745279918277,
      "id": "HPceY9retp6KCsNOPJia",
      "cuit": 30601502778,
      "condFiscal": "Responsable Inscripto - Factura A",
      "type": "modified",
      "tarifaTipo": {
        "especial": false,
        "eventual": false,
        "personalizada": false,
        "general": true
      },
      "razonSocial": "Andesmar Cargas SA"
    },
    "hojaRuta": "",
    "tarifaPersonalizada": {
      "aPagar": 0,
      "seccion": 0,
      "aCobrar": 0,
      "nombre": "",
      "categoria": 0
    },
    "fecha": "2025-04-21",
    "acompaniante": false,
    "tarifaTipo": {
      "general": true,
      "personalizada": false,
      "especial": false,
      "eventual": false
    },
    "documentacion": null,
    "valores": {
      "chofer": {
        "kmAdicional": 0,
        "acompValor": 0,
        "aPagar": 72600,
        "tarifaBase": 72600
      },
      "cliente": {
        "acompValor": 0,
        "aCobrar": 95000,
        "tarifaBase": 95000,
        "kmAdicional": 0
      }
    },
    "patenteChofer": "AD071GH",
    "multiplicadorChofer": 1,
    "tarifaEventual": {
      "chofer": {
        "concepto": "",
        "valor": 0
      },
      "cliente": {
        "valor": 0,
        "concepto": ""
      }
    },
    "observaciones": "",
    "facturaCliente": 1745888550144,
    "idOperacion": 1745370062779,
    "multiplicadorCliente": 1
  },
  {
    "id": "GFvQdf7yQchBdu4Zy52I",
    "estado": {
      "abierta": false,
      "facCliente": false,
      "cerrada": false,
      "facChofer": false,
      "facturada": true
    },
    "observaciones": "",
    "valores": {
      "cliente": {
        "kmAdicional": 0,
        "acompValor": 0,
        "aCobrar": 95000,
        "tarifaBase": 95000
      },
      "chofer": {
        "acompValor": 0,
        "aPagar": 72600,
        "kmAdicional": 0,
        "tarifaBase": 72600
      }
    },
    "idOperacion": 1745370062777,
    "facturaChofer": 1745887871150,
    "acompaniante": false,
    "tarifaEventual": {
      "chofer": {
        "valor": 0,
        "concepto": ""
      },
      "cliente": {
        "valor": 0,
        "concepto": ""
      }
    },
    "tarifaPersonalizada": {
      "categoria": 0,
      "nombre": "",
      "aPagar": 0,
      "aCobrar": 0,
      "seccion": 0
    },
    "hojaRuta": "",
    "patenteChofer": "MKO908",
    "fecha": "2025-04-21",
    "multiplicadorCliente": 1,
    "cliente": {
      "idCliente": 1736356938304,
      "idTarifa": 1745279918277,
      "type": "modified",
      "condFiscal": "Responsable Inscripto - Factura A",
      "direccionFiscal": {
        "localidad": "Luzuriaga",
        "provincia": "Mendoza",
        "domicilio": "Rodriguez Peña 205",
        "municipio": "Maipú"
      },
      "razonSocial": "Andesmar Cargas SA",
      "tarifaTipo": {
        "especial": false,
        "personalizada": false,
        "eventual": false,
        "general": true
      },
      "direccionOperativa": {
        "localidad": "Avellaneda",
        "municipio": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "provincia": "Buenos Aires"
      },
      "id": "HPceY9retp6KCsNOPJia",
      "tarifaAsignada": true,
      "cuit": 30601502778,
      "contactos": [
        {
          "nombre": "Juan",
          "apellido": "Paz",
          "telefono": "1126439403",
          "puesto": "Jefe Logistica",
          "email": "juanpaz@andesmar.com.ar"
        },
        {
          "nombre": "Ramiro",
          "telefono": "1133579699",
          "email": "",
          "apellido": "Marchetti",
          "puesto": "Encargado de Logistica"
        }
      ]
    },
    "km": 0,
    "multiplicadorChofer": 1,
    "documentacion": null,
    "tarifaTipo": {
      "general": true,
      "especial": false,
      "personalizada": false,
      "eventual": false
    },
    "facturaCliente": 1745887871150,
    "chofer": {
      "contactoEmergencia": "",
      "cuit": 20359966858,
      "idTarifa": 1745280075582,
      "direccion": {
        "municipio": "Lanús",
        "provincia": "Buenos Aires",
        "localidad": "Lanús",
        "domicilio": "Canada 4264"
      },
      "tarifaAsignada": true,
      "email": "",
      "idProveedor": 0,
      "fechaNac": "1991-12-26",
      "celularContacto": "1134114686",
      "tarifaTipo": {
        "eventual": false,
        "general": true,
        "personalizada": false,
        "especial": false
      },
      "nombre": "Juan Pablo",
      "celularEmergencia": "",
      "condFiscal": "Monotributista - Factura C",
      "apellido": "Franchino",
      "type": "modified",
      "id": "HvzkcMsIevqt02rpgO7s",
      "idChofer": 1744464413966,
      "vehiculo": [
        {
          "dominio": "MKO908",
          "tarjetaCombustible": false,
          "marca": "Citroen",
          "categoria": {
            "nombre": "Mini",
            "catOrden": 1
          },
          "satelital": "",
          "refrigeracion": null,
          "tipoCombustible": [
            "Nafta"
          ],
          "segSat": false,
          "modelo": "Berlingo",
          "publicidad": false
        }
      ]
    }
  },
  {
    "id": "AyAx931KouI4iINrBze8",
    "multiplicadorCliente": 1,
    "idOperacion": 1745370062775,
    "tarifaTipo": {
      "especial": false,
      "eventual": false,
      "general": true,
      "personalizada": false
    },
    "fecha": "2025-04-21",
    "tarifaEventual": {
      "chofer": {
        "concepto": "",
        "valor": 0
      },
      "cliente": {
        "valor": 0,
        "concepto": ""
      }
    },
    "valores": {
      "cliente": {
        "aCobrar": 131000,
        "acompValor": 0,
        "kmAdicional": 36000,
        "tarifaBase": 95000
      },
      "chofer": {
        "tarifaBase": 72600,
        "acompValor": 0,
        "aPagar": 100320,
        "kmAdicional": 27720
      }
    },
    "documentacion": null,
    "cliente": {
      "contactos": [
        {
          "nombre": "Juan",
          "email": "juanpaz@andesmar.com.ar",
          "puesto": "Jefe Logistica",
          "telefono": "1126439403",
          "apellido": "Paz"
        },
        {
          "telefono": "1133579699",
          "puesto": "Encargado de Logistica",
          "apellido": "Marchetti",
          "email": "",
          "nombre": "Ramiro"
        }
      ],
      "type": "modified",
      "idTarifa": 1745279918277,
      "tarifaAsignada": true,
      "id": "HPceY9retp6KCsNOPJia",
      "cuit": 30601502778,
      "direccionOperativa": {
        "domicilio": "General Gorriti 650 - Avellaneda",
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda",
        "localidad": "Avellaneda"
      },
      "tarifaTipo": {
        "especial": false,
        "eventual": false,
        "personalizada": false,
        "general": true
      },
      "condFiscal": "Responsable Inscripto - Factura A",
      "razonSocial": "Andesmar Cargas SA",
      "idCliente": 1736356938304,
      "direccionFiscal": {
        "domicilio": "Rodriguez Peña 205",
        "localidad": "Luzuriaga",
        "provincia": "Mendoza",
        "municipio": "Maipú"
      }
    },
    "km": 132,
    "observaciones": "",
    "hojaRuta": "",
    "tarifaPersonalizada": {
      "seccion": 0,
      "aCobrar": 0,
      "categoria": 0,
      "nombre": "",
      "aPagar": 0
    },
    "acompaniante": false,
    "chofer": {
      "email": "toma.f@hotmail.com",
      "contactoEmergencia": "Maitena Rodríguez",
      "celularContacto": "1166620796",
      "apellido": "Fernandez",
      "direccion": {
        "localidad": "Lanús Oeste",
        "provincia": "Buenos Aires",
        "domicilio": "R. de Escalada  de San Martin 1483",
        "municipio": "Lanús"
      },
      "cuit": 20443384900,
      "vehiculo": [
        {
          "tipoCombustible": [
            "Nafta"
          ],
          "refrigeracion": null,
          "segSat": true,
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "marca": "Peugeot",
          "dominio": "OPB248",
          "satelital": "Stop Car",
          "modelo": "Partner",
          "publicidad": false,
          "tarjetaCombustible": false
        }
      ],
      "celularEmergencia": "1139135361",
      "fechaNac": "2002-08-09",
      "type": "modified",
      "nombre": "Tomas Yamil",
      "condFiscal": "Monotributista - Factura C",
      "tarifaAsignada": true,
      "id": "IYdOM7gOiBPrLRIukidg",
      "idTarifa": 1745280075582,
      "idChofer": 1736728211494,
      "tarifaTipo": {
        "eventual": false,
        "personalizada": false,
        "especial": false,
        "general": true
      },
      "idProveedor": 0
    },
    "facturaCliente": 1745887031562,
    "multiplicadorChofer": 1,
    "patenteChofer": "OPB248",
    "estado": {
      "facChofer": false,
      "cerrada": false,
      "abierta": false,
      "facCliente": false,
      "facturada": true
    },
    "facturaChofer": 1745887031562
  },
  {
    "id": "3okRVUzwq2dRu2EMDKw1",
    "estado": {
      "facChofer": false,
      "cerrada": false,
      "facturada": true,
      "abierta": false,
      "facCliente": false
    },
    "km": 128,
    "tarifaEventual": {
      "cliente": {
        "concepto": "",
        "valor": 0
      },
      "chofer": {
        "concepto": "",
        "valor": 0
      }
    },
    "hojaRuta": "",
    "documentacion": null,
    "patenteChofer": "OEM143",
    "multiplicadorCliente": 1,
    "acompaniante": true,
    "fecha": "2025-04-21",
    "cliente": {
      "tarifaAsignada": true,
      "cuit": 30601502778,
      "idTarifa": 1745279918277,
      "type": "modified",
      "condFiscal": "Responsable Inscripto - Factura A",
      "idCliente": 1736356938304,
      "id": "HPceY9retp6KCsNOPJia",
      "direccionOperativa": {
        "municipio": "Avellaneda",
        "provincia": "Buenos Aires",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "localidad": "Avellaneda"
      },
      "contactos": [
        {
          "puesto": "Jefe Logistica",
          "email": "juanpaz@andesmar.com.ar",
          "nombre": "Juan",
          "apellido": "Paz",
          "telefono": "1126439403"
        },
        {
          "puesto": "Encargado de Logistica",
          "telefono": "1133579699",
          "nombre": "Ramiro",
          "email": "",
          "apellido": "Marchetti"
        }
      ],
      "tarifaTipo": {
        "especial": false,
        "personalizada": false,
        "eventual": false,
        "general": true
      },
      "razonSocial": "Andesmar Cargas SA",
      "direccionFiscal": {
        "provincia": "Mendoza",
        "localidad": "Luzuriaga",
        "municipio": "Maipú",
        "domicilio": "Rodriguez Peña 205"
      }
    },
    "chofer": {
      "contactoEmergencia": "Pareja",
      "cuit": 20171435472,
      "idTarifa": 1745280075582,
      "direccion": {
        "municipio": "La Matanza",
        "domicilio": "Derqui 3686",
        "localidad": "San Justo",
        "provincia": "Buenos Aires"
      },
      "tarifaAsignada": true,
      "email": "proserintsa@gmail.com",
      "idProveedor": 0,
      "fechaNac": "1964-08-17",
      "celularContacto": "1157361377",
      "tarifaTipo": {
        "eventual": false,
        "personalizada": false,
        "general": true,
        "especial": false
      },
      "nombre": "Daniel Eduardo",
      "celularEmergencia": "1132479708",
      "condFiscal": "Monotributista - Factura C",
      "type": "modified",
      "apellido": "Andrade",
      "id": "qwWzv5lrgsIxPVDgHybz",
      "idChofer": 1736603977629,
      "vehiculo": [
        {
          "satelital": "Stop Car",
          "tipoCombustible": [
            "Nafta"
          ],
          "dominio": "OEM143",
          "marca": "Ivecco",
          "refrigeracion": null,
          "publicidad": false,
          "categoria": {
            "nombre": "Furgon",
            "catOrden": 3
          },
          "modelo": "Daily",
          "segSat": true,
          "tarjetaCombustible": true
        }
      ]
    },
    "valores": {
      "chofer": {
        "aPagar": 243720,
        "acompValor": 40000,
        "tarifaBase": 165000,
        "kmAdicional": 38720
      },
      "cliente": {
        "kmAdicional": 52000,
        "aCobrar": 327000,
        "tarifaBase": 225000,
        "acompValor": 50000
      }
    },
    "observaciones": "",
    "idOperacion": 1745370062774,
    "facturaCliente": 1745883312416,
    "tarifaTipo": {
      "especial": false,
      "general": true,
      "eventual": false,
      "personalizada": false
    },
    "tarifaPersonalizada": {
      "aCobrar": 0,
      "aPagar": 0,
      "categoria": 0,
      "seccion": 0,
      "nombre": ""
    },
    "multiplicadorChofer": 1,
    "facturaChofer": 1745883312416
  },
  {
    "id": "4h3AoWdKFJMHozVW9JZC",
    "facturaChofer": 1745888541257,
    "fecha": "2025-04-18",
    "patenteChofer": "AD071GH",
    "cliente": {
      "contactos": [
        {
          "apellido": "Paz",
          "puesto": "Jefe Logistica",
          "telefono": "1126439403",
          "nombre": "Juan",
          "email": "juanpaz@andesmar.com.ar"
        },
        {
          "telefono": "1133579699",
          "apellido": "Marchetti",
          "email": "",
          "nombre": "Ramiro",
          "puesto": "Encargado de Logistica"
        }
      ],
      "direccionFiscal": {
        "localidad": "Luzuriaga",
        "municipio": "Maipú",
        "provincia": "Mendoza",
        "domicilio": "Rodriguez Peña 205"
      },
      "idTarifa": 1745279918277,
      "tarifaAsignada": true,
      "id": "HPceY9retp6KCsNOPJia",
      "tarifaTipo": {
        "especial": false,
        "eventual": false,
        "personalizada": false,
        "general": true
      },
      "razonSocial": "Andesmar Cargas SA",
      "idCliente": 1736356938304,
      "cuit": 30601502778,
      "direccionOperativa": {
        "municipio": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "provincia": "Buenos Aires",
        "localidad": "Avellaneda"
      },
      "type": "modified",
      "condFiscal": "Responsable Inscripto - Factura A"
    },
    "tarifaPersonalizada": {
      "seccion": 0,
      "aPagar": 0,
      "categoria": 0,
      "aCobrar": 0,
      "nombre": ""
    },
    "estado": {
      "facChofer": false,
      "abierta": false,
      "facturada": true,
      "facCliente": false,
      "cerrada": false
    },
    "km": 65,
    "multiplicadorCliente": 1,
    "valores": {
      "chofer": {
        "tarifaBase": 72600,
        "aPagar": 78760,
        "kmAdicional": 6160,
        "acompValor": 0
      },
      "cliente": {
        "kmAdicional": 8000,
        "tarifaBase": 95000,
        "aCobrar": 103000,
        "acompValor": 0
      }
    },
    "idOperacion": 1745369883765,
    "documentacion": null,
    "hojaRuta": "",
    "observaciones": "",
    "tarifaTipo": {
      "eventual": false,
      "especial": false,
      "personalizada": false,
      "general": true
    },
    "acompaniante": false,
    "chofer": {
      "celularEmergencia": "1123711081",
      "condFiscal": "Monotributista - Factura C",
      "cuit": 20410488392,
      "contactoEmergencia": "Lorena Soto",
      "fechaNac": "1998-03-13",
      "vehiculo": [
        {
          "refrigeracion": null,
          "tipoCombustible": [
            "Nafta"
          ],
          "satelital": "Stop Car",
          "modelo": "Fiorino",
          "segSat": true,
          "marca": "Fiat",
          "publicidad": false,
          "tarjetaCombustible": false,
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "dominio": "AD071GH"
        }
      ],
      "id": "vIsDMqhm9hag6LXDt28I",
      "apellido": "Soto",
      "email": "cristiannicolassoto1303@gmail.com",
      "type": "modified",
      "tarifaTipo": {
        "personalizada": false,
        "especial": false,
        "general": true,
        "eventual": false
      },
      "idProveedor": 0,
      "idChofer": 1736792086528,
      "idTarifa": 1745280075582,
      "direccion": {
        "domicilio": "Pasaje Cerviño 312",
        "provincia": "Buenos Aires",
        "localidad": "Sarandí",
        "municipio": "Avellaneda"
      },
      "tarifaAsignada": true,
      "celularContacto": "1153499040",
      "nombre": "Christian Nicolas"
    },
    "facturaCliente": 1745888541257,
    "multiplicadorChofer": 1,
    "tarifaEventual": {
      "cliente": {
        "concepto": "",
        "valor": 0
      },
      "chofer": {
        "concepto": "",
        "valor": 0
      }
    }
  },
  {
    "id": "zqVRoDHeUvlQYwi1zUhR",
    "valores": {
      "chofer": {
        "acompValor": 0,
        "aPagar": 112640,
        "kmAdicional": 40040,
        "tarifaBase": 72600
      },
      "cliente": {
        "kmAdicional": 52000,
        "aCobrar": 147000,
        "acompValor": 0,
        "tarifaBase": 95000
      }
    },
    "patenteChofer": "LUC928",
    "idOperacion": 1745369279676,
    "observaciones": "",
    "tarifaPersonalizada": {
      "nombre": "",
      "categoria": 0,
      "aPagar": 0,
      "aCobrar": 0,
      "seccion": 0
    },
    "km": 173,
    "fecha": "2025-04-17",
    "facturaChofer": 1745887291837,
    "tarifaEventual": {
      "cliente": {
        "concepto": "",
        "valor": 0
      },
      "chofer": {
        "valor": 0,
        "concepto": ""
      }
    },
    "cliente": {
      "condFiscal": "Responsable Inscripto - Factura A",
      "tarifaTipo": {
        "eventual": false,
        "general": true,
        "personalizada": false,
        "especial": false
      },
      "tarifaAsignada": true,
      "direccionFiscal": {
        "domicilio": "Rodriguez Peña 205",
        "localidad": "Luzuriaga",
        "municipio": "Maipú",
        "provincia": "Mendoza"
      },
      "idCliente": 1736356938304,
      "idTarifa": 1745279918277,
      "id": "HPceY9retp6KCsNOPJia",
      "cuit": 30601502778,
      "razonSocial": "Andesmar Cargas SA",
      "contactos": [
        {
          "apellido": "Paz",
          "puesto": "Jefe Logistica",
          "telefono": "1126439403",
          "nombre": "Juan",
          "email": "juanpaz@andesmar.com.ar"
        },
        {
          "telefono": "1133579699",
          "apellido": "Marchetti",
          "email": "",
          "puesto": "Encargado de Logistica",
          "nombre": "Ramiro"
        }
      ],
      "direccionOperativa": {
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "localidad": "Avellaneda"
      },
      "type": "modified"
    },
    "multiplicadorCliente": 1,
    "tarifaTipo": {
      "eventual": false,
      "personalizada": false,
      "especial": false,
      "general": true
    },
    "acompaniante": false,
    "hojaRuta": "",
    "multiplicadorChofer": 1,
    "facturaCliente": 1745887291837,
    "estado": {
      "facChofer": false,
      "cerrada": false,
      "facturada": true,
      "facCliente": false,
      "abierta": false
    },
    "chofer": {
      "vehiculo": [
        {
          "publicidad": false,
          "refrigeracion": null,
          "tipoCombustible": [
            "Nafta"
          ],
          "modelo": "Partner",
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "marca": "Peugeot",
          "satelital": "Stop Car",
          "tarjetaCombustible": false,
          "dominio": "LUC928",
          "segSat": true
        }
      ],
      "idProveedor": 0,
      "type": "modified",
      "celularContacto": "1133652485",
      "tarifaTipo": {
        "general": true,
        "personalizada": false,
        "especial": false,
        "eventual": false
      },
      "tarifaAsignada": true,
      "celularEmergencia": "1161671994",
      "id": "jhjDx7Yh3lf56iAFBWWp",
      "idChofer": 1736727991651,
      "nombre": "Matias Alberto",
      "apellido": "Fernandez",
      "fechaNac": "1996-03-07",
      "contactoEmergencia": "Stella",
      "condFiscal": "Monotributista - Factura C",
      "cuit": 20389286750,
      "idTarifa": 1745280075582,
      "email": "fndzmatias@gmail.com",
      "direccion": {
        "domicilio": "Pje Rosa Acevedo 1049",
        "provincia": "Buenos Aires",
        "municipio": "Lanús",
        "localidad": "Lanús Oeste"
      }
    },
    "documentacion": null
  },
  {
    "id": "tQWCJiMwW2Fcia10LBvf",
    "valores": {
      "cliente": {
        "kmAdicional": 8000,
        "acompValor": 0,
        "tarifaBase": 142500,
        "aCobrar": 150500
      },
      "chofer": {
        "tarifaBase": 108900,
        "kmAdicional": 6160,
        "acompValor": 0,
        "aPagar": 115060
      }
    },
    "km": 62,
    "multiplicadorCliente": 1.5,
    "acompaniante": false,
    "patenteChofer": "OPB248",
    "tarifaEventual": {
      "cliente": {
        "valor": 0,
        "concepto": ""
      },
      "chofer": {
        "concepto": "",
        "valor": 0
      }
    },
    "fecha": "2025-04-17",
    "observaciones": "",
    "multiplicadorChofer": 1.5,
    "tarifaTipo": {
      "eventual": false,
      "personalizada": false,
      "especial": false,
      "general": true
    },
    "tarifaPersonalizada": {
      "nombre": "",
      "aCobrar": 0,
      "categoria": 0,
      "aPagar": 0,
      "seccion": 0
    },
    "facturaCliente": 1745954612866,
    "idOperacion": 1745369279675,
    "estado": {
      "facChofer": false,
      "abierta": false,
      "facCliente": false,
      "facturada": true,
      "cerrada": false
    },
    "documentacion": null,
    "hojaRuta": "",
    "facturaChofer": 1745954612866,
    "chofer": {
      "celularEmergencia": "1139135361",
      "idProveedor": 0,
      "apellido": "Fernandez",
      "fechaNac": "2002-08-09",
      "id": "IYdOM7gOiBPrLRIukidg",
      "tarifaAsignada": true,
      "direccion": {
        "domicilio": "R. de Escalada  de San Martin 1483",
        "provincia": "Buenos Aires",
        "localidad": "Lanús Oeste",
        "municipio": "Lanús"
      },
      "celularContacto": "1166620796",
      "condFiscal": "Monotributista - Factura C",
      "idChofer": 1736728211494,
      "contactoEmergencia": "Maitena Rodríguez",
      "email": "toma.f@hotmail.com",
      "idTarifa": 1745280075582,
      "tarifaTipo": {
        "personalizada": false,
        "especial": false,
        "general": true,
        "eventual": false
      },
      "vehiculo": [
        {
          "publicidad": false,
          "modelo": "Partner",
          "marca": "Peugeot",
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "dominio": "OPB248",
          "satelital": "Stop Car",
          "refrigeracion": null,
          "tarjetaCombustible": false,
          "segSat": true,
          "tipoCombustible": [
            "Nafta"
          ]
        }
      ],
      "type": "modified",
      "nombre": "Tomas Yamil",
      "cuit": 20443384900
    },
    "cliente": {
      "tarifaAsignada": true,
      "contactos": [
        {
          "email": "juanpaz@andesmar.com.ar",
          "apellido": "Paz",
          "telefono": "1126439403",
          "puesto": "Jefe Logistica",
          "nombre": "Juan"
        },
        {
          "puesto": "Encargado de Logistica",
          "email": "",
          "apellido": "Marchetti",
          "nombre": "Ramiro",
          "telefono": "1133579699"
        }
      ],
      "idCliente": 1736356938304,
      "razonSocial": "Andesmar Cargas SA",
      "idTarifa": 1745279918277,
      "direccionOperativa": {
        "domicilio": "General Gorriti 650 - Avellaneda",
        "municipio": "Avellaneda",
        "localidad": "Avellaneda",
        "provincia": "Buenos Aires"
      },
      "direccionFiscal": {
        "municipio": "Maipú",
        "provincia": "Mendoza",
        "localidad": "Luzuriaga",
        "domicilio": "Rodriguez Peña 205"
      },
      "id": "HPceY9retp6KCsNOPJia",
      "cuit": 30601502778,
      "condFiscal": "Responsable Inscripto - Factura A",
      "tarifaTipo": {
        "eventual": false,
        "personalizada": false,
        "general": true,
        "especial": false
      },
      "type": "modified"
    }
  },
  {
    "id": "W2CNDmlFkZqHZ8lNpoH1",
    "km": 172,
    "fecha": "2025-04-17",
    "acompaniante": false,
    "idOperacion": 1745369279679,
    "estado": {
      "facCliente": false,
      "facChofer": false,
      "cerrada": false,
      "abierta": false,
      "facturada": true
    },
    "tarifaEventual": {
      "cliente": {
        "valor": 0,
        "concepto": ""
      },
      "chofer": {
        "concepto": "",
        "valor": 0
      }
    },
    "multiplicadorCliente": 1,
    "cliente": {
      "direccionOperativa": {
        "localidad": "Avellaneda",
        "provincia": "Buenos Aires",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "municipio": "Avellaneda"
      },
      "tarifaTipo": {
        "personalizada": false,
        "eventual": false,
        "general": true,
        "especial": false
      },
      "idCliente": 1736356938304,
      "razonSocial": "Andesmar Cargas SA",
      "tarifaAsignada": true,
      "contactos": [
        {
          "telefono": "1126439403",
          "email": "juanpaz@andesmar.com.ar",
          "nombre": "Juan",
          "apellido": "Paz",
          "puesto": "Jefe Logistica"
        },
        {
          "email": "",
          "puesto": "Encargado de Logistica",
          "nombre": "Ramiro",
          "apellido": "Marchetti",
          "telefono": "1133579699"
        }
      ],
      "cuit": 30601502778,
      "type": "modified",
      "condFiscal": "Responsable Inscripto - Factura A",
      "direccionFiscal": {
        "localidad": "Luzuriaga",
        "provincia": "Mendoza",
        "domicilio": "Rodriguez Peña 205",
        "municipio": "Maipú"
      },
      "idTarifa": 1745279918277,
      "id": "HPceY9retp6KCsNOPJia"
    },
    "multiplicadorChofer": 1,
    "valores": {
      "chofer": {
        "kmAdicional": 40040,
        "tarifaBase": 72600,
        "acompValor": 0,
        "aPagar": 112640
      },
      "cliente": {
        "kmAdicional": 52000,
        "acompValor": 0,
        "aCobrar": 147000,
        "tarifaBase": 95000
      }
    },
    "tarifaPersonalizada": {
      "aPagar": 0,
      "nombre": "",
      "categoria": 0,
      "aCobrar": 0,
      "seccion": 0
    },
    "facturaChofer": 1745957245097,
    "hojaRuta": "",
    "chofer": {
      "tarifaTipo": {
        "personalizada": false,
        "eventual": false,
        "general": true,
        "especial": false
      },
      "vehiculo": [
        {
          "publicidad": false,
          "dominio": "LCP568",
          "marca": "Fiat",
          "refrigeracion": null,
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "satelital": "Stop Car",
          "modelo": "Fiorino",
          "tipoCombustible": [
            "Nafta"
          ],
          "segSat": true,
          "tarjetaCombustible": true
        }
      ],
      "contactoEmergencia": "Mariana Podokian",
      "idChofer": 1736791944623,
      "condFiscal": "Monotributista - Factura C",
      "tarifaAsignada": true,
      "idTarifa": 1745280075582,
      "cuit": 20235231531,
      "apellido": "Venegas",
      "celularEmergencia": "1139103989",
      "direccion": {
        "domicilio": "Tuyuti 3003",
        "provincia": "Buenos Aires",
        "localidad": "Valentín Alsina",
        "municipio": "Lanús"
      },
      "email": "adrianvenegas7573@gmail.com",
      "fechaNac": "1973-09-10",
      "type": "modified",
      "idProveedor": 0,
      "id": "rsFavZLKXlrRMuilBzCS",
      "nombre": "Adrian Ernesto",
      "celularContacto": "1151465696"
    },
    "tarifaTipo": {
      "eventual": false,
      "personalizada": false,
      "especial": false,
      "general": true
    },
    "patenteChofer": "LCP568",
    "facturaCliente": 1745957245097,
    "observaciones": "",
    "documentacion": null
  },
  {
    "id": "S2YTTnnubh6pzlprzpRw",
    "chofer": {
      "apellido": "Andrade",
      "id": "qwWzv5lrgsIxPVDgHybz",
      "contactoEmergencia": "Pareja",
      "nombre": "Daniel Eduardo",
      "cuit": 20171435472,
      "idTarifa": 1745280075582,
      "celularEmergencia": "1132479708",
      "idChofer": 1736603977629,
      "tarifaAsignada": true,
      "email": "proserintsa@gmail.com",
      "idProveedor": 0,
      "type": "modified",
      "vehiculo": [
        {
          "marca": "Ivecco",
          "categoria": {
            "nombre": "Furgon",
            "catOrden": 3
          },
          "modelo": "Daily",
          "refrigeracion": null,
          "tipoCombustible": [
            "Nafta"
          ],
          "segSat": true,
          "publicidad": false,
          "dominio": "OEM143",
          "satelital": "Stop Car",
          "tarjetaCombustible": true
        }
      ],
      "condFiscal": "Monotributista - Factura C",
      "direccion": {
        "domicilio": "Derqui 3686",
        "provincia": "Buenos Aires",
        "localidad": "San Justo",
        "municipio": "La Matanza"
      },
      "tarifaTipo": {
        "especial": false,
        "general": true,
        "eventual": false,
        "personalizada": false
      },
      "fechaNac": "1964-08-17",
      "celularContacto": "1157361377"
    },
    "fecha": "2025-04-17",
    "multiplicadorChofer": 1,
    "hojaRuta": "",
    "estado": {
      "facturada": true,
      "facCliente": false,
      "facChofer": false,
      "cerrada": false,
      "abierta": false
    },
    "idOperacion": 1745369279674,
    "tarifaPersonalizada": {
      "aCobrar": 0,
      "seccion": 0,
      "nombre": "",
      "aPagar": 0,
      "categoria": 0
    },
    "tarifaTipo": {
      "general": true,
      "especial": false,
      "personalizada": false,
      "eventual": false
    },
    "valores": {
      "cliente": {
        "kmAdicional": 52000,
        "tarifaBase": 225000,
        "acompValor": 50000,
        "aCobrar": 327000
      },
      "chofer": {
        "tarifaBase": 165000,
        "aPagar": 243720,
        "acompValor": 40000,
        "kmAdicional": 38720
      }
    },
    "acompaniante": true,
    "km": 123,
    "tarifaEventual": {
      "chofer": {
        "concepto": "",
        "valor": 0
      },
      "cliente": {
        "concepto": "",
        "valor": 0
      }
    },
    "documentacion": null,
    "facturaCliente": 1745883355218,
    "facturaChofer": 1745883355218,
    "patenteChofer": "OEM143",
    "multiplicadorCliente": 1,
    "observaciones": "",
    "cliente": {
      "idTarifa": 1745279918277,
      "cuit": 30601502778,
      "tarifaAsignada": true,
      "direccionFiscal": {
        "domicilio": "Rodriguez Peña 205",
        "municipio": "Maipú",
        "provincia": "Mendoza",
        "localidad": "Luzuriaga"
      },
      "id": "HPceY9retp6KCsNOPJia",
      "razonSocial": "Andesmar Cargas SA",
      "tarifaTipo": {
        "personalizada": false,
        "general": true,
        "eventual": false,
        "especial": false
      },
      "idCliente": 1736356938304,
      "type": "modified",
      "direccionOperativa": {
        "localidad": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda"
      },
      "contactos": [
        {
          "puesto": "Jefe Logistica",
          "nombre": "Juan",
          "apellido": "Paz",
          "email": "juanpaz@andesmar.com.ar",
          "telefono": "1126439403"
        },
        {
          "telefono": "1133579699",
          "nombre": "Ramiro",
          "puesto": "Encargado de Logistica",
          "email": "",
          "apellido": "Marchetti"
        }
      ],
      "condFiscal": "Responsable Inscripto - Factura A"
    }
  },
  {
    "id": "GEO8HGZXF7rwo8NWg5gI",
    "tarifaTipo": {
      "personalizada": false,
      "especial": false,
      "eventual": false,
      "general": true
    },
    "multiplicadorChofer": 1,
    "facturaCliente": 1745956151463,
    "multiplicadorCliente": 1,
    "patenteChofer": "HPP453",
    "fecha": "2025-04-17",
    "km": 89,
    "idOperacion": 1745369279677,
    "observaciones": "",
    "tarifaPersonalizada": {
      "seccion": 0,
      "nombre": "",
      "aCobrar": 0,
      "categoria": 0,
      "aPagar": 0
    },
    "valores": {
      "chofer": {
        "acompValor": 0,
        "aPagar": 141020,
        "tarifaBase": 126500,
        "kmAdicional": 14520
      },
      "cliente": {
        "acompValor": 0,
        "kmAdicional": 20000,
        "aCobrar": 195000,
        "tarifaBase": 175000
      }
    },
    "acompaniante": false,
    "facturaChofer": 1745956151463,
    "chofer": {
      "cuit": 20380305381,
      "vehiculo": [
        {
          "segSat": true,
          "modelo": "Transporter",
          "dominio": "HPP453",
          "publicidad": false,
          "tipoCombustible": [
            "nafta"
          ],
          "tarjetaCombustible": true,
          "marca": "Volkswagen",
          "refrigeracion": null,
          "categoria": {
            "nombre": "Maxi",
            "catOrden": 2
          },
          "satelital": "Stop Car"
        }
      ],
      "id": "75TLs99t6qSNTuHessGQ",
      "apellido": "Quiroga",
      "celularContacto": "1130719809",
      " condFiscal": "",
      "fechaNac": "1994-02-01",
      "email": "actualizar@gmail.com",
      "contactoEmergencia": "",
      "idTarifa": 1745280075582,
      "idChofer": 1736730226989,
      "tarifaAsignada": true,
      "tarifaTipo": {
        "general": true,
        "eventual": false,
        "personalizada": false,
        "especial": false
      },
      "celularEmergencia": "",
      "direccion": {
        "localidad": "",
        "domicilio": "Juncal 777 - Lanus",
        " municipio": "",
        "provincia": ""
      },
      "type": "modified",
      "nombre": "Ariel Omar",
      "idProveedor": 0
    },
    "estado": {
      "cerrada": false,
      "facCliente": false,
      "facturada": true,
      "abierta": false,
      "facChofer": false
    },
    "hojaRuta": "",
    "tarifaEventual": {
      "chofer": {
        "concepto": "",
        "valor": 0
      },
      "cliente": {
        "valor": 0,
        "concepto": ""
      }
    },
    "cliente": {
      "cuit": 30601502778,
      "direccionFiscal": {
        "provincia": "Mendoza",
        "domicilio": "Rodriguez Peña 205",
        "localidad": "Luzuriaga",
        "municipio": "Maipú"
      },
      "contactos": [
        {
          "nombre": "Juan",
          "apellido": "Paz",
          "email": "juanpaz@andesmar.com.ar",
          "puesto": "Jefe Logistica",
          "telefono": "1126439403"
        },
        {
          "nombre": "Ramiro",
          "telefono": "1133579699",
          "email": "",
          "puesto": "Encargado de Logistica",
          "apellido": "Marchetti"
        }
      ],
      "id": "HPceY9retp6KCsNOPJia",
      "razonSocial": "Andesmar Cargas SA",
      "idTarifa": 1745279918277,
      "type": "modified",
      "idCliente": 1736356938304,
      "tarifaAsignada": true,
      "condFiscal": "Responsable Inscripto - Factura A",
      "tarifaTipo": {
        "eventual": false,
        "especial": false,
        "personalizada": false,
        "general": true
      },
      "direccionOperativa": {
        "municipio": "Avellaneda",
        "provincia": "Buenos Aires",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "localidad": "Avellaneda"
      }
    },
    "documentacion": null
  },
  {
    "id": "5PmXKLsxBvWz6hzH1gTw",
    "fecha": "2025-04-17",
    "observaciones": "",
    "acompaniante": false,
    "documentacion": null,
    "tarifaEventual": {
      "chofer": {
        "valor": 0,
        "concepto": ""
      },
      "cliente": {
        "concepto": "",
        "valor": 0
      }
    },
    "multiplicadorCliente": 1,
    "estado": {
      "facCliente": false,
      "cerrada": false,
      "abierta": false,
      "facturada": true,
      "facChofer": false
    },
    "chofer": {
      "type": "modified",
      "celularContacto": "1153499040",
      "tarifaTipo": {
        "personalizada": false,
        "especial": false,
        "general": true,
        "eventual": false
      },
      "id": "vIsDMqhm9hag6LXDt28I",
      "vehiculo": [
        {
          "satelital": "Stop Car",
          "modelo": "Fiorino",
          "tipoCombustible": [
            "Nafta"
          ],
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "publicidad": false,
          "refrigeracion": null,
          "segSat": true,
          "marca": "Fiat",
          "dominio": "AD071GH",
          "tarjetaCombustible": false
        }
      ],
      "cuit": 20410488392,
      "condFiscal": "Monotributista - Factura C",
      "email": "cristiannicolassoto1303@gmail.com",
      "idTarifa": 1745280075582,
      "fechaNac": "1998-03-13",
      "contactoEmergencia": "Lorena Soto",
      "tarifaAsignada": true,
      "direccion": {
        "municipio": "Avellaneda",
        "domicilio": "Pasaje Cerviño 312",
        "provincia": "Buenos Aires",
        "localidad": "Sarandí"
      },
      "celularEmergencia": "1123711081",
      "idProveedor": 0,
      "idChofer": 1736792086528,
      "nombre": "Christian Nicolas",
      "apellido": "Soto"
    },
    "tarifaTipo": {
      "eventual": false,
      "general": true,
      "especial": false,
      "personalizada": false
    },
    "tarifaPersonalizada": {
      "aCobrar": 0,
      "aPagar": 0,
      "seccion": 0,
      "nombre": "",
      "categoria": 0
    },
    "multiplicadorChofer": 1,
    "facturaChofer": 1745888559635,
    "idOperacion": 1745369279678,
    "valores": {
      "cliente": {
        "tarifaBase": 95000,
        "aCobrar": 99000,
        "acompValor": 0,
        "kmAdicional": 4000
      },
      "chofer": {
        "tarifaBase": 72600,
        "acompValor": 0,
        "kmAdicional": 3080,
        "aPagar": 75680
      }
    },
    "hojaRuta": "",
    "facturaCliente": 1745888559635,
    "km": 52,
    "cliente": {
      "idCliente": 1736356938304,
      "direccionFiscal": {
        "localidad": "Luzuriaga",
        "municipio": "Maipú",
        "provincia": "Mendoza",
        "domicilio": "Rodriguez Peña 205"
      },
      "tarifaAsignada": true,
      "razonSocial": "Andesmar Cargas SA",
      "cuit": 30601502778,
      "direccionOperativa": {
        "domicilio": "General Gorriti 650 - Avellaneda",
        "provincia": "Buenos Aires",
        "localidad": "Avellaneda",
        "municipio": "Avellaneda"
      },
      "tarifaTipo": {
        "eventual": false,
        "general": true,
        "personalizada": false,
        "especial": false
      },
      "condFiscal": "Responsable Inscripto - Factura A",
      "idTarifa": 1745279918277,
      "type": "modified",
      "contactos": [
        {
          "apellido": "Paz",
          "puesto": "Jefe Logistica",
          "nombre": "Juan",
          "email": "juanpaz@andesmar.com.ar",
          "telefono": "1126439403"
        },
        {
          "telefono": "1133579699",
          "email": "",
          "apellido": "Marchetti",
          "puesto": "Encargado de Logistica",
          "nombre": "Ramiro"
        }
      ],
      "id": "HPceY9retp6KCsNOPJia"
    },
    "patenteChofer": "AD071GH"
  },
  {
    "id": "zOGmAQOXoiieVyUadkEi",
    "cliente": {
      "type": "modified",
      "tarifaTipo": {
        "eventual": false,
        "general": true,
        "personalizada": false,
        "especial": false
      },
      "idCliente": 1736356938304,
      "cuit": 30601502778,
      "direccionFiscal": {
        "provincia": "Mendoza",
        "localidad": "Luzuriaga",
        "municipio": "Maipú",
        "domicilio": "Rodriguez Peña 205"
      },
      "id": "HPceY9retp6KCsNOPJia",
      "idTarifa": 1736356577273,
      "razonSocial": "Andesmar Cargas SA",
      "direccionOperativa": {
        "domicilio": "General Gorriti 650 - Avellaneda",
        "localidad": "Avellaneda",
        "municipio": "Avellaneda",
        "provincia": "Buenos Aires"
      },
      "condFiscal": "Responsable Inscripto - Factura A",
      "contactos": [
        {
          "email": "juanpaz@andesmar.com.ar",
          "telefono": "1126439403",
          "nombre": "Juan",
          "puesto": "Jefe Logistica",
          "apellido": "Paz"
        },
        {
          "apellido": "Marchetti",
          "email": "",
          "puesto": "Encargado de Logistica",
          "nombre": "Ramiro",
          "telefono": "1133579699"
        }
      ],
      "tarifaAsignada": true
    },
    "valores": {
      "chofer": {
        "acompValor": 0,
        "tarifaBase": 72600,
        "kmAdicional": 6160,
        "aPagar": 78760
      },
      "cliente": {
        "aCobrar": 103000,
        "kmAdicional": 8000,
        "tarifaBase": 95000,
        "acompValor": 0
      }
    },
    "tarifaTipo": {
      "general": true,
      "especial": false,
      "personalizada": false,
      "eventual": false
    },
    "km": 68,
    "patenteChofer": "LCP568",
    "multiplicadorChofer": 1,
    "facturaCliente": 1745888261167,
    "estado": {
      "facChofer": false,
      "facCliente": false,
      "facturada": true,
      "cerrada": false,
      "abierta": false
    },
    "multiplicadorCliente": 1,
    "chofer": {
      "idChofer": 1736791944623,
      "nombre": "Adrian Ernesto",
      "cuit": 20235231531,
      "idTarifa": 1736793791030,
      "tarifaAsignada": true,
      "id": "rsFavZLKXlrRMuilBzCS",
      "celularEmergencia": "1139103989",
      "condFiscal": "Monotributista - Factura C",
      "direccion": {
        "localidad": "Valentín Alsina",
        "domicilio": "Tuyuti 3003",
        "municipio": "Lanús",
        "provincia": "Buenos Aires"
      },
      "contactoEmergencia": "Mariana Podokian",
      "fechaNac": "1973-09-10",
      "email": "adrianvenegas7573@gmail.com",
      "tarifaTipo": {
        "personalizada": false,
        "general": true,
        "especial": false,
        "eventual": false
      },
      "apellido": "Venegas",
      "celularContacto": "1151465696",
      "vehiculo": [
        {
          "tipoCombustible": [
            "Nafta"
          ],
          "segSat": true,
          "refrigeracion": null,
          "modelo": "Fiorino",
          "satelital": "Stop Car",
          "publicidad": false,
          "tarjetaCombustible": true,
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "marca": "Fiat",
          "dominio": "LCP568"
        }
      ],
      "type": "modified",
      "idProveedor": 0
    },
    "tarifaEventual": {
      "chofer": {
        "concepto": "",
        "valor": 0
      },
      "cliente": {
        "valor": 0,
        "concepto": ""
      }
    },
    "fecha": "2025-04-16",
    "observaciones": "",
    "acompaniante": false,
    "tarifaPersonalizada": {
      "seccion": 0,
      "categoria": 0,
      "nombre": "",
      "aPagar": 0,
      "aCobrar": 0
    },
    "idOperacion": 1744904513484,
    "documentacion": null,
    "hojaRuta": "",
    "facturaChofer": 1745888261167
  },
  {
    "id": "qD48NBN3vtvsiuVUuDah",
    "valores": {
      "chofer": {
        "tarifaBase": 126500,
        "kmAdicional": 14520,
        "aPagar": 141020,
        "acompValor": 0
      },
      "cliente": {
        "kmAdicional": 20000,
        "tarifaBase": 175000,
        "acompValor": 0,
        "aCobrar": 195000
      }
    },
    "observaciones": "",
    "facturaChofer": 1745956163667,
    "tarifaPersonalizada": {
      "nombre": "",
      "seccion": 0,
      "aCobrar": 0,
      "categoria": 0,
      "aPagar": 0
    },
    "tarifaTipo": {
      "especial": false,
      "personalizada": false,
      "general": true,
      "eventual": false
    },
    "acompaniante": false,
    "facturaCliente": 1745956163667,
    "chofer": {
      "celularContacto": "1130719809",
      "id": "75TLs99t6qSNTuHessGQ",
      "vehiculo": [
        {
          "categoria": {
            "nombre": "Maxi",
            "catOrden": 2
          },
          "dominio": "HPP453",
          "refrigeracion": null,
          "satelital": "Stop Car",
          "publicidad": false,
          "tarjetaCombustible": true,
          "segSat": true,
          "marca": "Volkswagen",
          "modelo": "Transporter",
          "tipoCombustible": [
            "nafta"
          ]
        }
      ],
      "apellido": "Quiroga",
      "direccion": {
        "provincia": "",
        "localidad": "",
        "domicilio": "Juncal 777 - Lanus",
        " municipio": ""
      },
      " condFiscal": "",
      "email": "actualizar@gmail.com",
      "contactoEmergencia": "",
      "type": "modified",
      "tarifaAsignada": true,
      "idTarifa": 1736793791030,
      "fechaNac": "1994-02-01",
      "celularEmergencia": "",
      "nombre": "Ariel Omar",
      "idChofer": 1736730226989,
      "tarifaTipo": {
        "especial": false,
        "personalizada": false,
        "general": true,
        "eventual": false
      },
      "cuit": 20380305381,
      "idProveedor": 0
    },
    "hojaRuta": "",
    "fecha": "2025-04-16",
    "cliente": {
      "cuit": 30601502778,
      "idCliente": 1736356938304,
      "contactos": [
        {
          "email": "juanpaz@andesmar.com.ar",
          "apellido": "Paz",
          "telefono": "1126439403",
          "nombre": "Juan",
          "puesto": "Jefe Logistica"
        },
        {
          "email": "",
          "nombre": "Ramiro",
          "puesto": "Encargado de Logistica",
          "telefono": "1133579699",
          "apellido": "Marchetti"
        }
      ],
      "tarifaTipo": {
        "especial": false,
        "eventual": false,
        "general": true,
        "personalizada": false
      },
      "type": "modified",
      "direccionFiscal": {
        "domicilio": "Rodriguez Peña 205",
        "provincia": "Mendoza",
        "localidad": "Luzuriaga",
        "municipio": "Maipú"
      },
      "condFiscal": "Responsable Inscripto - Factura A",
      "razonSocial": "Andesmar Cargas SA",
      "idTarifa": 1736356577273,
      "tarifaAsignada": true,
      "direccionOperativa": {
        "domicilio": "General Gorriti 650 - Avellaneda",
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda",
        "localidad": "Avellaneda"
      },
      "id": "HPceY9retp6KCsNOPJia"
    },
    "idOperacion": 1744904513482,
    "tarifaEventual": {
      "chofer": {
        "concepto": "",
        "valor": 0
      },
      "cliente": {
        "valor": 0,
        "concepto": ""
      }
    },
    "patenteChofer": "HPP453",
    "km": 87,
    "documentacion": null,
    "multiplicadorChofer": 1,
    "multiplicadorCliente": 1,
    "estado": {
      "facCliente": false,
      "cerrada": false,
      "facturada": true,
      "facChofer": false,
      "abierta": false
    }
  },
  {
    "id": "hmzOf8C37Q6bYa62eJpm",
    "estado": {
      "facChofer": false,
      "facturada": true,
      "cerrada": false,
      "facCliente": false,
      "abierta": false
    },
    "facturaCliente": 1745887097591,
    "tarifaEventual": {
      "chofer": {
        "concepto": "",
        "valor": 0
      },
      "cliente": {
        "concepto": "",
        "valor": 0
      }
    },
    "km": 0,
    "multiplicadorCliente": 1.5,
    "cliente": {
      "tarifaTipo": {
        "especial": false,
        "eventual": false,
        "personalizada": false,
        "general": true
      },
      "idTarifa": 1736356577273,
      "type": "modified",
      "id": "HPceY9retp6KCsNOPJia",
      "condFiscal": "Responsable Inscripto - Factura A",
      "razonSocial": "Andesmar Cargas SA",
      "direccionFiscal": {
        "localidad": "Luzuriaga",
        "municipio": "Maipú",
        "domicilio": "Rodriguez Peña 205",
        "provincia": "Mendoza"
      },
      "tarifaAsignada": true,
      "contactos": [
        {
          "apellido": "Paz",
          "nombre": "Juan",
          "puesto": "Jefe Logistica",
          "telefono": "1126439403",
          "email": "juanpaz@andesmar.com.ar"
        },
        {
          "email": "",
          "nombre": "Ramiro",
          "telefono": "1133579699",
          "puesto": "Encargado de Logistica",
          "apellido": "Marchetti"
        }
      ],
      "cuit": 30601502778,
      "idCliente": 1736356938304,
      "direccionOperativa": {
        "provincia": "Buenos Aires",
        "localidad": "Avellaneda",
        "municipio": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda"
      }
    },
    "multiplicadorChofer": 1.5,
    "observaciones": "",
    "valores": {
      "cliente": {
        "aCobrar": 142500,
        "kmAdicional": 0,
        "acompValor": 0,
        "tarifaBase": 142500
      },
      "chofer": {
        "tarifaBase": 108900,
        "aPagar": 108900,
        "acompValor": 0,
        "kmAdicional": 0
      }
    },
    "documentacion": null,
    "facturaChofer": 1745887097591,
    "tarifaPersonalizada": {
      "aCobrar": 0,
      "aPagar": 0,
      "seccion": 0,
      "nombre": "",
      "categoria": 0
    },
    "fecha": "2025-04-16",
    "hojaRuta": "",
    "acompaniante": false,
    "patenteChofer": "OPB248",
    "idOperacion": 1744904513480,
    "tarifaTipo": {
      "general": true,
      "especial": false,
      "eventual": false,
      "personalizada": false
    },
    "chofer": {
      "celularEmergencia": "1139135361",
      "fechaNac": "2002-08-09",
      "celularContacto": "1166620796",
      "cuit": 20443384900,
      "tarifaTipo": {
        "general": true,
        "especial": false,
        "eventual": false,
        "personalizada": false
      },
      "contactoEmergencia": "Maitena Rodríguez",
      "idProveedor": 0,
      "email": "toma.f@hotmail.com",
      "nombre": "Tomas Yamil",
      "tarifaAsignada": true,
      "condFiscal": "Monotributista - Factura C",
      "type": "modified",
      "direccion": {
        "localidad": "Lanús Oeste",
        "municipio": "Lanús",
        "provincia": "Buenos Aires",
        "domicilio": "R. de Escalada  de San Martin 1483"
      },
      "apellido": "Fernandez",
      "idTarifa": 1736793791030,
      "id": "IYdOM7gOiBPrLRIukidg",
      "vehiculo": [
        {
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "refrigeracion": null,
          "marca": "Peugeot",
          "segSat": true,
          "tipoCombustible": [
            "Nafta"
          ],
          "dominio": "OPB248",
          "satelital": "Stop Car",
          "modelo": "Partner",
          "publicidad": false,
          "tarjetaCombustible": false
        }
      ],
      "idChofer": 1736728211494
    }
  },
  {
    "id": "TCUOOL88QArRGHcPotRw",
    "multiplicadorCliente": 1,
    "km": 126,
    "documentacion": null,
    "idOperacion": 1744904513479,
    "chofer": {
      "cuit": 20171435472,
      "idChofer": 1736603977629,
      "fechaNac": "1964-08-17",
      "tarifaAsignada": true,
      "celularContacto": "1157361377",
      "vehiculo": [
        {
          "tipoCombustible": [
            "Nafta"
          ],
          "marca": "Ivecco",
          "publicidad": false,
          "dominio": "OEM143",
          "modelo": "Daily",
          "refrigeracion": null,
          "satelital": "Stop Car",
          "segSat": true,
          "tarjetaCombustible": true,
          "categoria": {
            "nombre": "Furgon",
            "catOrden": 3
          }
        }
      ],
      "email": "proserintsa@gmail.com",
      "apellido": "Andrade",
      "id": "qwWzv5lrgsIxPVDgHybz",
      "nombre": "Daniel Eduardo",
      "tarifaTipo": {
        "general": true,
        "eventual": false,
        "personalizada": false,
        "especial": false
      },
      "celularEmergencia": "1132479708",
      "type": "modified",
      "idProveedor": 0,
      "condFiscal": "Monotributista - Factura C",
      "contactoEmergencia": "Pareja",
      "direccion": {
        "domicilio": "Derqui 3686",
        "municipio": "La Matanza",
        "provincia": "Buenos Aires",
        "localidad": "San Justo"
      },
      "idTarifa": 1736793791030
    },
    "cliente": {
      "condFiscal": "Responsable Inscripto - Factura A",
      "tarifaTipo": {
        "general": true,
        "eventual": false,
        "personalizada": false,
        "especial": false
      },
      "idTarifa": 1736356577273,
      "idCliente": 1736356938304,
      "direccionOperativa": {
        "provincia": "Buenos Aires",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "localidad": "Avellaneda",
        "municipio": "Avellaneda"
      },
      "contactos": [
        {
          "email": "juanpaz@andesmar.com.ar",
          "puesto": "Jefe Logistica",
          "telefono": "1126439403",
          "nombre": "Juan",
          "apellido": "Paz"
        },
        {
          "email": "",
          "nombre": "Ramiro",
          "puesto": "Encargado de Logistica",
          "apellido": "Marchetti",
          "telefono": "1133579699"
        }
      ],
      "cuit": 30601502778,
      "type": "modified",
      "razonSocial": "Andesmar Cargas SA",
      "tarifaAsignada": true,
      "direccionFiscal": {
        "domicilio": "Rodriguez Peña 205",
        "localidad": "Luzuriaga",
        "municipio": "Maipú",
        "provincia": "Mendoza"
      },
      "id": "HPceY9retp6KCsNOPJia"
    },
    "observaciones": "",
    "hojaRuta": "",
    "multiplicadorChofer": 1,
    "facturaChofer": 1745883375042,
    "tarifaPersonalizada": {
      "categoria": 0,
      "aPagar": 0,
      "seccion": 0,
      "aCobrar": 0,
      "nombre": ""
    },
    "tarifaTipo": {
      "general": true,
      "personalizada": false,
      "especial": false,
      "eventual": false
    },
    "acompaniante": false,
    "valores": {
      "cliente": {
        "acompValor": 0,
        "aCobrar": 277000,
        "tarifaBase": 225000,
        "kmAdicional": 52000
      },
      "chofer": {
        "aPagar": 203720,
        "acompValor": 0,
        "tarifaBase": 165000,
        "kmAdicional": 38720
      }
    },
    "fecha": "2025-04-16",
    "tarifaEventual": {
      "cliente": {
        "valor": 0,
        "concepto": ""
      },
      "chofer": {
        "valor": 0,
        "concepto": ""
      }
    },
    "patenteChofer": "OEM143",
    "estado": {
      "facChofer": false,
      "facturada": true,
      "facCliente": false,
      "cerrada": false,
      "abierta": false
    },
    "facturaCliente": 1745883375042
  },
  {
    "id": "GP8JG1prCfWKLkY2BBiq",
    "hojaRuta": "",
    "km": 124,
    "chofer": {
      "id": "vIsDMqhm9hag6LXDt28I",
      "tarifaTipo": {
        "eventual": false,
        "especial": false,
        "personalizada": false,
        "general": true
      },
      "cuit": 20410488392,
      "type": "modified",
      "direccion": {
        "localidad": "Sarandí",
        "municipio": "Avellaneda",
        "provincia": "Buenos Aires",
        "domicilio": "Pasaje Cerviño 312"
      },
      "contactoEmergencia": "Lorena Soto",
      "tarifaAsignada": true,
      "idChofer": 1736792086528,
      "vehiculo": [
        {
          "publicidad": false,
          "tarjetaCombustible": false,
          "satelital": "Stop Car",
          "marca": "Fiat",
          "dominio": "AD071GH",
          "refrigeracion": null,
          "categoria": {
            "nombre": "Mini",
            "catOrden": 1
          },
          "tipoCombustible": [
            "Nafta"
          ],
          "segSat": true,
          "modelo": "Fiorino"
        }
      ],
      "nombre": "Christian Nicolas",
      "apellido": "Soto",
      "condFiscal": "Monotributista - Factura C",
      "email": "cristiannicolassoto1303@gmail.com",
      "fechaNac": "1998-03-13",
      "celularContacto": "1153499040",
      "celularEmergencia": "1123711081",
      "idProveedor": 0,
      "idTarifa": 1736793791030
    },
    "facturaCliente": 1745888566476,
    "fecha": "2025-04-16",
    "facturaChofer": 1745888566476,
    "tarifaEventual": {
      "chofer": {
        "valor": 0,
        "concepto": ""
      },
      "cliente": {
        "concepto": "",
        "valor": 0
      }
    },
    "multiplicadorCliente": 1,
    "cliente": {
      "type": "modified",
      "cuit": 30601502778,
      "direccionOperativa": {
        "municipio": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "provincia": "Buenos Aires",
        "localidad": "Avellaneda"
      },
      "idCliente": 1736356938304,
      "razonSocial": "Andesmar Cargas SA",
      "id": "HPceY9retp6KCsNOPJia",
      "direccionFiscal": {
        "provincia": "Mendoza",
        "localidad": "Luzuriaga",
        "municipio": "Maipú",
        "domicilio": "Rodriguez Peña 205"
      },
      "tarifaAsignada": true,
      "tarifaTipo": {
        "general": true,
        "eventual": false,
        "especial": false,
        "personalizada": false
      },
      "condFiscal": "Responsable Inscripto - Factura A",
      "contactos": [
        {
          "nombre": "Juan",
          "telefono": "1126439403",
          "email": "juanpaz@andesmar.com.ar",
          "apellido": "Paz",
          "puesto": "Jefe Logistica"
        },
        {
          "email": "",
          "telefono": "1133579699",
          "apellido": "Marchetti",
          "puesto": "Encargado de Logistica",
          "nombre": "Ramiro"
        }
      ],
      "idTarifa": 1736356577273
    },
    "tarifaTipo": {
      "personalizada": false,
      "especial": false,
      "eventual": false,
      "general": true
    },
    "observaciones": "",
    "valores": {
      "cliente": {
        "kmAdicional": 32000,
        "aCobrar": 127000,
        "acompValor": 0,
        "tarifaBase": 95000
      },
      "chofer": {
        "kmAdicional": 24640,
        "tarifaBase": 72600,
        "acompValor": 0,
        "aPagar": 97240
      }
    },
    "idOperacion": 1744904513483,
    "documentacion": null,
    "tarifaPersonalizada": {
      "categoria": 0,
      "seccion": 0,
      "nombre": "",
      "aPagar": 0,
      "aCobrar": 0
    },
    "acompaniante": false,
    "multiplicadorChofer": 1,
    "estado": {
      "abierta": false,
      "facturada": true,
      "facChofer": false,
      "facCliente": false,
      "cerrada": false
    },
    "patenteChofer": "AD071GH"
  },
  {
    "id": "CJ6c9IfbUR0X1RA3PwlY",
    "cliente": {
      "type": "modified",
      "idTarifa": 1736356577273,
      "tarifaAsignada": true,
      "razonSocial": "Andesmar Cargas SA",
      "condFiscal": "Responsable Inscripto - Factura A",
      "contactos": [
        {
          "telefono": "1126439403",
          "nombre": "Juan",
          "apellido": "Paz",
          "puesto": "Jefe Logistica",
          "email": "juanpaz@andesmar.com.ar"
        },
        {
          "nombre": "Ramiro",
          "telefono": "1133579699",
          "apellido": "Marchetti",
          "email": "",
          "puesto": "Encargado de Logistica"
        }
      ],
      "direccionFiscal": {
        "municipio": "Maipú",
        "localidad": "Luzuriaga",
        "domicilio": "Rodriguez Peña 205",
        "provincia": "Mendoza"
      },
      "tarifaTipo": {
        "general": true,
        "especial": false,
        "personalizada": false,
        "eventual": false
      },
      "cuit": 30601502778,
      "direccionOperativa": {
        "municipio": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "localidad": "Avellaneda",
        "provincia": "Buenos Aires"
      },
      "idCliente": 1736356938304,
      "id": "HPceY9retp6KCsNOPJia"
    },
    "observaciones": "",
    "multiplicadorCliente": 1,
    "tarifaEventual": {
      "cliente": {
        "valor": 0,
        "concepto": ""
      },
      "chofer": {
        "valor": 0,
        "concepto": ""
      }
    },
    "tarifaTipo": {
      "especial": false,
      "eventual": false,
      "general": true,
      "personalizada": false
    },
    "facturaChofer": 1745887284871,
    "idOperacion": 1744904513481,
    "km": 87,
    "hojaRuta": "",
    "chofer": {
      "condFiscal": "Monotributista - Factura C",
      "celularEmergencia": "1161671994",
      "email": "fndzmatias@gmail.com",
      "apellido": "Fernandez",
      "tarifaTipo": {
        "personalizada": false,
        "general": true,
        "eventual": false,
        "especial": false
      },
      "cuit": 20389286750,
      "idTarifa": 1736793791030,
      "celularContacto": "1133652485",
      "direccion": {
        "provincia": "Buenos Aires",
        "localidad": "Lanús Oeste",
        "municipio": "Lanús",
        "domicilio": "Pje Rosa Acevedo 1049"
      },
      "idProveedor": 0,
      "tarifaAsignada": true,
      "idChofer": 1736727991651,
      "type": "modified",
      "vehiculo": [
        {
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "satelital": "Stop Car",
          "segSat": true,
          "tarjetaCombustible": false,
          "dominio": "LUC928",
          "publicidad": false,
          "marca": "Peugeot",
          "tipoCombustible": [
            "Nafta"
          ],
          "refrigeracion": null,
          "modelo": "Partner"
        }
      ],
      "id": "jhjDx7Yh3lf56iAFBWWp",
      "nombre": "Matias Alberto",
      "fechaNac": "1996-03-07",
      "contactoEmergencia": "Stella"
    },
    "estado": {
      "facturada": true,
      "facCliente": false,
      "cerrada": false,
      "facChofer": false,
      "abierta": false
    },
    "patenteChofer": "LUC928",
    "tarifaPersonalizada": {
      "aPagar": 0,
      "nombre": "",
      "categoria": 0,
      "seccion": 0,
      "aCobrar": 0
    },
    "facturaCliente": 1745887284871,
    "multiplicadorChofer": 1,
    "acompaniante": false,
    "fecha": "2025-04-16",
    "valores": {
      "chofer": {
        "kmAdicional": 12320,
        "tarifaBase": 72600,
        "aPagar": 84920,
        "acompValor": 0
      },
      "cliente": {
        "kmAdicional": 16000,
        "aCobrar": 111000,
        "tarifaBase": 95000,
        "acompValor": 0
      }
    },
    "documentacion": null
  },
  {
    "id": "yIl0cGpFqvHFJNvx1KFt",
    "chofer": {
      "fechaNac": "2002-08-09",
      "tarifaAsignada": true,
      "celularContacto": "1166620796",
      "contactoEmergencia": "Maitena Rodríguez",
      "nombre": "Tomas Yamil",
      "cuit": 20443384900,
      "tarifaTipo": {
        "especial": false,
        "personalizada": false,
        "eventual": false,
        "general": true
      },
      "idProveedor": 0,
      "direccion": {
        "domicilio": "R. de Escalada  de San Martin 1483",
        "localidad": "Lanús Oeste",
        "municipio": "Lanús",
        "provincia": "Buenos Aires"
      },
      "apellido": "Fernandez",
      "type": "modified",
      "condFiscal": "Monotributista - Factura C",
      "id": "IYdOM7gOiBPrLRIukidg",
      "vehiculo": [
        {
          "categoria": {
            "nombre": "Mini",
            "catOrden": 1
          },
          "satelital": "Stop Car",
          "dominio": "OPB248",
          "refrigeracion": null,
          "modelo": "Partner",
          "marca": "Peugeot",
          "publicidad": false,
          "segSat": true,
          "tarjetaCombustible": false,
          "tipoCombustible": [
            "Nafta"
          ]
        }
      ],
      "idChofer": 1736728211494,
      "celularEmergencia": "1139135361",
      "email": "toma.f@hotmail.com",
      "idTarifa": 1736793791030
    },
    "multiplicadorChofer": 1.5,
    "tarifaEventual": {
      "chofer": {
        "valor": 0,
        "concepto": ""
      },
      "cliente": {
        "concepto": "",
        "valor": 0
      }
    },
    "km": 0,
    "valores": {
      "chofer": {
        "aPagar": 99000,
        "kmAdicional": 0,
        "acompValor": 0,
        "tarifaBase": 99000
      },
      "cliente": {
        "aCobrar": 130500,
        "acompValor": 0,
        "tarifaBase": 130500,
        "kmAdicional": 0
      }
    },
    "cliente": {
      "type": "modified",
      "condFiscal": "Responsable Inscripto - Factura A",
      "id": "HPceY9retp6KCsNOPJia",
      "tarifaAsignada": true,
      "tarifaTipo": {
        "especial": false,
        "eventual": false,
        "general": true,
        "personalizada": false
      },
      "idTarifa": 1736356577273,
      "cuit": 30601502778,
      "razonSocial": "Andesmar Cargas SA",
      "idCliente": 1736356938304,
      "contactos": [
        {
          "puesto": "Jefe Logistica",
          "apellido": "Paz",
          "nombre": "Juan",
          "email": "juanpaz@andesmar.com.ar",
          "telefono": "1126439403"
        },
        {
          "telefono": "1133579699",
          "nombre": "Ramiro",
          "puesto": "Encargado de Logistica",
          "email": "",
          "apellido": "Marchetti"
        }
      ],
      "direccionOperativa": {
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda",
        "localidad": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda"
      },
      "direccionFiscal": {
        "municipio": "Maipú",
        "localidad": "Luzuriaga",
        "domicilio": "Rodriguez Peña 205",
        "provincia": "Mendoza"
      }
    },
    "idOperacion": 1744810023785,
    "estado": {
      "abierta": false,
      "facCliente": false,
      "facChofer": false,
      "facturada": true,
      "cerrada": false
    },
    "fecha": "2025-04-15",
    "multiplicadorCliente": 1.5,
    "hojaRuta": "",
    "acompaniante": false,
    "tarifaTipo": {
      "general": true,
      "especial": false,
      "eventual": false,
      "personalizada": false
    },
    "tarifaPersonalizada": {
      "aPagar": 0,
      "aCobrar": 0,
      "nombre": "",
      "seccion": 0,
      "categoria": 0
    },
    "patenteChofer": "OPB248",
    "documentacion": null,
    "facturaCliente": 1745268907704,
    "observaciones": "",
    "facturaChofer": 1745268907705
  },
  {
    "id": "uKHApH1vggng7IsFX1rH",
    "tarifaPersonalizada": {
      "categoria": 0,
      "aPagar": 0,
      "nombre": "",
      "seccion": 0,
      "aCobrar": 0
    },
    "multiplicadorCliente": 1,
    "acompaniante": false,
    "multiplicadorChofer": 1,
    "idOperacion": 1744810023789,
    "tarifaEventual": {
      "chofer": {
        "valor": 0,
        "concepto": ""
      },
      "cliente": {
        "valor": 0,
        "concepto": ""
      }
    },
    "km": 94,
    "facturaCliente": 1745271133175,
    "estado": {
      "facturada": true,
      "facChofer": false,
      "abierta": false,
      "cerrada": false,
      "facCliente": false
    },
    "tarifaTipo": {
      "especial": false,
      "personalizada": false,
      "eventual": false,
      "general": true
    },
    "fecha": "2025-04-15",
    "hojaRuta": "",
    "facturaChofer": 1745271133175,
    "valores": {
      "cliente": {
        "acompValor": 0,
        "tarifaBase": 87000,
        "kmAdicional": 17500,
        "aCobrar": 104500
      },
      "chofer": {
        "aPagar": 80000,
        "tarifaBase": 66000,
        "kmAdicional": 14000,
        "acompValor": 0
      }
    },
    "documentacion": null,
    "observaciones": "",
    "chofer": {
      "email": "adrianvenegas7573@gmail.com",
      "tarifaTipo": {
        "general": true,
        "eventual": false,
        "especial": false,
        "personalizada": false
      },
      "tarifaAsignada": true,
      "idChofer": 1736791944623,
      "celularEmergencia": "1139103989",
      "apellido": "Venegas",
      "fechaNac": "1973-09-10",
      "id": "rsFavZLKXlrRMuilBzCS",
      "celularContacto": "1151465696",
      "idProveedor": 0,
      "nombre": "Adrian Ernesto",
      "cuit": 20235231531,
      "condFiscal": "Monotributista - Factura C",
      "idTarifa": 1736793791030,
      "vehiculo": [
        {
          "tarjetaCombustible": true,
          "satelital": "Stop Car",
          "dominio": "LCP568",
          "refrigeracion": null,
          "marca": "Fiat",
          "tipoCombustible": [
            "Nafta"
          ],
          "modelo": "Fiorino",
          "publicidad": false,
          "categoria": {
            "nombre": "Mini",
            "catOrden": 1
          },
          "segSat": true
        }
      ],
      "contactoEmergencia": "Mariana Podokian",
      "type": "modified",
      "direccion": {
        "localidad": "Valentín Alsina",
        "domicilio": "Tuyuti 3003",
        "municipio": "Lanús",
        "provincia": "Buenos Aires"
      }
    },
    "cliente": {
      "id": "HPceY9retp6KCsNOPJia",
      "cuit": 30601502778,
      "tarifaTipo": {
        "personalizada": false,
        "eventual": false,
        "general": true,
        "especial": false
      },
      "razonSocial": "Andesmar Cargas SA",
      "direccionOperativa": {
        "domicilio": "General Gorriti 650 - Avellaneda",
        "localidad": "Avellaneda",
        "municipio": "Avellaneda",
        "provincia": "Buenos Aires"
      },
      "condFiscal": "Responsable Inscripto - Factura A",
      "contactos": [
        {
          "apellido": "Paz",
          "telefono": "1126439403",
          "email": "juanpaz@andesmar.com.ar",
          "nombre": "Juan",
          "puesto": "Jefe Logistica"
        },
        {
          "puesto": "Encargado de Logistica",
          "telefono": "1133579699",
          "email": "",
          "apellido": "Marchetti",
          "nombre": "Ramiro"
        }
      ],
      "type": "modified",
      "tarifaAsignada": true,
      "direccionFiscal": {
        "municipio": "Maipú",
        "provincia": "Mendoza",
        "domicilio": "Rodriguez Peña 205",
        "localidad": "Luzuriaga"
      },
      "idCliente": 1736356938304,
      "idTarifa": 1736356577273
    },
    "patenteChofer": "LCP568"
  },
  {
    "id": "lUk8y6EPHlQhaQxV5JT9",
    "tarifaTipo": {
      "general": true,
      "especial": false,
      "eventual": false,
      "personalizada": false
    },
    "km": 72,
    "patenteChofer": "AD071GH",
    "facturaCliente": 1745270680616,
    "chofer": {
      "tarifaAsignada": true,
      "tarifaTipo": {
        "eventual": false,
        "general": true,
        "especial": false,
        "personalizada": false
      },
      "idProveedor": 0,
      "celularContacto": "1153499040",
      "apellido": "Soto",
      "nombre": "Christian Nicolas",
      "cuit": 20410488392,
      "email": "cristiannicolassoto1303@gmail.com",
      "celularEmergencia": "1123711081",
      "vehiculo": [
        {
          "marca": "Fiat",
          "tipoCombustible": [
            "Nafta"
          ],
          "satelital": "Stop Car",
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "dominio": "AD071GH",
          "refrigeracion": null,
          "modelo": "Fiorino",
          "segSat": true,
          "tarjetaCombustible": false,
          "publicidad": false
        }
      ],
      "idChofer": 1736792086528,
      "condFiscal": "Monotributista - Factura C",
      "id": "vIsDMqhm9hag6LXDt28I",
      "contactoEmergencia": "Lorena Soto",
      "idTarifa": 1736793791030,
      "fechaNac": "1998-03-13",
      "direccion": {
        "domicilio": "Pasaje Cerviño 312",
        "provincia": "Buenos Aires",
        "localidad": "Sarandí",
        "municipio": "Avellaneda"
      },
      "type": "modified"
    },
    "tarifaPersonalizada": {
      "aPagar": 0,
      "seccion": 0,
      "nombre": "",
      "categoria": 0,
      "aCobrar": 0
    },
    "facturaChofer": 1745270680617,
    "acompaniante": false,
    "observaciones": "",
    "valores": {
      "chofer": {
        "acompValor": 0,
        "aPagar": 74400,
        "kmAdicional": 8400,
        "tarifaBase": 66000
      },
      "cliente": {
        "tarifaBase": 87000,
        "acompValor": 0,
        "aCobrar": 97500,
        "kmAdicional": 10500
      }
    },
    "documentacion": null,
    "idOperacion": 1744810023788,
    "cliente": {
      "idTarifa": 1736356577273,
      "tarifaAsignada": true,
      "tarifaTipo": {
        "especial": false,
        "personalizada": false,
        "eventual": false,
        "general": true
      },
      "razonSocial": "Andesmar Cargas SA",
      "idCliente": 1736356938304,
      "id": "HPceY9retp6KCsNOPJia",
      "contactos": [
        {
          "apellido": "Paz",
          "puesto": "Jefe Logistica",
          "nombre": "Juan",
          "email": "juanpaz@andesmar.com.ar",
          "telefono": "1126439403"
        },
        {
          "apellido": "Marchetti",
          "puesto": "Encargado de Logistica",
          "nombre": "Ramiro",
          "email": "",
          "telefono": "1133579699"
        }
      ],
      "direccionFiscal": {
        "localidad": "Luzuriaga",
        "municipio": "Maipú",
        "provincia": "Mendoza",
        "domicilio": "Rodriguez Peña 205"
      },
      "condFiscal": "Responsable Inscripto - Factura A",
      "type": "modified",
      "direccionOperativa": {
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "localidad": "Avellaneda"
      },
      "cuit": 30601502778
    },
    "fecha": "2025-04-15",
    "tarifaEventual": {
      "cliente": {
        "concepto": "",
        "valor": 0
      },
      "chofer": {
        "concepto": "",
        "valor": 0
      }
    },
    "multiplicadorChofer": 1,
    "estado": {
      "facCliente": false,
      "facChofer": false,
      "abierta": false,
      "cerrada": false,
      "facturada": true
    },
    "multiplicadorCliente": 1,
    "hojaRuta": ""
  },
  {
    "id": "Ov8grFSeQUcr3aNaPVLm",
    "cliente": {
      "id": "HPceY9retp6KCsNOPJia",
      "cuit": 30601502778,
      "contactos": [
        {
          "telefono": "1126439403",
          "apellido": "Paz",
          "puesto": "Jefe Logistica",
          "nombre": "Juan",
          "email": "juanpaz@andesmar.com.ar"
        },
        {
          "telefono": "1133579699",
          "email": "",
          "nombre": "Ramiro",
          "puesto": "Encargado de Logistica",
          "apellido": "Marchetti"
        }
      ],
      "tarifaAsignada": true,
      "tarifaTipo": {
        "especial": false,
        "eventual": false,
        "general": true,
        "personalizada": false
      },
      "direccionOperativa": {
        "localidad": "Avellaneda",
        "provincia": "Buenos Aires",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "municipio": "Avellaneda"
      },
      "idTarifa": 1736356577273,
      "condFiscal": "Responsable Inscripto - Factura A",
      "type": "modified",
      "direccionFiscal": {
        "provincia": "Mendoza",
        "localidad": "Luzuriaga",
        "municipio": "Maipú",
        "domicilio": "Rodriguez Peña 205"
      },
      "razonSocial": "Andesmar Cargas SA",
      "idCliente": 1736356938304
    },
    "documentacion": null,
    "tarifaEventual": {
      "chofer": {
        "valor": 0,
        "concepto": ""
      },
      "cliente": {
        "valor": 0,
        "concepto": ""
      }
    },
    "facturaChofer": 1745270069189,
    "tarifaPersonalizada": {
      "aCobrar": 0,
      "seccion": 0,
      "nombre": "",
      "aPagar": 0,
      "categoria": 0
    },
    "hojaRuta": "",
    "multiplicadorCliente": 1,
    "idOperacion": 1744810023787,
    "multiplicadorChofer": 1,
    "patenteChofer": "HPP453",
    "tarifaTipo": {
      "general": true,
      "especial": false,
      "eventual": false,
      "personalizada": false
    },
    "fecha": "2025-04-15",
    "estado": {
      "cerrada": false,
      "facCliente": false,
      "facturada": true,
      "facChofer": false,
      "abierta": false
    },
    "observaciones": "",
    "chofer": {
      "direccion": {
        " municipio": "",
        "provincia": "",
        "localidad": "",
        "domicilio": "Juncal 777 - Lanus"
      },
      "idProveedor": 0,
      "idTarifa": 1736793791030,
      "celularContacto": "1130719809",
      "fechaNac": "1994-02-01",
      "id": "75TLs99t6qSNTuHessGQ",
      "celularEmergencia": "",
      "tarifaAsignada": true,
      "tarifaTipo": {
        "general": true,
        "personalizada": false,
        "especial": false,
        "eventual": false
      },
      "email": "actualizar@gmail.com",
      "contactoEmergencia": "",
      "apellido": "Quiroga",
      "type": "modified",
      "nombre": "Ariel Omar",
      " condFiscal": "",
      "vehiculo": [
        {
          "segSat": true,
          "categoria": {
            "catOrden": 2,
            "nombre": "Maxi"
          },
          "tarjetaCombustible": true,
          "tipoCombustible": [
            "nafta"
          ],
          "publicidad": false,
          "refrigeracion": null,
          "dominio": "HPP453",
          "modelo": "Transporter",
          "marca": "Volkswagen",
          "satelital": "Stop Car"
        }
      ],
      "cuit": 20380305381,
      "idChofer": 1736730226989
    },
    "acompaniante": false,
    "valores": {
      "chofer": {
        "tarifaBase": 115000,
        "acompValor": 0,
        "kmAdicional": 33000,
        "aPagar": 148000
      },
      "cliente": {
        "acompValor": 0,
        "kmAdicional": 40000,
        "tarifaBase": 160000,
        "aCobrar": 200000
      }
    },
    "facturaCliente": 1745270069189,
    "km": 143
  },
  {
    "id": "2y5RQ10sbEMp3Wk8UXV2",
    "estado": {
      "cerrada": false,
      "abierta": false,
      "facCliente": false,
      "facturada": true,
      "facChofer": false
    },
    "observaciones": "",
    "valores": {
      "chofer": {
        "acompValor": 0,
        "tarifaBase": 66000,
        "aPagar": 80000,
        "kmAdicional": 14000
      },
      "cliente": {
        "aCobrar": 104500,
        "acompValor": 0,
        "tarifaBase": 87000,
        "kmAdicional": 17500
      }
    },
    "idOperacion": 1744810023786,
    "facturaChofer": 1745271547715,
    "tarifaEventual": {
      "cliente": {
        "valor": 0,
        "concepto": ""
      },
      "chofer": {
        "concepto": "",
        "valor": 0
      }
    },
    "acompaniante": false,
    "tarifaPersonalizada": {
      "aPagar": 0,
      "nombre": "",
      "categoria": 0,
      "aCobrar": 0,
      "seccion": 0
    },
    "hojaRuta": "",
    "patenteChofer": "LUC928",
    "fecha": "2025-04-15",
    "multiplicadorCliente": 1,
    "cliente": {
      "direccionFiscal": {
        "municipio": "Maipú",
        "localidad": "Luzuriaga",
        "provincia": "Mendoza",
        "domicilio": "Rodriguez Peña 205"
      },
      "id": "HPceY9retp6KCsNOPJia",
      "tarifaAsignada": true,
      "condFiscal": "Responsable Inscripto - Factura A",
      "tarifaTipo": {
        "eventual": false,
        "general": true,
        "personalizada": false,
        "especial": false
      },
      "razonSocial": "Andesmar Cargas SA",
      "idCliente": 1736356938304,
      "type": "modified",
      "cuit": 30601502778,
      "contactos": [
        {
          "puesto": "Jefe Logistica",
          "email": "juanpaz@andesmar.com.ar",
          "apellido": "Paz",
          "telefono": "1126439403",
          "nombre": "Juan"
        },
        {
          "telefono": "1133579699",
          "puesto": "Encargado de Logistica",
          "nombre": "Ramiro",
          "email": "",
          "apellido": "Marchetti"
        }
      ],
      "idTarifa": 1736356577273,
      "direccionOperativa": {
        "domicilio": "General Gorriti 650 - Avellaneda",
        "provincia": "Buenos Aires",
        "localidad": "Avellaneda",
        "municipio": "Avellaneda"
      }
    },
    "km": 98,
    "multiplicadorChofer": 1,
    "documentacion": null,
    "tarifaTipo": {
      "especial": false,
      "general": true,
      "personalizada": false,
      "eventual": false
    },
    "facturaCliente": 1745271547715,
    "chofer": {
      "type": "modified",
      "tarifaTipo": {
        "personalizada": false,
        "especial": false,
        "eventual": false,
        "general": true
      },
      "celularEmergencia": "1161671994",
      "apellido": "Fernandez",
      "tarifaAsignada": true,
      "contactoEmergencia": "Stella",
      "email": "fndzmatias@gmail.com",
      "idProveedor": 0,
      "id": "jhjDx7Yh3lf56iAFBWWp",
      "cuit": 20389286750,
      "fechaNac": "1996-03-07",
      "idChofer": 1736727991651,
      "nombre": "Matias Alberto",
      "celularContacto": "1133652485",
      "vehiculo": [
        {
          "dominio": "LUC928",
          "categoria": {
            "nombre": "Mini",
            "catOrden": 1
          },
          "modelo": "Partner",
          "tipoCombustible": [
            "Nafta"
          ],
          "segSat": true,
          "refrigeracion": null,
          "tarjetaCombustible": false,
          "marca": "Peugeot",
          "publicidad": false,
          "satelital": "Stop Car"
        }
      ],
      "idTarifa": 1736793791030,
      "direccion": {
        "localidad": "Lanús Oeste",
        "provincia": "Buenos Aires",
        "domicilio": "Pje Rosa Acevedo 1049",
        "municipio": "Lanús"
      },
      "condFiscal": "Monotributista - Factura C"
    }
  },
  {
    "id": "gkr9vJhPZrd8ASatdDFQ",
    "acompaniante": false,
    "chofer": {
      "direccion": {
        "localidad": "",
        " municipio": "",
        "provincia": "",
        "domicilio": "Juncal 777 - Lanus"
      },
      "idProveedor": 0,
      "idTarifa": 1736793791030,
      "celularContacto": "1130719809",
      "fechaNac": "1994-02-01",
      "id": "75TLs99t6qSNTuHessGQ",
      "celularEmergencia": "",
      "tarifaAsignada": true,
      "tarifaTipo": {
        "eventual": false,
        "general": true,
        "personalizada": false,
        "especial": false
      },
      "contactoEmergencia": "",
      "email": "actualizar@gmail.com",
      "type": "added",
      "apellido": "Quiroga",
      "nombre": "Ariel Omar",
      " condFiscal": "",
      "vehiculo": [
        {
          "categoria": {
            "catOrden": 2,
            "nombre": "Maxi"
          },
          "publicidad": false,
          "satelital": "Stop Car",
          "dominio": "HPP453",
          "segSat": true,
          "modelo": "Transporter",
          "tipoCombustible": [
            "nafta"
          ],
          "marca": "Volkswagen",
          "tarjetaCombustible": true,
          "refrigeracion": null
        }
      ],
      "cuit": 20380305381,
      "idChofer": 1736730226989
    },
    "hojaRuta": "",
    "valores": {
      "cliente": {
        "acompValor": 0,
        "tarifaBase": 240000,
        "kmAdicional": 16000,
        "aCobrar": 256000
      },
      "chofer": {
        "kmAdicional": 13200,
        "acompValor": 0,
        "tarifaBase": 172500,
        "aPagar": 185700
      }
    },
    "observaciones": "",
    "facturaCliente": 1745270053663,
    "fecha": "2025-04-14",
    "tarifaTipo": {
      "eventual": false,
      "especial": false,
      "general": true,
      "personalizada": false
    },
    "facturaChofer": 1745270053663,
    "patenteChofer": "HPP453",
    "multiplicadorCliente": 1.5,
    "documentacion": null,
    "tarifaEventual": {
      "cliente": {
        "valor": 0,
        "concepto": ""
      },
      "chofer": {
        "concepto": "",
        "valor": 0
      }
    },
    "cliente": {
      "condFiscal": "Responsable Inscripto - Factura A",
      "cuit": 30601502778,
      "razonSocial": "Andesmar Cargas SA",
      "tarifaAsignada": true,
      "idTarifa": 1736356577273,
      "direccionOperativa": {
        "localidad": "Avellaneda",
        "municipio": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "provincia": "Buenos Aires"
      },
      "idCliente": 1736356938304,
      "contactos": [
        {
          "puesto": "Jefe Logistica",
          "nombre": "Juan",
          "email": "juanpaz@andesmar.com.ar",
          "apellido": "Paz",
          "telefono": "1126439403"
        },
        {
          "puesto": "Encargado de Logistica",
          "email": "",
          "telefono": "1133579699",
          "apellido": "Marchetti",
          "nombre": "Ramiro"
        }
      ],
      "direccionFiscal": {
        "domicilio": "Rodriguez Peña 205",
        "municipio": "Maipú",
        "provincia": "Mendoza",
        "localidad": "Luzuriaga"
      },
      "type": "added",
      "id": "HPceY9retp6KCsNOPJia",
      "tarifaTipo": {
        "especial": false,
        "general": true,
        "personalizada": false,
        "eventual": false
      }
    },
    "km": 85,
    "estado": {
      "facChofer": false,
      "cerrada": false,
      "facturada": true,
      "abierta": false,
      "facCliente": false
    },
    "multiplicadorChofer": 1.5,
    "tarifaPersonalizada": {
      "aPagar": 0,
      "seccion": 0,
      "categoria": 0,
      "nombre": "",
      "aCobrar": 0
    },
    "idOperacion": 1744654399278
  },
  {
    "id": "fccYkzqf4JeosqEJVfev",
    "chofer": {
      "idChofer": 1736791944623,
      "direccion": {
        "localidad": "Valentín Alsina",
        "provincia": "Buenos Aires",
        "municipio": "Lanús",
        "domicilio": "Tuyuti 3003"
      },
      "apellido": "Venegas",
      "idProveedor": 0,
      "contactoEmergencia": "Mariana Podokian",
      "celularEmergencia": "1139103989",
      "tarifaTipo": {
        "general": true,
        "eventual": false,
        "personalizada": false,
        "especial": false
      },
      "celularContacto": "1151465696",
      "vehiculo": [
        {
          "refrigeracion": null,
          "tipoCombustible": [
            "Nafta"
          ],
          "publicidad": false,
          "segSat": true,
          "satelital": "Stop Car",
          "modelo": "Fiorino",
          "marca": "Fiat",
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "dominio": "LCP568",
          "tarjetaCombustible": true
        }
      ],
      "type": "added",
      "email": "adrianvenegas7573@gmail.com",
      "tarifaAsignada": true,
      "nombre": "Adrian Ernesto",
      "cuit": 20235231531,
      "condFiscal": "Monotributista - Factura C",
      "idTarifa": 1736793791030,
      "id": "rsFavZLKXlrRMuilBzCS",
      "fechaNac": "1973-09-10"
    },
    "valores": {
      "chofer": {
        "aPagar": 66000,
        "acompValor": 0,
        "kmAdicional": 0,
        "tarifaBase": 66000
      },
      "cliente": {
        "aCobrar": 87000,
        "kmAdicional": 0,
        "tarifaBase": 87000,
        "acompValor": 0
      }
    },
    "observaciones": "",
    "facturaChofer": 1745271144510,
    "multiplicadorChofer": 1,
    "hojaRuta": "",
    "multiplicadorCliente": 1,
    "estado": {
      "abierta": false,
      "cerrada": false,
      "facturada": true,
      "facChofer": false,
      "facCliente": false
    },
    "documentacion": null,
    "idOperacion": 1744654399280,
    "patenteChofer": "LCP568",
    "tarifaEventual": {
      "chofer": {
        "concepto": "",
        "valor": 0
      },
      "cliente": {
        "concepto": "",
        "valor": 0
      }
    },
    "fecha": "2025-04-14",
    "tarifaPersonalizada": {
      "aPagar": 0,
      "aCobrar": 0,
      "nombre": "",
      "seccion": 0,
      "categoria": 0
    },
    "acompaniante": false,
    "km": 47,
    "cliente": {
      "tarifaTipo": {
        "especial": false,
        "personalizada": false,
        "eventual": false,
        "general": true
      },
      "type": "added",
      "direccionOperativa": {
        "localidad": "Avellaneda",
        "municipio": "Avellaneda",
        "provincia": "Buenos Aires",
        "domicilio": "General Gorriti 650 - Avellaneda"
      },
      "contactos": [
        {
          "puesto": "Jefe Logistica",
          "email": "juanpaz@andesmar.com.ar",
          "nombre": "Juan",
          "apellido": "Paz",
          "telefono": "1126439403"
        },
        {
          "puesto": "Encargado de Logistica",
          "nombre": "Ramiro",
          "apellido": "Marchetti",
          "telefono": "1133579699",
          "email": ""
        }
      ],
      "cuit": 30601502778,
      "idCliente": 1736356938304,
      "condFiscal": "Responsable Inscripto - Factura A",
      "direccionFiscal": {
        "provincia": "Mendoza",
        "domicilio": "Rodriguez Peña 205",
        "localidad": "Luzuriaga",
        "municipio": "Maipú"
      },
      "idTarifa": 1736356577273,
      "razonSocial": "Andesmar Cargas SA",
      "id": "HPceY9retp6KCsNOPJia",
      "tarifaAsignada": true
    },
    "facturaCliente": 1745271144510,
    "tarifaTipo": {
      "general": true,
      "personalizada": false,
      "especial": false,
      "eventual": false
    }
  },
  {
    "id": "GJpGJKljDMLGuzgVTIFp",
    "observaciones": "",
    "km": 53,
    "tarifaTipo": {
      "personalizada": false,
      "eventual": false,
      "general": true,
      "especial": false
    },
    "cliente": {
      "tarifaTipo": {
        "especial": false,
        "eventual": false,
        "general": true,
        "personalizada": false
      },
      "idTarifa": 1736356577273,
      "cuit": 30601502778,
      "id": "HPceY9retp6KCsNOPJia",
      "idCliente": 1736356938304,
      "direccionOperativa": {
        "localidad": "Avellaneda",
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda"
      },
      "tarifaAsignada": true,
      "type": "added",
      "condFiscal": "Responsable Inscripto - Factura A",
      "contactos": [
        {
          "nombre": "Juan",
          "email": "juanpaz@andesmar.com.ar",
          "puesto": "Jefe Logistica",
          "apellido": "Paz",
          "telefono": "1126439403"
        },
        {
          "nombre": "Ramiro",
          "email": "",
          "puesto": "Encargado de Logistica",
          "apellido": "Marchetti",
          "telefono": "1133579699"
        }
      ],
      "razonSocial": "Andesmar Cargas SA",
      "direccionFiscal": {
        "domicilio": "Rodriguez Peña 205",
        "localidad": "Luzuriaga",
        "municipio": "Maipú",
        "provincia": "Mendoza"
      }
    },
    "idOperacion": 1744654399277,
    "chofer": {
      "direccion": {
        "localidad": "Lanús Oeste",
        "domicilio": "Pje Rosa Acevedo 1049",
        "municipio": "Lanús",
        "provincia": "Buenos Aires"
      },
      "id": "jhjDx7Yh3lf56iAFBWWp",
      "celularContacto": "1133652485",
      "idChofer": 1736727991651,
      "type": "added",
      "nombre": "Matias Alberto",
      "email": "fndzmatias@gmail.com",
      "fechaNac": "1996-03-07",
      "contactoEmergencia": "Stella",
      "apellido": "Fernandez",
      "vehiculo": [
        {
          "tipoCombustible": [
            "Nafta"
          ],
          "satelital": "Stop Car",
          "refrigeracion": null,
          "modelo": "Partner",
          "publicidad": false,
          "segSat": true,
          "dominio": "LUC928",
          "marca": "Peugeot",
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "tarjetaCombustible": false
        }
      ],
      "condFiscal": "Monotributista - Factura C",
      "tarifaAsignada": true,
      "idTarifa": 1736793791030,
      "cuit": 20389286750,
      "idProveedor": 0,
      "celularEmergencia": "1161671994",
      "tarifaTipo": {
        "eventual": false,
        "especial": false,
        "general": true,
        "personalizada": false
      }
    },
    "tarifaPersonalizada": {
      "seccion": 0,
      "aPagar": 0,
      "nombre": "",
      "categoria": 0,
      "aCobrar": 0
    },
    "valores": {
      "cliente": {
        "tarifaBase": 130500,
        "acompValor": 0,
        "aCobrar": 134000,
        "kmAdicional": 3500
      },
      "chofer": {
        "aPagar": 101800,
        "acompValor": 0,
        "kmAdicional": 2800,
        "tarifaBase": 99000
      }
    },
    "facturaCliente": 1744758287883,
    "facturaChofer": 1744758287883,
    "acompaniante": false,
    "tarifaEventual": {
      "chofer": {
        "concepto": "",
        "valor": 0
      },
      "cliente": {
        "concepto": "",
        "valor": 0
      }
    },
    "estado": {
      "abierta": false,
      "cerrada": false,
      "facCliente": false,
      "facChofer": false,
      "facturada": true
    },
    "documentacion": null,
    "multiplicadorChofer": 1.5,
    "patenteChofer": "LUC928",
    "multiplicadorCliente": 1.5,
    "fecha": "2025-04-14",
    "hojaRuta": ""
  },
  {
    "id": "A7DD9aq7CwZdkHYFhv6Y",
    "estado": {
      "facCliente": false,
      "facturada": true,
      "cerrada": false,
      "abierta": false,
      "facChofer": false
    },
    "valores": {
      "cliente": {
        "kmAdicional": 3500,
        "aCobrar": 134000,
        "tarifaBase": 130500,
        "acompValor": 0
      },
      "chofer": {
        "kmAdicional": 2800,
        "acompValor": 0,
        "tarifaBase": 99000,
        "aPagar": 101800
      }
    },
    "multiplicadorCliente": 1.5,
    "acompaniante": false,
    "tarifaPersonalizada": {
      "categoria": 0,
      "nombre": "",
      "aPagar": 0,
      "seccion": 0,
      "aCobrar": 0
    },
    "documentacion": null,
    "tarifaTipo": {
      "especial": false,
      "personalizada": false,
      "eventual": false,
      "general": true
    },
    "fecha": "2025-04-14",
    "chofer": {
      "idProveedor": 0,
      "id": "IYdOM7gOiBPrLRIukidg",
      "idTarifa": 1736793791030,
      "type": "added",
      "tarifaTipo": {
        "eventual": false,
        "general": true,
        "personalizada": false,
        "especial": false
      },
      "apellido": "Fernandez",
      "email": "toma.f@hotmail.com",
      "direccion": {
        "municipio": "Lanús",
        "provincia": "Buenos Aires",
        "localidad": "Lanús Oeste",
        "domicilio": "R. de Escalada  de San Martin 1483"
      },
      "cuit": 20443384900,
      "vehiculo": [
        {
          "satelital": "Stop Car",
          "marca": "Peugeot",
          "publicidad": false,
          "categoria": {
            "nombre": "Mini",
            "catOrden": 1
          },
          "dominio": "OPB248",
          "tipoCombustible": [
            "Nafta"
          ],
          "tarjetaCombustible": false,
          "segSat": true,
          "modelo": "Partner",
          "refrigeracion": null
        }
      ],
      "tarifaAsignada": true,
      "celularEmergencia": "1139135361",
      "contactoEmergencia": "Maitena Rodríguez",
      "fechaNac": "2002-08-09",
      "nombre": "Tomas Yamil",
      "condFiscal": "Monotributista - Factura C",
      "celularContacto": "1166620796",
      "idChofer": 1736728211494
    },
    "idOperacion": 1744654399276,
    "facturaChofer": 1744758092653,
    "patenteChofer": "OPB248",
    "observaciones": "",
    "cliente": {
      "contactos": [
        {
          "nombre": "Juan",
          "email": "juanpaz@andesmar.com.ar",
          "apellido": "Paz",
          "puesto": "Jefe Logistica",
          "telefono": "1126439403"
        },
        {
          "apellido": "Marchetti",
          "email": "",
          "nombre": "Ramiro",
          "telefono": "1133579699",
          "puesto": "Encargado de Logistica"
        }
      ],
      "tarifaAsignada": true,
      "idCliente": 1736356938304,
      "type": "added",
      "condFiscal": "Responsable Inscripto - Factura A",
      "id": "HPceY9retp6KCsNOPJia",
      "idTarifa": 1736356577273,
      "razonSocial": "Andesmar Cargas SA",
      "tarifaTipo": {
        "eventual": false,
        "general": true,
        "personalizada": false,
        "especial": false
      },
      "direccionFiscal": {
        "provincia": "Mendoza",
        "municipio": "Maipú",
        "localidad": "Luzuriaga",
        "domicilio": "Rodriguez Peña 205"
      },
      "cuit": 30601502778,
      "direccionOperativa": {
        "localidad": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "municipio": "Avellaneda",
        "provincia": "Buenos Aires"
      }
    },
    "tarifaEventual": {
      "chofer": {
        "concepto": "",
        "valor": 0
      },
      "cliente": {
        "valor": 0,
        "concepto": ""
      }
    },
    "hojaRuta": "",
    "facturaCliente": 1744758092652,
    "multiplicadorChofer": 1.5,
    "km": 60
  },
  {
    "id": "6M9tABQRkbbr9pLtIbNq",
    "chofer": {
      "vehiculo": [
        {
          "tipoCombustible": [
            "Nafta"
          ],
          "refrigeracion": null,
          "satelital": "Stop Car",
          "dominio": "AD071GH",
          "tarjetaCombustible": false,
          "categoria": {
            "nombre": "Mini",
            "catOrden": 1
          },
          "marca": "Fiat",
          "segSat": true,
          "publicidad": false,
          "modelo": "Fiorino"
        }
      ],
      "tarifaTipo": {
        "especial": false,
        "eventual": false,
        "general": true,
        "personalizada": false
      },
      "condFiscal": "Monotributista - Factura C",
      "idChofer": 1736792086528,
      "contactoEmergencia": "Lorena Soto",
      "tarifaAsignada": true,
      "idTarifa": 1736793791030,
      "cuit": 20410488392,
      "apellido": "Soto",
      "direccion": {
        "localidad": "Sarandí",
        "provincia": "Buenos Aires",
        "domicilio": "Pasaje Cerviño 312",
        "municipio": "Avellaneda"
      },
      "celularEmergencia": "1123711081",
      "email": "cristiannicolassoto1303@gmail.com",
      "fechaNac": "1998-03-13",
      "type": "added",
      "idProveedor": 0,
      "id": "vIsDMqhm9hag6LXDt28I",
      "nombre": "Christian Nicolas",
      "celularContacto": "1153499040"
    },
    "tarifaTipo": {
      "eventual": false,
      "especial": false,
      "general": true,
      "personalizada": false
    },
    "estado": {
      "abierta": false,
      "facChofer": false,
      "facturada": true,
      "facCliente": false,
      "cerrada": false
    },
    "observaciones": "",
    "idOperacion": 1744654399279,
    "multiplicadorCliente": 1,
    "multiplicadorChofer": 1,
    "km": 51,
    "cliente": {
      "type": "added",
      "contactos": [
        {
          "apellido": "Paz",
          "puesto": "Jefe Logistica",
          "email": "juanpaz@andesmar.com.ar",
          "telefono": "1126439403",
          "nombre": "Juan"
        },
        {
          "telefono": "1133579699",
          "nombre": "Ramiro",
          "apellido": "Marchetti",
          "email": "",
          "puesto": "Encargado de Logistica"
        }
      ],
      "idTarifa": 1736356577273,
      "direccionFiscal": {
        "municipio": "Maipú",
        "localidad": "Luzuriaga",
        "domicilio": "Rodriguez Peña 205",
        "provincia": "Mendoza"
      },
      "idCliente": 1736356938304,
      "tarifaTipo": {
        "eventual": false,
        "personalizada": false,
        "general": true,
        "especial": false
      },
      "direccionOperativa": {
        "domicilio": "General Gorriti 650 - Avellaneda",
        "municipio": "Avellaneda",
        "provincia": "Buenos Aires",
        "localidad": "Avellaneda"
      },
      "id": "HPceY9retp6KCsNOPJia",
      "tarifaAsignada": true,
      "cuit": 30601502778,
      "condFiscal": "Responsable Inscripto - Factura A",
      "razonSocial": "Andesmar Cargas SA"
    },
    "patenteChofer": "AD071GH",
    "tarifaPersonalizada": {
      "nombre": "",
      "seccion": 0,
      "categoria": 0,
      "aPagar": 0,
      "aCobrar": 0
    },
    "acompaniante": false,
    "facturaChofer": 1745270668769,
    "facturaCliente": 1745270668769,
    "valores": {
      "cliente": {
        "aCobrar": 90500,
        "kmAdicional": 3500,
        "tarifaBase": 87000,
        "acompValor": 0
      },
      "chofer": {
        "kmAdicional": 2800,
        "tarifaBase": 66000,
        "aPagar": 68800,
        "acompValor": 0
      }
    },
    "documentacion": null,
    "fecha": "2025-04-14",
    "tarifaEventual": {
      "chofer": {
        "valor": 0,
        "concepto": ""
      },
      "cliente": {
        "concepto": "",
        "valor": 0
      }
    },
    "hojaRuta": ""
  },
  {
    "id": "dcChm2MvsHkiXEJXQnU6",
    "hojaRuta": "",
    "patenteChofer": "AD071GH",
    "tarifaPersonalizada": {
      "aPagar": 0,
      "nombre": "",
      "categoria": 0,
      "aCobrar": 0,
      "seccion": 0
    },
    "multiplicadorChofer": 1,
    "fecha": "2025-04-12",
    "multiplicadorCliente": 1,
    "documentacion": null,
    "facturaChofer": 1745270655531,
    "estado": {
      "cerrada": false,
      "facChofer": false,
      "facCliente": false,
      "facturada": true,
      "abierta": false
    },
    "tarifaEventual": {
      "chofer": {
        "valor": 0,
        "concepto": ""
      },
      "cliente": {
        "concepto": "",
        "valor": 0
      }
    },
    "cliente": {
      "type": "added",
      "idCliente": 1736356938304,
      "cuit": 30601502778,
      "direccionOperativa": {
        "localidad": "Avellaneda",
        "provincia": "Buenos Aires",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "municipio": "Avellaneda"
      },
      "condFiscal": "Responsable Inscripto - Factura A",
      "tarifaTipo": {
        "general": true,
        "eventual": false,
        "personalizada": false,
        "especial": false
      },
      "id": "HPceY9retp6KCsNOPJia",
      "razonSocial": "Andesmar Cargas SA",
      "idTarifa": 1736356577273,
      "tarifaAsignada": true,
      "direccionFiscal": {
        "domicilio": "Rodriguez Peña 205",
        "provincia": "Mendoza",
        "localidad": "Luzuriaga",
        "municipio": "Maipú"
      },
      "contactos": [
        {
          "apellido": "Paz",
          "telefono": "1126439403",
          "puesto": "Jefe Logistica",
          "nombre": "Juan",
          "email": "juanpaz@andesmar.com.ar"
        },
        {
          "puesto": "Encargado de Logistica",
          "apellido": "Marchetti",
          "telefono": "1133579699",
          "email": "",
          "nombre": "Ramiro"
        }
      ]
    },
    "acompaniante": false,
    "facturaCliente": 1745270655531,
    "tarifaTipo": {
      "eventual": false,
      "personalizada": false,
      "general": true,
      "especial": false
    },
    "idOperacion": 1744654366338,
    "observaciones": "",
    "chofer": {
      "nombre": "Christian Nicolas",
      "idTarifa": 1736793791030,
      "id": "vIsDMqhm9hag6LXDt28I",
      "cuit": 20410488392,
      "celularEmergencia": "1123711081",
      "email": "cristiannicolassoto1303@gmail.com",
      "type": "added",
      "tarifaTipo": {
        "eventual": false,
        "especial": false,
        "general": true,
        "personalizada": false
      },
      "idChofer": 1736792086528,
      "condFiscal": "Monotributista - Factura C",
      "direccion": {
        "municipio": "Avellaneda",
        "domicilio": "Pasaje Cerviño 312",
        "localidad": "Sarandí",
        "provincia": "Buenos Aires"
      },
      "idProveedor": 0,
      "contactoEmergencia": "Lorena Soto",
      "tarifaAsignada": true,
      "apellido": "Soto",
      "celularContacto": "1153499040",
      "vehiculo": [
        {
          "segSat": true,
          "tipoCombustible": [
            "Nafta"
          ],
          "dominio": "AD071GH",
          "refrigeracion": null,
          "marca": "Fiat",
          "tarjetaCombustible": false,
          "satelital": "Stop Car",
          "publicidad": false,
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "modelo": "Fiorino"
        }
      ],
      "fechaNac": "1998-03-13"
    },
    "valores": {
      "cliente": {
        "aCobrar": 90500,
        "acompValor": 0,
        "kmAdicional": 3500,
        "tarifaBase": 87000
      },
      "chofer": {
        "aPagar": 68800,
        "kmAdicional": 2800,
        "tarifaBase": 66000,
        "acompValor": 0
      }
    },
    "km": 52
  },
  {
    "id": "lJoVaZz38IVtOdDzMMHy",
    "facturaChofer": 1744758124958,
    "estado": {
      "facCliente": false,
      "cerrada": false,
      "facChofer": false,
      "facturada": true,
      "abierta": false
    },
    "cliente": {
      "idTarifa": 1736356577273,
      "contactos": [
        {
          "telefono": "1126439403",
          "email": "juanpaz@andesmar.com.ar",
          "puesto": "Jefe Logistica",
          "nombre": "Juan",
          "apellido": "Paz"
        },
        {
          "apellido": "Marchetti",
          "puesto": "Encargado de Logistica",
          "email": "",
          "nombre": "Ramiro",
          "telefono": "1133579699"
        }
      ],
      "razonSocial": "Andesmar Cargas SA",
      "tarifaAsignada": true,
      "idCliente": 1736356938304,
      "type": "added",
      "condFiscal": "Responsable Inscripto - Factura A",
      "cuit": 30601502778,
      "direccionFiscal": {
        "municipio": "Maipú",
        "domicilio": "Rodriguez Peña 205",
        "provincia": "Mendoza",
        "localidad": "Luzuriaga"
      },
      "direccionOperativa": {
        "domicilio": "General Gorriti 650 - Avellaneda",
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda",
        "localidad": "Avellaneda"
      },
      "id": "HPceY9retp6KCsNOPJia",
      "tarifaTipo": {
        "eventual": false,
        "especial": false,
        "general": true,
        "personalizada": false
      }
    },
    "multiplicadorCliente": 1,
    "idOperacion": 1744654343562,
    "tarifaEventual": {
      "cliente": {
        "valor": 0,
        "concepto": ""
      },
      "chofer": {
        "valor": 0,
        "concepto": ""
      }
    },
    "multiplicadorChofer": 1,
    "valores": {
      "chofer": {
        "kmAdicional": 28000,
        "tarifaBase": 66000,
        "acompValor": 0,
        "aPagar": 94000
      },
      "cliente": {
        "kmAdicional": 35000,
        "aCobrar": 122000,
        "tarifaBase": 87000,
        "acompValor": 0
      }
    },
    "documentacion": null,
    "hojaRuta": "",
    "acompaniante": false,
    "tarifaPersonalizada": {
      "nombre": "",
      "aCobrar": 0,
      "aPagar": 0,
      "categoria": 0,
      "seccion": 0
    },
    "observaciones": "",
    "fecha": "2025-04-11",
    "km": 143,
    "chofer": {
      "idProveedor": 0,
      "idChofer": 1736728211494,
      "direccion": {
        "provincia": "Buenos Aires",
        "municipio": "Lanús",
        "localidad": "Lanús Oeste",
        "domicilio": "R. de Escalada  de San Martin 1483"
      },
      "email": "toma.f@hotmail.com",
      "vehiculo": [
        {
          "dominio": "OPB248",
          "publicidad": false,
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "modelo": "Partner",
          "marca": "Peugeot",
          "satelital": "Stop Car",
          "tipoCombustible": [
            "Nafta"
          ],
          "refrigeracion": null,
          "tarjetaCombustible": false,
          "segSat": true
        }
      ],
      "nombre": "Tomas Yamil",
      "celularContacto": "1166620796",
      "fechaNac": "2002-08-09",
      "id": "IYdOM7gOiBPrLRIukidg",
      "tarifaAsignada": true,
      "type": "added",
      "contactoEmergencia": "Maitena Rodríguez",
      "cuit": 20443384900,
      "condFiscal": "Monotributista - Factura C",
      "tarifaTipo": {
        "personalizada": false,
        "general": true,
        "eventual": false,
        "especial": false
      },
      "celularEmergencia": "1139135361",
      "apellido": "Fernandez",
      "idTarifa": 1736793791030
    },
    "facturaCliente": 1744758124958,
    "patenteChofer": "OPB248",
    "tarifaTipo": {
      "personalizada": false,
      "eventual": false,
      "especial": false,
      "general": true
    }
  },
  {
    "id": "TZ1vnetkttzzgHTSF3Kb",
    "documentacion": null,
    "multiplicadorCliente": 1,
    "acompaniante": false,
    "chofer": {
      "nombre": "Ariel Omar",
      "direccion": {
        "provincia": "",
        "domicilio": "Juncal 777 - Lanus",
        " municipio": "",
        "localidad": ""
      },
      "fechaNac": "1994-02-01",
      "idChofer": 1736730226989,
      "idProveedor": 0,
      "celularEmergencia": "",
      "idTarifa": 1736793791030,
      " condFiscal": "",
      "apellido": "Quiroga",
      "celularContacto": "1130719809",
      "cuit": 20380305381,
      "email": "actualizar@gmail.com",
      "type": "added",
      "tarifaAsignada": true,
      "contactoEmergencia": "",
      "id": "75TLs99t6qSNTuHessGQ",
      "tarifaTipo": {
        "especial": false,
        "personalizada": false,
        "general": true,
        "eventual": false
      },
      "vehiculo": [
        {
          "modelo": "Transporter",
          "tipoCombustible": [
            "nafta"
          ],
          "refrigeracion": null,
          "publicidad": false,
          "tarjetaCombustible": true,
          "categoria": {
            "nombre": "Maxi",
            "catOrden": 2
          },
          "satelital": "Stop Car",
          "segSat": true,
          "dominio": "HPP453",
          "marca": "Volkswagen"
        }
      ]
    },
    "tarifaPersonalizada": {
      "aCobrar": 0,
      "categoria": 0,
      "seccion": 0,
      "aPagar": 0,
      "nombre": ""
    },
    "facturaChofer": 1745270035981,
    "hojaRuta": "",
    "km": 159,
    "cliente": {
      "contactos": [
        {
          "telefono": "1126439403",
          "apellido": "Paz",
          "email": "juanpaz@andesmar.com.ar",
          "nombre": "Juan",
          "puesto": "Jefe Logistica"
        },
        {
          "email": "",
          "telefono": "1133579699",
          "apellido": "Marchetti",
          "nombre": "Ramiro",
          "puesto": "Encargado de Logistica"
        }
      ],
      "tarifaTipo": {
        "general": true,
        "especial": false,
        "personalizada": false,
        "eventual": false
      },
      "cuit": 30601502778,
      "idCliente": 1736356938304,
      "condFiscal": "Responsable Inscripto - Factura A",
      "direccionFiscal": {
        "provincia": "Mendoza",
        "municipio": "Maipú",
        "localidad": "Luzuriaga",
        "domicilio": "Rodriguez Peña 205"
      },
      "id": "HPceY9retp6KCsNOPJia",
      "razonSocial": "Andesmar Cargas SA",
      "direccionOperativa": {
        "localidad": "Avellaneda",
        "municipio": "Avellaneda",
        "provincia": "Buenos Aires",
        "domicilio": "General Gorriti 650 - Avellaneda"
      },
      "tarifaAsignada": true,
      "type": "added",
      "idTarifa": 1736356577273
    },
    "facturaCliente": 1745270035980,
    "valores": {
      "chofer": {
        "aPagar": 151300,
        "tarifaBase": 115000,
        "kmAdicional": 36300,
        "acompValor": 0
      },
      "cliente": {
        "kmAdicional": 44000,
        "tarifaBase": 160000,
        "acompValor": 0,
        "aCobrar": 204000
      }
    },
    "estado": {
      "abierta": false,
      "cerrada": false,
      "facChofer": false,
      "facCliente": false,
      "facturada": true
    },
    "tarifaTipo": {
      "eventual": false,
      "general": true,
      "personalizada": false,
      "especial": false
    },
    "patenteChofer": "HPP453",
    "observaciones": "",
    "idOperacion": 1744654343564,
    "multiplicadorChofer": 1,
    "tarifaEventual": {
      "cliente": {
        "concepto": "",
        "valor": 0
      },
      "chofer": {
        "valor": 0,
        "concepto": ""
      }
    },
    "fecha": "2025-04-11"
  },
  {
    "id": "R7EB7hxFcglW8FXelfMa",
    "patenteChofer": "AD071GH",
    "documentacion": null,
    "fecha": "2025-04-11",
    "tarifaEventual": {
      "chofer": {
        "valor": 0,
        "concepto": ""
      },
      "cliente": {
        "concepto": "",
        "valor": 0
      }
    },
    "valores": {
      "chofer": {
        "acompValor": 0,
        "aPagar": 66000,
        "tarifaBase": 66000,
        "kmAdicional": 0
      },
      "cliente": {
        "acompValor": 0,
        "aCobrar": 87000,
        "tarifaBase": 87000,
        "kmAdicional": 0
      }
    },
    "observaciones": "",
    "multiplicadorChofer": 1,
    "tarifaPersonalizada": {
      "categoria": 0,
      "nombre": "",
      "aCobrar": 0,
      "aPagar": 0,
      "seccion": 0
    },
    "chofer": {
      "apellido": "Soto",
      "fechaNac": "1998-03-13",
      "contactoEmergencia": "Lorena Soto",
      "email": "cristiannicolassoto1303@gmail.com",
      "celularEmergencia": "1123711081",
      "cuit": 20410488392,
      "type": "added",
      "nombre": "Christian Nicolas",
      "idTarifa": 1736793791030,
      "condFiscal": "Monotributista - Factura C",
      "direccion": {
        "domicilio": "Pasaje Cerviño 312",
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda",
        "localidad": "Sarandí"
      },
      "idChofer": 1736792086528,
      "vehiculo": [
        {
          "refrigeracion": null,
          "tipoCombustible": [
            "Nafta"
          ],
          "tarjetaCombustible": false,
          "segSat": true,
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "satelital": "Stop Car",
          "dominio": "AD071GH",
          "modelo": "Fiorino",
          "marca": "Fiat",
          "publicidad": false
        }
      ],
      "tarifaTipo": {
        "general": true,
        "especial": false,
        "personalizada": false,
        "eventual": false
      },
      "tarifaAsignada": true,
      "celularContacto": "1153499040",
      "idProveedor": 0,
      "id": "vIsDMqhm9hag6LXDt28I"
    },
    "tarifaTipo": {
      "eventual": false,
      "personalizada": false,
      "general": true,
      "especial": false
    },
    "facturaChofer": 1744468862164,
    "idOperacion": 1744462260851,
    "estado": {
      "cerrada": false,
      "facturada": true,
      "abierta": false,
      "facChofer": false,
      "facCliente": false
    },
    "km": 35,
    "cliente": {
      "direccionOperativa": {
        "localidad": "Avellaneda",
        "municipio": "Avellaneda",
        "provincia": "Buenos Aires",
        "domicilio": "General Gorriti 650 - Avellaneda"
      },
      "cuit": 30601502778,
      "id": "HPceY9retp6KCsNOPJia",
      "razonSocial": "Andesmar Cargas SA",
      "tarifaAsignada": true,
      "direccionFiscal": {
        "provincia": "Mendoza",
        "domicilio": "Rodriguez Peña 205",
        "municipio": "Maipú",
        "localidad": "Luzuriaga"
      },
      "idTarifa": 1736356577273,
      "tarifaTipo": {
        "personalizada": false,
        "general": true,
        "especial": false,
        "eventual": false
      },
      "condFiscal": "Responsable Inscripto - Factura A",
      "idCliente": 1736356938304,
      "contactos": [
        {
          "email": "juanpaz@andesmar.com.ar",
          "puesto": "Jefe Logistica",
          "telefono": "1126439403",
          "nombre": "Juan",
          "apellido": "Paz"
        },
        {
          "puesto": "Encargado de Logistica",
          "apellido": "Marchetti",
          "nombre": "Ramiro",
          "email": "",
          "telefono": "1133579699"
        }
      ],
      "type": "added"
    },
    "hojaRuta": "",
    "acompaniante": false,
    "facturaCliente": 1744468862164,
    "multiplicadorCliente": 1
  },
  {
    "id": "JAdd4yYCclr74pBq7VAo",
    "facturaCliente": 1744758211196,
    "chofer": {
      "tarifaTipo": {
        "general": true,
        "especial": false,
        "eventual": false,
        "personalizada": false
      },
      "vehiculo": [
        {
          "tipoCombustible": [
            "Nafta"
          ],
          "modelo": "Partner",
          "satelital": "Stop Car",
          "dominio": "LUC928",
          "segSat": true,
          "categoria": {
            "nombre": "Mini",
            "catOrden": 1
          },
          "marca": "Peugeot",
          "publicidad": false,
          "refrigeracion": null,
          "tarjetaCombustible": false
        }
      ],
      "type": "added",
      "email": "fndzmatias@gmail.com",
      "fechaNac": "1996-03-07",
      "contactoEmergencia": "Stella",
      "apellido": "Fernandez",
      "id": "jhjDx7Yh3lf56iAFBWWp",
      "tarifaAsignada": true,
      "celularContacto": "1133652485",
      "idChofer": 1736727991651,
      "condFiscal": "Monotributista - Factura C",
      "cuit": 20389286750,
      "nombre": "Matias Alberto",
      "celularEmergencia": "1161671994",
      "idTarifa": 1736793791030,
      "direccion": {
        "localidad": "Lanús Oeste",
        "domicilio": "Pje Rosa Acevedo 1049",
        "municipio": "Lanús",
        "provincia": "Buenos Aires"
      },
      "idProveedor": 0
    },
    "multiplicadorCliente": 1,
    "facturaChofer": 1744758211196,
    "tarifaTipo": {
      "eventual": false,
      "general": true,
      "especial": false,
      "personalizada": false
    },
    "tarifaPersonalizada": {
      "categoria": 0,
      "nombre": "",
      "aCobrar": 0,
      "seccion": 0,
      "aPagar": 0
    },
    "cliente": {
      "cuit": 30601502778,
      "id": "HPceY9retp6KCsNOPJia",
      "direccionOperativa": {
        "localidad": "Avellaneda",
        "municipio": "Avellaneda",
        "provincia": "Buenos Aires",
        "domicilio": "General Gorriti 650 - Avellaneda"
      },
      "tarifaAsignada": true,
      "razonSocial": "Andesmar Cargas SA",
      "direccionFiscal": {
        "localidad": "Luzuriaga",
        "domicilio": "Rodriguez Peña 205",
        "municipio": "Maipú",
        "provincia": "Mendoza"
      },
      "idTarifa": 1736356577273,
      "tarifaTipo": {
        "personalizada": false,
        "general": true,
        "eventual": false,
        "especial": false
      },
      "condFiscal": "Responsable Inscripto - Factura A",
      "idCliente": 1736356938304,
      "contactos": [
        {
          "email": "juanpaz@andesmar.com.ar",
          "puesto": "Jefe Logistica",
          "nombre": "Juan",
          "telefono": "1126439403",
          "apellido": "Paz"
        },
        {
          "email": "",
          "puesto": "Encargado de Logistica",
          "telefono": "1133579699",
          "nombre": "Ramiro",
          "apellido": "Marchetti"
        }
      ],
      "type": "added"
    },
    "valores": {
      "chofer": {
        "aPagar": 102400,
        "kmAdicional": 36400,
        "acompValor": 0,
        "tarifaBase": 66000
      },
      "cliente": {
        "tarifaBase": 87000,
        "aCobrar": 132500,
        "acompValor": 0,
        "kmAdicional": 45500
      }
    },
    "tarifaEventual": {
      "cliente": {
        "concepto": "",
        "valor": 0
      },
      "chofer": {
        "concepto": "",
        "valor": 0
      }
    },
    "multiplicadorChofer": 1,
    "km": 175,
    "acompaniante": false,
    "patenteChofer": "LUC928",
    "estado": {
      "abierta": false,
      "facturada": true,
      "facCliente": false,
      "facChofer": false,
      "cerrada": false
    },
    "fecha": "2025-04-11",
    "documentacion": null,
    "idOperacion": 1744654343563,
    "observaciones": "",
    "hojaRuta": ""
  },
  {
    "id": "HSHF5mSC1D4w9fVzwvBj",
    "chofer": {
      "nombre": "Adrian Ernesto",
      "idTarifa": 1736793791030,
      "cuit": 20235231531,
      "idChofer": 1736791944623,
      "email": "adrianvenegas7573@gmail.com",
      "type": "added",
      "celularEmergencia": "1139103989",
      "direccion": {
        "localidad": "Valentín Alsina",
        "provincia": "Buenos Aires",
        "municipio": "Lanús",
        "domicilio": "Tuyuti 3003"
      },
      "fechaNac": "1973-09-10",
      "contactoEmergencia": "Mariana Podokian",
      "apellido": "Venegas",
      "tarifaTipo": {
        "especial": false,
        "general": true,
        "personalizada": false,
        "eventual": false
      },
      "idProveedor": 0,
      "vehiculo": [
        {
          "modelo": "Fiorino",
          "publicidad": false,
          "dominio": "LCP568",
          "refrigeracion": null,
          "marca": "Fiat",
          "tarjetaCombustible": true,
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "satelital": "Stop Car",
          "tipoCombustible": [
            "Nafta"
          ],
          "segSat": true
        }
      ],
      "celularContacto": "1151465696",
      "tarifaAsignada": true,
      "id": "rsFavZLKXlrRMuilBzCS",
      "condFiscal": "Monotributista - Factura C"
    },
    "facturaChofer": 1744468979354,
    "valores": {
      "chofer": {
        "kmAdicional": 0,
        "acompValor": 0,
        "tarifaBase": 66000,
        "aPagar": 66000
      },
      "cliente": {
        "aCobrar": 87000,
        "tarifaBase": 87000,
        "kmAdicional": 0,
        "acompValor": 0
      }
    },
    "tarifaEventual": {
      "cliente": {
        "concepto": "",
        "valor": 0
      },
      "chofer": {
        "valor": 0,
        "concepto": ""
      }
    },
    "cliente": {
      "type": "added",
      "idCliente": 1736356938304,
      "razonSocial": "Andesmar Cargas SA",
      "direccionOperativa": {
        "provincia": "Buenos Aires",
        "localidad": "Avellaneda",
        "municipio": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda"
      },
      "direccionFiscal": {
        "domicilio": "Rodriguez Peña 205",
        "localidad": "Luzuriaga",
        "municipio": "Maipú",
        "provincia": "Mendoza"
      },
      "tarifaAsignada": true,
      "idTarifa": 1736356577273,
      "tarifaTipo": {
        "especial": false,
        "personalizada": false,
        "general": true,
        "eventual": false
      },
      "contactos": [
        {
          "telefono": "1126439403",
          "apellido": "Paz",
          "email": "juanpaz@andesmar.com.ar",
          "nombre": "Juan",
          "puesto": "Jefe Logistica"
        },
        {
          "email": "",
          "puesto": "Encargado de Logistica",
          "apellido": "Marchetti",
          "telefono": "1133579699",
          "nombre": "Ramiro"
        }
      ],
      "id": "HPceY9retp6KCsNOPJia",
      "condFiscal": "Responsable Inscripto - Factura A",
      "cuit": 30601502778
    },
    "facturaCliente": 1744468979354,
    "documentacion": null,
    "acompaniante": false,
    "tarifaTipo": {
      "eventual": false,
      "general": true,
      "personalizada": false,
      "especial": false
    },
    "hojaRuta": "",
    "tarifaPersonalizada": {
      "seccion": 0,
      "nombre": "",
      "aCobrar": 0,
      "categoria": 0,
      "aPagar": 0
    },
    "fecha": "2025-04-11",
    "multiplicadorCliente": 1,
    "multiplicadorChofer": 1,
    "observaciones": "",
    "estado": {
      "abierta": false,
      "facCliente": false,
      "cerrada": false,
      "facChofer": false,
      "facturada": true
    },
    "patenteChofer": "LCP568",
    "idOperacion": 1744462260852,
    "km": 42
  },
  {
    "id": "mlhOentfD7yZz8Jqt7rd",
    "patenteChofer": "HPP453",
    "tarifaTipo": {
      "eventual": false,
      "personalizada": false,
      "especial": false,
      "general": true
    },
    "chofer": {
      "idProveedor": 0,
      " condFiscal": "",
      "contactoEmergencia": "",
      "celularContacto": "1130719809",
      "type": "added",
      "vehiculo": [
        {
          "dominio": "HPP453",
          "marca": "Volkswagen",
          "refrigeracion": null,
          "satelital": "Stop Car",
          "categoria": {
            "nombre": "Maxi",
            "catOrden": 2
          },
          "tarjetaCombustible": true,
          "segSat": true,
          "tipoCombustible": [
            "nafta"
          ],
          "modelo": "Transporter",
          "publicidad": false
        }
      ],
      "cuit": 20380305381,
      "idTarifa": 1736793791030,
      "nombre": "Ariel Omar",
      "tarifaTipo": {
        "eventual": false,
        "especial": false,
        "general": true,
        "personalizada": false
      },
      "idChofer": 1736730226989,
      "tarifaAsignada": true,
      "direccion": {
        "provincia": "",
        " municipio": "",
        "localidad": "",
        "domicilio": "Juncal 777 - Lanus"
      },
      "id": "75TLs99t6qSNTuHessGQ",
      "apellido": "Quiroga",
      "email": "actualizar@gmail.com",
      "fechaNac": "1994-02-01",
      "celularEmergencia": ""
    },
    "tarifaEventual": {
      "chofer": {
        "valor": 0,
        "concepto": ""
      },
      "cliente": {
        "concepto": "",
        "valor": 0
      }
    },
    "observaciones": "",
    "valores": {
      "cliente": {
        "aCobrar": 180000,
        "kmAdicional": 20000,
        "acompValor": 0,
        "tarifaBase": 160000
      },
      "chofer": {
        "acompValor": 0,
        "kmAdicional": 16500,
        "aPagar": 131500,
        "tarifaBase": 115000
      }
    },
    "idOperacion": 1744462224184,
    "facturaChofer": 1745270024798,
    "multiplicadorCliente": 1,
    "fecha": "2025-04-09",
    "acompaniante": false,
    "hojaRuta": "",
    "multiplicadorChofer": 1,
    "km": 92,
    "tarifaPersonalizada": {
      "categoria": 0,
      "aPagar": 0,
      "seccion": 0,
      "nombre": "",
      "aCobrar": 0
    },
    "cliente": {
      "cuit": 30601502778,
      "tarifaTipo": {
        "personalizada": false,
        "eventual": false,
        "general": true,
        "especial": false
      },
      "contactos": [
        {
          "apellido": "Paz",
          "puesto": "Jefe Logistica",
          "nombre": "Juan",
          "telefono": "1126439403",
          "email": "juanpaz@andesmar.com.ar"
        },
        {
          "email": "",
          "puesto": "Encargado de Logistica",
          "apellido": "Marchetti",
          "telefono": "1133579699",
          "nombre": "Ramiro"
        }
      ],
      "direccionOperativa": {
        "domicilio": "General Gorriti 650 - Avellaneda",
        "localidad": "Avellaneda",
        "municipio": "Avellaneda",
        "provincia": "Buenos Aires"
      },
      "direccionFiscal": {
        "domicilio": "Rodriguez Peña 205",
        "municipio": "Maipú",
        "provincia": "Mendoza",
        "localidad": "Luzuriaga"
      },
      "id": "HPceY9retp6KCsNOPJia",
      "type": "added",
      "condFiscal": "Responsable Inscripto - Factura A",
      "razonSocial": "Andesmar Cargas SA",
      "idCliente": 1736356938304,
      "idTarifa": 1736356577273,
      "tarifaAsignada": true
    },
    "documentacion": null,
    "estado": {
      "cerrada": false,
      "facturada": true,
      "facCliente": false,
      "facChofer": false,
      "abierta": false
    },
    "facturaCliente": 1745270024798
  },
  {
    "id": "OXh8oUeGHvxlReGzyzQK",
    "tarifaTipo": {
      "general": true,
      "especial": false,
      "eventual": false,
      "personalizada": false
    },
    "acompaniante": false,
    "multiplicadorCliente": 1,
    "multiplicadorChofer": 1,
    "km": 155,
    "valores": {
      "cliente": {
        "acompValor": 0,
        "tarifaBase": 87000,
        "kmAdicional": 38500,
        "aCobrar": 125500
      },
      "chofer": {
        "tarifaBase": 66000,
        "aPagar": 96800,
        "acompValor": 0,
        "kmAdicional": 30800
      }
    },
    "observaciones": "",
    "chofer": {
      "fechaNac": "2002-08-09",
      "celularContacto": "1166620796",
      "apellido": "Fernandez",
      "idChofer": 1736728211494,
      "celularEmergencia": "1139135361",
      "idTarifa": 1736793791030,
      "id": "IYdOM7gOiBPrLRIukidg",
      "condFiscal": "Monotributista - Factura C",
      "type": "added",
      "idProveedor": 0,
      "nombre": "Tomas Yamil",
      "vehiculo": [
        {
          "dominio": "OPB248",
          "publicidad": false,
          "marca": "Peugeot",
          "tipoCombustible": [
            "Nafta"
          ],
          "modelo": "Partner",
          "segSat": true,
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "tarjetaCombustible": false,
          "refrigeracion": null,
          "satelital": "Stop Car"
        }
      ],
      "contactoEmergencia": "Maitena Rodríguez",
      "email": "toma.f@hotmail.com",
      "direccion": {
        "municipio": "Lanús",
        "provincia": "Buenos Aires",
        "domicilio": "R. de Escalada  de San Martin 1483",
        "localidad": "Lanús Oeste"
      },
      "cuit": 20443384900,
      "tarifaTipo": {
        "general": true,
        "personalizada": false,
        "especial": false,
        "eventual": false
      },
      "tarifaAsignada": true
    },
    "estado": {
      "facChofer": false,
      "facturada": true,
      "facCliente": false,
      "cerrada": false,
      "abierta": false
    },
    "documentacion": null,
    "facturaChofer": 1744465839747,
    "hojaRuta": "",
    "facturaCliente": 1744465839746,
    "tarifaPersonalizada": {
      "categoria": 0,
      "nombre": "",
      "seccion": 0,
      "aPagar": 0,
      "aCobrar": 0
    },
    "patenteChofer": "OPB248",
    "idOperacion": 1744462224182,
    "tarifaEventual": {
      "cliente": {
        "concepto": "",
        "valor": 0
      },
      "chofer": {
        "concepto": "",
        "valor": 0
      }
    },
    "cliente": {
      "condFiscal": "Responsable Inscripto - Factura A",
      "direccionFiscal": {
        "localidad": "Luzuriaga",
        "provincia": "Mendoza",
        "domicilio": "Rodriguez Peña 205",
        "municipio": "Maipú"
      },
      "contactos": [
        {
          "puesto": "Jefe Logistica",
          "email": "juanpaz@andesmar.com.ar",
          "nombre": "Juan",
          "apellido": "Paz",
          "telefono": "1126439403"
        },
        {
          "email": "",
          "puesto": "Encargado de Logistica",
          "nombre": "Ramiro",
          "apellido": "Marchetti",
          "telefono": "1133579699"
        }
      ],
      "id": "HPceY9retp6KCsNOPJia",
      "tarifaTipo": {
        "personalizada": false,
        "general": true,
        "especial": false,
        "eventual": false
      },
      "type": "added",
      "tarifaAsignada": true,
      "direccionOperativa": {
        "provincia": "Buenos Aires",
        "localidad": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "municipio": "Avellaneda"
      },
      "idCliente": 1736356938304,
      "cuit": 30601502778,
      "razonSocial": "Andesmar Cargas SA",
      "idTarifa": 1736356577273
    },
    "fecha": "2025-04-09"
  },
  {
    "id": "OHRIluQS8yNulw2fUy1Y",
    "multiplicadorChofer": 1,
    "patenteChofer": "AD071GH",
    "tarifaPersonalizada": {
      "aCobrar": 0,
      "categoria": 0,
      "aPagar": 0,
      "seccion": 0,
      "nombre": ""
    },
    "documentacion": null,
    "fecha": "2025-04-09",
    "facturaCliente": 1744468877706,
    "acompaniante": false,
    "facturaChofer": 1744468877706,
    "tarifaTipo": {
      "especial": false,
      "general": true,
      "personalizada": false,
      "eventual": false
    },
    "hojaRuta": "",
    "cliente": {
      "idCliente": 1736356938304,
      "id": "HPceY9retp6KCsNOPJia",
      "idTarifa": 1736356577273,
      "tarifaAsignada": true,
      "tarifaTipo": {
        "eventual": false,
        "general": true,
        "personalizada": false,
        "especial": false
      },
      "direccionFiscal": {
        "provincia": "Mendoza",
        "domicilio": "Rodriguez Peña 205",
        "municipio": "Maipú",
        "localidad": "Luzuriaga"
      },
      "contactos": [
        {
          "puesto": "Jefe Logistica",
          "email": "juanpaz@andesmar.com.ar",
          "nombre": "Juan",
          "apellido": "Paz",
          "telefono": "1126439403"
        },
        {
          "puesto": "Encargado de Logistica",
          "email": "",
          "telefono": "1133579699",
          "apellido": "Marchetti",
          "nombre": "Ramiro"
        }
      ],
      "cuit": 30601502778,
      "type": "added",
      "condFiscal": "Responsable Inscripto - Factura A",
      "razonSocial": "Andesmar Cargas SA",
      "direccionOperativa": {
        "domicilio": "General Gorriti 650 - Avellaneda",
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda",
        "localidad": "Avellaneda"
      }
    },
    "observaciones": "",
    "estado": {
      "abierta": false,
      "cerrada": false,
      "facCliente": false,
      "facturada": true,
      "facChofer": false
    },
    "tarifaEventual": {
      "chofer": {
        "concepto": "",
        "valor": 0
      },
      "cliente": {
        "concepto": "",
        "valor": 0
      }
    },
    "km": 65,
    "multiplicadorCliente": 1,
    "valores": {
      "chofer": {
        "aPagar": 71600,
        "kmAdicional": 5600,
        "acompValor": 0,
        "tarifaBase": 66000
      },
      "cliente": {
        "aCobrar": 94000,
        "tarifaBase": 87000,
        "kmAdicional": 7000,
        "acompValor": 0
      }
    },
    "chofer": {
      "condFiscal": "Monotributista - Factura C",
      "celularContacto": "1153499040",
      "id": "vIsDMqhm9hag6LXDt28I",
      "vehiculo": [
        {
          "publicidad": false,
          "segSat": true,
          "modelo": "Fiorino",
          "refrigeracion": null,
          "marca": "Fiat",
          "dominio": "AD071GH",
          "categoria": {
            "nombre": "Mini",
            "catOrden": 1
          },
          "tipoCombustible": [
            "Nafta"
          ],
          "tarjetaCombustible": false,
          "satelital": "Stop Car"
        }
      ],
      "apellido": "Soto",
      "celularEmergencia": "1123711081",
      "direccion": {
        "domicilio": "Pasaje Cerviño 312",
        "localidad": "Sarandí",
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda"
      },
      "idChofer": 1736792086528,
      "fechaNac": "1998-03-13",
      "email": "cristiannicolassoto1303@gmail.com",
      "tarifaAsignada": true,
      "idProveedor": 0,
      "contactoEmergencia": "Lorena Soto",
      "cuit": 20410488392,
      "idTarifa": 1736793791030,
      "tarifaTipo": {
        "general": true,
        "personalizada": false,
        "eventual": false,
        "especial": false
      },
      "type": "added",
      "nombre": "Christian Nicolas"
    },
    "idOperacion": 1744462224185
  },
  {
    "id": "B1QzObU1lH9QCMMSqXgz",
    "documentacion": null,
    "multiplicadorCliente": 1,
    "fecha": "2025-04-09",
    "idOperacion": 1744462224186,
    "cliente": {
      "tarifaTipo": {
        "especial": false,
        "personalizada": false,
        "general": true,
        "eventual": false
      },
      "idTarifa": 1736356577273,
      "direccionOperativa": {
        "domicilio": "General Gorriti 650 - Avellaneda",
        "localidad": "Avellaneda",
        "municipio": "Avellaneda",
        "provincia": "Buenos Aires"
      },
      "idCliente": 1736356938304,
      "condFiscal": "Responsable Inscripto - Factura A",
      "contactos": [
        {
          "nombre": "Juan",
          "apellido": "Paz",
          "puesto": "Jefe Logistica",
          "email": "juanpaz@andesmar.com.ar",
          "telefono": "1126439403"
        },
        {
          "email": "",
          "telefono": "1133579699",
          "nombre": "Ramiro",
          "apellido": "Marchetti",
          "puesto": "Encargado de Logistica"
        }
      ],
      "cuit": 30601502778,
      "id": "HPceY9retp6KCsNOPJia",
      "type": "added",
      "direccionFiscal": {
        "domicilio": "Rodriguez Peña 205",
        "municipio": "Maipú",
        "localidad": "Luzuriaga",
        "provincia": "Mendoza"
      },
      "tarifaAsignada": true,
      "razonSocial": "Andesmar Cargas SA"
    },
    "facturaChofer": 1744468987252,
    "valores": {
      "chofer": {
        "kmAdicional": 39200,
        "aPagar": 105200,
        "acompValor": 0,
        "tarifaBase": 66000
      },
      "cliente": {
        "kmAdicional": 49000,
        "tarifaBase": 87000,
        "acompValor": 0,
        "aCobrar": 136000
      }
    },
    "acompaniante": false,
    "hojaRuta": "",
    "facturaCliente": 1744468987252,
    "multiplicadorChofer": 1,
    "patenteChofer": "LCP568",
    "tarifaPersonalizada": {
      "seccion": 0,
      "nombre": "",
      "aCobrar": 0,
      "aPagar": 0,
      "categoria": 0
    },
    "tarifaEventual": {
      "chofer": {
        "concepto": "",
        "valor": 0
      },
      "cliente": {
        "concepto": "",
        "valor": 0
      }
    },
    "km": 187,
    "observaciones": "",
    "tarifaTipo": {
      "general": true,
      "eventual": false,
      "personalizada": false,
      "especial": false
    },
    "estado": {
      "facCliente": false,
      "facturada": true,
      "abierta": false,
      "cerrada": false,
      "facChofer": false
    },
    "chofer": {
      "nombre": "Adrian Ernesto",
      "idProveedor": 0,
      "tarifaAsignada": true,
      "tarifaTipo": {
        "especial": false,
        "general": true,
        "eventual": false,
        "personalizada": false
      },
      "type": "added",
      "celularContacto": "1151465696",
      "idChofer": 1736791944623,
      "email": "adrianvenegas7573@gmail.com",
      "apellido": "Venegas",
      "cuit": 20235231531,
      "idTarifa": 1736793791030,
      "fechaNac": "1973-09-10",
      "condFiscal": "Monotributista - Factura C",
      "direccion": {
        "provincia": "Buenos Aires",
        "municipio": "Lanús",
        "domicilio": "Tuyuti 3003",
        "localidad": "Valentín Alsina"
      },
      "vehiculo": [
        {
          "segSat": true,
          "dominio": "LCP568",
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "satelital": "Stop Car",
          "modelo": "Fiorino",
          "refrigeracion": null,
          "tipoCombustible": [
            "Nafta"
          ],
          "publicidad": false,
          "marca": "Fiat",
          "tarjetaCombustible": true
        }
      ],
      "celularEmergencia": "1139103989",
      "contactoEmergencia": "Mariana Podokian",
      "id": "rsFavZLKXlrRMuilBzCS"
    }
  },
  {
    "id": "0SbV1Me9sF53CKQds6me",
    "chofer": {
      "vehiculo": [
        {
          "segSat": true,
          "satelital": "Stop Car",
          "tarjetaCombustible": false,
          "categoria": {
            "nombre": "Mini",
            "catOrden": 1
          },
          "dominio": "LUC928",
          "modelo": "Partner",
          "tipoCombustible": [
            "Nafta"
          ],
          "refrigeracion": null,
          "publicidad": false,
          "marca": "Peugeot"
        }
      ],
      "condFiscal": "Monotributista - Factura C",
      "fechaNac": "1996-03-07",
      "apellido": "Fernandez",
      "email": "fndzmatias@gmail.com",
      "nombre": "Matias Alberto",
      "cuit": 20389286750,
      "celularEmergencia": "1161671994",
      "tarifaAsignada": true,
      "type": "added",
      "idTarifa": 1736793791030,
      "tarifaTipo": {
        "general": true,
        "especial": false,
        "personalizada": false,
        "eventual": false
      },
      "direccion": {
        "provincia": "Buenos Aires",
        "domicilio": "Pje Rosa Acevedo 1049",
        "localidad": "Lanús Oeste",
        "municipio": "Lanús"
      },
      "idChofer": 1736727991651,
      "celularContacto": "1133652485",
      "idProveedor": 0,
      "id": "jhjDx7Yh3lf56iAFBWWp",
      "contactoEmergencia": "Stella"
    },
    "idOperacion": 1744462224183,
    "hojaRuta": "",
    "documentacion": null,
    "facturaCliente": 1744758244757,
    "cliente": {
      "direccionOperativa": {
        "localidad": "Avellaneda",
        "provincia": "Buenos Aires",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "municipio": "Avellaneda"
      },
      "tarifaAsignada": true,
      "condFiscal": "Responsable Inscripto - Factura A",
      "idTarifa": 1736356577273,
      "id": "HPceY9retp6KCsNOPJia",
      "cuit": 30601502778,
      "type": "added",
      "idCliente": 1736356938304,
      "razonSocial": "Andesmar Cargas SA",
      "direccionFiscal": {
        "localidad": "Luzuriaga",
        "domicilio": "Rodriguez Peña 205",
        "provincia": "Mendoza",
        "municipio": "Maipú"
      },
      "tarifaTipo": {
        "personalizada": false,
        "especial": false,
        "general": true,
        "eventual": false
      },
      "contactos": [
        {
          "nombre": "Juan",
          "apellido": "Paz",
          "telefono": "1126439403",
          "email": "juanpaz@andesmar.com.ar",
          "puesto": "Jefe Logistica"
        },
        {
          "email": "",
          "puesto": "Encargado de Logistica",
          "telefono": "1133579699",
          "apellido": "Marchetti",
          "nombre": "Ramiro"
        }
      ]
    },
    "tarifaPersonalizada": {
      "aCobrar": 0,
      "aPagar": 0,
      "seccion": 0,
      "categoria": 0,
      "nombre": ""
    },
    "fecha": "2025-04-09",
    "multiplicadorCliente": 1,
    "valores": {
      "chofer": {
        "kmAdicional": 36400,
        "acompValor": 0,
        "aPagar": 102400,
        "tarifaBase": 66000
      },
      "cliente": {
        "aCobrar": 132500,
        "tarifaBase": 87000,
        "kmAdicional": 45500,
        "acompValor": 0
      }
    },
    "tarifaEventual": {
      "cliente": {
        "valor": 0,
        "concepto": ""
      },
      "chofer": {
        "valor": 0,
        "concepto": ""
      }
    },
    "multiplicadorChofer": 1,
    "estado": {
      "facCliente": false,
      "abierta": false,
      "facturada": true,
      "cerrada": false,
      "facChofer": false
    },
    "tarifaTipo": {
      "general": true,
      "eventual": false,
      "personalizada": false,
      "especial": false
    },
    "acompaniante": false,
    "patenteChofer": "LUC928",
    "observaciones": "",
    "facturaChofer": 1744758244758,
    "km": 171
  },
  {
    "id": "kyh3nvTgxd1eWSiLu7c1",
    "estado": {
      "facCliente": false,
      "facturada": true,
      "abierta": false,
      "facChofer": false,
      "cerrada": false
    },
    "facturaChofer": 1744758235899,
    "multiplicadorCliente": 1,
    "tarifaPersonalizada": {
      "aPagar": 0,
      "nombre": "",
      "aCobrar": 0,
      "seccion": 0,
      "categoria": 0
    },
    "patenteChofer": "LUC928",
    "idOperacion": 1744462169498,
    "multiplicadorChofer": 1,
    "chofer": {
      "cuit": 20389286750,
      "tarifaTipo": {
        "especial": false,
        "eventual": false,
        "personalizada": false,
        "general": true
      },
      "email": "fndzmatias@gmail.com",
      "celularEmergencia": "1161671994",
      "idProveedor": 0,
      "direccion": {
        "localidad": "Lanús Oeste",
        "domicilio": "Pje Rosa Acevedo 1049",
        "provincia": "Buenos Aires",
        "municipio": "Lanús"
      },
      "fechaNac": "1996-03-07",
      "contactoEmergencia": "Stella",
      "apellido": "Fernandez",
      "nombre": "Matias Alberto",
      "vehiculo": [
        {
          "tarjetaCombustible": false,
          "marca": "Peugeot",
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "segSat": true,
          "satelital": "Stop Car",
          "dominio": "LUC928",
          "publicidad": false,
          "modelo": "Partner",
          "tipoCombustible": [
            "Nafta"
          ],
          "refrigeracion": null
        }
      ],
      "tarifaAsignada": true,
      "condFiscal": "Monotributista - Factura C",
      "id": "jhjDx7Yh3lf56iAFBWWp",
      "celularContacto": "1133652485",
      "idTarifa": 1736793791030,
      "idChofer": 1736727991651,
      "type": "added"
    },
    "fecha": "2025-04-08",
    "observaciones": "",
    "km": 54,
    "tarifaEventual": {
      "chofer": {
        "concepto": "",
        "valor": 0
      },
      "cliente": {
        "valor": 0,
        "concepto": ""
      }
    },
    "tarifaTipo": {
      "general": true,
      "especial": false,
      "personalizada": false,
      "eventual": false
    },
    "acompaniante": false,
    "valores": {
      "chofer": {
        "aPagar": 68800,
        "acompValor": 0,
        "tarifaBase": 66000,
        "kmAdicional": 2800
      },
      "cliente": {
        "tarifaBase": 87000,
        "kmAdicional": 3500,
        "aCobrar": 90500,
        "acompValor": 0
      }
    },
    "cliente": {
      "id": "HPceY9retp6KCsNOPJia",
      "idCliente": 1736356938304,
      "idTarifa": 1736356577273,
      "direccionFiscal": {
        "localidad": "Luzuriaga",
        "domicilio": "Rodriguez Peña 205",
        "municipio": "Maipú",
        "provincia": "Mendoza"
      },
      "condFiscal": "Responsable Inscripto - Factura A",
      "tarifaAsignada": true,
      "type": "added",
      "tarifaTipo": {
        "especial": false,
        "personalizada": false,
        "eventual": false,
        "general": true
      },
      "direccionOperativa": {
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda",
        "localidad": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda"
      },
      "razonSocial": "Andesmar Cargas SA",
      "contactos": [
        {
          "nombre": "Juan",
          "telefono": "1126439403",
          "email": "juanpaz@andesmar.com.ar",
          "apellido": "Paz",
          "puesto": "Jefe Logistica"
        },
        {
          "puesto": "Encargado de Logistica",
          "email": "",
          "telefono": "1133579699",
          "nombre": "Ramiro",
          "apellido": "Marchetti"
        }
      ],
      "cuit": 30601502778
    },
    "documentacion": null,
    "facturaCliente": 1744758235899,
    "hojaRuta": ""
  },
  {
    "id": "iEO7pV9u7Vb2SjD4oPCP",
    "tarifaPersonalizada": {
      "nombre": "",
      "aCobrar": 0,
      "seccion": 0,
      "categoria": 0,
      "aPagar": 0
    },
    "valores": {
      "chofer": {
        "acompValor": 0,
        "kmAdicional": 44800,
        "tarifaBase": 66000,
        "aPagar": 110800
      },
      "cliente": {
        "tarifaBase": 87000,
        "kmAdicional": 56000,
        "aCobrar": 143000,
        "acompValor": 0
      }
    },
    "km": 202,
    "observaciones": "",
    "multiplicadorChofer": 1,
    "facturaCliente": 1744465848951,
    "idOperacion": 1744462169497,
    "documentacion": null,
    "tarifaEventual": {
      "cliente": {
        "valor": 0,
        "concepto": ""
      },
      "chofer": {
        "concepto": "",
        "valor": 0
      }
    },
    "tarifaTipo": {
      "especial": false,
      "general": true,
      "personalizada": false,
      "eventual": false
    },
    "hojaRuta": "",
    "fecha": "2025-04-08",
    "cliente": {
      "cuit": 30601502778,
      "id": "HPceY9retp6KCsNOPJia",
      "razonSocial": "Andesmar Cargas SA",
      "contactos": [
        {
          "email": "juanpaz@andesmar.com.ar",
          "puesto": "Jefe Logistica",
          "apellido": "Paz",
          "nombre": "Juan",
          "telefono": "1126439403"
        },
        {
          "nombre": "Ramiro",
          "email": "",
          "telefono": "1133579699",
          "puesto": "Encargado de Logistica",
          "apellido": "Marchetti"
        }
      ],
      "tarifaTipo": {
        "especial": false,
        "eventual": false,
        "general": true,
        "personalizada": false
      },
      "direccionOperativa": {
        "domicilio": "General Gorriti 650 - Avellaneda",
        "provincia": "Buenos Aires",
        "localidad": "Avellaneda",
        "municipio": "Avellaneda"
      },
      "idTarifa": 1736356577273,
      "condFiscal": "Responsable Inscripto - Factura A",
      "type": "added",
      "tarifaAsignada": true,
      "direccionFiscal": {
        "provincia": "Mendoza",
        "localidad": "Luzuriaga",
        "municipio": "Maipú",
        "domicilio": "Rodriguez Peña 205"
      },
      "idCliente": 1736356938304
    },
    "chofer": {
      "nombre": "Tomas Yamil",
      "idChofer": 1736728211494,
      "fechaNac": "2002-08-09",
      "contactoEmergencia": "Maitena Rodríguez",
      "id": "IYdOM7gOiBPrLRIukidg",
      "celularContacto": "1166620796",
      "apellido": "Fernandez",
      "condFiscal": "Monotributista - Factura C",
      "type": "added",
      "email": "toma.f@hotmail.com",
      "celularEmergencia": "1139135361",
      "direccion": {
        "localidad": "Lanús Oeste",
        "domicilio": "R. de Escalada  de San Martin 1483",
        "municipio": "Lanús",
        "provincia": "Buenos Aires"
      },
      "cuit": 20443384900,
      "tarifaTipo": {
        "eventual": false,
        "especial": false,
        "general": true,
        "personalizada": false
      },
      "vehiculo": [
        {
          "satelital": "Stop Car",
          "refrigeracion": null,
          "modelo": "Partner",
          "marca": "Peugeot",
          "tipoCombustible": [
            "Nafta"
          ],
          "segSat": true,
          "publicidad": false,
          "categoria": {
            "nombre": "Mini",
            "catOrden": 1
          },
          "tarjetaCombustible": false,
          "dominio": "OPB248"
        }
      ],
      "idProveedor": 0,
      "idTarifa": 1736793791030,
      "tarifaAsignada": true
    },
    "multiplicadorCliente": 1,
    "patenteChofer": "OPB248",
    "facturaChofer": 1744465848951,
    "estado": {
      "facCliente": false,
      "facturada": true,
      "abierta": false,
      "cerrada": false,
      "facChofer": false
    },
    "acompaniante": false
  },
  {
    "id": "HeFg2QegZWh3IZqkqWLa",
    "chofer": {
      "cuit": 20380305381,
      " condFiscal": "",
      "tarifaAsignada": true,
      "celularContacto": "1130719809",
      "direccion": {
        "localidad": "",
        "domicilio": "Juncal 777 - Lanus",
        " municipio": "",
        "provincia": ""
      },
      "vehiculo": [
        {
          "satelital": "Stop Car",
          "tarjetaCombustible": true,
          "publicidad": false,
          "categoria": {
            "nombre": "Maxi",
            "catOrden": 2
          },
          "modelo": "Transporter",
          "segSat": true,
          "tipoCombustible": [
            "nafta"
          ],
          "refrigeracion": null,
          "marca": "Volkswagen",
          "dominio": "HPP453"
        }
      ],
      "apellido": "Quiroga",
      "fechaNac": "1994-02-01",
      "contactoEmergencia": "",
      "idProveedor": 0,
      "type": "added",
      "celularEmergencia": "",
      "email": "actualizar@gmail.com",
      "nombre": "Ariel Omar",
      "idTarifa": 1736793791030,
      "idChofer": 1736730226989,
      "id": "75TLs99t6qSNTuHessGQ",
      "tarifaTipo": {
        "personalizada": false,
        "especial": false,
        "eventual": false,
        "general": true
      }
    },
    "cliente": {
      "cuit": 30601502778,
      "idTarifa": 1736356577273,
      "idCliente": 1736356938304,
      "direccionOperativa": {
        "municipio": "Avellaneda",
        "provincia": "Buenos Aires",
        "localidad": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda"
      },
      "direccionFiscal": {
        "provincia": "Mendoza",
        "localidad": "Luzuriaga",
        "domicilio": "Rodriguez Peña 205",
        "municipio": "Maipú"
      },
      "condFiscal": "Responsable Inscripto - Factura A",
      "id": "HPceY9retp6KCsNOPJia",
      "tarifaTipo": {
        "especial": false,
        "general": true,
        "eventual": false,
        "personalizada": false
      },
      "type": "added",
      "tarifaAsignada": true,
      "razonSocial": "Andesmar Cargas SA",
      "contactos": [
        {
          "nombre": "Juan",
          "email": "juanpaz@andesmar.com.ar",
          "puesto": "Jefe Logistica",
          "telefono": "1126439403",
          "apellido": "Paz"
        },
        {
          "email": "",
          "apellido": "Marchetti",
          "nombre": "Ramiro",
          "puesto": "Encargado de Logistica",
          "telefono": "1133579699"
        }
      ]
    },
    "multiplicadorChofer": 1,
    "km": 149,
    "observaciones": "",
    "tarifaPersonalizada": {
      "aCobrar": 0,
      "nombre": "",
      "aPagar": 0,
      "seccion": 0,
      "categoria": 0
    },
    "acompaniante": false,
    "facturaChofer": 1745270011986,
    "hojaRuta": "",
    "facturaCliente": 1745270011985,
    "documentacion": null,
    "valores": {
      "chofer": {
        "kmAdicional": 33000,
        "aPagar": 148000,
        "tarifaBase": 115000,
        "acompValor": 0
      },
      "cliente": {
        "acompValor": 0,
        "kmAdicional": 40000,
        "tarifaBase": 160000,
        "aCobrar": 200000
      }
    },
    "tarifaEventual": {
      "cliente": {
        "concepto": "",
        "valor": 0
      },
      "chofer": {
        "concepto": "",
        "valor": 0
      }
    },
    "tarifaTipo": {
      "eventual": false,
      "personalizada": false,
      "especial": false,
      "general": true
    },
    "idOperacion": 1744462169499,
    "fecha": "2025-04-08",
    "estado": {
      "facCliente": false,
      "facturada": true,
      "cerrada": false,
      "abierta": false,
      "facChofer": false
    },
    "patenteChofer": "HPP453",
    "multiplicadorCliente": 1
  },
  {
    "id": "7TxMP3KTG7y5NP8IplBa",
    "fecha": "2025-04-08",
    "cliente": {
      "id": "HPceY9retp6KCsNOPJia",
      "condFiscal": "Responsable Inscripto - Factura A",
      "tarifaTipo": {
        "especial": false,
        "general": true,
        "personalizada": false,
        "eventual": false
      },
      "direccionOperativa": {
        "municipio": "Avellaneda",
        "localidad": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "provincia": "Buenos Aires"
      },
      "type": "added",
      "contactos": [
        {
          "telefono": "1126439403",
          "email": "juanpaz@andesmar.com.ar",
          "puesto": "Jefe Logistica",
          "apellido": "Paz",
          "nombre": "Juan"
        },
        {
          "apellido": "Marchetti",
          "telefono": "1133579699",
          "email": "",
          "puesto": "Encargado de Logistica",
          "nombre": "Ramiro"
        }
      ],
      "tarifaAsignada": true,
      "idCliente": 1736356938304,
      "idTarifa": 1736356577273,
      "direccionFiscal": {
        "localidad": "Luzuriaga",
        "municipio": "Maipú",
        "domicilio": "Rodriguez Peña 205",
        "provincia": "Mendoza"
      },
      "cuit": 30601502778,
      "razonSocial": "Andesmar Cargas SA"
    },
    "chofer": {
      "condFiscal": "Monotributista - Factura C",
      "email": "adrianvenegas7573@gmail.com",
      "tarifaAsignada": true,
      "fechaNac": "1973-09-10",
      "id": "rsFavZLKXlrRMuilBzCS",
      "type": "added",
      "celularEmergencia": "1139103989",
      "nombre": "Adrian Ernesto",
      "celularContacto": "1151465696",
      "apellido": "Venegas",
      "idProveedor": 0,
      "tarifaTipo": {
        "especial": false,
        "general": true,
        "eventual": false,
        "personalizada": false
      },
      "cuit": 20235231531,
      "idTarifa": 1736793791030,
      "contactoEmergencia": "Mariana Podokian",
      "vehiculo": [
        {
          "tipoCombustible": [
            "Nafta"
          ],
          "refrigeracion": null,
          "dominio": "LCP568",
          "segSat": true,
          "marca": "Fiat",
          "categoria": {
            "nombre": "Mini",
            "catOrden": 1
          },
          "modelo": "Fiorino",
          "publicidad": false,
          "tarjetaCombustible": true,
          "satelital": "Stop Car"
        }
      ],
      "idChofer": 1736791944623,
      "direccion": {
        "domicilio": "Tuyuti 3003",
        "localidad": "Valentín Alsina",
        "municipio": "Lanús",
        "provincia": "Buenos Aires"
      }
    },
    "tarifaPersonalizada": {
      "aPagar": 0,
      "aCobrar": 0,
      "nombre": "",
      "seccion": 0,
      "categoria": 0
    },
    "patenteChofer": "LCP568",
    "documentacion": null,
    "idOperacion": 1744462169500,
    "tarifaEventual": {
      "cliente": {
        "concepto": "",
        "valor": 0
      },
      "chofer": {
        "concepto": "",
        "valor": 0
      }
    },
    "facturaChofer": 1744468993512,
    "tarifaTipo": {
      "general": true,
      "personalizada": false,
      "eventual": false,
      "especial": false
    },
    "valores": {
      "chofer": {
        "kmAdicional": 39200,
        "aPagar": 105200,
        "tarifaBase": 66000,
        "acompValor": 0
      },
      "cliente": {
        "acompValor": 0,
        "tarifaBase": 87000,
        "kmAdicional": 49000,
        "aCobrar": 136000
      }
    },
    "estado": {
      "facChofer": false,
      "facturada": true,
      "abierta": false,
      "facCliente": false,
      "cerrada": false
    },
    "km": 183,
    "hojaRuta": "",
    "multiplicadorCliente": 1,
    "facturaCliente": 1744468993512,
    "observaciones": "",
    "acompaniante": false,
    "multiplicadorChofer": 1
  },
  {
    "id": "kRftjf50V9pahAIXN9bN",
    "km": 128,
    "valores": {
      "cliente": {
        "aCobrar": 192000,
        "acompValor": 0,
        "kmAdicional": 32000,
        "tarifaBase": 160000
      },
      "chofer": {
        "aPagar": 141400,
        "kmAdicional": 26400,
        "acompValor": 0,
        "tarifaBase": 115000
      }
    },
    "tarifaTipo": {
      "personalizada": false,
      "especial": false,
      "eventual": false,
      "general": true
    },
    "multiplicadorCliente": 1,
    "facturaCliente": 1745270003574,
    "idOperacion": 1744062380157,
    "estado": {
      "abierta": false,
      "facturada": true,
      "cerrada": false,
      "facCliente": false,
      "facChofer": false
    },
    "chofer": {
      "cuit": 20380305381,
      "celularEmergencia": "",
      "vehiculo": [
        {
          "marca": "Volkswagen",
          "tipoCombustible": [
            "nafta"
          ],
          "satelital": "Stop Car",
          "tarjetaCombustible": true,
          "modelo": "Transporter",
          "refrigeracion": null,
          "publicidad": false,
          "dominio": "HPP453",
          "categoria": {
            "nombre": "Maxi",
            "catOrden": 2
          },
          "segSat": true
        }
      ],
      "nombre": "Ariel Omar",
      "idProveedor": 0,
      "tarifaTipo": {
        "eventual": false,
        "personalizada": false,
        "especial": false,
        "general": true
      },
      "idChofer": 1736730226989,
      "id": "75TLs99t6qSNTuHessGQ",
      "direccion": {
        " municipio": "",
        "provincia": "",
        "domicilio": "Juncal 777 - Lanus",
        "localidad": ""
      },
      "apellido": "Quiroga",
      " condFiscal": "",
      "fechaNac": "1994-02-01",
      "tarifaAsignada": true,
      "celularContacto": "1130719809",
      "contactoEmergencia": "",
      "email": "actualizar@gmail.com"
    },
    "tarifaPersonalizada": {
      "seccion": 0,
      "categoria": 0,
      "aCobrar": 0,
      "aPagar": 0,
      "nombre": ""
    },
    "observaciones": "",
    "patenteChofer": "HPP453",
    "fecha": "2025-04-07",
    "tarifaEventual": {
      "cliente": {
        "valor": 0,
        "concepto": ""
      },
      "chofer": {
        "valor": 0,
        "concepto": ""
      }
    },
    "facturaChofer": 1745270003574,
    "acompaniante": false,
    "multiplicadorChofer": 1,
    "hojaRuta": "",
    "documentacion": null,
    "cliente": {
      "tarifaTipo": {
        "general": true,
        "especial": false,
        "personalizada": false,
        "eventual": false
      },
      "id": "HPceY9retp6KCsNOPJia",
      "direccionFiscal": {
        "provincia": "Mendoza",
        "municipio": "Maipú",
        "localidad": "Luzuriaga",
        "domicilio": "Rodriguez Peña 205"
      },
      "contactos": [
        {
          "nombre": "Juan",
          "telefono": "1126439403",
          "email": "juanpaz@andesmar.com.ar",
          "apellido": "Paz",
          "puesto": "Jefe Logistica"
        },
        {
          "puesto": "Encargado de Logistica",
          "email": "",
          "telefono": "1133579699",
          "apellido": "Marchetti",
          "nombre": "Ramiro"
        }
      ],
      "direccionOperativa": {
        "localidad": "Avellaneda",
        "municipio": "Avellaneda",
        "provincia": "Buenos Aires",
        "domicilio": "General Gorriti 650 - Avellaneda"
      },
      "idCliente": 1736356938304,
      "cuit": 30601502778,
      "tarifaAsignada": true,
      "razonSocial": "Andesmar Cargas SA",
      "condFiscal": "Responsable Inscripto - Factura A"
    }
  },
  {
    "id": "WS3oeTvsF1dofdudGQbQ",
    "facturaChofer": 1744407402381,
    "chofer": {
      "idProveedor": 0,
      "direccion": {
        "provincia": "Buenos Aires",
        "localidad": "Valentín Alsina",
        "municipio": "Lanús",
        "domicilio": "Tuyuti 3003"
      },
      "celularContacto": "1151465696",
      "condFiscal": "Monotributista - Factura C",
      "id": "rsFavZLKXlrRMuilBzCS",
      "nombre": "Adrian Ernesto",
      "fechaNac": "1973-09-10",
      "vehiculo": [
        {
          "segSat": true,
          "publicidad": false,
          "tarjetaCombustible": true,
          "modelo": "Fiorino",
          "refrigeracion": null,
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "marca": "Fiat",
          "tipoCombustible": [
            "Nafta"
          ],
          "dominio": "LCP568",
          "satelital": "Stop Car"
        }
      ],
      "tarifaAsignada": true,
      "apellido": "Venegas",
      "tarifaTipo": {
        "eventual": false,
        "especial": false,
        "personalizada": false,
        "general": true
      },
      "idChofer": 1736791944623,
      "contactoEmergencia": "Mariana Podokian",
      "cuit": 20235231531,
      "celularEmergencia": "1139103989",
      "email": "adrianvenegas7573@gmail.com"
    },
    "idOperacion": 1744062380158,
    "documentacion": null,
    "cliente": {
      "condFiscal": "Responsable Inscripto - Factura A",
      "idCliente": 1736356938304,
      "contactos": [
        {
          "apellido": "Paz",
          "telefono": "1126439403",
          "nombre": "Juan",
          "puesto": "Jefe Logistica",
          "email": "juanpaz@andesmar.com.ar"
        },
        {
          "telefono": "1133579699",
          "apellido": "Marchetti",
          "email": "",
          "puesto": "Encargado de Logistica",
          "nombre": "Ramiro"
        }
      ],
      "cuit": 30601502778,
      "direccionOperativa": {
        "municipio": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "provincia": "Buenos Aires",
        "localidad": "Avellaneda"
      },
      "razonSocial": "Andesmar Cargas SA",
      "id": "HPceY9retp6KCsNOPJia",
      "direccionFiscal": {
        "localidad": "Luzuriaga",
        "provincia": "Mendoza",
        "domicilio": "Rodriguez Peña 205",
        "municipio": "Maipú"
      },
      "tarifaAsignada": true,
      "tarifaTipo": {
        "personalizada": false,
        "eventual": false,
        "general": true,
        "especial": false
      }
    },
    "tarifaPersonalizada": {
      "seccion": 0,
      "categoria": 0,
      "aPagar": 0,
      "nombre": "",
      "aCobrar": 0
    },
    "hojaRuta": "",
    "multiplicadorCliente": 1,
    "estado": {
      "facCliente": false,
      "abierta": false,
      "cerrada": false,
      "facturada": true,
      "facChofer": false
    },
    "observaciones": "",
    "facturaCliente": 1744407402381,
    "multiplicadorChofer": 1,
    "km": 182,
    "tarifaEventual": {
      "chofer": {
        "valor": 0,
        "concepto": ""
      },
      "cliente": {
        "valor": 0,
        "concepto": ""
      }
    },
    "patenteChofer": "LCP568",
    "fecha": "2025-04-07",
    "valores": {
      "cliente": {
        "acompValor": 0,
        "kmAdicional": 49000,
        "tarifaBase": 87000,
        "aCobrar": 136000
      },
      "chofer": {
        "acompValor": 0,
        "aPagar": 105200,
        "tarifaBase": 66000,
        "kmAdicional": 39200
      }
    },
    "acompaniante": false,
    "tarifaTipo": {
      "eventual": false,
      "especial": false,
      "general": true,
      "personalizada": false
    }
  },
  {
    "id": "76mfdh7eEqYA1oUO6OPZ",
    "documentacion": null,
    "cliente": {
      "condFiscal": "Responsable Inscripto - Factura A",
      "razonSocial": "Andesmar Cargas SA",
      "direccionOperativa": {
        "domicilio": "General Gorriti 650 - Avellaneda",
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda",
        "localidad": "Avellaneda"
      },
      "cuit": 30601502778,
      "id": "HPceY9retp6KCsNOPJia",
      "contactos": [
        {
          "apellido": "Paz",
          "email": "juanpaz@andesmar.com.ar",
          "telefono": "1126439403",
          "puesto": "Jefe Logistica",
          "nombre": "Juan"
        },
        {
          "nombre": "Ramiro",
          "apellido": "Marchetti",
          "email": "",
          "puesto": "Encargado de Logistica",
          "telefono": "1133579699"
        }
      ],
      "tarifaTipo": {
        "eventual": false,
        "general": true,
        "especial": false,
        "personalizada": false
      },
      "idCliente": 1736356938304,
      "direccionFiscal": {
        "municipio": "Maipú",
        "provincia": "Mendoza",
        "localidad": "Luzuriaga",
        "domicilio": "Rodriguez Peña 205"
      },
      "tarifaAsignada": true
    },
    "facturaCliente": 1744406761139,
    "multiplicadorCliente": 1,
    "acompaniante": false,
    "chofer": {
      "vehiculo": [
        {
          "tarjetaCombustible": false,
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "segSat": true,
          "marca": "Peugeot",
          "dominio": "LUC928",
          "refrigeracion": null,
          "satelital": "Stop Car",
          "tipoCombustible": [
            "Nafta"
          ],
          "publicidad": false,
          "modelo": "Partner"
        }
      ],
      "apellido": "Fernandez",
      "cuit": 20389286750,
      "celularContacto": "1133652485",
      "tarifaAsignada": true,
      "direccion": {
        "provincia": "Buenos Aires",
        "municipio": "Lanús",
        "domicilio": "Pje Rosa Acevedo 1049",
        "localidad": "Lanús Oeste"
      },
      "condFiscal": "Monotributista - Factura C",
      "idChofer": 1736727991651,
      "contactoEmergencia": "Stella",
      "id": "jhjDx7Yh3lf56iAFBWWp",
      "fechaNac": "1996-03-07",
      "tarifaTipo": {
        "general": true,
        "personalizada": false,
        "eventual": false,
        "especial": false
      },
      "email": "fndzmatias@gmail.com",
      "celularEmergencia": "1161671994",
      "idProveedor": 0,
      "nombre": "Matias Alberto"
    },
    "facturaChofer": 1744406761139,
    "patenteChofer": "LUC928",
    "tarifaEventual": {
      "chofer": {
        "concepto": "",
        "valor": 0
      },
      "cliente": {
        "concepto": "",
        "valor": 0
      }
    },
    "fecha": "2025-04-07",
    "tarifaPersonalizada": {
      "nombre": "",
      "categoria": 0,
      "aCobrar": 0,
      "aPagar": 0,
      "seccion": 0
    },
    "valores": {
      "cliente": {
        "tarifaBase": 87000,
        "kmAdicional": 31500,
        "aCobrar": 118500,
        "acompValor": 0
      },
      "chofer": {
        "tarifaBase": 66000,
        "aPagar": 91200,
        "kmAdicional": 25200,
        "acompValor": 0
      }
    },
    "observaciones": "",
    "multiplicadorChofer": 1,
    "km": 132,
    "tarifaTipo": {
      "personalizada": false,
      "especial": false,
      "eventual": false,
      "general": true
    },
    "hojaRuta": "",
    "idOperacion": 1744062380156,
    "estado": {
      "facCliente": false,
      "facturada": true,
      "cerrada": false,
      "abierta": false,
      "facChofer": false
    }
  },
  {
    "id": "lsdhiRuukkEfA9pXde4z",
    "multiplicadorChofer": 1,
    "fecha": "2025-04-04",
    "tarifaPersonalizada": {
      "aPagar": 0,
      "categoria": 0,
      "seccion": 0,
      "aCobrar": 0,
      "nombre": ""
    },
    "acompaniante": false,
    "chofer": {
      "tarifaTipo": {
        "personalizada": false,
        "especial": false,
        "general": true,
        "eventual": false
      },
      "email": "adrianvenegas7573@gmail.com",
      "idChofer": 1736791944623,
      "direccion": {
        "provincia": "Buenos Aires",
        "domicilio": "Tuyuti 3003",
        "municipio": "Lanús",
        "localidad": "Valentín Alsina"
      },
      "idProveedor": 0,
      "tarifaAsignada": true,
      "celularEmergencia": "1139103989",
      "vehiculo": [
        {
          "refrigeracion": null,
          "marca": "Fiat",
          "publicidad": false,
          "segSat": true,
          "tipoCombustible": [
            "Nafta"
          ],
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "modelo": "Fiorino",
          "dominio": "LCP568",
          "tarjetaCombustible": true,
          "satelital": "Stop Car"
        }
      ],
      "cuit": 20235231531,
      "contactoEmergencia": "Mariana Podokian",
      "celularContacto": "1151465696",
      "id": "rsFavZLKXlrRMuilBzCS",
      "fechaNac": "1973-09-10",
      "apellido": "Venegas",
      "condFiscal": "Monotributista - Factura C",
      "nombre": "Adrian Ernesto"
    },
    "patenteChofer": "LCP568",
    "hojaRuta": "",
    "km": 105,
    "multiplicadorCliente": 1,
    "valores": {
      "chofer": {
        "acompValor": 0,
        "kmAdicional": 16800,
        "aPagar": 82800,
        "tarifaBase": 66000
      },
      "cliente": {
        "kmAdicional": 21000,
        "aCobrar": 108000,
        "tarifaBase": 87000,
        "acompValor": 0
      }
    },
    "facturaChofer": 1744407410464,
    "observaciones": "",
    "documentacion": null,
    "tarifaTipo": {
      "general": true,
      "especial": false,
      "eventual": false,
      "personalizada": false
    },
    "estado": {
      "facChofer": false,
      "facCliente": false,
      "cerrada": false,
      "facturada": true,
      "abierta": false
    },
    "idOperacion": 1743869723144,
    "facturaCliente": 1744407410464,
    "tarifaEventual": {
      "cliente": {
        "concepto": "",
        "valor": 0
      },
      "chofer": {
        "concepto": "",
        "valor": 0
      }
    },
    "cliente": {
      "idCliente": 1736356938304,
      "direccionFiscal": {
        "domicilio": "Rodriguez Peña 205",
        "provincia": "Mendoza",
        "municipio": "Maipú",
        "localidad": "Luzuriaga"
      },
      "cuit": 30601502778,
      "direccionOperativa": {
        "localidad": "Avellaneda",
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda"
      },
      "id": "HPceY9retp6KCsNOPJia",
      "razonSocial": "Andesmar Cargas SA",
      "contactos": [
        {
          "apellido": "Paz",
          "telefono": "1126439403",
          "nombre": "Juan",
          "email": "juanpaz@andesmar.com.ar",
          "puesto": "Jefe Logistica"
        },
        {
          "apellido": "Marchetti",
          "telefono": "1133579699",
          "nombre": "Ramiro",
          "email": "",
          "puesto": "Encargado de Logistica"
        }
      ],
      "condFiscal": "Responsable Inscripto - Factura A",
      "tarifaAsignada": true,
      "tarifaTipo": {
        "personalizada": false,
        "especial": false,
        "eventual": false,
        "general": true
      }
    }
  },
  {
    "id": "bmYPmNcb8EsnBWOXCpiL",
    "multiplicadorCliente": 1,
    "chofer": {
      "idProveedor": 0,
      "cuit": 20389286750,
      "condFiscal": "Monotributista - Factura C",
      "idChofer": 1736727991651,
      "celularEmergencia": "1161671994",
      "tarifaAsignada": true,
      "fechaNac": "1996-03-07",
      "id": "jhjDx7Yh3lf56iAFBWWp",
      "contactoEmergencia": "Stella",
      "celularContacto": "1133652485",
      "apellido": "Fernandez",
      "nombre": "Matias Alberto",
      "email": "fndzmatias@gmail.com",
      "direccion": {
        "localidad": "Lanús Oeste",
        "domicilio": "Pje Rosa Acevedo 1049",
        "provincia": "Buenos Aires",
        "municipio": "Lanús"
      },
      "vehiculo": [
        {
          "marca": "Peugeot",
          "satelital": "Stop Car",
          "tarjetaCombustible": false,
          "refrigeracion": null,
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "dominio": "LUC928",
          "modelo": "Partner",
          "segSat": true,
          "tipoCombustible": [
            "Nafta"
          ],
          "publicidad": false
        }
      ],
      "tarifaTipo": {
        "personalizada": false,
        "general": true,
        "especial": false,
        "eventual": false
      }
    },
    "observaciones": "",
    "hojaRuta": "",
    "documentacion": null,
    "fecha": "2025-04-04",
    "cliente": {
      "idCliente": 1736356938304,
      "direccionOperativa": {
        "localidad": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda"
      },
      "cuit": 30601502778,
      "razonSocial": "Andesmar Cargas SA",
      "direccionFiscal": {
        "domicilio": "Rodriguez Peña 205",
        "localidad": "Luzuriaga",
        "provincia": "Mendoza",
        "municipio": "Maipú"
      },
      "tarifaAsignada": true,
      "contactos": [
        {
          "telefono": "1126439403",
          "puesto": "Jefe Logistica",
          "apellido": "Paz",
          "email": "juanpaz@andesmar.com.ar",
          "nombre": "Juan"
        },
        {
          "nombre": "Ramiro",
          "apellido": "Marchetti",
          "email": "",
          "puesto": "Encargado de Logistica",
          "telefono": "1133579699"
        }
      ],
      "tarifaTipo": {
        "general": true,
        "especial": false,
        "personalizada": false,
        "eventual": false
      },
      "id": "HPceY9retp6KCsNOPJia",
      "condFiscal": "Responsable Inscripto - Factura A"
    },
    "estado": {
      "facCliente": false,
      "abierta": false,
      "cerrada": false,
      "facChofer": false,
      "facturada": true
    },
    "idOperacion": 1743869723142,
    "multiplicadorChofer": 1,
    "acompaniante": false,
    "valores": {
      "cliente": {
        "kmAdicional": 45500,
        "acompValor": 0,
        "tarifaBase": 87000,
        "aCobrar": 132500
      },
      "chofer": {
        "kmAdicional": 36400,
        "tarifaBase": 66000,
        "aPagar": 102400,
        "acompValor": 0
      }
    },
    "tarifaTipo": {
      "eventual": false,
      "especial": false,
      "personalizada": false,
      "general": true
    },
    "facturaCliente": 1744406747878,
    "km": 171,
    "tarifaPersonalizada": {
      "aCobrar": 0,
      "aPagar": 0,
      "seccion": 0,
      "categoria": 0,
      "nombre": ""
    },
    "tarifaEventual": {
      "chofer": {
        "concepto": "",
        "valor": 0
      },
      "cliente": {
        "valor": 0,
        "concepto": ""
      }
    },
    "facturaChofer": 1744406747878,
    "patenteChofer": "LUC928"
  },
  {
    "id": "2AgCX8alQQKxyWHfkstK",
    "cliente": {
      "idCliente": 1736356938304,
      "contactos": [
        {
          "puesto": "Jefe Logistica",
          "apellido": "Paz",
          "telefono": "1126439403",
          "email": "juanpaz@andesmar.com.ar",
          "nombre": "Juan"
        },
        {
          "email": "",
          "nombre": "Ramiro",
          "telefono": "1133579699",
          "apellido": "Marchetti",
          "puesto": "Encargado de Logistica"
        }
      ],
      "cuit": 30601502778,
      "direccionOperativa": {
        "provincia": "Buenos Aires",
        "localidad": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "municipio": "Avellaneda"
      },
      "razonSocial": "Andesmar Cargas SA",
      "direccionFiscal": {
        "domicilio": "Rodriguez Peña 205",
        "provincia": "Mendoza",
        "localidad": "Luzuriaga",
        "municipio": "Maipú"
      },
      "id": "HPceY9retp6KCsNOPJia",
      "condFiscal": "Responsable Inscripto - Factura A",
      "tarifaTipo": {
        "eventual": false,
        "personalizada": false,
        "general": true,
        "especial": false
      },
      "tarifaAsignada": true
    },
    "acompaniante": false,
    "multiplicadorChofer": 1,
    "tarifaEventual": {
      "chofer": {
        "valor": 0,
        "concepto": ""
      },
      "cliente": {
        "valor": 0,
        "concepto": ""
      }
    },
    "hojaRuta": "",
    "facturaCliente": 1745269985950,
    "estado": {
      "abierta": false,
      "facCliente": false,
      "facturada": true,
      "facChofer": false,
      "cerrada": false
    },
    "facturaChofer": 1745269985950,
    "documentacion": null,
    "km": 113,
    "valores": {
      "chofer": {
        "aPagar": 138100,
        "tarifaBase": 115000,
        "acompValor": 0,
        "kmAdicional": 23100
      },
      "cliente": {
        "kmAdicional": 28000,
        "aCobrar": 188000,
        "acompValor": 0,
        "tarifaBase": 160000
      }
    },
    "fecha": "2025-04-04",
    "multiplicadorCliente": 1,
    "tarifaTipo": {
      "eventual": false,
      "general": true,
      "especial": false,
      "personalizada": false
    },
    "tarifaPersonalizada": {
      "categoria": 0,
      "aPagar": 0,
      "seccion": 0,
      "aCobrar": 0,
      "nombre": ""
    },
    "patenteChofer": "HPP453",
    "chofer": {
      "tarifaAsignada": true,
      "idProveedor": 0,
      "tarifaTipo": {
        "general": true,
        "eventual": false,
        "especial": false,
        "personalizada": false
      },
      "fechaNac": "1994-02-01",
      "email": "actualizar@gmail.com",
      "contactoEmergencia": "",
      "idChofer": 1736730226989,
      "id": "75TLs99t6qSNTuHessGQ",
      "celularEmergencia": "",
      " condFiscal": "",
      "celularContacto": "1130719809",
      "cuit": 20380305381,
      "apellido": "Quiroga",
      "nombre": "Ariel Omar",
      "vehiculo": [
        {
          "categoria": {
            "catOrden": 2,
            "nombre": "Maxi"
          },
          "modelo": "Transporter",
          "marca": "Volkswagen",
          "tipoCombustible": [
            "nafta"
          ],
          "segSat": true,
          "dominio": "HPP453",
          "refrigeracion": null,
          "publicidad": false,
          "satelital": "Stop Car",
          "tarjetaCombustible": true
        }
      ],
      "direccion": {
        "domicilio": "Juncal 777 - Lanus",
        "localidad": "",
        "provincia": "",
        " municipio": ""
      }
    },
    "observaciones": "",
    "idOperacion": 1743869723143
  },
  {
    "id": "rvqxecKmwxUgHive7kP0",
    "tarifaPersonalizada": {
      "seccion": 0,
      "nombre": "",
      "categoria": 0,
      "aPagar": 0,
      "aCobrar": 0
    },
    "acompaniante": false,
    "facturaCliente": 1744406684221,
    "documentacion": null,
    "facturaChofer": 1744406684221,
    "tarifaTipo": {
      "general": true,
      "especial": false,
      "personalizada": false,
      "eventual": false
    },
    "patenteChofer": "LUC928",
    "estado": {
      "cerrada": false,
      "facCliente": false,
      "abierta": false,
      "facChofer": false,
      "facturada": true
    },
    "tarifaEventual": {
      "chofer": {
        "valor": 0,
        "concepto": ""
      },
      "cliente": {
        "concepto": "",
        "valor": 0
      }
    },
    "valores": {
      "cliente": {
        "tarifaBase": 87000,
        "aCobrar": 111500,
        "acompValor": 0,
        "kmAdicional": 24500
      },
      "chofer": {
        "tarifaBase": 66000,
        "kmAdicional": 19600,
        "acompValor": 0,
        "aPagar": 85600
      }
    },
    "fecha": "2025-04-03",
    "multiplicadorCliente": 1,
    "idOperacion": 1743869699871,
    "multiplicadorChofer": 1,
    "chofer": {
      "celularContacto": "1133652485",
      "contactoEmergencia": "Stella",
      "apellido": "Fernandez",
      "nombre": "Matias Alberto",
      "tarifaAsignada": true,
      "id": "jhjDx7Yh3lf56iAFBWWp",
      "vehiculo": [
        {
          "modelo": "Partner",
          "tarjetaCombustible": false,
          "refrigeracion": null,
          "tipoCombustible": [
            "Nafta"
          ],
          "satelital": "Stop Car",
          "dominio": "LUC928",
          "segSat": true,
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          },
          "marca": "Peugeot",
          "publicidad": false
        }
      ],
      "condFiscal": "Monotributista - Factura C",
      "cuit": 20389286750,
      "fechaNac": "1996-03-07",
      "tarifaTipo": {
        "especial": false,
        "general": true,
        "eventual": false,
        "personalizada": false
      },
      "idProveedor": 0,
      "direccion": {
        "localidad": "Lanús Oeste",
        "domicilio": "Pje Rosa Acevedo 1049",
        "municipio": "Lanús",
        "provincia": "Buenos Aires"
      },
      "celularEmergencia": "1161671994",
      "idChofer": 1736727991651,
      "email": "fndzmatias@gmail.com"
    },
    "km": 118,
    "hojaRuta": "",
    "observaciones": "",
    "cliente": {
      "id": "HPceY9retp6KCsNOPJia",
      "cuit": 30601502778,
      "razonSocial": "Andesmar Cargas SA",
      "condFiscal": "Responsable Inscripto - Factura A",
      "idCliente": 1736356938304,
      "contactos": [
        {
          "puesto": "Jefe Logistica",
          "apellido": "Paz",
          "nombre": "Juan",
          "telefono": "1126439403",
          "email": "juanpaz@andesmar.com.ar"
        },
        {
          "telefono": "1133579699",
          "nombre": "Ramiro",
          "apellido": "Marchetti",
          "email": "",
          "puesto": "Encargado de Logistica"
        }
      ],
      "tarifaTipo": {
        "general": true,
        "especial": false,
        "personalizada": false,
        "eventual": false
      },
      "tarifaAsignada": true,
      "direccionOperativa": {
        "provincia": "Buenos Aires",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "municipio": "Avellaneda",
        "localidad": "Avellaneda"
      },
      "direccionFiscal": {
        "domicilio": "Rodriguez Peña 205",
        "localidad": "Luzuriaga",
        "provincia": "Mendoza",
        "municipio": "Maipú"
      }
    }
  },
  {
    "id": "Q92bSoMIcPBl6na8cyMP",
    "tarifaTipo": {
      "general": true,
      "eventual": false,
      "personalizada": false,
      "especial": false
    },
    "observaciones": "",
    "estado": {
      "facChofer": false,
      "abierta": false,
      "facturada": true,
      "facCliente": false,
      "cerrada": false
    },
    "multiplicadorChofer": 1,
    "km": 108,
    "hojaRuta": "",
    "patenteChofer": "HPP453",
    "cliente": {
      "tarifaAsignada": true,
      "contactos": [
        {
          "telefono": "1126439403",
          "email": "juanpaz@andesmar.com.ar",
          "puesto": "Jefe Logistica",
          "apellido": "Paz",
          "nombre": "Juan"
        },
        {
          "apellido": "Marchetti",
          "puesto": "Encargado de Logistica",
          "nombre": "Ramiro",
          "email": "",
          "telefono": "1133579699"
        }
      ],
      "cuit": 30601502778,
      "id": "HPceY9retp6KCsNOPJia",
      "idCliente": 1736356938304,
      "razonSocial": "Andesmar Cargas SA",
      "tarifaTipo": {
        "personalizada": false,
        "especial": false,
        "general": true,
        "eventual": false
      },
      "direccionOperativa": {
        "localidad": "Avellaneda",
        "municipio": "Avellaneda",
        "domicilio": "General Gorriti 650 - Avellaneda",
        "provincia": "Buenos Aires"
      },
      "condFiscal": "Responsable Inscripto - Factura A",
      "direccionFiscal": {
        "domicilio": "Rodriguez Peña 205",
        "provincia": "Mendoza",
        "municipio": "Maipú",
        "localidad": "Luzuriaga"
      }
    },
    "tarifaEventual": {
      "cliente": {
        "valor": 0,
        "concepto": ""
      },
      "chofer": {
        "valor": 0,
        "concepto": ""
      }
    },
    "documentacion": null,
    "multiplicadorCliente": 1,
    "acompaniante": false,
    "valores": {
      "cliente": {
        "aCobrar": 184000,
        "acompValor": 0,
        "kmAdicional": 24000,
        "tarifaBase": 160000
      },
      "chofer": {
        "tarifaBase": 115000,
        "acompValor": 0,
        "aPagar": 134800,
        "kmAdicional": 19800
      }
    },
    "tarifaPersonalizada": {
      "seccion": 0,
      "aCobrar": 0,
      "nombre": "",
      "aPagar": 0,
      "categoria": 0
    },
    "facturaChofer": 1745269976231,
    "chofer": {
      "cuit": 20380305381,
      "celularContacto": "1130719809",
      "idProveedor": 0,
      "nombre": "Ariel Omar",
      "vehiculo": [
        {
          "segSat": true,
          "dominio": "HPP453",
          "tarjetaCombustible": true,
          "publicidad": false,
          "satelital": "Stop Car",
          "modelo": "Transporter",
          "tipoCombustible": [
            "nafta"
          ],
          "marca": "Volkswagen",
          "categoria": {
            "catOrden": 2,
            "nombre": "Maxi"
          },
          "refrigeracion": null
        }
      ],
      "celularEmergencia": "",
      "tarifaAsignada": true,
      "tarifaTipo": {
        "general": true,
        "personalizada": false,
        "eventual": false,
        "especial": false
      },
      "email": "actualizar@gmail.com",
      " condFiscal": "",
      "contactoEmergencia": "",
      "fechaNac": "1994-02-01",
      "id": "75TLs99t6qSNTuHessGQ",
      "direccion": {
        " municipio": "",
        "provincia": "",
        "domicilio": "Juncal 777 - Lanus",
        "localidad": ""
      },
      "apellido": "Quiroga",
      "idChofer": 1736730226989
    },
    "idOperacion": 1743869699872,
    "facturaCliente": 1745269976230,
    "fecha": "2025-04-03"
  },
  {
    "id": "PUrUjXYj2XNnLI1kitLK",
    "facturaChofer": 1744407418383,
    "tarifaEventual": {
      "cliente": {
        "valor": 0,
        "concepto": ""
      },
      "chofer": {
        "concepto": "",
        "valor": 0
      }
    },
    "hojaRuta": "",
    "tarifaPersonalizada": {
      "nombre": "",
      "categoria": 0,
      "aPagar": 0,
      "seccion": 0,
      "aCobrar": 0
    },
    "facturaCliente": 1744407418382,
    "fecha": "2025-04-03",
    "estado": {
      "facturada": true,
      "facChofer": false,
      "abierta": false,
      "facCliente": false,
      "cerrada": false
    },
    "valores": {
      "cliente": {
        "aCobrar": 87000,
        "kmAdicional": 0,
        "acompValor": 0,
        "tarifaBase": 87000
      },
      "chofer": {
        "kmAdicional": 0,
        "tarifaBase": 66000,
        "aPagar": 66000,
        "acompValor": 0
      }
    },
    "acompaniante": false,
    "chofer": {
      "cuit": 20235231531,
      "idProveedor": 0,
      "contactoEmergencia": "Mariana Podokian",
      "id": "rsFavZLKXlrRMuilBzCS",
      "email": "adrianvenegas7573@gmail.com",
      "tarifaAsignada": true,
      "idChofer": 1736791944623,
      "condFiscal": "Monotributista - Factura C",
      "tarifaTipo": {
        "general": true,
        "eventual": false,
        "personalizada": false,
        "especial": false
      },
      "direccion": {
        "municipio": "Lanús",
        "localidad": "Valentín Alsina",
        "domicilio": "Tuyuti 3003",
        "provincia": "Buenos Aires"
      },
      "vehiculo": [
        {
          "dominio": "LCP568",
          "marca": "Fiat",
          "segSat": true,
          "tarjetaCombustible": true,
          "tipoCombustible": [
            "Nafta"
          ],
          "publicidad": false,
          "modelo": "Fiorino",
          "refrigeracion": null,
          "satelital": "Stop Car",
          "categoria": {
            "catOrden": 1,
            "nombre": "Mini"
          }
        }
      ],
      "nombre": "Adrian Ernesto",
      "celularEmergencia": "1139103989",
      "celularContacto": "1151465696",
      "fechaNac": "1973-09-10",
      "apellido": "Venegas"
    },
    "documentacion": null,
    "cliente": {
      "cuit": 30601502778,
      "tarifaAsignada": true,
      "direccionFiscal": {
        "domicilio": "Rodriguez Peña 205",
        "municipio": "Maipú",
        "localidad": "Luzuriaga",
        "provincia": "Mendoza"
      },
      "id": "HPceY9retp6KCsNOPJia",
      "razonSocial": "Andesmar Cargas SA",
      "idCliente": 1736356938304,
      "tarifaTipo": {
        "general": true,
        "especial": false,
        "personalizada": false,
        "eventual": false
      },
      "direccionOperativa": {
        "municipio": "Avellaneda",
        "localidad": "Avellaneda",
        "provincia": "Buenos Aires",
        "domicilio": "General Gorriti 650 - Avellaneda"
      },
      "contactos": [
        {
          "puesto": "Jefe Logistica",
          "email": "juanpaz@andesmar.com.ar",
          "nombre": "Juan",
          "apellido": "Paz",
          "telefono": "1126439403"
        },
        {
          "telefono": "1133579699",
          "apellido": "Marchetti",
          "nombre": "Ramiro",
          "email": "",
          "puesto": "Encargado de Logistica"
        }
      ],
      "condFiscal": "Responsable Inscripto - Factura A"
    },
    "patenteChofer": "LCP568",
    "observaciones": "",
    "multiplicadorChofer": 1,
    "multiplicadorCliente": 1,
    "km": 42,
    "idOperacion": 1743869699873,
    "tarifaTipo": {
      "especial": false,
      "general": true,
      "eventual": false,
      "personalizada": false
    }
  },
  {
    "id": "n7TtgYipl0ylrHcxcxVi",
    "tarifaEventual": {
      "chofer": {
        "concepto": "",
        "valor": 0
      },
      "cliente": {
        "valor": 0,
        "concepto": ""
      }
    },
    "observaciones": "",
    "chofer": {
      "cuit": 20389286750,
      "tarifaTipo": {
        "eventual": false,
        "personalizada": false,
        "especial": false,
        "general": true
      },
      "fechaNac": "1996-03-07",
      "vehiculo": [
        {
          "refrigeracion": null,
          "tarjetaCombustible": false,
          "publicidad": false,
          "categoria": {
            "nombre": "Mini",
            "catOrden": 1
          },
          "marca": "Peugeot",
          "tipoCombustible": [
            "Nafta"
          ],
          "satelital": "Stop Car",
          "dominio": "LUC928",
          "modelo": "Partner",
          "segSat": true
        }
      ],
      "tarifaAsignada": true,
      "id": "jhjDx7Yh3lf56iAFBWWp",
      "celularContacto": "1133652485",
      "direccion": {
        "municipio": "Lanús",
        "domicilio": "Pje Rosa Acevedo 1049",
        "provincia": "Buenos Aires",
        "localidad": "Lanús Oeste"
      },
      "condFiscal": "Monotributista - Factura C",
      "email": "fndzmatias@gmail.com",
      "nombre": "Matias Alberto",
      "contactoEmergencia": "Stella",
      "idChofer": 1736727991651,
      "idProveedor": 0,
      "apellido": "Fernandez",
      "celularEmergencia": "1161671994"
    },
    "estado": {
      "facCliente": false,
      "abierta": false,
      "cerrada": false,
      "facChofer": false,
      "facturada": true
    },
    "fecha": "2025-04-01",
    "hojaRuta": "",
    "documentacion": null,
    "acompaniante": false,
    "cliente": {
      "condFiscal": "Responsable Inscripto - Factura A",
      "cuit": 30601502778,
      "razonSocial": "Andesmar Cargas SA",
      "tarifaAsignada": true,
      "direccionFiscal": {
        "provincia": "Mendoza",
        "municipio": "Maipú",
        "localidad": "Luzuriaga",
        "domicilio": "Rodriguez Peña 205"
      },
      "idCliente": 1736356938304,
      "id": "HPceY9retp6KCsNOPJia",
      "contactos": [
        {
          "telefono": "1126439403",
          "email": "juanpaz@andesmar.com.ar",
          "apellido": "Paz",
          "puesto": "Jefe Logistica",
          "nombre": "Juan"
        },
        {
          "telefono": "1133579699",
          "nombre": "Ramiro",
          "email": "",
          "apellido": "Marchetti",
          "puesto": "Encargado de Logistica"
        }
      ],
      "tarifaTipo": {
        "eventual": false,
        "general": true,
        "personalizada": false,
        "especial": false
      },
      "direccionOperativa": {
        "domicilio": "General Gorriti 650 - Avellaneda",
        "provincia": "Buenos Aires",
        "municipio": "Avellaneda",
        "localidad": "Avellaneda"
      }
    },
    "km": 125,
    "multiplicadorCliente": 1,
    "patenteChofer": "LUC928",
    "facturaChofer": 1744406728728,
    "valores": {
      "chofer": {
        "kmAdicional": 22400,
        "tarifaBase": 66000,
        "acompValor": 0,
        "aPagar": 88400
      },
      "cliente": {
        "aCobrar": 115000,
        "tarifaBase": 87000,
        "acompValor": 0,
        "kmAdicional": 28000
      }
    },
    "multiplicadorChofer": 1,
    "facturaCliente": 1744406728728,
    "tarifaTipo": {
      "personalizada": false,
      "general": true,
      "eventual": false,
      "especial": false
    },
    "tarifaPersonalizada": {
      "categoria": 0,
      "aCobrar": 0,
      "aPagar": 0,
      "seccion": 0,
      "nombre": ""
    },
    "idOperacion": 1743869667988
  },
  {
    "id": "2rG9ionei2UMJoHOu3uE",
    "observaciones": "",
    "idOperacion": 1743869667989,
    "valores": {
      "chofer": {
        "kmAdicional": 13200,
        "tarifaBase": 172500,
        "acompValor": 0,
        "aPagar": 185700
      },
      "cliente": {
        "kmAdicional": 16000,
        "acompValor": 0,
        "tarifaBase": 240000,
        "aCobrar": 256000
      }
    },
    "tarifaPersonalizada": {
      "aCobrar": 0,
      "categoria": 0,
      "nombre": "",
      "aPagar": 0,
      "seccion": 0
    },
    "facturaChofer": 1745269964391,
    "chofer": {
      "nombre": "Ariel Omar",
      "idChofer": 1736730226989,
      "tarifaAsignada": true,
      "vehiculo": [
        {
          "tipoCombustible": [
            "nafta"
          ],
          "satelital": "Stop Car",
          "modelo": "Transporter",
          "segSat": true,
          "publicidad": false,
          "refrigeracion": null,
          "categoria": {
            "nombre": "Maxi",
            "catOrden": 2
          },
          "dominio": "HPP453",
          "tarjetaCombustible": true,
          "marca": "Volkswagen"
        }
      ],
      "cuit": 20380305381,
      " condFiscal": "",
      "celularEmergencia": "",
      "contactoEmergencia": "",
      "fechaNac": "1994-02-01",
      "direccion": {
        "localidad": "",
        "domicilio": "Juncal 777 - Lanus",
        "provincia": "",
        " municipio": ""
      },
      "email": "actualizar@gmail.com",
      "idProveedor": 0,
      "id": "75TLs99t6qSNTuHessGQ",
      "tarifaTipo": {
        "personalizada": false,
        "eventual": false,
        "especial": false,
        "general": true
      },
      "apellido": "Quiroga",
      "celularContacto": "1130719809"
    },
    "facturaCliente": 1745269964390,
    "tarifaTipo": {
      "eventual": false,
      "general": true,
      "personalizada": false,
      "especial": false
    },
    "patenteChofer": "HPP453",
    "acompaniante": false,
    "cliente": {
      "razonSocial": "Andesmar Cargas SA",
      "idCliente": 1736356938304,
      "tarifaTipo": {
        "eventual": false,
        "especial": false,
        "personalizada": false,
        "general": true
      },
      "direccionOperativa": {
        "localidad": "Avellaneda",
        "municipio": "Avellaneda",
        "provincia": "Buenos Aires",
        "domicilio": "General Gorriti 650 - Avellaneda"
      },
      "condFiscal": "Responsable Inscripto - Factura A",
      "contactos": [
        {
          "puesto": "Jefe Logistica",
          "apellido": "Paz",
          "nombre": "Juan",
          "telefono": "1126439403",
          "email": "juanpaz@andesmar.com.ar"
        },
        {
          "apellido": "Marchetti",
          "nombre": "Ramiro",
          "email": "",
          "telefono": "1133579699",
          "puesto": "Encargado de Logistica"
        }
      ],
      "id": "HPceY9retp6KCsNOPJia",
      "tarifaAsignada": true,
      "direccionFiscal": {
        "municipio": "Maipú",
        "domicilio": "Rodriguez Peña 205",
        "provincia": "Mendoza",
        "localidad": "Luzuriaga"
      },
      "cuit": 30601502778
    },
    "km": 83,
    "fecha": "2025-04-01",
    "tarifaEventual": {
      "chofer": {
        "concepto": "",
        "valor": 0
      },
      "cliente": {
        "concepto": "",
        "valor": 0
      }
    },
    "estado": {
      "facturada": true,
      "facChofer": false,
      "cerrada": false,
      "abierta": false,
      "facCliente": false
    },
    "multiplicadorCliente": 1.5,
    "hojaRuta": "",
    "documentacion": null,
    "multiplicadorChofer": 1.5
  }
]

console.log("pfOp", pfOp)
let opPrueba: ConId<Operacion>[] = [];
opPrueba.push(pfOp[0]);
console.log("opPrueba: ", opPrueba);
 
this.dbFirebase.guardarMultiple(pfOp,"operaciones","idOperacion","operaciones").then(
  (result:any)=>{
        this.isLoading = false;
        if(result.exito){
          alert("se actualizaron correctamente")
        } else {
          alert("error en la actualización")
        }
      }
)

  
  }
  

  
}
