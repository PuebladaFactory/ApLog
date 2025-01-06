import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Cliente } from 'src/app/interfaces/cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ClienteAltaComponent } from '../cliente-alta/cliente-alta.component';
import Swal from 'sweetalert2';
import { ColumnMode, SelectionType, SortType } from '@swimlane/ngx-datatable';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { ConId } from 'src/app/interfaces/conId';


@Component({
  selector: 'app-cliente-listado',
  templateUrl: './cliente-listado.component.html',
  styleUrls: ['./cliente-listado.component.scss']
})
export class ClienteListadoComponent implements OnInit {
  
  searchText!:string;  
  clienteEditar!: Cliente;  
  componente:string ="clientes";  
  $clientes!: Cliente[];  
//////////////////////////////TABLA/////////////////////////////////////////////////////////
  rows: any[] = [];
  filteredRows: any[] = [];
  paginatedRows: any[] = [];
  allColumns = [
  //    { prop: '', name: '', selected: true, flexGrow:1  },
    { prop: 'idCliente', name: 'Id Cliente', selected: false, flexGrow:2  },  
    { prop: 'razonSocial', name: 'Razon Social', selected: true, flexGrow:2  },          
    { prop: 'cuit', name: 'CUIT', selected: true, flexGrow:2  },
    { prop: 'direccion', name: 'Direccion', selected: true, flexGrow:2 },
    { prop: 'tarifa', name: 'Tarifa', selected: true, flexGrow: 2 },
    { prop: 'contacto', name: 'Contacto', selected: false, flexGrow:2  },    
    { prop: 'puesto', name: 'Puesto', selected: false, flexGrow:2  },    
    { prop: 'telefono', name: 'N° Contacto', selected: false, flexGrow:2  },    
    { prop: 'correo', name: 'Correo', selected: true, flexGrow:2  },  
    
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
  

  private destroy$ = new Subject<void>()

//////////////////////////////////////////////////////////////////////////////////////////

  constructor(private storageService: StorageService,  private modalService: NgbModal){}
  
  ngOnInit(): void { 

    this.storageService.getObservable<ConId<Cliente>>('clientes').subscribe(data => {
      if (data) {
        console.log('Datos cargados para clientes:', data);
        this.$clientes = data;
        this.$clientes = this.$clientes.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
        this.armarTabla();
      }      
    });  
    // Sincroniza cambios en tiempo real
    this.storageService.syncChanges<Cliente>('clientes');
  }
  
  abrirEdicion(row:any):void {
    this.seleccionarCliente(row);
    this.openModal("edicion");    
  }
  
  seleccionarCliente(row:any){ 
    let seleccion = this.$clientes.filter((cliente:Cliente)=>{
      return cliente.idCliente === row.idCliente
    })
    this.clienteEditar = seleccion[0];    
  }

  abrirVista(row:any):void {
    this.seleccionarCliente(row);
    this.openModal("vista")   
  }

  eliminarCliente(row:any){
    this.seleccionarCliente(row)
    Swal.fire({
      title: "¿Eliminar el Cliente?",
      text: "No se podrá revertir esta acción",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        this.storageService.deleteItem(this.componente, this.clienteEditar);
        Swal.fire({
          title: "Confirmado",
          text: "El Cliente ha sido borrado",
          icon: "success"
        });
      }
    });   
    
  }


  openModal(modo:string): void {      
    {
      const modalRef = this.modalService.open(ClienteAltaComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'md', 
        //backdrop:"static" 
      });      

    let info = {
        modo: modo,
        item: this.clienteEditar,
      } 
      //console.log()(info); */
      
      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
        
        },
        (reason) => {}
      );
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////
  armarTabla() {
    //console.log("consultasOp: ", this.$consultasOp );
    let indice = 0
    this.rows = this.$clientes.map((cliente: Cliente) => ({
        indice: indice ++,
        idCliente: cliente.idCliente,
        razonSocial: cliente.razonSocial,
        direccion: cliente.direccion,
        cuit: this.formatCuit(cliente.cuit),
        tarifa: cliente.tarifaTipo.general ? "General" : cliente.tarifaTipo.especial ? "Especial" : cliente.tarifaTipo.personalizada ? "Personalizada" : "Eventual",
        contacto: cliente.contactos.length > 0 ? cliente.contactos[0].apellido : "Sin Datos",
        puesto: cliente.contactos.length > 0 ? cliente.contactos[0].puesto : "Sin Datos" ,
        telefono: cliente.contactos.length > 0 ? cliente.contactos[0].telefono : "Sin Datos"  ,
        correo: cliente.contactos.length > 0 ? cliente.contactos[0].email : "Sin Datos",
        
      }));
    
    //console.log("Rows: ", this.rows); // Verifica que `this.rows` tenga datos correctos
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

  formatCuit(cuitNumber: number | string): string {
    // Convertir el número a string, si no lo es
    const cuitString = cuitNumber.toString();
  
    // Validar que tiene exactamente 11 dígitos
    if (cuitString.length !== 11 || isNaN(Number(cuitString))) {
      throw new Error('El CUIT debe ser un número de 11 dígitos');
    }
  
    // Insertar los guiones en las posiciones correctas
    return `${cuitString.slice(0, 2)}-${cuitString.slice(2, 10)}-${cuitString.slice(10)}`;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
