import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import { describirMotivos } from 'src/app/shared/utils/vigencia-no-disponibilidad.util';

import { AsignacionItem } from 'src/app/interfaces/asignacion';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConIdType } from 'src/app/interfaces/conId';
import { EntidadConVehiculos } from 'src/app/interfaces/no-disponibilidad';

import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { OperacionService, OperacionCreada, ResultadoCreacionOps, ErrorCreacionOp } from 'src/app/servicios/operaciones/operacion.service';
import { AsignacionService } from 'src/app/servicios/operaciones/asignacion.service';
import { DisponibilidadService } from 'src/app/servicios/no-disponibilidad/disponibilidad.service';
import { NoDisponibilidadService } from 'src/app/servicios/no-disponibilidad/no-disponibilidad.service';
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
import { OperacionesEditorComponent } from 'src/app/raiz/operaciones/operaciones-editor/operaciones-editor.component';
import { ModalObjetosActivosComponent } from '../modal-objetos-activos/modal-objetos-activos.component';
import { ModalNoDisponibilidadComponent } from '../modal-no-disponibilidad/modal-no-disponibilidad.component';

/** Viewmodel efímero de exhibición: chofer directo seleccionable + sus vehículos
 *  (para badges de categoría). Vive en el componente, no en interfaces/. */
interface ChoferDirectoSeleccionable {
  chofer: ConIdType<Chofer>;
  vehiculos: ConIdType<Vehiculo>[];
}

/** Viewmodel efímero de exhibición: proveedor seleccionable + sus vehículos. */
interface ProveedorSeleccionable {
  proveedor: ConIdType<Proveedor>;
  vehiculos: ConIdType<Vehiculo>[];
}

interface EstiloCategoria {
  clase: string;
  estilo: { [k: string]: string };
}

/** Una categoría de vehículo de la entidad en la fecha: disponible si le
 *  queda al menos un vehículo disponible. `titulo`: dominios, o los motivos. */
interface CategoriaEntidad {
  catOrden: number;
  nombre: string;
  disponible: boolean;
  titulo: string;
}

/** Disponibilidad de una entidad (chofer directo o proveedor) en la fecha.
 *  Bloqueada sólo si ella misma no está disponible o si no le queda NINGÚN
 *  vehículo disponible. Uno roto de varios no la bloquea: atenúa su categoría. */
interface EstadoEntidad {
  bloqueada: boolean;
  motivo: string;
  categorias: CategoriaEntidad[];
}

@Component({
  selector: 'app-carga-asignacion',
  templateUrl: './carga-asignacion.component.html',
  styleUrls: ['./carga-asignacion.component.scss'],
  standalone: false,
})
export class CargaAsignacionComponent implements OnInit, OnDestroy {

  fechaSeleccionada: string | null = null;
  clienteSeleccionado: ConIdType<Cliente> | null = null;
  clientesActivos: ConIdType<Cliente>[] = [];

  choferesDirectosBase: ChoferDirectoSeleccionable[] = [];
  proveedoresBase: ProveedorSeleccionable[] = [];

  choferesSeleccionadosIds = new Set<string>();
  proveedoresSeleccionadosIds = new Set<string>();

  // ---- No disponibilidad (contra la fecha seleccionada) ----
  /** Por 'chofer:<id>' / 'proveedor:<id>'. Se recalcula al cambiar la fecha o
   *  al llegar datos; el template sólo lee. */
  private estadoEntidades = new Map<string, EstadoEntidad>();
  /** Hay fecha pero los datos de disponibilidad todavía no cargaron: no se
   *  asume disponible, se bloquea la selección. */
  sinVerificar = false;

  // Lista ordenada de categorías del sistema, construida desde la tarifa general.
  // Fuente de verdad para el color de los badges (mismo criterio que tablero-asignaciones).
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

  isLoading = false;
  bloqueadoPorBorrador = false;
  destroy$ = new Subject<void>();

