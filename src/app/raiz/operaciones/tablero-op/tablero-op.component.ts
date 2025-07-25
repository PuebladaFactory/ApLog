import { Component, OnInit, OnDestroy, ViewChild  } from '@angular/core';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { Operacion } from 'src/app/interfaces/operacion';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { Subject, takeUntil } from 'rxjs';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { EstadoCellRendererComponent } from 'src/app/shared/estado-cell-renderer/estado-cell-renderer.component';
import { AccionesCellRendererComponent } from 'src/app/shared/tabla/ag-cell-renderers/acciones-cell-renderer/acciones-cell-renderer.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalResumenOpComponent } from '../modal-resumen-op/modal-resumen-op.component';
import Swal from 'sweetalert2';
import { ModalBajaComponent } from 'src/app/shared/modal-baja/modal-baja.component';
import { ModalOpAltaComponent } from '../modal-op-alta/modal-op-alta.component';
import { CargaMultipleComponent } from '../carga-multiple/carga-multiple.component';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { Cliente } from 'src/app/interfaces/cliente';
import { TableroService } from 'src/app/servicios/tablero/tablero.service';


@Component({
  selector: 'app-tablero-op',
  standalone: false,
  templateUrl: './tablero-op.component.html',
  styleUrls: ['./tablero-op.component.scss']
})
export class TableroOpComponent implements OnInit, OnDestroy {
  
  paginatedRows: any[] = [];
  private gridApi!: GridApi;  
  visibleColumns: string[] = [];
  // Definición original completa para visibilidad
  allColumnDefs: ColDef[] = [
    { headerName: 'Fecha', field: 'fecha', flex: 2 },
    { headerName: 'IdOperacion', field: 'idOperacion', flex: 2 },
    { headerName: 'Cliente', field: 'cliente', flex: 2 },
    { headerName: 'Chofer', field: 'chofer', flex: 2 },
    { headerName: 'Categoria', field: 'categoria', flex: 2 },
    { headerName: 'Patente', field: 'patente', flex: 2 },
    { headerName: 'Acompaniante', field: 'acompaniante', flex: 2 },
    { headerName: 'Tarifa', field: 'tarifa', flex: 2 },
    { headerName: 'A Cobrar', field: 'aCobrar', flex: 2 },
    { headerName: 'A Pagar', field: 'aPagar', flex: 2 },
    { headerName: 'Hoja Ruta', field: 'hojaRuta', flex: 2 },
    { headerName: 'proveedor', field: 'proveedor', flex: 2 },
    { headerName: 'observaciones', field: 'observaciones', flex: 3 },
  ];

  agColumnDefs: ColDef[] = [];
  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true,
    floatingFilter: false
  };   
  context = { componentParent: this };
