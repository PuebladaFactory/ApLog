import { Component, OnDestroy, OnInit, TemplateRef } from '@angular/core';
import { Subject, Subscription, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import Swal from 'sweetalert2';

import { ModalObjetosActivosComponent } from 'src/app/raiz/operaciones/modal-objetos-activos/modal-objetos-activos.component';
import { sumarDias } from 'src/app/shared/utils/fecha.util';
import { describirMotivos, idDeSujeto, unirMotivos } from 'src/app/shared/utils/vigencia-no-disponibilidad.util';
import { preguntarFormatoDescarga } from 'src/app/shared/utils/preguntar-descarga.util';

import { Asignacion, AsignacionItem, AsignacionRef, SujetoAsignacion } from 'src/app/interfaces/asignacion';
import { Categoria, Vehiculo, Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConIdType } from 'src/app/interfaces/conId';
import { NoDisponibilidadChofer } from 'src/app/interfaces/no-disponibilidad-chofer';
import { ConsultaSujeto, MotivoNoDisponible } from 'src/app/interfaces/no-disponibilidad';

import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { AsignacionService } from 'src/app/servicios/operaciones/asignacion.service';
import { AsignacionesExportService } from 'src/app/servicios/operaciones/asignaciones-export.service';
import { OperacionService, OperacionCreada, ResultadoCreacionOps, ErrorCreacionOp } from 'src/app/servicios/operaciones/operacion.service';
import { OperacionesEditorComponent } from 'src/app/raiz/operaciones/operaciones-editor/operaciones-editor.component';
import { DisponibilidadService } from 'src/app/servicios/no-disponibilidad/disponibilidad.service';
import { NoDisponibilidadService } from 'src/app/servicios/no-disponibilidad/no-disponibilidad.service';
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
import { ModalNoDisponibilidadComponent } from '../modal-no-disponibilidad/modal-no-disponibilidad.component';

interface VehiculoPool {
  idVehiculo: string;
  dominio: string;
  categoria: Categoria;
  asignadoA: AsignacionRef['asignadoA'];
}

interface GrupoCategoriaPool {
  catOrden: number;
  nombre: string;
  vehiculos: VehiculoPool[];
}

interface EstiloCategoria {
  clase: string;
  estilo: { [k: string]: string };
}

@Component({
  selector: 'app-tablero-asignaciones',
  templateUrl: './tablero-asignaciones.component.html',
  styleUrls: ['./tablero-asignaciones.component.scss'],
  standalone: false,
})
export class TableroAsignacionesComponent implements OnInit, OnDestroy {

  // ---- Estado de carga / modo ----
  modo: 'edicion' | 'visor' = 'edicion';
  tablero: Asignacion | null = null;
  itemsBorrador: AsignacionItem[] = [];
  borradorSucio = false;
  private clientesActivos: ConIdType<Cliente>[] = [];
  private visorSub: Subscription | null = null;  // suscripción del listener (modo visor)

  // ---- item en edición (modal de observación / hoja de ruta) ----
  itemEnEdicion: AsignacionItem | null = null;
  edicionObservacion = '';
  edicionHojaDeRuta = '';

  // ---- Navegación de fecha ----
  fechaSeleccionada = '';
  fechaAnterior: string | null = null;

  // ---- Pool de vehículos ----
  gruposPool: GrupoCategoriaPool[] = [];

  // Lista ordenada de categorías del sistema, construida desde la tarifa general.
  // Es la fuente de verdad para el agrupamiento y el color del pool.
  categoriasOrdenadas: { catOrden: number; nombre: string }[] = [];

  sectionColorClasses: string[] = [
    'bg-primary text-white',
    'bg-success text-white',
    'bg-warning text-dark',
    'bg-info text-dark',
    'bg-danger text-white',
    'bg-secondary text-white',
    'bg-dark text-white',
  ];

  // ---- No disponibilidad ----
  // Memo de la resolución por sujeto para la fecha del tablero: el template
  // pregunta por cada tarjeta e ítem en cada ciclo. Se vacía al cambiar de
  // fecha o al llegar datos nuevos (no disponibilidades, choferes, vehículos).
  private memoDisponibilidad = new Map<string, MotivoNoDisponible[]>();
  private memoFecha = '';

  // ---- RxJS ----
  destroy$ = new Subject<void>();
  isLoading = false;

  constructor(
    private choferService: ChoferService,
    private proveedorService: ProveedorService,
    private clienteService: ClienteService,
    private asignacionService: AsignacionService,
    private asignacionesExport: AsignacionesExportService,
    private operacionService: OperacionService,
    private disponibilidadService: DisponibilidadService,
    private noDisponibilidadService: NoDisponibilidadService,
    private tarifarioService: TarifarioService,
    private modal: NgbModal,
  ) {}

  ngOnInit(): void {
    // Categorías desde la tarifa General del sistema nuevo (Tarifario) — la General
    // tiene siempre 1 sola sección (invariante del motor de cálculo, Bloque 6).
    const tarifaGeneral = this.tarifarioService.getTarifaGeneralVigente();
    if (tarifaGeneral?.secciones?.[0]) {
      this.categoriasOrdenadas = [...tarifaGeneral.secciones[0].categorias]
        .sort((a, b) => a.orden - b.orden)
        .map(cat => ({ catOrden: cat.orden, nombre: cat.nombre }));
    }

    const enCurso = this.asignacionService.getBorradorEnCurso();
    if (enCurso) {
      // CASO LOCAL no guardado: el borrador no está en Firestore, se rehidrata de memoria.
      this.fechaSeleccionada = enCurso.fecha;
      this.fechaAnterior    = enCurso.fecha;
      this.itemsBorrador    = enCurso.items;
      this.modo             = 'edicion';
      this.borradorSucio    = true;
      this.tablero          = null;
      this.invalidarDisponibilidad();
    } else {
      // NO hay borrador local. ¿Había una fecha vista (persistido o alta)?
      const ultima = this.asignacionService.getUltimaFechaVista();
      if (ultima) {
        this.fechaSeleccionada = ultima;
        this.fechaAnterior    = ultima;
        this.cargarTablero(ultima); // reconstruye modo/tablero/badges/sucio desde Firestore
      }
      // si no hay ninguna de las dos → arranca sin fecha (flujo normal), como hoy.
    }

    // Clientes activos: base para clientesVisibles (getter derivado).
    this.clienteService.getActivos()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.clientesActivos = [...data];
      });

    // Pool reactivo: se recompone cuando cambian vehículos, choferes o proveedores.
    // Usamos los arrays del combineLatest (snapshot coherente del stream) en lugar
    // de los getters síncronos, para evitar race conditions entre observables.
    combineLatest([
      this.choferService.vehiculos$,
      this.choferService.choferes$,
      this.proveedorService.proveedores$,
    ])
    .pipe(takeUntil(this.destroy$))
    .subscribe(([vehiculos, choferes, proveedores]) => {
      this.gruposPool = this.construirPool(vehiculos, choferes, proveedores);
      this.invalidarDisponibilidad();
    });

    // No disponibilidad: idempotente (normalmente ya lo arrancó HomeComponent).
    // Cada emisión del listener invalida la resolución de la fecha.
    this.noDisponibilidadService.init();
    this.noDisponibilidadService.noDisponibilidades$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.invalidarDisponibilidad());
  }

  ngOnDestroy(): void {
    // 1. Espejar el borrador en curso SOLO si es trabajo local sin guardar (borradorSucio).
    //    itemsBorrador.length>0 no alcanza: tras guardarBorrador() itemsBorrador queda
    //    poblado (clon de lo persistido) pero borradorSucio es false — mirroring por
    //    length reintroduciría el bug de badges incorrectos al volver.
    if (this.modo === 'edicion' && this.borradorSucio) {
      this.asignacionService.setBorradorEnCurso(this.fechaSeleccionada, this.itemsBorrador);
    }
    // 2. Recordar la última fecha vista siempre que haya una fecha seleccionada
    //    (cualquier modo/estado: borrador local, persistido o alta).
    if (this.fechaSeleccionada) {
      this.asignacionService.setUltimaFechaVista(this.fechaSeleccionada);
    }
    this.visorSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------------------------------------------------------------------------
  // Selección y navegación de fecha
  // ---------------------------------------------------------------------------

  getDiaSemana(fechaStr: string): string {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const [anio, mes, dia] = fechaStr.split('-').map(Number);
    return dias[new Date(anio, mes - 1, dia).getDay()];
  }

  cambiarDia(direccion: number): void {
    if (!this.fechaSeleccionada) return;
    // FE4 (lazy-fechas): suma sobre el string 'YYYY-MM-DD', sin depender del
    // huso (antes se compensaban dos corrimientos UTC: daba bien, pero frágil).
    this.fechaSeleccionada = sumarDias(this.fechaSeleccionada, direccion);
    this.onFechaSeleccionadaChange();
  }

  async onFechaSeleccionadaChange(): Promise<void> {
    if (!this.fechaSeleccionada || this.fechaSeleccionada === this.fechaAnterior) return;

    // Guardia de borrador sucio: pedir confirmación antes de perder cambios.
    if (this.modo === 'edicion' && this.borradorSucio) {
      const { isConfirmed } = await Swal.fire({
        icon: 'warning',
        title: '¿Descartar cambios?',
        text: 'Tenés asignaciones sin guardar. ¿Descartar los cambios y cambiar de fecha?',
        showCancelButton: true,
        confirmButtonText: 'Sí, cambiar de fecha',
        cancelButtonText: 'Cancelar',
      });
      if (!isConfirmed) {
        // Revertir la fecha al valor anterior para que el input no quede desincronizado.
        this.fechaSeleccionada = this.fechaAnterior!;
        return;
      }
      this.asignacionService.limpiarBorradorEnCurso();
    }

    this.fechaAnterior = this.fechaSeleccionada;

    // Limpiar estado de la fecha anterior.
    this.visorSub?.unsubscribe();
    this.visorSub = null;
    this.itemsBorrador = [];
    this.borradorSucio = false;
    this.tablero = null;

    this.invalidarDisponibilidad();
    await this.cargarTablero(this.fechaSeleccionada);
  }

  // ---------------------------------------------------------------------------
  // Carga de tablero y decisión de modo
  // ---------------------------------------------------------------------------

  private async cargarTablero(fecha: string): Promise<void> {
    this.isLoading = true;
    try {
      const t = await this.asignacionService.getTableroPorFecha(fecha);

      if (!t) {
        this.modo = 'edicion';
        this.tablero = null;
        this.itemsBorrador = [];
        this.borradorSucio = false;
        return;
      }

      if (!t.asignado) {
        // Borrador guardado: copia profunda para que itemsBorrador sea independiente
        // del objeto leído de Firestore (el borrador es desechable).
        this.modo = 'edicion';
        this.tablero = t;
        this.itemsBorrador = structuredClone(t.items);
        this.borradorSucio = false;
        return;
      }

      // asignado === true → modo visor, listener vivo
      this.modo = 'visor';
      this.tablero = t;
      this.itemsBorrador = [];
      this.borradorSucio = false;
      this.engancharVisor(fecha);

    } catch (e) {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'Error al cargar tablero',
        text: 'No se pudo recuperar el tablero de la base de datos.' });
    } finally {
      this.isLoading = false;
    }
  }

  private engancharVisor(fecha: string): void {
    this.asignacionService.cargarFecha(fecha);
    this.visorSub = this.asignacionService.asignacion$
      .pipe(takeUntil(this.destroy$))
      .subscribe(a => {
        // Refleja cambios en vivo solo si seguimos en modo visor y es la fecha actual.
        if (this.modo === 'visor' && a && a.fecha === this.fechaSeleccionada) {
          this.tablero = a;
        }
        // Si a===null (tablero eliminado externamente), se conserva el último estado
        // conocido. Caso borde no crítico: el tablero confirmado no se elimina
        // en el flujo normal de la app.
      });
  }

  // ---------------------------------------------------------------------------
  // Items por cliente (render y orden)
  // ---------------------------------------------------------------------------

  private itemsActuales(): AsignacionItem[] {
    return this.modo === 'edicion' ? this.itemsBorrador : (this.tablero?.items ?? []);
  }

  // Activos ∪ clientes con asignaciones (inactivos con items no desaparecen).
  get clientesVisibles(): ConIdType<Cliente>[] {
    const idsConItems = new Set(this.itemsActuales().map(it => it.idCliente));
    const mapa = new Map<string, ConIdType<Cliente>>();
    for (const c of this.clientesActivos) mapa.set(c.idCliente, c);
    for (const id of idsConItems) {
      if (!mapa.has(id)) {
        const cli = this.clienteService.getClientePorId(id);
        if (cli) mapa.set(id, cli);
        // si no resuelve (papelera): sin columna, item existe en borrador
        // TODO: refactor Papelera — resolver contra papelera cuando esté disponible.
      }
    }
    return [...mapa.values()].sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));
  }

  get idsColumnas(): string[] {
    return this.clientesVisibles.map(c => `cliente-drop-${c.idCliente}`);
  }

  itemsDeCliente(idCliente: string): AsignacionItem[] {
    // Devuelve una copia ordenada; no muta itemsBorrador.
    // En modo visor se muestran TODOS los items (activos y anulados) para
    // preservar el registro histórico del tablero. Los anulados se atenúan en la vista.
    return this.itemsActuales()
      .filter(it => it.idCliente === idCliente)
      .sort((a, b) => {
        const ordenCat = a.ref.categoria.catOrden - b.ref.categoria.catOrden;
        if (ordenCat !== 0) return ordenCat;
        return this.claveOrden(a).localeCompare(this.claveOrden(b));
      });
  }

  private claveOrden(item: AsignacionItem): string {
    const a = item.ref.asignadoA;
    if (a.tipo === 'chofer') return `${a.apellido} ${a.nombre}`;
    return a.razonSocial;
  }

  // ---------------------------------------------------------------------------
  // Drag & drop
  // ---------------------------------------------------------------------------

  onDropEnCliente(event: CdkDragDrop<any>, idCliente: string): void {
    if (this.modo !== 'edicion') return;
    if (!this.fechaSeleccionada) {
      Swal.fire({ icon: 'warning', title: 'Sin fecha', text: 'Seleccioná una fecha primero.' });
      return;
    }

    const pool = event.item.data as VehiculoPool;
    if (!pool) return;

    // Guarda de disponibilidad (el arrastre ya está deshabilitado; esto cubre
    // cualquier otro camino). Sin datos cargados no se asume disponible.
    const motivos = this.motivosPool(pool);
    if (motivos === null) {
      Swal.fire({ icon: 'warning', title: 'No se pudo verificar la disponibilidad',
        text: 'Todavía se están cargando los datos. Probá de nuevo en unos segundos.' });
      return;
    }
    if (motivos.length > 0) {
      Swal.fire({ icon: 'warning', title: 'No disponible en la fecha', text: describirMotivos(motivos) });
      return;
    }

    const item: AsignacionItem = {
      idItem: crypto.randomUUID(),
      idCliente,
      sujeto: this.derivarSujeto(pool),
      ref: {
        dominio:   pool.dominio,
        categoria: pool.categoria,
        asignadoA: pool.asignadoA,
      },
      observacion: '',
      hojaDeRuta:  '',
      idOperacion: null,
      estado: { estado: 'activa' },
    };

    this.itemsBorrador = [...this.itemsBorrador, item];
    this.borradorSucio = true;
  }

  private derivarSujeto(pool: VehiculoPool): SujetoAsignacion {
    const a = pool.asignadoA;
    if (a.tipo === 'chofer') {
      return { tipo: 'directo', idChofer: a.idChofer, idVehiculo: pool.idVehiculo };
    }
    return { tipo: 'proveedor', idProveedor: a.idProveedor, idChofer: null, idVehiculo: pool.idVehiculo };
  }

  quitarItem(idItem: string): void {
    if (this.modo !== 'edicion') return;
    this.itemsBorrador = this.itemsBorrador.filter(it => it.idItem !== idItem);
    this.borradorSucio = true;
  }

  // ---------------------------------------------------------------------------
  // Feedback del pool
  // ---------------------------------------------------------------------------

  vecesAsignado(idVehiculo: string): number {
    if (this.modo !== 'edicion') return 0;
    // sujeto.idVehiculo existe en ambas ramas del union (directo y proveedor)
    return this.itemsBorrador.filter(it => it.sujeto.idVehiculo === idVehiculo).length;
  }

  estaAsignado(idVehiculo: string): boolean {
    return this.vecesAsignado(idVehiculo) > 0;
  }

  clientesAsignados(idVehiculo: string): string[] {
    if (this.modo !== 'edicion') return [];
    const idsClientes = this.itemsBorrador
      .filter(it => it.sujeto.idVehiculo === idVehiculo)
      .map(it => it.idCliente);
    const nombres = idsClientes
      .map(id => this.clientesVisibles.find(c => c.idCliente === id)?.razonSocial)
      .filter((n): n is string => !!n);
    return [...new Set(nombres)];
  }

  // ---------------------------------------------------------------------------
  // Helpers de estado de item (para el template)
  // ---------------------------------------------------------------------------

  esAnulado(item: AsignacionItem): boolean {
    return item.estado.estado === 'anulada';
  }

  motivoAnulado(item: AsignacionItem): string {
    return item.estado.estado === 'anulada' ? item.estado.motivo : '';
  }

  nombreItemRef(ref: AsignacionRef): string {
    const a = ref.asignadoA;
    if (a.tipo === 'chofer') return `${a.apellido}, ${a.nombre}`;
    return a.razonSocial;
  }

  // ---------------------------------------------------------------------------
  // Modal de observación / hoja de ruta
  // ---------------------------------------------------------------------------

  abrirEdicionItem(item: AsignacionItem, modalRef: TemplateRef<any>): void {
    this.itemEnEdicion = item;
    this.edicionObservacion = item.observacion;
    this.edicionHojaDeRuta = item.hojaDeRuta;

    const modal = this.modal.open(modalRef, { centered: true });
    modal.result.finally(() => {
      this.itemEnEdicion = null;
      this.edicionObservacion = '';
      this.edicionHojaDeRuta = '';
    });
  }

  guardarEdicionItem(modal: any): void {
    if (this.modo !== 'edicion' || !this.itemEnEdicion) { modal.close(); return; }
    const id = this.itemEnEdicion.idItem;
    this.itemsBorrador = this.itemsBorrador.map(it =>
      it.idItem === id
        ? { ...it, observacion: this.edicionObservacion, hojaDeRuta: this.edicionHojaDeRuta }
        : it
    );
    this.borradorSucio = true;
    modal.close();
  }

  // ---------------------------------------------------------------------------
  // Acciones de persistencia
  // ---------------------------------------------------------------------------

  async guardarBorrador(): Promise<void> {
    if (this.modo !== 'edicion') return;
    if (!this.fechaSeleccionada) {
      Swal.fire({ icon: 'warning', title: 'Sin fecha', text: 'Debe seleccionar una fecha.' });
      return;
    }
    if (this.itemsBorrador.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Sin asignaciones',
        text: 'Debe asignar al menos un vehículo para guardar el tablero.' });
      return;
    }

    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: '¿Guardar borrador?',
      text: '¿Desea guardar este tablero para continuar luego?',
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
    });
    if (!isConfirmed) return;

    this.isLoading = true;
    try {
      await this.asignacionService.guardarBorrador(this.fechaSeleccionada, this.itemsBorrador);
      this.asignacionService.limpiarBorradorEnCurso();
      // Recargar: la máquina de estados actualiza modo + apaga borradorSucio.
      await this.cargarTablero(this.fechaSeleccionada);
      Swal.fire({ icon: 'success', title: 'Guardado',
        text: 'Tablero guardado, podrá retomarlo más adelante.' });
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'Error al guardar',
        text: 'Ocurrió un problema al guardar el tablero.' });
    } finally {
      this.isLoading = false;
    }
  }

  async altaOp(): Promise<void> {
    // GUARDAS
    if (this.modo !== 'edicion') return;
    if (!this.fechaSeleccionada) {
      Swal.fire({ icon: 'error', title: 'Sin fecha', text: 'Debe seleccionar una fecha.' });
      return;
    }
    if (this.itemsBorrador.length === 0) {
      Swal.fire({ icon: 'error', title: 'Sin asignaciones',
        text: 'Debe asignar al menos un vehículo para crear operaciones.' });
      return;
    }

    // CONFIRMACIÓN
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: '¿Dar de alta las operaciones?',
      text: '¿Dar de alta las operaciones de este tablero?',
      showCancelButton: true,
      confirmButtonText: 'Confirmar alta',
      cancelButtonText: 'Cancelar',
    });
    if (!isConfirmed) return;

    // ETAPA 1 — crear ops básicas en memoria (sin red; todo-o-nada)
    const resultadoCreacion: ResultadoCreacionOps =
      this.operacionService.crearOperacionesDesdeAsignacion(
        this.itemsBorrador, this.fechaSeleccionada);

    if (resultadoCreacion.errores.length > 0) {
      const detalle = resultadoCreacion.errores
        .map((e: ErrorCreacionOp) => {
          const cli = this.clientesVisibles.find(c => c.idCliente === e.idCliente)?.razonSocial
                      ?? e.idCliente;
          return `• ${cli}: ${e.motivo}`;
        })
        .join('<br>');
      Swal.fire({ icon: 'error', title: 'No se pueden crear las operaciones',
        html: `Hay asignaciones que no se pudieron resolver:<br>${detalle}` });
      return;
    }

    const opsBasicas: OperacionCreada[] = resultadoCreacion.creadas;

    // ETAPA 2 — abrir operaciones-editor (modal) con las ops básicas
    const modalRef = this.modal.open(OperacionesEditorComponent, {
      windowClass: 'modal-super-xl', centered: true, size: 'xl',
    });
    modalRef.componentInstance.operacionesCreadas = opsBasicas;

    let opsFinales: OperacionCreada[];
    try {
      opsFinales = await modalRef.result;
    } catch {
      // dismiss → usuario canceló. Nada persistido; el borrador queda intacto.
      return;
    }

    if (!opsFinales || opsFinales.length === 0) {
      Swal.fire({ icon: 'info', title: 'Sin operaciones',
        text: 'No quedaron operaciones para dar de alta.' });
      return;
    }

    // ETAPA 3 — alta atómica de las ops finales
    this.isLoading = true;
    try {
      const resultado = await this.operacionService.altaDesdeAsignacion(
        this.fechaSeleccionada, opsFinales);

      if (resultado.exito) {
        this.asignacionService.limpiarBorradorEnCurso();
        Swal.fire({ icon: 'success', title: 'Operaciones creadas',
          text: resultado.mensaje });
        await this.cargarTablero(this.fechaSeleccionada);
      } else {
        Swal.fire({ icon: 'error', title: 'No se pudo dar de alta',
          text: resultado.mensaje });
      }
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'Error',
        text: 'Ocurrió un problema al dar de alta las operaciones.' });
    } finally {
      this.isLoading = false;
    }
  }

  async limpiar(): Promise<void> {
    if (this.modo !== 'edicion') return;

    // Caso A: existe un borrador guardado en Firestore → ofrecer eliminarlo.
    if (this.tablero && !this.tablero.asignado) {
      const { isConfirmed } = await Swal.fire({
        icon: 'warning',
        title: 'Eliminar borrador guardado',
        text: `Esto eliminará el tablero borrador guardado del ${this.fechaSeleccionada}. ¿Continuar?`,
        showCancelButton: true,
        confirmButtonText: 'Eliminar',
        cancelButtonText: 'Cancelar',
      });
      if (!isConfirmed) return;

      this.isLoading = true;
      try {
        await this.asignacionService.descartarBorrador(this.fechaSeleccionada);
        this.itemsBorrador = [];
        this.borradorSucio = false;
        this.tablero = null;
        this.asignacionService.limpiarBorradorEnCurso();
        this.asignacionService.limpiarUltimaFechaVista();
        // Sin esto, ngOnDestroy volvería a grabar esta fecha como "última fecha vista"
        // (fechaSeleccionada sigue truthy), deshaciendo el limpiarUltimaFechaVista recién hecho.
        this.fechaSeleccionada = '';
        this.fechaAnterior = null;
        Swal.fire({ icon: 'success', title: 'Borrador eliminado' });
      } catch (e) {
        console.error(e);
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar el borrador.' });
      } finally {
        this.isLoading = false;
      }
      return;
    }

    // Caso B: solo borrador local (sin documento en Firestore).
    if (this.borradorSucio) {
      const { isConfirmed } = await Swal.fire({
        icon: 'question',
        title: '¿Limpiar asignaciones?',
        text: 'Se perderán las asignaciones sin guardar. ¿Continuar?',
        showCancelButton: true,
        confirmButtonText: 'Limpiar',
        cancelButtonText: 'Cancelar',
      });
      if (!isConfirmed) return;
    }
    this.itemsBorrador = [];
    this.borradorSucio = false;
    this.asignacionService.limpiarBorradorEnCurso();
  }

  // ---------------------------------------------------------------------------
  // Informe del tablero
  // ---------------------------------------------------------------------------

  /** Excel o PDF del tablero de la fecha: las asignaciones de pantalla (el
   *  borrador en edición, el tablero confirmado en visor) y los choferes que
   *  ese día no estaban disponibles. */
  async descargar(): Promise<void> {
    const items = this.itemsParaInforme();
    if (items.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'No hay asignaciones para exportar',
        text: 'El tablero de esta fecha está vacío.',
      });
      return;
    }

    const formato = await preguntarFormatoDescarga(
      `Informe del tablero del ${this.fechaSeleccionada}`,
      '¿En qué formato lo querés?',
      'question',
    );
    if (!formato) return;

    let error: unknown = null;
    this.isLoading = true;
    try {
      await this.asignacionesExport.descargar({
        fecha: this.fechaSeleccionada,
        estado: this.modo === 'edicion' ? 'borrador' : 'confirmado',
        items,
        clientes: this.clientesVisibles.map(c => ({ id: c.idCliente, razonSocial: c.razonSocial })),
        noDisponibilidades: this.noDisponibilidadesParaInforme(),
      }, formato);
    } catch (e) {
      error = e;
    } finally {
      this.isLoading = false;
    }

    if (error) {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo generar el informe',
        text: (error as Error)?.message ?? String(error),
      });
    }
  }

  /** Los items en el orden de la grilla (clientes A→Z, y dentro de cada uno
   *  por categoría y nombre). Los items cuyo cliente no resuelve —dado de baja,
   *  ver el TODO de papelera en clientesVisibles— NO tienen columna en la
   *  grilla, pero un informe no puede perderlos: van al final, y el util los
   *  marca como "Sin resolver" en la columna Cliente. */
  private itemsParaInforme(): AsignacionItem[] {
    const ordenados = this.clientesVisibles.flatMap(c => this.itemsDeCliente(c.idCliente));
    const incluidos = new Set(ordenados.map(it => it.idItem));
    const huerfanos = this.itemsActuales().filter(it => !incluidos.has(it.idItem));
    return [...ordenados, ...huerfanos];
  }

  // ---------------------------------------------------------------------------
  // Pool
  // ---------------------------------------------------------------------------

  private construirPool(
    vehiculos: ConIdType<Vehiculo>[],
    choferes: ConIdType<Chofer>[],
    proveedores: ConIdType<any>[],
  ): GrupoCategoriaPool[] {
    const vehiculosPool: VehiculoPool[] = [];

    for (const v of vehiculos) {
      // Asignado a const para que TypeScript mantenga el narrowing dentro de callbacks.
      const asignadoA = v.asignadoA;
      if (asignadoA.tipo === 'chofer') {
        const chofer = choferes.find(c => c.idChofer === asignadoA.idChofer);
        if (!chofer || !chofer.activo) continue;
        vehiculosPool.push({
          idVehiculo: v.idVehiculo,
          dominio: v.dominio,
          categoria: v.categoria,
          asignadoA: {
            tipo: 'chofer',
            idChofer: chofer.idChofer,
            nombre: chofer.datosPersonales.nombre,
            apellido: chofer.datosPersonales.apellido,
          },
        });
      } else {
        const proveedor = proveedores.find(p => p.idProveedor === asignadoA.idProveedor);
        if (!proveedor || !proveedor.activo) continue;
        vehiculosPool.push({
          idVehiculo: v.idVehiculo,
          dominio: v.dominio,
          categoria: v.categoria,
          asignadoA: {
            tipo: 'proveedor',
            idProveedor: proveedor.idProveedor,
            razonSocial: proveedor.razonSocial,
          },
        });
      }
    }

    // Agrupar siguiendo el orden del catálogo (no el orden de aparición en los vehículos).
    const grupos: GrupoCategoriaPool[] = this.categoriasOrdenadas
      .map(cat => ({
        catOrden: cat.catOrden,
        nombre: cat.nombre,
        vehiculos: vehiculosPool
          .filter(v => v.categoria.catOrden === cat.catOrden)
          .sort((a, b) => this.claveOrdenPool(a).localeCompare(this.claveOrdenPool(b))),
      }))
      .filter(g => g.vehiculos.length > 0); // omitir grupos vacíos

    // Vehículos cuya categoría no figura en el catálogo → grupo "Sin categoría" al final.
    // Catálogo incompleto es un caso real (categoría eliminada/renombrada).
    const catOrdenesConocidos = new Set(this.categoriasOrdenadas.map(c => c.catOrden));
    const sinCategoria = vehiculosPool
      .filter(v => !catOrdenesConocidos.has(v.categoria.catOrden))
      .sort((a, b) => this.claveOrdenPool(a).localeCompare(this.claveOrdenPool(b)));
    if (sinCategoria.length > 0) {
      grupos.push({ catOrden: -1, nombre: 'Sin categoría', vehiculos: sinCategoria });
    }

    return grupos;
  }

  private claveOrdenPool(v: VehiculoPool): string {
    const a = v.asignadoA;
    return a.tipo === 'chofer' ? `${a.apellido} ${a.nombre}` : a.razonSocial;
  }

  // ---------------------------------------------------------------------------
  // Color híbrido posicional
  // ---------------------------------------------------------------------------

  getEstiloCategoria(catOrden: number): EstiloCategoria {
    const posicion = this.categoriasOrdenadas.findIndex(c => c.catOrden === catOrden);
    if (posicion < 0) return { clase: 'bg-light text-dark', estilo: {} };
    if (posicion < 7) return { clase: this.sectionColorClasses[posicion], estilo: {} };
    // 8ª categoría en adelante: HSL por ángulo áureo, texto blanco fijo
    const hue = (posicion * 137.5) % 360;
    return { clase: '', estilo: { 'background-color': `hsl(${hue}, 65%, 45%)`, color: '#fff' } };
  }

  // ---------------------------------------------------------------------------
  // No disponibilidad (DisponibilidadService, contra la FECHA DEL TABLERO)
  // ---------------------------------------------------------------------------
  //
  // Se pregunta por los dos lados: el vehículo y la entidad dueña (chofer
  // directo o proveedor). Un chofer directo con todos sus vehículos fuera está
  // él mismo disponible (no tiene registro propio): con una sola pregunta se
  // colaría. `null` = no se pudo verificar (sin fecha o sin datos cargados):
  // NO se asume disponible.

  private invalidarDisponibilidad(): void {
    this.memoDisponibilidad.clear();
  }

  private puedeVerificar(): boolean {
    return !!this.fechaSeleccionada && this.disponibilidadService.datosCargados();
  }

  private motivosDe(consulta: ConsultaSujeto): MotivoNoDisponible[] {
    if (this.memoFecha !== this.fechaSeleccionada) {
      this.memoDisponibilidad.clear();
      this.memoFecha = this.fechaSeleccionada;
    }
    const clave = `${consulta.tipo}:${idDeSujeto(consulta)}`;
    let motivos = this.memoDisponibilidad.get(clave);
    if (!motivos) {
      const r = this.disponibilidadService.disponibilidadDe(consulta, this.fechaSeleccionada);
      motivos = r.disponible ? [] : r.motivos;
      this.memoDisponibilidad.set(clave, motivos);
    }
    return motivos;
  }

  /** Tarjeta del pool: el vehículo y su dueño. */
  motivosPool(v: VehiculoPool): MotivoNoDisponible[] | null {
    if (!this.puedeVerificar()) return null;
    const a = v.asignadoA;
    const entidad: ConsultaSujeto = a.tipo === 'chofer'
      ? { tipo: 'chofer', idChofer: a.idChofer }
      : { tipo: 'proveedor', idProveedor: a.idProveedor };
    return unirMotivos(this.motivosDe({ tipo: 'vehiculo', idVehiculo: v.idVehiculo }), this.motivosDe(entidad));
  }

  /** Ítem ya colocado: lo que ya se sabe de su sujeto (resolución
   *  progresiva). El vehículo si ya está resuelto; la entidad siempre; y en
   *  uno de proveedor, también el chofer si ya se eligió. */
  motivosItem(item: AsignacionItem): MotivoNoDisponible[] | null {
    if (!this.puedeVerificar()) return null;
    const s = item.sujeto;
    const listas: MotivoNoDisponible[][] = [];
    if (s.idVehiculo) listas.push(this.motivosDe({ tipo: 'vehiculo', idVehiculo: s.idVehiculo }));
    if (s.tipo === 'directo') {
      listas.push(this.motivosDe({ tipo: 'chofer', idChofer: s.idChofer }));
    } else {
      listas.push(this.motivosDe({ tipo: 'proveedor', idProveedor: s.idProveedor }));
      if (s.idChofer) listas.push(this.motivosDe({ tipo: 'chofer', idChofer: s.idChofer }));
    }
    return unirMotivos(...listas);
  }

  /** Atenuada y sin arrastre: no disponible, o no se pudo verificar. */
  poolBloqueado(v: VehiculoPool): boolean {
    const motivos = this.motivosPool(v);
    return motivos === null || motivos.length > 0;
  }

  tituloPool(v: VehiculoPool, clientes: string[]): string {
    const motivos = this.motivosPool(v);
    if (motivos === null) {
      return this.fechaSeleccionada
        ? 'No se pudo verificar la disponibilidad: todavía se están cargando los datos.'
        : 'Elegí una fecha para ver la disponibilidad.';
    }
    if (motivos.length > 0) return `No disponible en la fecha:\n${describirMotivos(motivos)}`;
    return clientes.join(', ');
  }

  /** Un ítem colocado se marca sólo si se pudo verificar y NO está
   *  disponible. Sin datos no se marca ni se da por bueno: las guardas duras
   *  (bloque 6) son las que rechazan cuando no pueden verificar. */
  itemNoDisponible(item: AsignacionItem): boolean {
    const motivos = this.motivosItem(item);
    return motivos !== null && motivos.length > 0;
  }

  tituloItem(item: AsignacionItem): string {
    if (this.esAnulado(item)) return 'Anulado: ' + this.motivoAnulado(item);
    const motivos = this.motivosItem(item);
    if (motivos && motivos.length > 0) return `No disponible en la fecha:\n${describirMotivos(motivos)}`;
    return item.ref.dominio;
  }

  /** PUENTE HASTA EL BLOQUE 7. El informe del tablero sigue tipado contra el
   *  modelo viejo (sólo choferes). Se le pasan los registros activos de
   *  CHOFER del modelo nuevo con la forma vieja; los de vehículo y proveedor
   *  todavía no van a la hoja "No disponibles". El util filtra por fecha. */
  private noDisponibilidadesParaInforme(): NoDisponibilidadChofer[] {
    const resultado: NoDisponibilidadChofer[] = [];
    for (const nd of this.noDisponibilidadService.getNoDisponibilidadesActuales()) {
      if (!nd.activa || nd.sujeto.tipo !== 'chofer') continue;
      resultado.push({
        idNoDisponibilidad: nd.id,
        idChofer: nd.sujeto.idChofer,
        desde: nd.desde,
        hasta: nd.hasta,
        motivo: nd.motivo,
        activa: true,
      });
    }
    return resultado;
  }

  // ---------------------------------------------------------------------------
  // Modales de visibilidad
  // ---------------------------------------------------------------------------

  openModalActivos(modo: 'choferes' | 'proveedores' | 'clientes'): void {
    const modalRef = this.modal.open(ModalObjetosActivosComponent, {
      centered: true, size: 'lg',
    });
    modalRef.componentInstance.modo = modo;
  }

  openModalNoOperativos(): void {
    this.modal.open(ModalNoDisponibilidadComponent, { centered: true, size: 'xl', scrollable: true });
  }
}
