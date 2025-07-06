import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { Subject, takeUntil } from 'rxjs';
import { Chofer } from 'src/app/interfaces/chofer';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { AccionesCellRendererComponent } from 'src/app/shared/tabla/ag-cell-renderers/acciones-cell-renderer/acciones-cell-renderer.component';
import Swal from 'sweetalert2';
import { ProveedoresAltaComponent } from '../proveedores-alta/proveedores-alta.component';
import { ModalBajaComponent } from 'src/app/shared/modal-baja/modal-baja.component';

@Component({
  selector: 'app-proveedores-listado',
  standalone: false,  
  templateUrl: './proveedores-listado.component.html',
  styleUrl: './proveedores-listado.component.scss'
})
export class ProveedoresListadoComponent implements OnInit, OnDestroy{
    
    @ViewChild('modalChoferes', { static: false }) modalChoferes: any;
    rowData: any[] = [];
    paginatedRows: any[] = [];
    private gridApi!: GridApi;  
    visibleColumns: string[] = [];
    ajustes = false;
    componente: string = 'proveedores';
    //context = { componentParent: this };
    allColumnDefs: ColDef[] = [
      { field: 'idProveedor', headerName: 'Id Proveedor', hide: true, flex: 2 },
      { field: 'razonSocial', headerName: 'Razon Social', flex: 3 },
      { field: 'cuit', headerName: 'CUIT', flex: 2 },
      { field: 'condFiscal', headerName: 'Condición Fiscal', hide: true, flex: 2 },
      { field: 'direccionFiscal', headerName: 'Direccion Fiscal', flex: 2 },
      { field: 'direccionOperativa', headerName: 'Direccion Operativa', flex: 2 },
      { field: 'tarifa', headerName: 'Tarifa', flex: 1 },
      { field: 'contacto', headerName: 'Contacto', hide: true, flex: 2 },
      { field: 'puesto', headerName: 'Puesto', hide: true, flex: 2 },
      { field: 'telefono', headerName: 'N° Contacto', hide: true, flex: 2 },
      { field: 'correo', headerName: 'Correo', flex: 2 },
    ];
  
    agColumnDefs: ColDef[] = [];
  
    defaultColDef: ColDef = {
      sortable: true,
      filter: true,
      floatingFilter: false,
      resizable: true,
    };
    $choferes!: ConId<Chofer>[] ;
    $proveedores!: ConIdType<Proveedor>[];    
    proveedorEditar!: ConIdType<Proveedor>;
    choferesProveedor!: ConId<Chofer>[];
    //firstFilter: string = '';
    //secondFilter: string = '';
    private destroy$ = new Subject<void>();
  
    constructor(private storageService: StorageService, private modalService: NgbModal) {}
  
