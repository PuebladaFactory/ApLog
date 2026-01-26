import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { Subject, takeUntil } from 'rxjs';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { AccionesCellRendererComponent } from 'src/app/shared/tabla/ag-cell-renderers/acciones-cell-renderer/acciones-cell-renderer.component';
import Swal from 'sweetalert2';
import { ChoferesAltaComponent } from '../choferes-alta/choferes-alta.component';
import { BajaObjetoComponent } from 'src/app/shared/modales/baja-objeto/baja-objeto.component';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { VisibilidadListadosComponent } from 'src/app/shared/modales/visibilidad-listados/visibilidad-listados.component';

@Component({
  selector: 'app-choferes-listado',
  standalone: false,
  templateUrl: './choferes-listado.component.html',
  styleUrl: './choferes-listado.component.scss'
})
export class ChoferesListadoComponent implements OnInit, OnDestroy {

  rowData: any[] = [];
    paginatedRows: any[] = [];
    private gridApi!: GridApi;  
    visibleColumns: string[] = [];
    ajustes = false;
    componente: string = 'choferes';
    //context = { componentParent: this };
    allColumnDefs: ColDef[] = [
      { field: 'idChofer', headerName: 'Id Chofer', hide: true, flex: 2 },
      { field: 'apellido', headerName: 'Apellido', flex: 2 },
      { field: 'nombre', headerName: 'Nombre', flex: 2 },      
      { field: 'celular', headerName: 'Celular', flex: 2 },
      { field: 'celularEmergencia', headerName: 'Cel Emergencia', hide: true, flex: 2 },
      { field: 'direccion', headerName: 'Dirección', flex: 2 },
      { field: 'cuit', headerName: 'CUIT', flex: 2 },
      { field: 'condFiscal', headerName: 'Condición Fiscal', hide:true, flex: 2 },
      { field: 'proveedor', headerName: 'Proveedor', flex: 2 },
      { field: 'tarifa', headerName: 'Tarifa', flex: 2 },            
      { field: 'correo', headerName: 'Correo', flex: 2 },   
      { field: 'fechaNac', headerName: 'Fecha Nac', hide: true, flex: 2 },
    ];
  
    agColumnDefs: ColDef[] = [];
  
    defaultColDef: ColDef = {
      sortable: true,
      filter: true,
      floatingFilter: false,
      resizable: true,
    };
    $choferes!: ConIdType<Chofer>[] ;
    $proveedores!: ConId<Proveedor>[];    
    choferEditar!: ConIdType<Chofer>;
    choferesActualizados: any[] = [];
    private destroy$ = new Subject<void>();

    choferesFiltrados: ConIdType<Chofer>[] = [];
    filtroEstado: 'visibles' | 'todos' = 'visibles';
  
    constructor(
      private storageService: StorageService, 
      private modalService: NgbModal, 
      private dbFirebase: DbFirestoreService,
      private excelServ: ExcelService
    ) {}
  
    ngOnInit(): void {
      this.cargarConfiguracionColumnas(); // Esto setea visibleColumns
      this.construirColumnDefs();         // Ahora sí, construye columnas visibles
      this.storageService.getObservable<ConId<Proveedor>>('proveedores')
          .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
          .subscribe(data => {
            this.$proveedores = data;
      }); 
      this.storageService.getObservable<ConIdType<Chofer>>('choferes')
          .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
          .subscribe(data => {
            if (data) {
              console.log('Datos choferes actualizados:', data);
              this.$choferes = data; // Clona el array para evitar problemas con referencias
              this.$choferes.sort((a, b) => a.apellido.localeCompare(b.apellido));
              this.aplicarFiltro(); // 👈 clave
            }
      });                     
    }

    aplicarFiltro(): void {
      if (this.filtroEstado === 'visibles') {
        this.choferesFiltrados = this.$choferes.filter(c => c.visible === true);
      } else {
        this.choferesFiltrados = [...this.$choferes];
      }

      this.armarTabla();
    }
  
