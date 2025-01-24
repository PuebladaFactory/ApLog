import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ProveedoresAltaComponent } from '../proveedores-alta/proveedores-alta.component';
import Swal from 'sweetalert2';
import { ColumnMode, SelectionType, SortType } from '@swimlane/ngx-datatable';
import { Chofer } from 'src/app/interfaces/chofer';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-proveedores-listado',
  templateUrl: './proveedores-listado.component.html',
  styleUrls: ['./proveedores-listado.component.scss']
})
export class ProveedoresListadoComponent implements OnInit {
  
  searchText!: string;
  $proveedores!: Proveedor[];  
  proveedorEditar!: Proveedor;  
  componente:string ="proveedores";
  $choferes!: Chofer [];
  ////////////////////////////////////////////////////////////////////////////////////////
  //@ViewChild('tablaClientes') table: any;  
  rows: any[] = [];
  filteredRows: any[] = [];
  paginatedRows: any[] = [];
  choferesProveedor!: Chofer[];
  allColumns = [
  //    { prop: '', name: '', selected: true, flexGrow:1  },
    { prop: 'idProveedor', name: 'Id Proveedor', selected: false, flexGrow:2  },  
    { prop: 'razonSocial', name: 'Razon Social', selected: true, flexGrow:2  },          
    { prop: 'cuit', name: 'CUIT', selected: true, flexGrow:2  },
    { prop: 'condFiscal', name: 'Condición Fiscal', selected: true, flexGrow:2  },
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
private destroy$ = new Subject<void>();

//////////////////////////////////////////////////////////////////////////////////////////


  constructor(private storageService: StorageService, private modalService: NgbModal){}
  
  ngOnInit(): void { 
    //this.proveedores$ = this.storageService.proveedores$; 
    
    this.storageService.getObservable<Proveedor>('proveedores')
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data => {
      if(data){
        this.$proveedores = data;
        this.$proveedores = this.$proveedores.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
        this.armarTabla();
      }      
    })

    this.storageService.getObservable<Chofer>('choferes')
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data => {
      if (data) {
        console.log('Datos choferes actualizados:', data);
        this.$choferes = [...data]; // Clona el array para evitar problemas con referencias
        this.$choferes.sort((a, b) => a.apellido.localeCompare(b.apellido));
        this.armarTabla();
      }
    });    

    this.storageService.syncChanges<Proveedor>('proveedores');
    this.storageService.syncChanges<Chofer>('choferes');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  abrirEdicion(row:any):void {
    this.seleccionarProveedor(row);
    this.openModal("edicion");    
  }


  seleccionarProveedor(row:any){ 
    let seleccion = this.$proveedores.filter((proveedor:Proveedor)=>{
      return proveedor.idProveedor === row.idProveedor;
    })
    this.proveedorEditar = seleccion[0];    
  }

  abrirVista(row:any):void {
    this.seleccionarProveedor(row)
    this.openModal("vista")   
  }

  eliminarProveedor(row: any){
    this.seleccionarProveedor(row)
    Swal.fire({
      title: "¿Eliminar el Proveedor?",
      text: "No se podrá revertir esta acción",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        this.storageService.deleteItem(this.componente, this.proveedorEditar, this.proveedorEditar.idProveedor);
        Swal.fire({
          title: "Confirmado",
          text: "El Proveedor ha sido borrado",
          icon: "success"
        });
      }
    });   
    
    /* this.ngOnInit(); */    
  }

  
  openModal(modo:string): void {   
   
    {
      const modalRef = this.modalService.open(ProveedoresAltaComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'lg', 
        //backdrop:"static" 
      });

    let info = {
        modo: modo,
        item: this.proveedorEditar,
      }; 
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
    this.rows = this.$proveedores.map((proveedor: Proveedor) => ({
        indice: indice ++,
        idProveedor: proveedor.idProveedor,
        razonSocial: proveedor.razonSocial,
        direccion: `${proveedor.direccion.domicilio}, ${proveedor.direccion.municipio}, ${proveedor.direccion.provincia}`,
        cuit: this.formatCuit(proveedor.cuit),
        condFiscal: proveedor.condFiscal,
        tarifa: proveedor.tarifaTipo.general ? "General" : proveedor.tarifaTipo.especial ? "Especial" : proveedor.tarifaTipo.personalizada ? "Personalizada" : "Eventual",
        contacto: proveedor.contactos.length > 0 ? proveedor.contactos[0].apellido : "Sin Datos",
        puesto: proveedor.contactos.length > 0 ? proveedor.contactos[0].puesto : "Sin Datos" ,
        telefono: proveedor.contactos.length > 0 ? proveedor.contactos[0].telefono : "Sin Datos"  ,
        correo: proveedor.contactos.length > 0 ? proveedor.contactos[0].email : "Sin Datos",
        
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

  mostrarVehiculos(row: any){
    this.seleccionarProveedor(row)    
    this.choferesProveedor = this.$choferes.filter((chofer:Chofer)=>{
      return chofer.idProveedor === this.proveedorEditar.idProveedor
    })
  
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

}