///////////////////////////////////////////////////////
  private destroy$ = new Subject<void>();
  opEditar!: ConId<Operacion>;
  componente:string = "operaciones";
  $opActivas: ConId<Operacion>[] = [];
  $opFiltradas: ConId<Operacion>[] = [];  
  isLoading: boolean = false;
  fechasConsulta!: any;
  modo : string = "operaciones";
  btnConsulta:boolean = false;
  respuestaOp!:any;
  titulo: string = "operaciones";
  ajustes: boolean = false;
  cantPorPagina: boolean = false; ////  ESTO  NO SE SI SIGUE APLICANDO
  $clientes!: ConIdType<Cliente>[];
  $choferes!: ConIdType<Chofer>[];
  $proveedores!: ConIdType<Proveedor>[];
  clientesEnPeriodo: ConIdType<Cliente>[] = [];
  choferesEnPeriodo: ConIdType<Chofer>[] = [];  
  clienteSeleccionado: ConIdType<Cliente> | null = null;
  choferSeleccionado: ConIdType<Chofer> | null = null;
  objetoEditado: ConId<Operacion>[] = [];
  totalFiltrado: number = 0;
  filtroPrincipal: 'cliente' | 'chofer' | null = null;
  private modeloFiltrosPrevio: any = null;

  constructor(
    private storageService: StorageService,
    private dbFirebase: DbFirestoreService,
    private modalService: NgbModal,
    private excelServ: ExcelService,
    private tableroServ: TableroService
  ) {}

  ngOnInit(): void {
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
      this.restaurarEstadoFiltros();
      this.cargarConfiguracionColumnas(); // Esto setea visibleColumns
      this.construirColumnDefs();         // Ahora sí, construye columnas visibles
      this.cargarDatos();

  }

  ngOnDestroy(): void {
    if (this.gridApi) {
      const colState = this.gridApi.getColumnState();
      localStorage.setItem('tableroOpColumnState', JSON.stringify(colState));
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;

    const savedFilters = localStorage.getItem('filtrosTableroOp');
    if (savedFilters) {
      const parsedModel = JSON.parse(savedFilters);
      this.gridApi.setFilterModel(parsedModel);
    }

    // Actualizar cantidad y dropdowns iniciales
    this.actualizarEstadoFiltrado();
  }

  toggleColumnVisibility(colId: string): void {
    const isVisible = this.visibleColumns.includes(colId);

    if (isVisible) {
      this.visibleColumns = this.visibleColumns.filter(c => c !== colId);
    } else {
      this.visibleColumns.push(colId);
    }

    this.storageService.setInfo('columnasVisiblesTablero', this.visibleColumns);
    this.construirColumnDefs(); // reconstruir las columnas
  }

private cargarConfiguracionColumnas(): void {
  const saved = this.storageService.loadInfo('columnasVisiblesTablero');

  if (Array.isArray(saved) && saved.length) {
    this.visibleColumns = saved;
  } else {
    // Mostrar por defecto las columnas deseadas
    this.visibleColumns = [
      'estado', 'fecha', 'cliente', 'chofer', 'categoria',
      'aCobrar', 'aPagar', 'hojaRuta', 'observaciones'
    ];
  }
}

  private construirColumnDefs(): void {
    const columnas: ColDef[] = [];

    // Estado
    columnas.push({
      headerName: 'Estado',
      field: 'estado',
      cellRenderer: EstadoCellRendererComponent,
      sortable: true,
      filter: true,
      flex: 2
    });

    // Dinámicas según visibilidad
    const visibles = this.allColumnDefs.filter(col =>
      this.visibleColumns.includes(col.field!)
    );
    columnas.push(...visibles);

    // Acciones
    columnas.push({
      headerName: 'Acciones',
      field: 'acciones',
      cellRenderer: AccionesCellRendererComponent,
      cellRendererParams: {
        buttons: ['detalle', 'editar', 'eliminar', 'factura'],
        disableOn: {
          editar: 'Abierta',
          eliminar: 'Abierta',
          factura: 'Abierta',
        },
        onDetalle: (row: any) => this.abrirVista(row),
        onEditar: (row: any) => this.abrirEdicion(row),
        onEliminar: (row: any) => this.eliminarOperacion(row),
        onFactura: (row: any) => this.crearFacturaOp(row),
      },
      flex: 3,
      filter: false,
    });


    this.agColumnDefs = columnas;
  }

cargarDatos(): void {
  if (this.gridApi) {
    // ✅ Guarda los filtros activos ANTES de que llegue nueva data
    this.modeloFiltrosPrevio = this.gridApi.getFilterModel();
  }

  this.storageService.getObservable<ConId<Operacion>>("operaciones")
    .pipe(takeUntil(this.destroy$))
    .subscribe((ops: ConId<Operacion>[]) => {
      this.$opActivas = ops;
      this.$opFiltradas = ops;
      this.armarTabla();

      setTimeout(() => {
        // ✅ Reaplica el filtro anterior si existe
        if (this.gridApi && this.modeloFiltrosPrevio) {
          this.gridApi.setFilterModel(this.modeloFiltrosPrevio);
          this.gridApi.onFilterChanged();
          this.modeloFiltrosPrevio = null;
        }

        // ✅ Actualiza dropdowns y contador
        if (this.gridApi) {
          this.actualizarEstadoFiltrado();
        }
      }, 0);
    });
}


  aplicarFiltros(filtros: string[]): void {
    if (!filtros.length) {
      this.$opFiltradas = [...this.$opActivas];
    } else {
      this.$opFiltradas = this.$opActivas.filter(op =>
        filtros.some(key => (op.estado as any)[key])
      );
    }
    this.armarTabla();
  }

  armarTabla(): void {
    let indice = 0;
    this.paginatedRows = this.$opFiltradas.map((op) => ({
      indice: indice++,
      fecha: op.fecha,
      estado: op.estado.abierta ? "Abierta" : op.estado.cerrada ? "Cerrada" :
              op.estado.proformaCl || op.estado.proformaCh ? "Proforma" :
              op.estado.facCliente ? "Cliente Fac" :
              op.estado.facChofer ? "Chofer Fac" :
              op.estado.facturada ? "Facturada" : "Sin Datos",
      idOperacion: op.idOperacion,
      cliente: op.cliente.razonSocial,
      idCliente: op.cliente.idCliente,
      chofer: `${op.chofer.apellido} ${op.chofer.nombre}`,
      idChofer: op.chofer.idChofer,
      categoria: this.getCategoria(op),
      patente: op.patenteChofer,
      acompaniante: op.acompaniante ? 'Sí' : 'No',
      tarifa: op.tarifaTipo.especial ? "Especial" :
              op.tarifaTipo.eventual ? "Eventual" :
              op.tarifaTipo.personalizada ? "Personalizada" : "General",
      aCobrar: this.formatearValor(op.valores.cliente.aCobrar),
      aPagar: this.formatearValor(op.valores.chofer.aPagar),
      hojaRuta: op.hojaRuta,
      proveedor: this.getProveedor(op.chofer.idProveedor),
      observaciones: op.observaciones,
    }));

    this.clientesEnPeriodo = this.obtenerClientesFiltrados(this.$opFiltradas);
    this.choferesEnPeriodo = this.obtenerChoferesFiltrados(this.$opFiltradas);
  }

  private obtenerClientesFiltrados(operaciones: ConId<Operacion>[]): ConIdType<Cliente>[] {
    const idsClientes = new Set(operaciones.map(op => op.cliente.idCliente));
    return this.$clientes.filter(c => idsClientes.has(c.idCliente));
  }

  private obtenerChoferesFiltrados(operaciones: ConId<Operacion>[]): ConIdType<Chofer>[] {
    const idsChoferes = new Set(operaciones.map(op => op.chofer.idChofer));
    return this.$choferes.filter(c => idsChoferes.has(c.idChofer));
  }


  filtrarPorCliente(cliente: ConIdType<Cliente>) {
    this.clienteSeleccionado = cliente;
    this.guardarEstadoFiltros(); // <<<< guardar estado
    const currentFilters = this.gridApi.getFilterModel();

    // Establecer jerarquía si no hay filtro principal aún
    if (!this.filtroPrincipal) {
      this.filtroPrincipal = 'cliente';
    }

    // Si cliente es principal y ya hay un chofer seleccionado, eliminar temporalmente el filtro de chofer
    //
    if (this.choferSeleccionado && this.filtroPrincipal === 'cliente') {
      //filtroTemporalChofer = currentFilters['chofer'];
      delete currentFilters['chofer'];
      this.choferSeleccionado = null;
    }

    // Aplicar filtro de cliente
    currentFilters['cliente'] = { type: 'equals', filter: cliente.razonSocial };
    this.gridApi.setFilterModel(currentFilters);
    this.gridApi.onFilterChanged();

    // Solo actualizar listado de choferes si el cliente es el filtro principal
    if (this.filtroPrincipal === 'cliente') {
      const visibles = this.getFilasVisibles();
      this.choferesEnPeriodo = this.filtrarChoferesDesdeFilas(visibles);
    }

  }


  filtrarPorChofer(chofer: ConIdType<Chofer>) {
    this.choferSeleccionado = chofer;
    this.guardarEstadoFiltros(); // <<<< guardar estado
  
    const currentFilters = this.gridApi.getFilterModel();

    // Establecer jerarquía si no hay filtro principal aún
    if (!this.filtroPrincipal) {
      this.filtroPrincipal = 'chofer';
    }

    // Si chofer es principal y ya hay un cliente seleccionado, eliminar temporalmente el filtro de cliente
    //let filtroTemporalCliente: any = null;
    if (this.clienteSeleccionado && this.filtroPrincipal === 'chofer') {
      //filtroTemporalCliente = currentFilters['cliente'];
      delete currentFilters['cliente'];
      this.clienteSeleccionado = null;
    }

    // Aplicar filtro de chofer
    currentFilters['chofer'] = {
      type: 'equals',
      filter: `${chofer.apellido} ${chofer.nombre}`,
    };
    this.gridApi.setFilterModel(currentFilters);
    this.gridApi.onFilterChanged();

    // Solo actualizar listado de clientes si chofer es el filtro principal
    if (this.filtroPrincipal === 'chofer') {
      const visibles = this.getFilasVisibles();
      this.clientesEnPeriodo = this.filtrarClientesDesdeFilas(visibles);
    }

  }



  private getFilasVisibles(): any[] {
    const visibles: any[] = [];
    if (!this.gridApi) return visibles;

    for (let i = 0; i < this.gridApi.getDisplayedRowCount(); i++) {
      const node = this.gridApi.getDisplayedRowAtIndex(i);
      if (node?.data) visibles.push(node.data);
    }

    return visibles;
  }

  private actualizarEstadoFiltrado(): void {
    this.totalFiltrado = this.gridApi.getDisplayedRowCount();
    const visibleRows: any[] = [];

    for (let i = 0; i < this.gridApi.getDisplayedRowCount(); i++) {
      const rowNode = this.gridApi.getDisplayedRowAtIndex(i);
      if (rowNode?.data) {
        visibleRows.push(rowNode.data);
      }
    }
    //this.clientesEnPeriodo = this.filtrarClientesDesdeFilas(visibleRows);
    //this.choferesEnPeriodo = this.filtrarChoferesDesdeFilas(visibleRows);
    this.actualizarDropdowns();
  }

/*   private actualizarDropdowns(visibleRows: any[]): void {
    // Solo regenerar los dropdowns si NO hay selecciones cruzadas
    if (!this.clienteSeleccionado) {
      this.clientesEnPeriodo = this.filtrarClientesDesdeFilas(visibleRows);
    }
    if (!this.choferSeleccionado) {
      this.choferesEnPeriodo = this.filtrarChoferesDesdeFilas(visibleRows);
    }
  } */
private actualizarDropdowns(): void {
  if (!this.gridApi) return;

  const allData = this.$opFiltradas; // operaciones filtradas por periodo
  let baseData: any[] = [];

  const model = this.gridApi.getFilterModel();

  // Si no hay filtros, usar todas las del periodo
  if (!model || Object.keys(model).length === 0) {
    baseData = [...allData];
  } else if (this.filtroPrincipal === 'cliente' && this.clienteSeleccionado) {
    baseData = allData.filter(op => op.cliente.idCliente === this.clienteSeleccionado?.idCliente);
  } else if (this.filtroPrincipal === 'chofer' && this.choferSeleccionado) {
    baseData = allData.filter(op => op.chofer.idChofer === this.choferSeleccionado?.idChofer);
  } else {
    // fallback: usar lo visible en la tabla
    for (let i = 0; i < this.gridApi.getDisplayedRowCount(); i++) {
      const rowNode = this.gridApi.getDisplayedRowAtIndex(i);
      if (rowNode?.data) {
        baseData.push(rowNode.data);
      }
    }
  }
  //console.log("baseData", baseData);
  

  // Actualizar dropdowns según jerarquía
  if (!this.filtroPrincipal) {
    this.clientesEnPeriodo = this.obtenerClientesFiltrados(baseData);
    this.choferesEnPeriodo = this.obtenerChoferesFiltrados(baseData);
  } else if (this.filtroPrincipal === 'cliente') {
    this.choferesEnPeriodo = this.obtenerChoferesFiltrados(baseData);
  } else if (this.filtroPrincipal === 'chofer') {
    this.clientesEnPeriodo = this.obtenerClientesFiltrados(baseData);
  }
}








  limpiarFiltrosCruzados(): void {
    this.clienteSeleccionado = null;
    this.choferSeleccionado = null;
    this.filtroPrincipal = null;

    if (!this.gridApi) return;

    const currentFilters = this.gridApi.getFilterModel();

    delete currentFilters['cliente'];
    delete currentFilters['chofer'];

    this.gridApi.setFilterModel(currentFilters);
    this.gridApi.onFilterChanged();

    const visibles = this.getFilasVisibles();
    this.actualizarDropdowns();
  }

  
  getCategoria(op: Operacion): string {
    const vehiculo = op.chofer.vehiculo.find(v => v.dominio === op.patenteChofer);
    return vehiculo?.categoria.nombre ?? 'Sin categoría';
  }

  formatearValor(valor: number): string {
    return `$${new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor)}`;
  }

  getProveedor(idProveedor: number): string {
    if (!this.$proveedores || idProveedor === 0) return 'No';
    const proveedor = this.$proveedores.find(p => p.idProveedor === idProveedor);
    return proveedor?.razonSocial ?? 'Proveedor dado de baja';
  }

  // Renderers

  estadoRenderer(params: any): HTMLElement {
    const span = document.createElement('span');
    span.innerText = params.value;

    const clasesEstado: Record<string, string> = {
      'Abierta': 'estado-abierta',
      'Cerrada': 'estado-cerrada',
      'Cliente Fac': 'estado-facCliente',
      'Chofer Fac': 'estado-facChofer',
      'Facturada': 'estado-facturada',
      'Proforma': 'estado-proforma'
    };

    span.className = clasesEstado[params.value] ?? '';
    return span;
  }

  accionesRenderer(params: any): HTMLElement {
    const estado = params.data.estado;
    const container = document.createElement('div');

    const botones = [
      { name: 'Detalle', handler: () => this.abrirVista(params.data) },
      { name: 'Editar', handler: () => this.abrirEdicion(params.data), disabled: estado !== 'Abierta' },
      { name: 'Eliminar', handler: () => this.eliminarOperacion(params.data), disabled: estado !== 'Abierta' },
      { name: 'Factura', handler: () => this.crearFacturaOp(params.data), disabled: estado !== 'Abierta' }
    ];

    botones.forEach(b => {
      const btn = document.createElement('button');
      btn.innerText = b.name;
      btn.className = `btn btn-sm mx-1 ${b.disabled ? 'isDisabled' : ''}`;
      btn.disabled = !!b.disabled;
      btn.addEventListener('click', b.handler);
      container.appendChild(btn);
    });

    return container;
  }

  onFirstDataRendered(): void {
  // Opcional: aplicar estilos adicionales al header si querés
  const header = document.querySelector('.ag-header') as HTMLElement;
  /* if (header) {
    header.classList.add('sticky-top'); // Solo si usás Bootstrap
  } */
}

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
    this.seleccionarOp(op);    
    this.openModal("cerrar");
    //this.opCerrada = this.detalleOp;
  }

  openModal(modo: string){
    {
      const modalRef = this.modalService.open(ModalResumenOpComponent, {
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

    async openModalBaja(idOp:number){
      {
        const modalRef = this.modalService.open(ModalBajaComponent, {
          windowClass: 'myCustomModalClass',
          centered: true,
          scrollable: true, 
          size: 'sm',     
        });   
        
        let operacion:ConId<Operacion> [] = this.$opActivas.filter(o => o.idOperacion === idOp);
  
        let info = {
          modo: "operaciones",
          item: operacion[0]
        }  
        ////////////console.log()(info); */
        
        modalRef.componentInstance.fromParent = info;
        try {
          const motivo = await modalRef.result;
          if(!motivo) return
          await this.tableroServ.anularOperacionYActualizarTablero(operacion[0], motivo, 'Baja de operación desde el tablero-op');
          Swal.fire({
            icon: 'success',
            title: 'Operación eliminada',
            text: 'La operación fue dada de baja y se actualizó el tablero.'
          });

        } catch (e) {
          console.warn("El modal fue cancelado o falló:", e);
        }

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

    descargarOp(){
        this.excelServ.generarInformeOperaciones(this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta,this.$opFiltradas)
    }

    getMsg(e:any) {
        this.btnConsulta = e
        //////////console.log("getMsg: ", this.btnConsulta);                  
        if(this.btnConsulta){          
          this.consultarOp();            
        }
    }
     
    toogleAjustes(){      
      this.ajustes = !this.ajustes;
    }

 // NUEVO: Guarda el filtro en localStorage
  onFilterChanged(): void {
    if (!this.gridApi) return;

    // ✅ Actualiza el contador
    this.totalFiltrado = this.gridApi.getDisplayedRowCount();

    // ✅ Extrae filas visibles
    const visibleRows: any[] = [];

    for (let i = 0; i < this.gridApi.getDisplayedRowCount(); i++) {
      const rowNode = this.gridApi.getDisplayedRowAtIndex(i);
      if (rowNode?.data) {
        visibleRows.push(rowNode.data);
      }
    }

    // ✅ Reemplazamos por la función que respeta reglas
    this.actualizarDropdowns();

    // ✅ Guarda filtro para persistencia
    const model = this.gridApi.getFilterModel();
    localStorage.setItem('filtrosTableroOp', JSON.stringify(model));
  }


  private filtrarClientesDesdeFilas(filas: any[]): ConIdType<Cliente>[] {
    const idsClientes = new Set(filas.map(f => f.idCliente));
    return this.$clientes.filter(c => idsClientes.has(c.idCliente));
  }

  private filtrarChoferesDesdeFilas(filas: any[]): ConIdType<Chofer>[] {
    const idsChoferes = new Set(filas.map(f => f.idChofer));
    return this.$choferes.filter(c => idsChoferes.has(c.idChofer));
  }

  limpiarFiltros(): void {
    this.clienteSeleccionado = null;
    this.choferSeleccionado = null;
    this.filtroPrincipal = null;
    if (this.gridApi) {
      this.gridApi.setFilterModel(null);
      this.gridApi.onFilterChanged();
      localStorage.removeItem('filtrosTableroOp');
    }      
  }

  private guardarEstadoFiltros() {
  const estado = {
    clienteId: this.clienteSeleccionado?.idCliente || null,
    choferId: this.choferSeleccionado?.idChofer || null,
    filtroPrincipal: this.filtroPrincipal || null
  };
  localStorage.setItem('estadoFiltrosTableroOp', JSON.stringify(estado));
}

  private restaurarEstadoFiltros() {
    const estadoRaw = localStorage.getItem('estadoFiltrosTableroOp');
    if (!estadoRaw) return;

    try {
    const estado = JSON.parse(estadoRaw);

    // Restaurar filtro principal
    this.filtroPrincipal = estado.filtroPrincipal;

    // Restaurar cliente
    if (estado.clienteId) {
      this.clienteSeleccionado = this.$clientes.find(c => c.idCliente === estado.clienteId) || null;
    }

    // Restaurar chofer
    if (estado.choferId) {
      this.choferSeleccionado = this.$choferes.find(c => c.idChofer === estado.choferId) || null;
    }

    // Aplicar los filtros guardados en ag-grid
    setTimeout(() => {
      const currentFilters = this.gridApi?.getFilterModel() || {};

      if (this.clienteSeleccionado) {
        currentFilters['cliente'] = { type: 'equals', filter: this.clienteSeleccionado.razonSocial };
      }
      if (this.choferSeleccionado) {
        currentFilters['chofer'] = { type: 'equals', filter: `${this.choferSeleccionado.apellido} ${this.choferSeleccionado.nombre}` };
      }

        this.gridApi?.setFilterModel(currentFilters);
        this.gridApi?.onFilterChanged();
        this.actualizarDropdowns(); // reconstruir listados
    }, 0);

    } catch (e) {
      console.error('Error restaurando estado de filtros', e);
    }
  }

////////////////////////////////////////////////MÉTODOS PARA PRUEBAS Y CORRECCION DE ERRORES///////////////////////////
  consultarOp(){
    const modoStorage = this.storageService.loadInfo("filtroOp");
    //////console.log("ngOnInit: modoStorage ", modoStorage);
    
    /* if (modoStorage) {
      modoStorage.forEach((key: string) => {
        this.estadoSeleccionado[key] = true;
      });
    } */

    //this.aplicarFiltros();
    //////////console.log("2)aca??: ");            
    this.storageService.respuestaOp$
      .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
      .subscribe(data => {
        if(data){
          //////////console.log("respuestaOp data: ", data);
          
          this.respuestaOp = data
          this.fechasConsulta = this.respuestaOp[0].fechas;
          ////////console.log("fechasConsulta: ", this.fechasConsulta);
          //this.rango = this.respuestaOp[0].rango ////ESTO NO SE SI SIGUE APLICANDO
          ////////console.log("rango: ", this.rango);
          this.storageService.syncChangesDateValue<Operacion>(this.titulo, "fecha", this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta, 'desc');
          //this.storageService.listenForChangesDate<Operacion>(this.titulo, "fecha", this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta, 'desc');
          //this.aplicarFiltros()   ////ESTO NO SE SI SIGUE APLICANDO 
        }
        ////////////console.log("TABLERO OP: fechas consulta: ",this.fechasConsulta);      
        //this.getMsg()
    });
  }

  editarObjeto(){
    ////console.log("1)this.opActivas", this.$opActivas);
    //this.objetoEditado= this.editarCampo(this.$opActivas);        
    this.objetoEditado= this.$opActivas;
    //console.log("2)this.objetoEditado", this.objetoEditado);
  }

  razonZocial(op:any):string{
    return "Andesmar"
  }

  editarCampo(operaciones: any[]): ConId<Operacion>[] {
   return operaciones.map(operacion => {
        operacion.cliente.razonSocial = "Andesmar Cargas SA";
        return operacion
    });
  }

  actualizarObjeto(){
    this.isLoading = true
    this.dbFirebase.actualizarOperacionesBatch(this.objetoEditado, "operaciones").then((result)=>{
      this.isLoading = false
      if(result.exito){
        alert("actualizado correctamente")
      } else {
        alert(`error actualizando. errr: ${result.mensaje}`)
      }
    })
  }

  eliminarObjeto(){
    this.isLoading = true
    this.dbFirebase.eliminarMultiple(this.objetoEditado, "operaciones").then((result)=>{
      this.isLoading = false
      if(result.exito){
        alert("actualizado correctamente")
      } else {
        alert(`error actualizando. errr: ${result.mensaje}`)
      }
    })
  }



}
