import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { Subject, takeUntil } from 'rxjs';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConId } from 'src/app/interfaces/conId';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { AccionesCellRendererComponent } from 'src/app/shared/tabla/ag-cell-renderers/acciones-cell-renderer/acciones-cell-renderer.component';
import Swal from 'sweetalert2';
import { ClienteAltaComponent } from '../cliente-alta/cliente-alta.component';
import { BajaObjetoComponent } from 'src/app/shared/modales/baja-objeto/baja-objeto.component';
import { forEach } from 'lodash';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { VisibilidadListadosComponent } from 'src/app/shared/modales/visibilidad-listados/visibilidad-listados.component';

@Component({
  selector: 'app-listado-nuevo',
  standalone: false,
  templateUrl: './clientes-listado.component.html',
  styleUrl: './clientes-listado.component.scss'
})
export class ClientesListadoComponent implements OnInit, OnDestroy {

  rowData: any[] = [];
  paginatedRows: any[] = [];
  private gridApi!: GridApi;  
  visibleColumns: string[] = [];
  ajustes = false;
  componente: string = 'clientes';
  //context = { componentParent: this };
  allColumnDefs: ColDef[] = [
    { field: 'idCliente', headerName: 'Id Cliente', hide: true, flex: 2 },
    { field: 'razonSocial', headerName: 'Razon Social', flex: 3 },
    { field: 'cuit', headerName: 'CUIT', flex: 2 },
    { field: 'condFiscal', headerName: 'Condición Fiscal', hide: true, flex: 2 },
    { field: 'direccionFiscal', headerName: 'Direccion Fiscal', flex: 2 },
    { field: 'direccionOperativa', headerName: 'Direccion Operativa', flex: 2 },
    { field: 'tarifa', headerName: 'Tarifa', flex: 2 },
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

  $clientes: ConId<Cliente>[] = [];
  clienteEditar!: ConId<Cliente>;
  //firstFilter: string = '';
  //secondFilter: string = '';
  private destroy$ = new Subject<void>();
  clientesActivo: ConId<Cliente>[] = [];
  isLoading: boolean = false;

  clientesFiltrados: ConId<Cliente>[] = [];
  filtroEstado: 'visibles' | 'todos' = 'visibles';

  constructor(
    private storageService: StorageService, 
    private modalService: NgbModal,
    private dbFirestore: DbFirestoreService,
    private excelServ: ExcelService,
  ) {}

  ngOnInit(): void {
    this.cargarConfiguracionColumnas(); // Esto setea visibleColumns
    this.construirColumnDefs();         // Ahora sí, construye columnas visibles
    this.storageService
      .getObservable<ConId<Cliente>>('clientes')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.$clientes = data.sort((a, b) =>
          a.razonSocial.localeCompare(b.razonSocial)
        );
        this.aplicarFiltro(); // 👈 clave
      });
  }

  aplicarFiltro(): void {
    if (this.filtroEstado === 'visibles') {
      this.clientesFiltrados = this.$clientes.filter(c => c.visible === true);
    } else {
      this.clientesFiltrados = [...this.$clientes];
    }

    this.armarTabla();
  }

  armarTabla(): void {
    this.rowData = this.clientesFiltrados.map((cliente) => ({
      idCliente: cliente.idCliente,
      razonSocial: cliente.razonSocial,
      cuit: this.formatCuit(cliente.cuit),
      condFiscal: cliente.condFiscal,
      direccionFiscal: `${cliente.direccionFiscal.domicilio}, ${cliente.direccionFiscal.municipio}, ${cliente.direccionFiscal.provincia}`,
      direccionOperativa: `${cliente.direccionOperativa.domicilio}, ${cliente.direccionOperativa.municipio}, ${cliente.direccionOperativa.provincia}`,
      tarifa: cliente.tarifaTipo.general
        ? 'General'
        : cliente.tarifaTipo.especial
        ? 'Especial'
        : cliente.tarifaTipo.personalizada
        ? 'Personalizada'
        : 'Eventual',
      contacto: cliente.contactos[0]?.apellido || 'Sin Datos',
      puesto: cliente.contactos[0]?.puesto || 'Sin Datos',
      telefono: cliente.contactos[0]?.telefono || 'Sin Datos',
      correo: cliente.contactos[0]?.email || 'Sin Datos',
      cliente: cliente, // guardamos el objeto para acciones
    }));
  }

  cambiarFiltro(valor: 'visibles' | 'todos'): void {
    this.filtroEstado = valor;
    this.aplicarFiltro();
  }

  private cargarConfiguracionColumnas(): void {
    const saved = this.storageService.loadInfo('columnasVisiblesClientes');
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
      buttons: ['detalle', 'editar', 'eliminar'],
      onDetalle: (row: any) => this.abrirVista(row),
      onEditar: (row: any) => this.abrirEdicion(row),
      onEliminar: (row: any) => this.eliminarCliente(row),
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

  this.storageService.setInfo('columnasVisiblesClientes', this.visibleColumns);
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
    this.clienteEditar = row.cliente;
    this.openModal('vista');
  }

  abrirEdicion(row: any) {
    this.clienteEditar = row.cliente;
    this.openModal('edicion');
  }

  eliminarCliente(row: any) {
    this.clienteEditar = row.cliente;

    Swal.fire({
      title: '¿Eliminar el Cliente?',
      text: 'No se podrá revertir esta acción',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.openModalBaja(row.idCliente);
      }
    });
  }

  openModal(modo: string) {
    const modalRef = this.modalService.open(ClienteAltaComponent, {
      windowClass: 'myCustomModalClass',
      centered: true,
      size: 'lg',
    });

    modalRef.componentInstance.fromParent = {
      modo,
      item: this.clienteEditar,
    };
  }

  openModalBaja(idCliente: number) {
    const modalRef = this.modalService.open(BajaObjetoComponent, {
      windowClass: 'myCustomModalClass',
      centered: true,
      scrollable: true,
      size: 'sm',
    });

    modalRef.componentInstance.fromParent = {
      modo: 'Cliente',
      item: this.clienteEditar,
    };

    modalRef.result.then((result) => {
      if (result !== undefined) {
        this.storageService.deleteItemPapelera(
          this.componente,
          this.clienteEditar,
          this.clienteEditar.idCliente,
          'BAJA',
          `Baja de Cliente ${this.clienteEditar.razonSocial}`,
          result
        );
        Swal.fire({
          title: 'Confirmado',
          text: 'El Cliente ha sido dado de baja',
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

  clientesActivos(){
    this.$clientes.map((c:ConId<Cliente>) => {
        c.activo = true;
        this.clientesActivo.push(c);
      })
    this.clientesActivo = this.clientesActivo.sort((a, b) =>
      a.razonSocial.localeCompare(b.razonSocial)
    );
    console.log("this.clientesActivo", this.clientesActivo);   
    
  }

  async actualizarActivos(){
    this.isLoading = true;    
    const resp = await this.dbFirestore.actualizarMultiple(this.clientesActivo, "clientes");
    if(resp){
      this.isLoading = false;
      this.mensajesError(resp.mensaje)
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

  descargarClientes(){
    this.excelServ.exportarClientesTablaExcel(this.$clientes, 'Clientes')
  }

  visibilidadClientes(){
    {
      const modalRef = this.modalService.open(VisibilidadListadosComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'md', 
        //backdrop:"static" 
      });      

    let info = {
        tipo: 'clientes',
        objetos: this.$clientes,
      } 
      //console.log()(info); */
      
      modalRef.componentInstance.info = info;
      modalRef.result.then(

        () => {
          // modal cancelado → no hacemos nada
        }
      );
    }
  }

}
