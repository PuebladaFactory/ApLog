import { Component, OnDestroy, OnInit, TemplateRef } from '@angular/core';
import { Subject, Subscription, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import Swal from 'sweetalert2';

import { Asignacion, AsignacionItem, AsignacionRef, EstadoAsignacion, SujetoAsignacion } from 'src/app/interfaces/asignacion';
import { Categoria, Vehiculo, Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConIdType } from 'src/app/interfaces/conId';
import { NoDisponibilidadChofer } from 'src/app/interfaces/no-disponibilidad-chofer';

import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { AsignacionService } from 'src/app/servicios/operaciones/asignacion.service';
import { OperacionService, OperacionCreada, ResultadoCreacionOps, ErrorCreacionOp } from 'src/app/servicios/operaciones/operacion.service';
import { OperacionesEditorComponent } from 'src/app/raiz/operaciones/operaciones-editor/operaciones-editor.component';
import { StorageService } from 'src/app/servicios/storage/storage.service'; // TODO: refactor Tarifas

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
  clientesVisibles: ConIdType<Cliente>[] = [];
  idsColumnas: string[] = [];                    // IDs de cdkDropList de columnas cliente
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

  // ---- No-disponibilidad ----
  noDisponibilidades: NoDisponibilidadChofer[] = [];
  noOperativosSet = new Set<string>();

  // ---- RxJS ----
  destroy$ = new Subject<void>();
  isLoading = false;

  constructor(
    private choferService: ChoferService,
    private proveedorService: ProveedorService,
    private clienteService: ClienteService,
    private asignacionService: AsignacionService,
    private operacionService: OperacionService,
    private storageService: StorageService,
    private modal: NgbModal,
  ) {}

  ngOnInit(): void {
    // TODO: refactor Tarifas — categorías leídas desde StorageService
    const storedTarifa = this.storageService.loadInfo('tarifasGralCliente');
    const tarifaGeneral = storedTarifa[0];
    if (tarifaGeneral?.cargasGenerales) {
      this.categoriasOrdenadas = [...tarifaGeneral.cargasGenerales]
        .sort((a, b) => a.orden - b.orden)
        .map(cat => ({ catOrden: cat.orden, nombre: cat.nombre }));
    }

    const enCurso = this.asignacionService.getBorradorEnCurso();
    if (enCurso) {
      this.fechaSeleccionada = enCurso.fecha;
      this.fechaAnterior    = enCurso.fecha;
      this.itemsBorrador    = enCurso.items;
      this.modo             = 'edicion';
      this.borradorSucio    = true;
      this.calcularChoferesNoOperativosPorFecha(enCurso.fecha);
    }

    // Columnas destino: clientes activos ordenados por razón social.
    // idsColumnas se actualiza junto con clientesVisibles para que cdkDropListConnectedTo
    // sea siempre coherente con las columnas renderizadas.
    this.clienteService.getActivos()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.clientesVisibles = [...data].sort((a, b) =>
          a.razonSocial.localeCompare(b.razonSocial)
        );
        this.idsColumnas = this.clientesVisibles.map(c => `cliente-drop-${c.idCliente}`);
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
    });

    // No-disponibilidad por fecha
    this.storageService
      .getObservable<NoDisponibilidadChofer>('noOperativo')
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        if (!data) return;
        this.noDisponibilidades = data
          .filter(n => n.activa)
          .map(n => {
            const { id, type, ...clean } = n as any;
            return clean as NoDisponibilidadChofer;
          });
        if (this.fechaSeleccionada) {
          this.calcularChoferesNoOperativosPorFecha(this.fechaSeleccionada);
        }
      });
  }

  ngOnDestroy(): void {
    if (this.modo === 'edicion' && this.itemsBorrador.length > 0) {
      this.asignacionService.setBorradorEnCurso(this.fechaSeleccionada, this.itemsBorrador);
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
    const d = new Date(this.fechaSeleccionada);
    d.setDate(d.getDate() + direccion);
    this.fechaSeleccionada = d.toISOString().split('T')[0];
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

    this.calcularChoferesNoOperativosPorFecha(this.fechaSeleccionada);
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

    // Guarda no-operativo: solo aplica a choferes directos.
    const a = pool.asignadoA;
    if (a.tipo === 'chofer' && this.isChoferNoOperativo(a.idChofer)) {
      Swal.fire({ icon: 'warning', title: 'Chofer no disponible',
        text: 'El chofer no está disponible para la fecha seleccionada.' });
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

  // El informe Excel debe reescribirse para AsignacionItem[] (modelo nuevo).
  // TODO: cierre de módulo — reescribir informe Excel para el modelo nuevo.
  descargar(): void {
    Swal.fire({ icon: 'info', title: 'Próximamente',
      text: 'La descarga de informes estará disponible próximamente.' });
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
        vehiculos: vehiculosPool.filter(v => v.categoria.catOrden === cat.catOrden),
      }))
      .filter(g => g.vehiculos.length > 0); // omitir grupos vacíos

    // Vehículos cuya categoría no figura en el catálogo → grupo "Sin categoría" al final.
    // Catálogo incompleto es un caso real (categoría eliminada/renombrada).
    const catOrdenesConocidos = new Set(this.categoriasOrdenadas.map(c => c.catOrden));
    const sinCategoria = vehiculosPool.filter(v => !catOrdenesConocidos.has(v.categoria.catOrden));
    if (sinCategoria.length > 0) {
      grupos.push({ catOrden: -1, nombre: 'Sin categoría', vehiculos: sinCategoria });
    }

    return grupos;
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
  // No-disponibilidad
  // ---------------------------------------------------------------------------

  private calcularChoferesNoOperativosPorFecha(fecha: string): void {
    this.noOperativosSet.clear();
    const fechaMs = new Date(fecha + 'T00:00:00').getTime();
    for (const nd of this.noDisponibilidades) {
      const desdeMs = new Date(nd.desde + 'T00:00:00').getTime();
      const hastaMs = nd.hasta ? new Date(nd.hasta + 'T00:00:00').getTime() : null;
      if (fechaMs >= desdeMs && (hastaMs === null || fechaMs <= hastaMs)) {
        this.noOperativosSet.add(nd.idChofer);
      }
    }
  }

  isChoferNoOperativo(idChofer: string): boolean {
    return this.noOperativosSet.has(idChofer);
  }

  getMotivoNoDisponibilidad(idChofer: string): string {
    const fecha = this.fechaSeleccionada;
    const nd = this.noDisponibilidades.find(n => {
      if (n.idChofer !== idChofer) return false;
      return fecha >= n.desde && (!n.hasta || fecha <= n.hasta);
    });
    return nd?.motivo || 'No disponible';
  }

  // La no-disponibilidad solo aplica a vehículos de chofer DIRECTO.
  // Los vehículos de proveedor no se marcan: el chofer asignado al proveedor
  // se elige en operaciones-table, y su disponibilidad se gestiona allí.
  vehiculoNoOperativo(v: VehiculoPool): boolean {
    return v.asignadoA.tipo === 'chofer' && this.isChoferNoOperativo(v.asignadoA.idChofer);
  }

  // ---------------------------------------------------------------------------
  // Modales de visibilidad (stubs — pendiente migración de modales)
  // ---------------------------------------------------------------------------

  // TODO: migrar modales de visibilidad. La llamada al modal queda comentada
  //       hasta migrar ModalObjetosActivosComponent / ModalChoferesNoDisponiblesComponent
  //       al modelo nuevo. El impacto de la visibilidad sobre el tablero se maneja
  //       en un paso posterior.
  openModalActivos(_modo: 'choferes' | 'proveedores' | 'clientes'): void {
    // const modalRef = this.modal.open(ModalObjetosActivosComponent, { ... });
    // modalRef.componentInstance...
    // (pendiente: definir qué se envía/recibe al migrar el modal)
  }

  openModalNoOperativos(): void {
    // const modalRef = this.modal.open(ModalChoferesNoDisponiblesComponent, { ... });
    // (pendiente: migrar el modal)
  }
}
