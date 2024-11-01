import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ChoferesAltaComponent } from '../choferes-alta/choferes-alta.component';
import Swal from 'sweetalert2';
import { ColumnMode, SelectionType, SortType } from '@swimlane/ngx-datatable';
import { Proveedor } from 'src/app/interfaces/proveedor';


@Component({
  selector: 'app-choferes-listado',
  templateUrl: './choferes-listado.component.html',
  styleUrls: ['./choferes-listado.component.scss']
})
export class ChoferesListadoComponent implements OnInit {
  
  @Input() fromParent: any;
  
  $choferes!: Chofer[] ;
  $proveedores!: any;  
  choferEditar!: Chofer;
  componente:string = "choferes";        
  soloVista:boolean = false;
  searchText!: string;
  publicidad!: boolean;
  choferVehiculos!: Chofer;
////////////////////////////////////////////////////////////////////////////////////////
  rows: any[] = [];
  filteredRows: any[] = [];
  paginatedRows: any[] = [];
  allColumns = [
//    { prop: '', name: '', selected: true, flexGrow:1  },
  { prop: 'idChofer', name: 'Id Chofer', selected: false, flexGrow:2  },  
  { prop: 'apellido', name: 'Apellido', selected: true, flexGrow:2  },          
  { prop: 'nombre', name: 'Nombre', selected: true, flexGrow:2  },
  { prop: 'celular', name: 'Celular', selected: true, flexGrow:2  },
  { prop: 'celularEmergencia', name: 'Cel Emergencia', selected: false, flexGrow:2  },
  { prop: 'direccion', name: 'Direccion', selected: false, flexGrow:2  },
  { prop: 'cuit', name: 'CUIT', selected: true, flexGrow:2  },
  { prop: 'proveedor', name: 'Proveedor', selected: true, flexGrow:2  },
  { prop: 'tarifa', name: 'Tarifa', selected: true, flexGrow:2  },
  /* { prop: 'dominio', name: 'Patente', selected: true, flexGrow:2 },
  { prop: 'categoria', name: 'Categoria', selected: true, flexGrow:3 },
  { prop: 'marca', name: 'Marca', selected: false, flexGrow:2 },
  { prop: 'modelo', name: 'Modelo', selected: false, flexGrow:2 },
  { prop: 'tarjCombustible', name: 'Tarj Combustible', selected: false, flexGrow:2  },    
  { prop: 'tipoCombustible', name: 'Tipo Combustible', selected: false, flexGrow:2  },    
  { prop: 'publicidad', name: 'Publicidad', selected: true, flexGrow:2  },    
  { prop: 'satelital', name: 'Satelital', selected: false, flexGrow:2  },     */
  { prop: 'correo', name: 'Correo', selected: true, flexGrow:2  },  
  { prop: 'fechaNac', name: 'Fech Nac', selected: false, flexGrow:2  },  
  
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
  vehiculos: Vehiculo[] = [];

//////////////////////////////////////////////////////////////////////////////////////////

  constructor(private storageService: StorageService, private modalService: NgbModal){   
  }  
  ngOnInit(): void { 
    //console.log(this.tablaVehiculo);    
    this.storageService.proveedores$.subscribe(data => {
      this.$proveedores = data;
    });    
    this.storageService.choferes$.subscribe(data => {
      this.$choferes = data;      
      this.armarTabla();
    });    
  }
  
  seleccionarChofer(row:any){ 
    let seleccion = this.$choferes.filter((chofer:Chofer)=>{
      return chofer.idChofer === row
    })
    this.choferEditar = seleccion[0];    
  }

  eliminarChofer(row:any){    
    this.seleccionarChofer(row)
    let chofer = this.choferEditar
    Swal.fire({
      title: "¿Eliminar el Chofer?",
      text: "No se podrá revertir esta acción",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        this.storageService.deleteItem(this.componente, this.choferEditar);
        Swal.fire({
          title: "Confirmado",
          text: "El Chofer ha sido borrado",
          icon: "success"
        });
      }
    });   
   
}

  abrirEdicion(row:any, modo:string):void {
    this.seleccionarChofer(row);
    this.openModal(modo);    
  }

  openModal(modo:string): void {      
    {
      const modalRef = this.modalService.open(ChoferesAltaComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'lg', 
        //backdrop:"static" 
      });

      let info = {
        modo: modo,
        item: this.choferEditar,
      }; 
      
      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
          ////console.log()("ROOWW:" ,row);
          this.storageService.getAllSorted("choferes", 'idChofer', 'asc');
        },
        (reason) => {}
      );
    }
  }

  /////////////////////////////TABLA///////////////////////////////////////////////////////
  armarTabla() {
    //console.log("consultasOp: ", this.$consultasOp );
    let indice = 0
    this.rows = this.$choferes.map((chofer: Chofer) => ({
        indice: indice ++,
        idChofer: chofer.idChofer,
        apellido: chofer.apellido,
        nombre: chofer.nombre,
        celular: chofer.celularContacto,
        celularEmergencia: chofer.celularEmergencia,
        direccion: chofer.domicilio,
        cuit: chofer.cuit,
        proveedor: chofer.idProveedor === 0 ? "Monotributista" : this.getProveedor(chofer.idProveedor),
        tarifa: chofer.tarifaTipo?.general ? "General" : chofer.tarifaTipo?.especial ? "Especial" : chofer.tarifaTipo?.personalizada ? "Personalizada" : chofer.tarifaTipo?.eventual ? "Eventual" : "Tarifa Proveedor",      
        correo: chofer.email,
        fechaNac: chofer.fechaNac,
        
      }));
    this.applyFilters(); // Aplica filtros y actualiza filteredRows
  }

  getProveedor(idProveedor:number) {    
    let proveedor:Proveedor[] = [];
    proveedor = this.$proveedores.filter((p:Proveedor)=>{
      return p.idProveedor === idProveedor;
    });    
    return proveedor[0].razonSocial
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

  mostrarVehiculos(id: number){
    //this.tablaVehiculo[indice] = !this.tablaVehiculo[indice];
    let chofer = this.$choferes.filter((chofer:Chofer)=>{
      return chofer.idChofer === id
    });
    this.choferVehiculos = chofer[0];
    this.vehiculos = chofer[0].vehiculo
    
  }

}