    ngOnInit(): void {
      this.cargarConfiguracionColumnas(); // Esto setea visibleColumns
      this.construirColumnDefs();         // Ahora sí, construye columnas visibles
      this.storageService.getObservable<ConId<Chofer>>('choferes')
          .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
          .subscribe(data => {
            if (data) {
              console.log('Datos choferes actualizados:', data);
              this.$choferes = data; // Clona el array para evitar problemas con referencias
              this.$choferes.sort((a, b) => a.apellido.localeCompare(b.apellido));
              
            }
          });        
      this.storageService.getObservable<ConIdType<Proveedor>>('proveedores')
          .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
          .subscribe(data => {
            this.$proveedores = data;
            this.$proveedores.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));
            this.armarTabla();
          });              
    }
  
    armarTabla(): void {
      let indice = 0
      this.rowData = this.$proveedores.map((proveedor:ConIdType<Proveedor>) => ({
        indice: indice ++,
        idProveedor: proveedor.idProveedor,
        razonSocial: proveedor.razonSocial,
        direccionFiscal: `${proveedor.direccionFiscal.domicilio}, ${proveedor.direccionFiscal.municipio}, ${proveedor.direccionFiscal.provincia}`,
        direccionOperativa: `${proveedor.direccionOperativa.domicilio}, ${proveedor.direccionOperativa.municipio}, ${proveedor.direccionOperativa.provincia}`,
        cuit: this.formatCuit(proveedor.cuit),
        condFiscal: proveedor.condFiscal,
        tarifa: proveedor.tarifaTipo.general ? "General" : proveedor.tarifaTipo.especial ? "Especial" : proveedor.tarifaTipo.personalizada ? "Personalizada" : "Eventual",
        contacto: proveedor.contactos.length > 0 ? proveedor.contactos[0].apellido : "Sin Datos",
        puesto: proveedor.contactos.length > 0 ? proveedor.contactos[0].puesto : "Sin Datos" ,
        telefono: proveedor.contactos.length > 0 ? proveedor.contactos[0].telefono : "Sin Datos"  ,
        correo: proveedor.contactos.length > 0 ? proveedor.contactos[0].email : "Sin Datos",
        proveedor: proveedor, // guardamos el objeto para acciones
      }));
    }
  
    private cargarConfiguracionColumnas(): void {
      const saved = this.storageService.loadInfo('columnasVisiblesProveedores');
      console.log("saved", saved);
      
      if (Array.isArray(saved) && saved.length) {
        this.visibleColumns = saved;
      } else {
        // Mostrar por defecto las columnas deseadas
        this.visibleColumns = [
          'razonSocial', 'cuit', 'direccionFiscal', 'direccionOperativa', 'tarifa',
          'correo'
        ];
      }
    }
  
  private construirColumnDefs(): void {
    const columnas: ColDef[] = [];
  
    // Clonamos y marcamos si debe ocultarse
    const definidas = this.allColumnDefs.map(col => ({
      ...col,
      hide: !this.visibleColumns.includes(col.field!)
    }));
  
    columnas.push(...definidas);
  
    // Agregamos columna de acciones al final
    columnas.push({
      headerName: 'Acciones',
      field: 'acciones',
      cellRenderer: AccionesCellRendererComponent,
      cellRendererParams: {
        buttons: ['vehiculos','detalle', 'editar', 'eliminar'],
        onVehiculos: (row: any) => this.mostrarVehiculos(row),
        onDetalle: (row: any) => this.abrirVista(row),
        onEditar: (row: any) => this.abrirEdicion(row),
        onEliminar: (row: any) => this.eliminarProveedor(row),        
      },
      flex: 2,
      filter: false,
    });
  
    this.agColumnDefs = columnas;
  
    // Si el grid ya está listo, volver a aplicar definiciones
    if (this.gridApi) {
      this.gridApi.getColumnDefs();
    }
  }
  
    onGridReady(params: GridReadyEvent): void {
      this.gridApi = params.api;
    }
  
    onFirstDataRendered(): void {
      // Opcional: aplicar estilos adicionales al header si querés
      const header = document.querySelector('.ag-header') as HTMLElement;
      if (header) {
        header.classList.add('sticky-top'); // Solo si usás Bootstrap
      }
    }
  
  toggleColumnVisibility(colId: string): void {
    const isVisible = this.visibleColumns.includes(colId);
    if (isVisible) {
      this.visibleColumns = this.visibleColumns.filter(c => c !== colId);
    } else {
      this.visibleColumns.push(colId);
    }
  
    this.storageService.setInfo('columnasVisiblesProveedores', this.visibleColumns);
    this.construirColumnDefs(); // reconstruir las columnas visibles y aplicar al grid
  }
  
  
     toogleAjustes(){      
        this.ajustes = !this.ajustes;
      }
  
      limpiarFiltros(): void {
        if (this.gridApi) {
          this.gridApi.setFilterModel(null);       // Limpia todos los filtros aplicados
          this.gridApi.onFilterChanged();          // Fuerza actualización del grid
        }
      }
   
  
    abrirVista(row: any) {
      this.proveedorEditar = row.proveedor;
      this.openModal('vista');
    }
  
    abrirEdicion(row: any) {
      this.proveedorEditar = row.proveedor;
      this.openModal('edicion');
    }
  
    eliminarProveedor(row: any) {
      this.proveedorEditar = row.proveedor;
  
      Swal.fire({
        title: '¿Eliminar el Proveedor?',
        text: 'No se podrá revertir esta acción',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Confirmar',
        cancelButtonText: 'Cancelar',
      }).then((result) => {
        if (result.isConfirmed) {
          this.openModalBaja(row.idProveedor);
        }
      });
    }
  
    openModal(modo: string) {
      const modalRef = this.modalService.open(ProveedoresAltaComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'lg',
      });
  
      modalRef.componentInstance.fromParent = {
        modo,
        item: this.proveedorEditar,
      };
    }
  
    openModalBaja(idProveedor: number) {
      const modalRef = this.modalService.open(ModalBajaComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        scrollable: true,
        size: 'sm',
      });
  
      modalRef.componentInstance.fromParent = {
        modo: 'Proveedor',
        item: this.proveedorEditar,
      };
  
      modalRef.result.then((result) => {
        if (result !== undefined) {
          this.storageService.deleteItemPapelera(
            this.componente,
            this.proveedorEditar,
            this.proveedorEditar.idProveedor,
            'BAJA',
            `Baja de Proveedor ${this.proveedorEditar.razonSocial}`,
            result
          );
          Swal.fire({
            title: 'Confirmado',
            text: 'El Proveedor ha sido dado de baja',
            icon: 'success',
          });
        }
      });
    }
  
    formatCuit(cuitNumber: number | string): string {
      const cuitString = cuitNumber.toString();
      if (cuitString.length !== 11 || isNaN(Number(cuitString))) {
        return 'Formato inválido';
      }
      return `${cuitString.slice(0, 2)}-${cuitString.slice(2, 10)}-${cuitString.slice(10)}`;
    }
    ngOnDestroy(): void {
      this.destroy$.next();
      this.destroy$.complete();
    }

    mostrarVehiculos(row: any){
      this.proveedorEditar = row.proveedor;          
      this.choferesProveedor = this.$choferes.filter((chofer:Chofer)=>{
        return chofer.idProveedor === this.proveedorEditar.idProveedor
      })
      console.log("this.choferesProveedor", this.choferesProveedor);
      this.modalService.open(this.modalChoferes, {
          size: 'lg',
          centered: true,
        });
    }

}
