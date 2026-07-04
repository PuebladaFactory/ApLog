import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import { AsignacionItem } from 'src/app/interfaces/asignacion';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConIdType } from 'src/app/interfaces/conId';
import { NoDisponibilidadChofer } from 'src/app/interfaces/no-disponibilidad-chofer';

import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { OperacionService, OperacionCreada, ResultadoCreacionOps, ErrorCreacionOp } from 'src/app/servicios/operaciones/operacion.service';
import { AsignacionService } from 'src/app/servicios/operaciones/asignacion.service';
import { StorageService } from 'src/app/servicios/storage/storage.service'; // TODO: refactor Tarifas
import { OperacionesEditorComponent } from 'src/app/raiz/operaciones/operaciones-editor/operaciones-editor.component';
import { ModalObjetosActivosComponent } from '../modal-objetos-activos/modal-objetos-activos.component';
import { ModalChoferesNoDisponiblesComponent } from '../modal-choferes-no-disponibles/modal-choferes-no-disponibles.component';

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

  // ---- No-disponibilidad ----
  noDisponibilidades: NoDisponibilidadChofer[] = [];
  noOperativosSet = new Set<string>();

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
    private storageService: StorageService,
    private modal: NgbModal,
    public activeModal: NgbActiveModal,
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
    });

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
    return this.choferesDirectosBase.filter(
      x => !this.noOperativosSet.has(x.chofer.idChofer));
  }

  get choferesDirectosNoOperativos(): ChoferDirectoSeleccionable[] {
    return this.choferesDirectosBase.filter(
      x => this.noOperativosSet.has(x.chofer.idChofer));
  }

  // ---------------------------------------------------------------------------
  // Fecha
  // ---------------------------------------------------------------------------

  async onFechaChange(): Promise<void> {
    if (this.fechaSeleccionada) {
      this.calcularChoferesNoOperativosPorFecha(this.fechaSeleccionada);
    } else {
      this.noOperativosSet.clear();
    }
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

  getMotivoNoDisponibilidad(idChofer: string): string {
    if (!this.fechaSeleccionada) return 'No disponible';
    const fecha = this.fechaSeleccionada;
    const nd = this.noDisponibilidades.find(n => {
      if (n.idChofer !== idChofer) return false;
      return fecha >= n.desde && (!n.hasta || fecha <= n.hasta);
    });
    return nd?.motivo || 'No disponible';
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
      // TODO: migrar ModalChoferesNoDisponiblesComponent al modelo nuevo (frente aparte).
      const modalRef = this.modal.open(ModalChoferesNoDisponiblesComponent, { centered: true, size: 'lg', });
    }
}
