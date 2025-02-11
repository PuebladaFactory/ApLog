import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
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
import { Subject, takeUntil } from 'rxjs';
import { ModalBajaComponent } from 'src/app/shared/modal-baja/modal-baja.component';

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
  $clientes!: Cliente[];
  $choferes!: Chofer[];
  cantPorPagina: boolean = false;
  $proveedores!: Proveedor[];
  $opActivas!: Operacion[];
  $opFiltradas!: Operacion[];
  opEditar!: Operacion;
  date:any = new Date();
  primerDia: any = new Date(this.date.getFullYear(), this.date.getMonth() , 1).toISOString().split('T')[0];
  ultimoDia:any = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).toISOString().split('T')[0];
  facturar: boolean = false;
  fechasConsulta!: any;
  ultTarifaGralCliente!: TarifaGralCliente;
  ultTarifaGralChofer!: TarifaGralCliente;
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
  
  constructor(private storageService: StorageService, private modalService: NgbModal){}
  
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
    
    
    
    this.storageService.choferes$
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      this.$choferes = data;
      this.$choferes = this.$choferes.sort((a, b) => a.apellido.localeCompare(b.apellido)); // Ordena por el nombre del chofer
    });
  
    this.storageService.clientes$
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      this.$clientes = data;
      this.$clientes = this.$clientes.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
    });   
    
    this.storageService.proveedores$
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      this.$proveedores = data;
    });
   
    //¿PORQUE?
    this.storageService.getObservable<Operacion>('operaciones')
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      if(data){
        ////console.log("1)aca??: ");      
        this.$opActivas = data;
        //this.$opActivas = this.$opActivas.sort((a, b) => a.fecha.getTime() - b.fecha.getTime()); // Ordena por el nombre del chofer
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
            this.filtrarEstado()
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
      estado: op.estado.abierta ? "Abierta" : op.estado.cerrada ? "Cerrada" : "Facturada",
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
    this.storageService.setInfo("filtroOp", [modo]);
    this.filtrarEstado()
  }

  filtrarEstado(){  
   
    let modo = "";
    let modoStorage = this.storageService.loadInfo("filtroOp");
    
    //////console.log("this.btnConsulta", this.btnConsulta);
    //////console.log("this.estadoFiltrado", this.estadoFiltrado);
    //////console.log("modoStorage", modoStorage[0]);
    //////console.log("modo", modo);

    if(modoStorage[0] === undefined){
      modo = this.estadoFiltrado;
    } else {
      modo = modoStorage[0];
    }
    this.$opFiltradas = this.$opActivas;

    this.estadoFiltrado = modo;
/*     if(!this.btnConsulta){
      switch(modo){
        case "Todo":{

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
    } else {      

      
    } */
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
      return proveedor[0].razonSocial;
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
  

  
}
