import { Component, OnDestroy, OnInit } from '@angular/core';
import { filter, Subject, takeUntil } from 'rxjs';
import { ConId } from 'src/app/interfaces/conId';
import { Operacion } from 'src/app/interfaces/operacion';
import { Cliente } from 'src/app/interfaces/cliente';
import { Chofer } from 'src/app/interfaces/chofer';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { DateRange, DateRangeService, toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalResumenOpComponent } from '../modal-resumen-op/modal-resumen-op.component';
import { ModalOpAltaComponent } from '../modal-op-alta/modal-op-alta.component';
import { CargaMultipleComponent } from '../carga-multiple/carga-multiple.component';
import { BajaObjetoComponent } from 'src/app/shared/modales/baja-objeto/baja-objeto.component';
import { TableroService } from 'src/app/servicios/tablero/tablero.service';
import Swal from 'sweetalert2';
import { FormatoNumericoService } from 'src/app/servicios/formato-numerico/formato-numerico.service';

// =====================
// MODELOS
// =====================
interface OpRow {
  indice: number;
  fecha: string;
  estado: string;
  idOperacion: number;
  cliente: string;
  idCliente: number;
  chofer: string;
  idChofer: number;
  categoria: string;
  patente: string;
  acompaniante: string;
  tarifa: string;
  aCobrar: string;      // formateado
  aPagar: string;       // formateado
  aCobrarNum: number;   // numérico real
  aPagarNum: number;    // numérico real
  hojaRuta: string | number | null;
  proveedor: string;
  observaciones: string | null;
  _raw: ConId<Operacion>;
  [key: string]: any;
}
interface FiltrosState {
  textoGlobal: string | null;
  columnas: Record<string,string>;
  clienteId: number | null;
  choferId: number | null;
  principal: 'cliente'|'chofer'|null;
  sortCampo: string | null;
  sortDir: 'asc'|'desc'|null;
}



// =====================
// COMPONENTE
// =====================

