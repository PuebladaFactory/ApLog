import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ChoferesAltaComponent } from '../choferes-alta/choferes-alta.component';
import Swal from 'sweetalert2';
import { ColumnMode, SelectionType, SortType } from '@swimlane/ngx-datatable';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { LegajosService } from 'src/app/servicios/legajos/legajos.service';
import { Subject, takeUntil } from 'rxjs';
import { ModalBajaComponent } from 'src/app/shared/modal-baja/modal-baja.component';


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
  { prop: 'direccion', name: 'Direccion', selected: true, flexGrow:2  },
  { prop: 'cuit', name: 'CUIT', selected: true, flexGrow:2  },
  { prop: 'condFiscal', name: 'Condición Fisacal', selected: false, flexGrow:2  },
  { prop: 'proveedor', name: 'Proveedor', selected: true, flexGrow:2  },
  { prop: 'tarifa', name: 'Tarifa', selected: true, flexGrow:2  }, 
  { prop: 'correo', name: 'Correo', selected: true, flexGrow:2  },  
  { prop: 'fechaNac', name: 'Fech Nac', selected: false, flexGrow:2  },  
  
  ];
  visibleColumns = this.allColumns.filter(column => column.selected);
  selected = [];
  count = 0;
  limit = 100;
  offset = 0;
  sortType = SortType.multi; // Aquí usamos la enumeración SortType
  selectionType = SelectionType.checkbox; // Aquí usamos la enumeración SelectionType
  ColumnMode = ColumnMode;  
  encapsulation!: ViewEncapsulation.None;
  ajustes: boolean = false;
  firstFilter = '';
  secondFilter = '';
  vehiculos: Vehiculo[] = [];
  private destroy$ = new Subject<void>();
//////////////////////////////////////////////////////////////////////////////////////////

  constructor(private storageService: StorageService, private modalService: NgbModal, private legajoServ: LegajosService){   
  }  
  ngOnInit(): void { 
    //console.log(this.tablaVehiculo);  
    //this.storageService.getAllSorted("choferes", 'idChofer', 'asc') 
    this.storageService.getObservable<Proveedor>('proveedores')
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data => {
      this.$proveedores = data;
    });    
    this.storageService.getObservable<Chofer>('choferes')
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data => {
      if (data) {
        console.log('Datos choferes actualizados:', data);
        this.$choferes = data; // Clona el array para evitar problemas con referencias
        this.$choferes.sort((a, b) => a.apellido.localeCompare(b.apellido));
        this.armarTabla();
      }
    });    
    this.storageService.syncChanges<Chofer>('choferes');
    this.storageService.syncChanges<Proveedor>('proveedores');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
      title: "Desea dar de baja el Chofer?",
      text: "No se podrá revertir esta acción",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        this.openModalBaja();
       
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
        direccion: `${chofer.direccion.domicilio}, ${chofer.direccion.localidad}, ${chofer.direccion.provincia} `,
        cuit: this.formatCuit(chofer.cuit),
        condFiscal: chofer.condFiscal,
        proveedor: chofer.idProveedor === 0 ? "No" : this.getProveedor(chofer.idProveedor),
        tarifa: chofer.idProveedor !== 0 ? "Tarifa Proveedor" : chofer.tarifaTipo?.general ? "General" : chofer.tarifaTipo?.especial ? "Especial" : chofer.tarifaTipo?.personalizada ? "Personalizada" : "Eventual",
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

/*   legajo(){
    this.$choferes.forEach((c:Chofer)=>{
      this.legajoServ.crearLegajo(c.idChofer)
    })
  } */

    /* legajoId(idChofer:number){
      this.legajoServ.crearLegajo(idChofer);
    }  */

      /* convertirPatente(){
        this.$choferes.forEach((c:Chofer)=>{
          if(c.vehiculo.length > 0){
            c.vehiculo.forEach((v:Vehiculo)=>{
              v.dominio = v.dominio?.toUpperCase();            
            });
            this.storageService.updateItem(this.componente, c);
          }
          
        })
      } */

    openModalBaja(){
        {
          const modalRef = this.modalService.open(ModalBajaComponent, {
            windowClass: 'myCustomModalClass',
            centered: true,
            scrollable: true, 
            size: 'sm',     
          });   
          
          
    
          let info = {
            modo: "Chofer",
            item: this.choferEditar,
          }  
          //////console.log()(info); */
          
          modalRef.componentInstance.fromParent = info;
        
          modalRef.result.then(
            (result) => {
              console.log("result", result);
              if(result !== undefined){   
                ////////console.log("llamada al storage desde op-abiertas, deleteItem");
                //this.storageService.deleteItem(this.componente, this.clienteEditar, this.clienteEditar.idCliente, "BAJA", `Baja de Cliente ${this.clienteEditar.razonSocial}`);
                this.storageService.deleteItemPapelera(this.componente, this.choferEditar, this.choferEditar.idChofer, "BAJA", `Baja de Chofer ${this.choferEditar.apellido} ${this.choferEditar.nombre}`, result);
                ////////console.log("consultas Op: " , this.$consultasOp);
                this.legajoServ.eliminarLegajo(this.choferEditar.idChofer, result);
                //this.storageService.deleteItem(this.componente, this.choferEditar, this.choferEditar.idChofer, "BAJA", `Baja de Chofer ${this.choferEditar.apellido} ${this.choferEditar.nombre}`);        
                Swal.fire({
                  title: "Confirmado",
                  text: "El Chofer ha sido dada de baja",
                  icon: "success"
                });
              }
              
            },
            (reason) => {}
          );
        }
      }

}
