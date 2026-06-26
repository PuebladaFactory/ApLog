import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Operacion, RefChofer, RefVehiculo } from 'src/app/interfaces/operacion';
import { AsignacionItem } from 'src/app/interfaces/asignacion';
import { Chofer, Vehiculo, TarifaTipo } from 'src/app/interfaces/chofer';
import { ConIdType } from 'src/app/interfaces/conId';
import { CategoriaTarifa, TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
import { OperacionCreada } from 'src/app/servicios/operaciones/operacion.service';
import { OperacionFactoryService } from 'src/app/servicios/operaciones/operacion-factory.service';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

/** Grupo de exhibición: una tabla por cliente. Viewmodel efímero del componente. */
interface GrupoEditor {
  idCliente:   string;
  razonSocial: string;
  /** tarifaTipo del CLIENTE (informativo, para el badge del encabezado). */
  tipoCliente: 'general' | 'especial' | 'eventual' | 'personalizada';
  creadas:     OperacionCreada[];
}

@Component({
  selector: 'app-operaciones-editor',
  standalone: false,
  templateUrl: './operaciones-editor.component.html',
  styleUrls: ['./operaciones-editor.component.scss'],
})
export class OperacionesEditorComponent implements OnInit {

  /** Entrada del modal: lista PLANA de ops creadas (el componente agrupa internamente). */
  @Input() operacionesCreadas: OperacionCreada[] = [];

  /** Grupos por cliente (derivados en ngOnInit). */
  grupos: GrupoEditor[] = [];

  /** idItem de las ops eliminadas (Opción B): se ocultan del render y se excluyen
   *  del resultado, SIN mutar destructivamente operacionesCreadas. Cancelar = inocuo. */
  private eliminados = new Set<string>();

  /** tarifaTipo original de cada op (clave idItem), para volver atrás del toggle eventual.
   *  Estado de UI puro; no ensucia la Operacion. */
  private tarifaOriginal = new Map<string, TarifaTipo>();

  /** Catálogo de tarifas personalizadas (módulo Tarifas no migrado).
   *  TODO: refactor Tarifas — leer del sistema unificado en vez de StorageService. */
  tarifasPersonalizadas: TarifaPersonalizadaCliente[] = [];

  constructor(
    public  activeModal:      NgbActiveModal,
    private operacionFactory: OperacionFactoryService,
    private clienteService:   ClienteService,
    private choferService:    ChoferService,
    private proveedorService: ProveedorService,
    private storageService:   StorageService,
  ) {}

  // ===========================================================================
  // INIT — agrupar por cliente + sembrar tarifaOriginal
  // ===========================================================================

  ngOnInit(): void {
    this.tarifasPersonalizadas = this.storageService.loadInfo('tarifasPersCliente') || [];

    // Sembrar el tipo original de cada op (antes de cualquier toggle).
    for (const c of this.operacionesCreadas) {
      this.tarifaOriginal.set(c.item.idItem, { ...c.operacion.tarifaTipo });
    }

    this.reagrupar();
  }

  /** Reconstruye los grupos desde operacionesCreadas, excluyendo eliminadas. */
  private reagrupar(): void {
    const mapa = new Map<string, GrupoEditor>();

    for (const c of this.operacionesCreadas) {
      if (this.eliminados.has(c.item.idItem)) continue;

      const idCliente = c.item.idCliente;
      let grupo = mapa.get(idCliente);
      if (!grupo) {
        grupo = {
          idCliente,
          razonSocial: c.operacion.cliente.razonSocial,
          tipoCliente: this.tipoClienteLabel(c.operacion.tarifaTipo),
          creadas: [],
        };
        mapa.set(idCliente, grupo);
      }
      grupo.creadas.push(c);
    }

    this.grupos = Array.from(mapa.values());
  }

  /** Etiqueta del badge de cliente. NOTA: usa el tarifaTipo de la PRIMERA op del
   *  cliente como referencia de exhibición (todas las ops del mismo cliente comparten
   *  la tarifa de cliente; la eventual es override por op, no cambia la del cliente). */
  private tipoClienteLabel(t: TarifaTipo): GrupoEditor['tipoCliente'] {
    if (t.personalizada) return 'personalizada';
    if (t.especial)      return 'especial';
    if (t.eventual)      return 'eventual';
    return 'general';
  }

  // ===========================================================================
  // PENDIENTE: CHOFER (caso proveedor — op.chofer.id === '')
  // ===========================================================================

  /** True si la op tiene el chofer pendiente de resolver. */
  choferPendiente(op: Operacion): boolean {
    return op.chofer.id === '';
  }

  /** Choferes disponibles para resolver el pendiente: los del proveedor de la op. */
  choferesDisponibles(op: Operacion): ConIdType<Chofer>[] {
    if (!op.proveedor) return [];
    return this.choferService.getChoferesPorProveedor(op.proveedor.id);
  }

  /** Resuelve el chofer pendiente: puebla RefChofer, recalcula tarifaTipo con la tarifa
   *  del PROVEEDOR (no del chofer, que la hereda) y re-siembra el tipo original. */
  onChoferSeleccionado(c: OperacionCreada, idChofer: string): void {
    const op = c.operacion;
    if (!idChofer) return;

    const chofer = this.choferService.getChoferPorId(idChofer);
    if (!chofer) return;

    op.chofer = {
      id:       chofer.id,
      nombre:   chofer.datosPersonales.nombre,
      apellido: chofer.datosPersonales.apellido,
      cuit:     chofer.datosPersonales.cuit,
    };

    // Recalcular tarifaTipo. Cliente vivo + tarifa secundaria del proveedor.
    const cliente = this.clienteService.getClientePorId(op.cliente.id);
    if (cliente) {
      const tarifaProveedor = op.proveedor
        ? this.proveedorService.getTarifaTipo(op.proveedor.id)
        : undefined;
      const nuevoTipo = this.operacionFactory.recalcularTarifaTipo(cliente, tarifaProveedor);

      // Aplicar el nuevo tipo manteniendo el invariante de datosTarifaX.
      // Reusamos aplicarTarifaEventual: si el tipo recalculado NO es eventual, lo
      // aplicamos como "desactivar eventual hacia nuevoTipo"; si ES eventual, "activar".
      this.operacionFactory.aplicarTarifaEventual(op, nuevoTipo.eventual, nuevoTipo);

      // Re-sembrar el tipo original (este pasa a ser el nuevo punto de retorno del toggle).
      this.tarifaOriginal.set(c.item.idItem, { ...nuevoTipo });
    }
  }

  // ===========================================================================
  // PENDIENTE: VEHÍCULO (directo multi-vehículo o proveedor — op.vehiculo.id === '')
  // ===========================================================================

  /** True si la op tiene el vehículo pendiente de resolver. */
  vehiculoPendiente(op: Operacion): boolean {
    return op.vehiculo.id === '';
  }

  /** Vehículos disponibles: del proveedor si la op es de proveedor, del chofer si es directa.
   *  Filtro síncrono inline sobre getVehiculosActuales (no suscripción: el editor edita). */
  vehiculosDisponibles(op: Operacion): ConIdType<Vehiculo>[] {
    const vehiculos = this.choferService.getVehiculosActuales();
    if (op.proveedor) {
      return vehiculos.filter(v =>
        v.asignadoA.tipo === 'proveedor' && v.asignadoA.idProveedor === op.proveedor!.id);
    }
    if (op.chofer.id) {
      return vehiculos.filter(v =>
        v.asignadoA.tipo === 'chofer' && v.asignadoA.idChofer === op.chofer.id);
    }
    return [];
  }

  /** Resuelve el vehículo pendiente: puebla RefVehiculo desde el Vehiculo elegido. */
  onVehiculoSeleccionado(op: Operacion, idVehiculo: string): void {
    if (!idVehiculo) return;
    const v = this.choferService.getVehiculoPorId(idVehiculo);
    if (!v) return;
    op.vehiculo = { id: v.id, dominio: v.dominio, categoria: v.categoria };
  }

  // ===========================================================================
  // TARIFA EVENTUAL (toggle reversible) — delega la mutación en el factory
  // ===========================================================================

  /** True si la op está actualmente en tarifa eventual. */
  esEventual(op: Operacion): boolean {
    return op.tarifaTipo.eventual;
  }

  /** True si la op está actualmente en tarifa personalizada. */
  esPersonalizada(op: Operacion): boolean {
    return op.tarifaTipo.personalizada;
  }

  /** Toggle eventual. La mutación coherente (tarifaTipo + datosTarifaX) vive en el factory.
   *  El punto de retorno es el tarifaOriginal sembrado para esta op. */
  onEventualToggle(c: OperacionCreada, activar: boolean): void {
    const original = this.tarifaOriginal.get(c.item.idItem)
      ?? { ...c.operacion.tarifaTipo };
    this.operacionFactory.aplicarTarifaEventual(c.operacion, activar, original);
  }

  // ===========================================================================
  // TARIFA PERSONALIZADA (rescatado de operaciones-table, retipado a Operacion real)
  // ===========================================================================

  /** TODO: refactor Tarifas — idCliente de TarifaPersonalizadaCliente es number (módulo
   *  no migrado); se cruza con op.cliente.id (string) vía Number(). Quitar al unificar. */
  getTarifaPersonalizada(idCliente: string): TarifaPersonalizadaCliente | null {
    return this.tarifasPersonalizadas.find(t => t.idCliente === Number(idCliente)) || null;
  }

  getCategoriasDisponibles(op: Operacion): CategoriaTarifa[] {
    if (!op.tarifaTipo.personalizada || !op.datosTarifaPersonalizada) return [];
    const tarifa = this.getTarifaPersonalizada(op.cliente.id);
    const seccion = tarifa?.secciones.find(s => s.orden === +op.datosTarifaPersonalizada!.seccion);
    return seccion?.categorias || [];
  }

  onSeccionChange(op: Operacion): void {
    if (!op.datosTarifaPersonalizada) return;
    op.datosTarifaPersonalizada.seccion   = Number(op.datosTarifaPersonalizada.seccion);
    op.datosTarifaPersonalizada.categoria = -1;
    op.datosTarifaPersonalizada.nombre    = '';
    op.datosTarifaPersonalizada.aCobrar   = 0;
    op.datosTarifaPersonalizada.aPagar    = 0;
  }

  onCategoriaChange(op: Operacion): void {
    if (!op.datosTarifaPersonalizada) return;
    op.datosTarifaPersonalizada.categoria = Number(op.datosTarifaPersonalizada.categoria);

    const tarifa = this.getTarifaPersonalizada(op.cliente.id);
    if (!tarifa) return;

    const sec = tarifa.secciones.find(s => s.orden === +op.datosTarifaPersonalizada!.seccion);
    const cat = sec?.categorias.find(c => c.orden === +op.datosTarifaPersonalizada!.categoria);
    if (cat) {
      op.datosTarifaPersonalizada.nombre  = cat.nombre;
      op.datosTarifaPersonalizada.aCobrar = cat.aCobrar;
      op.datosTarifaPersonalizada.aPagar  = cat.aPagar;
    }
  }

  getSeccionSeleccionadaLabel(op: Operacion): string {
    if (!op.datosTarifaPersonalizada) return '';
    const tarifa = this.getTarifaPersonalizada(op.cliente.id);
    const sec = tarifa?.secciones.find(s => s.orden === op.datosTarifaPersonalizada!.seccion);
    return sec ? `Sección ${sec.orden}` : '';
  }

  getCategoriaSeleccionadaLabel(op: Operacion): string {
    if (!op.datosTarifaPersonalizada) return '';
    const cats = this.getCategoriasDisponibles(op);
    const cat = cats.find(c => c.orden === op.datosTarifaPersonalizada!.categoria);
    return cat ? `Categoría ${cat.orden}: ${cat.nombre}` : '';
  }

  // ===========================================================================
  // BADGE INFORMATIVO: tarifa del chofer (resuelta por ID, no congelada)
  // ===========================================================================

  /** Tarifa del chofer, para exhibición. Directo: chofer.tarifaTipo. Proveedor: la hereda
   *  (ProveedorService.getTarifaTipo). Resuelta por ID — no está en el snapshot.
   *  TODO: refactor Tarifas — rama especial deshabilitada en cálculo; acá es solo display. */
  getChoferTarifaTipo(op: Operacion): 'General' | 'Especial' | 'Eventual' {
    if (op.chofer.id === '') return 'General';
    let tarifa: TarifaTipo | undefined;
    if (op.proveedor) {
      tarifa = this.proveedorService.getTarifaTipo(op.proveedor.id);
    } else {
      tarifa = this.choferService.getChoferPorId(op.chofer.id)?.tarifaTipo;
    }
    if (tarifa?.eventual) return 'Eventual';
    if (tarifa?.especial) return 'Especial';
    return 'General';
  }

  // ===========================================================================
  // ACOMPAÑANTE (rescatado tal cual)
  // ===========================================================================

  configurarAcompaniante(op: Operacion): void {
    op.acompanianteCant = op.acompaniante ? 1 : 0;
  }

  configurarCantAcompaniante(op: Operacion): void {
    if (op.acompanianteCant === 0)                      op.acompaniante = false;
    if (op.acompanianteCant && op.acompanianteCant > 0) op.acompaniante = true;
  }

  // ===========================================================================
  // VALIDACIÓN
  // ===========================================================================

  validarOperacion(op: Operacion): string[] {
    const errores: string[] = [];

    if (op.chofer.id === '')   errores.push('Falta chofer');
    if (op.vehiculo.id === '') errores.push('Falta vehículo');

    if (op.tarifaTipo.personalizada) {
      if (!op.datosTarifaPersonalizada || op.datosTarifaPersonalizada.seccion <= 0)
        errores.push('Falta sección');
      if (!op.datosTarifaPersonalizada || op.datosTarifaPersonalizada.categoria <= 0)
        errores.push('Falta categoría');
    }

    if (op.tarifaTipo.eventual) {
      if (!op.datosTarifaEventual || !op.datosTarifaEventual.chofer.concepto)
        errores.push('Concepto chofer');
      if (!op.datosTarifaEventual || !op.datosTarifaEventual.cliente.concepto)
        errores.push('Concepto cliente');
    }

    if (op.acompaniante && op.acompanianteCant === 0)
      errores.push('La cantidad de acompañantes no puede ser 0');

    return errores;
  }

  tieneErrores(op: Operacion): boolean {
    return this.validarOperacion(op).length > 0;
  }

  // ===========================================================================
  // ACCIONES
  // ===========================================================================

  /** Eliminar = excluir del resultado (Opción B). NO toca Firestore, NO muta el input.
   *  Marca el idItem y reagrupa. */
  eliminarOperacion(c: OperacionCreada): void {
    Swal.fire({
      title: '¿Eliminar operación?',
      text: 'Se quitará de esta alta. No se da de baja nada (todavía no se guardó).',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then(result => {
      if (result.isConfirmed) {
        this.eliminados.add(c.item.idItem);
        this.reagrupar();
      }
    });
  }

  /** Confirmar: valida todas las ops vigentes; si OK, devuelve operacionesCreadas
   *  SIN las eliminadas (Opción B). Las op se devuelven completadas in-place. */
  confirmar(): void {
    const vigentes = this.operacionesCreadas.filter(c => !this.eliminados.has(c.item.idItem));

    if (vigentes.length === 0) {
      Swal.fire('Sin operaciones', 'No queda ninguna operación para dar de alta.', 'info');
      return;
    }

    const conErrores = vigentes.filter(c => this.tieneErrores(c.operacion));
    if (conErrores.length > 0) {
      Swal.fire(
        'Faltan datos',
        `Hay ${conErrores.length} operación(es) con datos incompletos. Revíselas antes de confirmar.`,
        'warning',
      );
      return;
    }

    this.activeModal.close(vigentes);
  }

  cancelar(): void {
    this.activeModal.dismiss();
  }
}
