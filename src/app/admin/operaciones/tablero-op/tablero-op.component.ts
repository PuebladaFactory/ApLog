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
import { TarifaGralChofer } from 'src/app/interfaces/tarifa-gral-chofer';
import { ModalFacturacionComponent } from '../modal-facturacion/modal-facturacion.component';

@Component({
  selector: 'app-tablero-op',
  templateUrl: './tablero-op.component.html',
  styleUrls: ['./tablero-op.component.scss']
})
export class TableroOpComponent implements OnInit {

  @Input() btnConsulta:boolean = false;
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
  $consultasOp!: Operacion [];
  $proveedores!: Proveedor[];
  $opActivas!: Operacion[];
  opEditar!: Operacion;
  date:any = new Date();
  primerDia: any = new Date(this.date.getFullYear(), this.date.getMonth() , 1).toISOString().split('T')[0];
  ultimoDia:any = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).toISOString().split('T')[0];
  facturar: boolean = false;
  fechasConsulta: any = {
    fechaDesde: 0,
    fechaHasta: 0,
  };
  ultTarifaGralCliente!: TarifaGralCliente;
  ultTarifaGralChofer!: TarifaGralChofer;
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
    { prop: 'tarifa', name: 'Tarifa', selected: true, flexGrow:2  },   
    { prop: 'aCobrar', name: 'A Cobrar', selected: true, flexGrow:2  },   
    { prop: 'aPagar', name: 'A Pagar', selected: true, flexGrow:2  },      
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
  /////////////////////////////////////////////////////////////////////

  constructor(private storageService: StorageService, private modalService: NgbModal){}
  
  ngOnInit(): void {
    this.storageService.opTarEve$.subscribe(data=>{
      let datos = data
      this.tarifaEventual = datos[0];
      //console.log("tarifa eventual: ", this.tarifaEventual);
      
    });
    this.storageService.opTarPers$.subscribe(data=>{
      let datos = data
      this.tarifaPersonalizada = datos[0];
      //console.log("tarifa personalizada: ", this.tarifaPersonalizada);
    });

    this.storageService.vehiculosChofer$.subscribe(data=>{
      let datos = data
      this.vehiculosChofer = datos[0];
      //console.log("vehiculos chofer: ", this.vehiculosChofer);
    });

    this.storageService.choferes$.subscribe(data => {
      this.$choferes = data;
    });
  
    this.storageService.clientes$.subscribe(data => {
      this.$clientes = data;
    });    
   
    this.storageService.operaciones$.subscribe(data => {
      this.$opActivas = data;
      this.armarTabla();
    });  

    this.storageService.consultasOp$.subscribe(data => {
      this.$consultasOp = data;
      this.armarTabla();
    });   
    
    this.storageService.proveedores$.subscribe(data => {
      this.$proveedores = data;
    });

    this.storageService.fechasConsulta$.subscribe(data => {
      this.fechasConsulta = data;
      console.log("TABLERO OP: fechas consulta: ",this.fechasConsulta);
      this.storageService.getByDateValue(this.titulo, "fecha", this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta, "consultasOp");
      this.btnConsulta = true;
    });
     
  }

  getMsg(msg: any) {
    this.btnConsulta = true;
    //console.log(msg);
    this.fechasConsulta = {
      fechaDesde: msg.fechaDesde,
      fechaHasta: msg.fechaHasta,
    }

  }

  ///////////// TABLA //////////////////////////////////////////////////////////////////////////////////
  armarTabla() {
    //////console.log("consultasOp: ", this.$consultasOp );
    let indice = 0
    let operaciones: Operacion [];
    if(!this.btnConsulta){
      operaciones = this.$opActivas;
    } else {
      operaciones = this.$consultasOp;
    }
    this.rows = operaciones.map((op) => ({
      indice: indice ++,
      fecha: op.fecha,
      estado: op.estado.abierta ? "Abierta" : op.estado.cerrada ? "Cerrada" : "Facturada",
      idOperacion: op.idOperacion,
      cliente: op.cliente.razonSocial,
      chofer: `${op.chofer.apellido} ${op.chofer.nombre}`,
      categoria: this.getCategoria(op),
      patente: op.patenteChofer,
      acompaniante: `${op.acompaniante ? "Si" : "No"}` ,
      tarifa: op.tarifaTipo.especial ? "Especial" : op.tarifaTipo.eventual ? "Eventual" : op.tarifaTipo.personalizada ? "Personalizada" : "General",
      aCobrar: this.formatearValor(op.aCobrar),
      aPagar: this.formatearValor(op.aPagar),        
      observaciones: op.observaciones,
      
    }));   
    //////console.log("Rows: ", this.rows); // Verifica que `this.rows` tenga datos correctos
    this.applyFilters(); // Aplica filtros y actualiza filteredRows
  }

  formatearValor(valor: number) : any{
    let nuevoValor =  new Intl.NumberFormat('es-ES', { 
     minimumFractionDigits: 2, 
     maximumFractionDigits: 2 
   }).format(valor);
   ////////console.log(nuevoValor);    
//   `$${nuevoValor}`
   return `$${nuevoValor}`
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
        //////console.log("llamada al storage desde op-abiertas, deleteItem");
        this.storageService.deleteItem(this.componente, this.opEditar);
        //////console.log("consultas Op: " , this.$consultasOp);
        Swal.fire({
          title: "Confirmado",
          text: "La operación ha sido cancelada",
          icon: "success"
        });
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
    ////console.log(vehiculo[0].categoria.nombre);
    return vehiculo[0].categoria.nombre

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
      ////console.log()(info); */
      
      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
         
        },
        (reason) => {}
      );
    }
  }

  filtrarEstado(modo: string){   
    if(!this.btnConsulta){
      switch(modo){
        case "Todo":{
          this.storageService.consultasOp$.subscribe(data => {
            this.$consultasOp = data;
            this.armarTabla();
          });   
          break;
        };
        case "Abierta":{          
          this.$opActivas = this.$opActivas.filter((op:Operacion)=>{
            return op.estado.abierta === true; 
          });          
          this.armarTabla();
          break;
        };
        case "Cerrada":{
          this.$opActivas = this.$opActivas.filter((op:Operacion)=>{
            return op.estado.cerrada === true; 
          });          
          this.armarTabla();
          break;
        };
        case "Facturada":{
          this.$opActivas = this.$opActivas.filter((op:Operacion)=>{
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
      switch(modo){
        case "Todo":{
          this.storageService.consultasOp$.subscribe(data => {
            this.$consultasOp = data;
            this.armarTabla();
          });   
          break;
        };
        case "Abierta":{         
          this.$consultasOp = this.$opActivas.filter((op:Operacion)=>{
            return op.estado.abierta === true; 
          });          
          this.armarTabla();
          break;
        };
        case "Cerrada":{
          this.$consultasOp = this.$opActivas.filter((op:Operacion)=>{
            return op.estado.cerrada === true; 
          });          
          this.armarTabla();
          break;
        };
        case "Facturada":{
          this.$consultasOp = this.$opActivas.filter((op:Operacion)=>{
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
  }
}