  constructor(
    private choferService: ChoferService,
    private proveedorService: ProveedorService,
    private clienteService: ClienteService,
    private operacionService: OperacionService,
    private asignacionService: AsignacionService,
    private disponibilidadService: DisponibilidadService,
    private noDisponibilidadService: NoDisponibilidadService,
    private tarifarioService: TarifarioService,
    private modal: NgbModal,
    public activeModal: NgbActiveModal,
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

    this.clienteService.getActivos()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.clientesActivos = [...data].sort((a, b) =>
          a.razonSocial.localeCompare(b.razonSocial));
      });

    combineLatest([
      this.choferService.choferes$,
      this.choferService.vehiculos$,
      this.proveedorService.proveedores$,
    ])
    .pipe(takeUntil(this.destroy$))
    .subscribe(([choferes, vehiculos, proveedores]) => {
      this.construirListasSeleccionables(choferes, vehiculos, proveedores);
      this.recalcularDisponibilidad();
    });

    // Idempotente (normalmente ya lo arrancó HomeComponent).
    this.noDisponibilidadService.init();
    this.noDisponibilidadService.noDisponibilidades$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.recalcularDisponibilidad());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------------------------------------------------------------------------
  // Listas seleccionables
  // ---------------------------------------------------------------------------

  private construirListasSeleccionables(
    choferes: ConIdType<Chofer>[],
    vehiculos: ConIdType<Vehiculo>[],
    proveedores: ConIdType<Proveedor>[],
  ): void {
    this.choferesDirectosBase = choferes
      .filter(c => c.activo === true && this.choferService.getTipoContratacion(c.idChofer) === 'directo')
      .map(c => ({
        chofer: c,
        vehiculos: vehiculos
          .filter(v => v.asignadoA.tipo === 'chofer' && v.asignadoA.idChofer === c.idChofer),
      }))
      // Filtro defensivo: excluir choferes con vehiculos.length === 0 (no debería ocurrir
      // dado que tener vehículo es requisito de alta de chofer directo — es un seguro,
      // no una regla de negocio activa).
      .filter(x => x.vehiculos.length > 0)
      .sort((a, b) => a.chofer.datosPersonales.apellido.localeCompare(b.chofer.datosPersonales.apellido));

    this.proveedoresBase = proveedores
      .filter(p => p.activo === true)
      .map(p => ({
        proveedor: p,
        // Sin filtro defensivo: un proveedor sin vehículos es un caso válido a mostrar.
        vehiculos: vehiculos
          .filter(v => v.asignadoA.tipo === 'proveedor' && v.asignadoA.idProveedor === p.idProveedor),
      }))
      .sort((a, b) => a.proveedor.razonSocial.localeCompare(b.proveedor.razonSocial));
  }

  get choferesDirectosDisponibles(): ChoferDirectoSeleccionable[] {
    return this.choferesDirectosBase.filter(x => !this.estadoChofer(x).bloqueada);
  }

  get choferesDirectosNoOperativos(): ChoferDirectoSeleccionable[] {
    return this.choferesDirectosBase.filter(x => this.estadoChofer(x).bloqueada);
  }

  // ---------------------------------------------------------------------------
  // Fecha
  // ---------------------------------------------------------------------------

  async onFechaChange(): Promise<void> {
    this.recalcularDisponibilidad();
    this.choferesSeleccionadosIds.clear();
    this.proveedoresSeleccionadosIds.clear();

    this.bloqueadoPorBorrador = this.fechaSeleccionada
      ? await this.asignacionService.existeBorradorSinConfirmar(this.fechaSeleccionada)
      : false;
    if (this.bloqueadoPorBorrador) {
      Swal.fire({ icon: 'warning', title: 'Tablero borrador existente',
        text: `Ya existe un tablero sin confirmar para el ${this.fechaSeleccionada}. ` +
              `Resuélvalo desde el Tablero de Asignaciones antes de continuar.` });
    }
  }

  // ---------------------------------------------------------------------------
  // No disponibilidad (DisponibilidadService, contra la fecha seleccionada)
  // ---------------------------------------------------------------------------

  estadoChofer(x: ChoferDirectoSeleccionable): EstadoEntidad {
    return this.estadoEntidades.get(`chofer:${x.chofer.idChofer}`) ?? this.estadoSinFecha(x.vehiculos);
  }

  estadoProveedor(x: ProveedorSeleccionable): EstadoEntidad {
    return this.estadoEntidades.get(`proveedor:${x.proveedor.idProveedor}`) ?? this.estadoSinFecha(x.vehiculos);
  }

  /** Recalcula el estado de cada entidad para la fecha. Sin fecha no hay qué
   *  verificar (todavía no se puede dar de alta). Con fecha pero sin datos
   *  cargados, `sinVerificar`: no se asume disponible. Las entidades que
   *  quedan bloqueadas salen de la selección. */
  private recalcularDisponibilidad(): void {
    this.estadoEntidades.clear();
    const fecha = this.fechaSeleccionada;
    this.sinVerificar = !!fecha && !this.disponibilidadService.datosCargados();
    if (!fecha || this.sinVerificar) return;

    for (const x of this.choferesDirectosBase) {
      const estado = this.calcularEstado({ tipo: 'chofer', idChofer: x.chofer.idChofer }, x.vehiculos, fecha);
      this.estadoEntidades.set(`chofer:${x.chofer.idChofer}`, estado);
      if (estado.bloqueada) this.choferesSeleccionadosIds.delete(x.chofer.idChofer);
    }
    for (const x of this.proveedoresBase) {
      const estado = this.calcularEstado({ tipo: 'proveedor', idProveedor: x.proveedor.idProveedor }, x.vehiculos, fecha);
      this.estadoEntidades.set(`proveedor:${x.proveedor.idProveedor}`, estado);
      if (estado.bloqueada) this.proveedoresSeleccionadosIds.delete(x.proveedor.idProveedor);
    }
  }

  private calcularEstado(
    entidad: EntidadConVehiculos,
    vehiculos: ConIdType<Vehiculo>[],
    fecha: string,
  ): EstadoEntidad {
    const propia = this.disponibilidadService.disponibilidadDe(entidad, fecha);
    const { disponibles, noDisponibles } = this.disponibilidadService.vehiculosDisponiblesDe(entidad, fecha);
    const idsDisponibles = new Set(disponibles.map(v => v.idVehiculo));
    const motivosVehiculo = new Map(noDisponibles.map(n => [n.vehiculo.idVehiculo, n.motivos]));

    const categorias = this.agruparPorCategoria(vehiculos).map(g => {
      const libres = g.vehiculos.filter(v => idsDisponibles.has(v.idVehiculo));
      return {
        catOrden: g.catOrden,
        nombre: g.nombre,
        disponible: libres.length > 0,
        titulo: libres.length > 0
          ? libres.map(v => v.dominio).join(', ')
          : g.vehiculos
              .map(v => `${v.dominio}:\n${describirMotivos(motivosVehiculo.get(v.idVehiculo) ?? [])}`)
              .join('\n'),
      };
    });

    if (!propia.disponible) {
      return { bloqueada: true, motivo: describirMotivos(propia.motivos), categorias };
    }
    // Sin vehículos: caso válido para un proveedor (se resuelve en el editor);
    // no hay vehículo "que le quede", así que no se bloquea por esta vía.
    if (vehiculos.length > 0 && disponibles.length === 0) {
      return { bloqueada: true, motivo: 'Ningún vehículo disponible en la fecha.', categorias };
    }
    return { bloqueada: false, motivo: '', categorias };
  }

  /** Sin fecha (o sin verificar): las categorías tal cual, sin bloqueos. */
  private estadoSinFecha(vehiculos: ConIdType<Vehiculo>[]): EstadoEntidad {
    return {
      bloqueada: false,
      motivo: '',
      categorias: this.agruparPorCategoria(vehiculos).map(g => ({
        catOrden: g.catOrden,
        nombre: g.nombre,
        disponible: true,
        titulo: g.vehiculos.map(v => v.dominio).join(', '),
      })),
    };
  }

  /** Una entrada por categoría (antes, un badge por vehículo: un chofer con
   *  dos del mismo tipo mostraba dos badges iguales), en el orden del catálogo. */
  private agruparPorCategoria(
    vehiculos: ConIdType<Vehiculo>[],
  ): { catOrden: number; nombre: string; vehiculos: ConIdType<Vehiculo>[] }[] {
    const grupos = new Map<number, { catOrden: number; nombre: string; vehiculos: ConIdType<Vehiculo>[] }>();
    for (const v of vehiculos) {
      const g = grupos.get(v.categoria.catOrden)
        ?? { catOrden: v.categoria.catOrden, nombre: v.categoria.nombre, vehiculos: [] };
      g.vehiculos.push(v);
      grupos.set(v.categoria.catOrden, g);
    }
    return [...grupos.values()].sort((a, b) => a.catOrden - b.catOrden);
  }

  // ---------------------------------------------------------------------------
  // Selección
  // ---------------------------------------------------------------------------

  toggleChofer(idChofer: string, checked: boolean): void {
    if (checked) {
      this.choferesSeleccionadosIds.add(idChofer);
    } else {
      this.choferesSeleccionadosIds.delete(idChofer);
    }
  }

  toggleProveedor(idProveedor: string, checked: boolean): void {
    if (checked) {
      this.proveedoresSeleccionadosIds.add(idProveedor);
    } else {
      this.proveedoresSeleccionadosIds.delete(idProveedor);
    }
  }

  // ---------------------------------------------------------------------------
  // Color híbrido posicional (copiado tal cual de tablero-asignaciones)
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
  // Armado de items + alta
  // ---------------------------------------------------------------------------

  private armarItems(): AsignacionItem[] {
    const items: AsignacionItem[] = [];
    const idCliente = this.clienteSeleccionado!.id;

    // Resolución anticipada de vehículo único. Si la entidad (chofer/proveedor) tiene
    // un solo vehículo no hay elección posible — se resuelve acá para que
    // crearOperacionesDesdeAsignacion arme la op ya completa y operaciones-editor no pida
    // nada al usuario para esa fila. Con 2+ vehículos, idVehiculo queda null y la elección
    // se difiere a operaciones-editor, sin cambios respecto al comportamiento anterior.

    for (const idChofer of this.choferesSeleccionadosIds) {
      const entry = this.choferesDirectosBase.find(x => x.chofer.idChofer === idChofer);
      if (!entry) continue;
      const chofer = entry.chofer;
      const vehiculoUnico = entry.vehiculos.length === 1 ? entry.vehiculos[0] : null;

      items.push({
        idItem: crypto.randomUUID(),
        idCliente,
        sujeto: { tipo: 'directo', idChofer: chofer.idChofer, idVehiculo: vehiculoUnico?.id ?? null },
        ref: {
          dominio: vehiculoUnico?.dominio ?? '',
          categoria: vehiculoUnico?.categoria ?? { catOrden: 0, nombre: '' },
          asignadoA: {
            tipo: 'chofer',
            idChofer: chofer.idChofer,
            nombre: chofer.datosPersonales.nombre,
            apellido: chofer.datosPersonales.apellido,
          },
        },
        observacion: '',
        hojaDeRuta: '',
        idOperacion: null,
        estado: { estado: 'activa' },
      });
    }

    for (const idProveedor of this.proveedoresSeleccionadosIds) {
      const entry = this.proveedoresBase.find(x => x.proveedor.idProveedor === idProveedor);
      if (!entry) continue;
      const proveedor = entry.proveedor;
      const vehiculoUnico = entry.vehiculos.length === 1 ? entry.vehiculos[0] : null;

      items.push({
        idItem: crypto.randomUUID(),
        idCliente,
        sujeto: { tipo: 'proveedor', idProveedor: proveedor.idProveedor, idChofer: null, idVehiculo: vehiculoUnico?.id ?? null },
        ref: {
          dominio: vehiculoUnico?.dominio ?? '',
          categoria: vehiculoUnico?.categoria ?? { catOrden: 0, nombre: '' },
          asignadoA: {
            tipo: 'proveedor',
            idProveedor: proveedor.idProveedor,
            razonSocial: proveedor.razonSocial,
          },
        },
        observacion: '',
        hojaDeRuta: '',
        idOperacion: null,
        estado: { estado: 'activa' },
      });
    }

    return items;
  }

  async altaOp(): Promise<void> {
    if (!this.fechaSeleccionada) {
      Swal.fire({ icon: 'warning', title: 'Sin fecha', text: 'Debe seleccionar una fecha' });
      return;
    }
    if (!this.clienteSeleccionado) {
      Swal.fire({ icon: 'warning', title: 'Sin cliente', text: 'Debe seleccionar un cliente' });
      return;
    }
    if (this.sinVerificar) {
      Swal.fire({ icon: 'warning', title: 'No se pudo verificar la disponibilidad',
        text: 'Todavía se están cargando los datos. Probá de nuevo en unos segundos.' });
      return;
    }
    if (this.choferesSeleccionadosIds.size + this.proveedoresSeleccionadosIds.size === 0) {
      Swal.fire({ icon: 'warning', title: 'Sin selección',
        text: 'Debe seleccionar al menos un chofer o proveedor' });
      return;
    }

    const items = this.armarItems();
    const resultadoCreacion: ResultadoCreacionOps =
      this.operacionService.crearOperacionesDesdeAsignacion(items, this.fechaSeleccionada);

    if (resultadoCreacion.errores.length > 0) {
      const detalle = resultadoCreacion.errores
        .map((e: ErrorCreacionOp) => {
          const cli = this.clientesActivos.find(c => c.idCliente === e.idCliente)?.razonSocial
                      ?? e.idCliente;
          return `• ${cli}: ${e.motivo}`;
        })
        .join('<br>');
      Swal.fire({ icon: 'error', title: 'No se pueden crear las operaciones',
        html: `Hay asignaciones que no se pudieron resolver:<br>${detalle}` });
      return;
    }

    const modalRef = this.modal.open(OperacionesEditorComponent, {
      windowClass: 'modal-super-xl', centered: true, size: 'xl',
    });
    modalRef.componentInstance.operacionesCreadas = resultadoCreacion.creadas;

    let opsFinales: OperacionCreada[];
    try {
      opsFinales = await modalRef.result;
    } catch {
      // dismiss → usuario canceló. Nada persistido; carga-asignacion queda abierto,
      // selección intacta.
      return;
    }

    if (!opsFinales || opsFinales.length === 0) {
      Swal.fire({ icon: 'info', title: 'Sin operaciones',
        text: 'No quedaron operaciones para dar de alta.' });
      return;
    }

    this.isLoading = true;
    try {
      const resultado = await this.operacionService.altaDesdeAsignacion(
        this.fechaSeleccionada, opsFinales, 'bloquear');

      if (resultado.exito) {
        Swal.fire({ icon: 'success', title: 'Operaciones creadas', text: resultado.mensaje });
        this.activeModal.close();
      } else {
        Swal.fire({ icon: 'error', title: 'No se pudo dar de alta', text: resultado.mensaje });
      }
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'Error',
        text: 'Ocurrió un problema al dar de alta las operaciones.' });
    } finally {
      this.isLoading = false;
    }
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