    armarTabla(): void {
      let indice = 0
      this.rowData = this.choferesFiltrados.map((chofer:ConIdType<Chofer>) => ({
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
        chofer: chofer, // guardamos el objeto para acciones
      }));
    }

    cambiarFiltro(valor: 'visibles' | 'todos'): void {
      this.filtroEstado = valor;
      this.aplicarFiltro();
    }
  
    private cargarConfiguracionColumnas(): void {
      const saved = this.storageService.loadInfo('columnasVisiblesChoferes');
      console.log("saved", saved);
      
      if (Array.isArray(saved) && saved.length) {
        this.visibleColumns = saved;
      } else {
        // Mostrar por defecto las columnas deseadas
        this.visibleColumns = [
          'apellido', 'nombre', 'celular', 'direccion', 'cuit', 'proveedor',
          'tarifa', 'correo'
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
        onEliminar: (row: any) => this.eliminarChofer(row),
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
  
    this.storageService.setInfo('columnasVisiblesChoferes', this.visibleColumns);
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
      this.choferEditar = row.chofer;
      this.openModal('vista');
    }
  
    abrirEdicion(row: any) {
      this.choferEditar = row.chofer;
      this.openModal('edicion');
    }
  
    eliminarChofer(row: any) {
      this.choferEditar = row.chofer;
      console.log("this.choferEditar", this.choferEditar);
      
      Swal.fire({
        title: '¿Eliminar el Chofer?',
        text: 'No se podrá revertir esta acción',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Confirmar',
        cancelButtonText: 'Cancelar',
      }).then((result) => {
        if (result.isConfirmed) {
          this.openModalBaja(row.idChofer);
        }
      });
    }
  
    openModal(modo: string) {
      const modalRef = this.modalService.open(ChoferesAltaComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'lg',
      });
  
      modalRef.componentInstance.fromParent = {
        modo,
        item: this.choferEditar,
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
        modo: 'Chofer',
        item: this.choferEditar,
      };
      //let {id, type, ...chBaja} = this.choferEditar
  
      modalRef.result.then((result) => {
        if (result !== undefined) {
          this.storageService.deleteItemPapelera(
            this.componente,
            this.choferEditar,
            this.choferEditar.idChofer,
            'BAJA',
            `Baja de Chofer ${this.choferEditar.apellido} ${this.choferEditar.nombre}`,
            result
          );
          Swal.fire({
            title: 'Confirmado',
            text: 'El Chofer ha sido dado de baja',
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

    getProveedor(idProveedor:number) {    
      let proveedor:Proveedor[] = [];
      proveedor = this.$proveedores.filter((p:Proveedor)=>{
        return p.idProveedor === idProveedor;
      });    
      return proveedor[0].razonSocial
    }
  
    ngOnDestroy(): void {
      this.destroy$.next();
      this.destroy$.complete();
    }

    editarChoferes(){
      
      this.choferesActualizados = this.agregarCampoActivo(this.$choferes);
      console.log("choferesActualizados", this.choferesActualizados);
      
    }

    agregarCampoActivo(choferes: any): ConIdType<Chofer>[] {
      return choferes.map((chofer:any) => {
        return {
          ...chofer,
          activo: true
        };
      });
    }

    actualizarChoferes(){
      this.dbFirebase.actualizarMultiple(this.choferesActualizados, "choferes")
    }


    descargarChoferes(){
       this.excelServ.exportarChoferesTablaExcel(this.choferesFiltrados)
    }

    visibilidadChoferes(){
      {
        const modalRef = this.modalService.open(VisibilidadListadosComponent, {
          windowClass: 'myCustomModalClass',
          centered: true,
          size: 'md', 
          //backdrop:"static" 
        });      

      let info = {
          tipo: 'choferes',
          objetos: this.$choferes,
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