@Component({
  selector: 'app-tablero-op-v2',
  standalone: false,
  templateUrl: './tablero-op-v2.component.html',
  styleUrls: ['./tablero-op-v2.component.scss'],
})
export class TableroOpV2Component implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  operacionesPeriodo: ConId<Operacion>[] = [];
  operacionesVista: OpRow[] = [];

  columnasDisponibles = [
    'estado','fecha','idOperacion','cliente','chofer','categoria','patente',
    'acompaniante','tarifa','aCobrar','aPagar','hojaRuta','proveedor','observaciones'
  ];

  columnasVisibles: string[] = [];

  filtros: FiltrosState = {
    textoGlobal: null,
    columnas: {},
    clienteId: null,
    choferId: null,
    principal: null,
    sortCampo: null,
    sortDir: null
  };

  clientesDropdown: any[] = [];
  choferesDropdown: any[] = [];

  clienteSeleccionado: number | null = null;
  choferSeleccionado: number | null = null;

  private readonly STORAGE_FILTROS_KEY = 'tablero_op_filtros_v2';
  private STORAGE_RANGE_KEY = 'tablero_op_range_v1';

  // UI estado
  columnasDropdownOpen = false;


  isLoading = false;

  // catálogos
  clientes: ConId<Cliente>[] = [];
  choferes: ConId<Chofer>[] = [];
  proveedores: ConId<Proveedor>[] = [];

  constructor(
    private storage: StorageService,
    private dateRange: DateRangeService,
    private modal: NgbModal,
    private tableroServ: TableroService,
    private formatoNum: FormatoNumericoService
  ) {}

  // =====================
  // INIT
  // =====================

  ngOnInit(): void {

    this.cargarColumnasVisibles();
    this.cargarFiltrosDeStorage();
    this.restaurarRangoPropio(); 

    this.choferes = this.storage.loadInfo('choferes');
    this.choferes = this.choferes.sort((a, b) => a.apellido.localeCompare(b.apellido)); // Ordena por el nombre del chofer
    this.clientes = this.storage.loadInfo('clientes');
    this.clientes = this.clientes.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
    this.proveedores = this.storage.loadInfo('proveedores');
    this.proveedores = this.proveedores.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer

    this.dateRange.range$
      .pipe(
        filter((r): r is DateRange => r !== null),
        takeUntil(this.destroy$))
      .subscribe(r => {
        this.isLoading = true;
         localStorage.setItem(
          this.STORAGE_RANGE_KEY,
          JSON.stringify({
            desde: r.desde.toISOString(),
            hasta: r.hasta.toISOString(),
            tipo: r.tipo
          })
        );
        const desde = toISODateString(r.desde);
        const hasta = toISODateString(r.hasta);

        this.isLoading = true;
        this.storage.syncChangesDateValue('operaciones','fecha',desde,hasta,'desc');
        this.escucharOperaciones();
      });
      
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  escucharOperaciones() {
    this.storage.getObservable<ConId<Operacion>>('operaciones')
      .pipe(takeUntil(this.destroy$))
      .subscribe(ops => {
        this.operacionesPeriodo = ops;
        this.rebuildDropdownsBase();
        this.syncFiltroLabels();   // 👈 importante
        this.aplicarFiltros();
        this.isLoading = false;
      });
  }

  private restaurarRangoPropio() {
    const s = localStorage.getItem(this.STORAGE_RANGE_KEY);
    if (!s) return;

    const r = JSON.parse(s);

    this.dateRange.setRange({
      desde: new Date(r.desde),
      hasta: new Date(r.hasta),
      tipo: r.tipo
    });
  }

// ===================== MAPEO =====================

  private mapOp(op: ConId<Operacion>, i:number): OpRow {
    const aCobrarNum = op.valores.cliente.aCobrar ?? 0;
    const aPagarNum  = op.valores.chofer.aPagar ?? 0;

    return {
      indice: i+1,
      fecha: op.fecha,
      estado:
        op.estado.abierta ? 'Abierta' :
        op.estado.cerrada ? 'Cerrada' :
        (op.estado.proformaCl || op.estado.proformaCh) ? 'Proforma' :
        op.estado.facCliente ? 'Cliente Fac' :
        op.estado.facChofer ? 'Chofer Fac' :
        op.estado.facturada ? 'Facturada' : 'Sin datos',
      idOperacion: op.idOperacion,
      cliente: op.cliente.razonSocial,
      idCliente: op.cliente.idCliente,
      chofer: `${op.chofer.apellido} ${op.chofer.nombre}`,
      idChofer: op.chofer.idChofer,
      categoria: this.getCategoria(op),
      patente: op.patenteChofer,
      acompaniante: op.acompaniante ? 'Sí':'No',
      tarifa: this.getTarifa(op),
      aCobrar: `$${this.formatoNum.convertirAValorFormateado(aCobrarNum)}`,
      aPagar: `$${this.formatoNum.convertirAValorFormateado(aPagarNum)}`,
      aCobrarNum,
      aPagarNum,
      hojaRuta: op.hojaRuta,
      proveedor: String(op.chofer.idProveedor ?? ''),
      observaciones: op.observaciones,
      _raw: op
    };
  }

 // ===================== FILTROS =====================

  aplicarFiltros() {
    let data = this.operacionesPeriodo.map((o,i)=>this.mapOp(o,i));

    if (this.filtros.clienteId) {
      data = data.filter(r=>r.idCliente === this.filtros.clienteId);
    }

    if (this.filtros.choferId) {
      data = data.filter(r=>r.idChofer === this.filtros.choferId);
    }

    for (const c in this.filtros.columnas) {
      const v = this.filtros.columnas[c];
      if (!v) continue;

      if (c === 'aCobrar') {
        const num = Number(v.replace(',', '.'));
        if (!isNaN(num)) {
          data = data.filter(r => r.aCobrarNum === num);
          continue;
        }
      }

      if (c === 'aPagar') {
        const num = Number(v.replace(',', '.'));
        if (!isNaN(num)) {
          data = data.filter(r => r.aPagarNum === num);
          continue;
        }
      }

      data = data.filter(r =>
        String(r[c]).toLowerCase().includes(v.toLowerCase())
      );
    }

    if (this.filtros.textoGlobal) {
      const t = this.filtros.textoGlobal.toLowerCase();
      data = data.filter(r =>
        Object.values(r).some(v =>
          String(v).toLowerCase().includes(t)
        )
      );
    }

    if (this.filtros.sortCampo) {
      const c = this.filtros.sortCampo;
      const d = this.filtros.sortDir === 'asc' ? 1 : -1;

      data.sort((a,b)=>{

        if (c === 'aCobrar') return (a.aCobrarNum - b.aCobrarNum) * d;
        if (c === 'aPagar')  return (a.aPagarNum  - b.aPagarNum)  * d;

        const v1 = a[c];
        const v2 = b[c];
        if (v1==null) return 1;
        if (v2==null) return -1;
        if (v1>v2) return d;
        if (v1<v2) return -d;
        return 0;
      });
    }

    this.operacionesVista = data;
    this.rebuildDropdownsDesdeFiltradas();
    this.guardarFiltrosEnStorage();
  }

  private guardarFiltrosEnStorage() {
    const data = {
      filtros: this.filtros,
      clienteSeleccionado: this.clienteSeleccionado,
      choferSeleccionado: this.choferSeleccionado
    };

    localStorage.setItem(
      this.STORAGE_FILTROS_KEY,
      JSON.stringify(data)
    );
  }

  private cargarFiltrosDeStorage() {
    const s = localStorage.getItem(this.STORAGE_FILTROS_KEY);
    if (!s) return;

    try {
      const data = JSON.parse(s);

      this.filtros = {
        ...this.filtros,
        ...data.filtros
      };

      this.clienteSeleccionado = data.clienteSeleccionado ?? null;
      this.choferSeleccionado = data.choferSeleccionado ?? null;

    } catch {
      localStorage.removeItem(this.STORAGE_FILTROS_KEY);
    }
  }

  limpiarFiltrosTotales() {

    this.filtros = {
      textoGlobal: null,
      columnas: {},
      clienteId: null,
      choferId: null,
      principal: null,
      sortCampo: null,
      sortDir: null
    };

    this.clienteSeleccionado = null;
    this.choferSeleccionado = null;

    localStorage.removeItem(this.STORAGE_FILTROS_KEY);

    this.rebuildDropdownsBase();
    this.aplicarFiltros();
  }

  onFiltroColumna(col:string, val:string) {
    if (val) this.filtros.columnas[col] = val;
    else delete this.filtros.columnas[col];

    this.aplicarFiltros();
  }

  private syncFiltroLabels() {

    if (this.filtros.clienteId) {
      this.clienteSeleccionado =
        this.clientesDropdown.find(c =>
          c.idCliente === this.filtros.clienteId
        ) ?? null;
    }

    if (this.filtros.choferId) {
      this.choferSeleccionado =
        this.choferesDropdown.find(c =>
          c.idChofer === this.filtros.choferId
        ) ?? null;
    }
  }




  // ===================== SORT =====================

  sortBy(col:string) {
    if (this.filtros.sortCampo !== col) {
      this.filtros.sortCampo = col;
      this.filtros.sortDir = 'asc';
    } else if (this.filtros.sortDir === 'asc') {
      this.filtros.sortDir = 'desc';
    } else {
      this.filtros.sortCampo = null;
      this.filtros.sortDir = null;
    }
    this.aplicarFiltros();
  }


// ===================== COLUMNAS UI =====================

  toggleColumnasDropdown() {
    this.columnasDropdownOpen = !this.columnasDropdownOpen;
  }

  isColVisible(c:string) {
    return this.columnasVisibles.includes(c);
  }

  toggleCol(c:string) {
    const i = this.columnasVisibles.indexOf(c);
    if (i>=0) this.columnasVisibles.splice(i,1);
    else this.columnasVisibles.push(c);
    localStorage.setItem('op_cols', JSON.stringify(this.columnasVisibles));
  }

  private cargarColumnasVisibles() {
    const s = localStorage.getItem('op_cols');
    this.columnasVisibles = s ? JSON.parse(s) : [
      'estado','fecha','cliente','chofer','categoria','aCobrar','aPagar','hojaRuta','observaciones'
    ];
  }

  // ===================== ANCHOS =====================


  getColWidth(col:string): string | null {
    const map: Record<string,string> = {
    estado: '9rem',
    fecha: '11rem',
    cliente: '15rem',
    chofer: '15rem',
    idOperacion: '12rem',
    categoria: '12rem',
    hojaRuta: '12rem',
    aCobrar: '12rem',
    aPagar: '12rem',
    observaciones: '12rem'
    };
    return map[col] ?? null;
  }


  // ===================== FILTROS CRUZADOS UI =====================

  seleccionarCliente(id:number|null) {
    this.clienteSeleccionado = id;
    this.filtros.clienteId = id;
    if (id) this.filtros.principal = 'cliente';
    this.aplicarFiltros();
  }

  seleccionarChofer(id:number|null) {
    this.choferSeleccionado = id;
    this.filtros.choferId = id;
    if (id) this.filtros.principal = 'chofer';
    this.aplicarFiltros();
  }

  limpiarFiltrosCruzados() {
    this.clienteSeleccionado = null;
    this.choferSeleccionado = null;
    this.filtros.clienteId = null;
    this.filtros.choferId = null;
    this.filtros.principal = null;
    this.rebuildDropdownsBase();
    this.aplicarFiltros();
  }

  private rebuildDropdownsBase() {
    const mapC = new Map<number,string>();
    const mapCh = new Map<number,string>();

    for (const o of this.operacionesPeriodo) {
      mapC.set(o.cliente.idCliente, o.cliente.razonSocial);
      mapCh.set(o.chofer.idChofer, `${o.chofer.apellido} ${o.chofer.nombre}`);
    }

    this.clientesDropdown = [...mapC.entries()].map(([id,n])=>({id,n}));
    this.choferesDropdown = [...mapCh.entries()].map(([id,n])=>({id,n}));
  }

  private rebuildDropdownsDesdeFiltradas() {
    if (this.filtros.principal === 'cliente' && this.filtros.clienteId) {
      const set = new Map<number,string>();
      for (const r of this.operacionesVista) {
        set.set(r.idChofer, r.chofer);
      }
      this.choferesDropdown = [...set.entries()].map(([id,n])=>({id,n}));
    }

    if (this.filtros.principal === 'chofer' && this.filtros.choferId) {
      const set = new Map<number,string>();
      for (const r of this.operacionesVista) {
        set.set(r.idCliente, r.cliente);
      }
      this.clientesDropdown = [...set.entries()].map(([id,n])=>({id,n}));
    }
  }



  // ===================== BADGES ESTADO =====================

  getEstadoBadgeClass(estado:string) {
    switch (estado) {
      case 'Abierta': return 'badge bg-success';
      case 'Cerrada': return 'badge bg-danger';
      case 'Proforma': return 'badge bg-warning text-dark';
      case 'Cliente Fac': return 'badge bg-info text-dark';
      case 'Chofer Fac': return 'badge bg-light text-dark';
      case 'Facturada': return 'badge bg-primary';
      default: return 'badge bg-light text-secondary';
    }
  }

  // ===================== HEADERS LABEL =====================

  headerLabel(col:string): string {
    const map: Record<string,string> = {
      aCobrar: 'A Cobrar',
      aPagar: 'A Pagar',
      hojaRuta: 'Hoja Ruta'
    };

    if (map[col]) return map[col];
    return col.charAt(0).toUpperCase() + col.slice(1);
  }

  // ===================== HELPERS =====================

  getCategoria(op: Operacion): string {
    const vehiculo = op.chofer.vehiculo.find(v => v.dominio === op.patenteChofer);
    return vehiculo?.categoria.nombre ?? 'Sin categoría';
  }

  getTarifa(op:Operacion) {
    if (op.tarifaTipo.especial) return 'Especial';
    if (op.tarifaTipo.eventual) return 'Eventual';
    if (op.tarifaTipo.personalizada) return 'Personalizada';
    return 'General';
  }

  // ===================== ACCIONES =====================

  verDetalle(row: OpRow) {
  // emitir evento o abrir modal
  console.log('detalle', row._raw);
  }

  editar(row: OpRow) {
    console.log('editar', row._raw);
  }

  cerrar(row: OpRow) {
    console.log('cerrar', row._raw);
  }

  eliminar(row: OpRow) {
    console.log('eliminar', row._raw.id);
  }

}
