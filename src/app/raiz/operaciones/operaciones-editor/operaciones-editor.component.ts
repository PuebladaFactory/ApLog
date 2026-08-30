import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Operacion } from 'src/app/interfaces/operacion';
import { AsignacionItem } from 'src/app/interfaces/asignacion';
import { Chofer, Vehiculo, TarifaTipo } from 'src/app/interfaces/chofer';
import { ConIdType } from 'src/app/interfaces/conId';
import { tarifaTipoDesdeHabilitadas } from 'src/app/interfaces/tarifa-habilitada';
import { EntidadTipo } from 'src/app/interfaces/tarifa';
import { OperacionCreada } from 'src/app/servicios/operaciones/operacion.service';
import { OperacionFactoryService } from 'src/app/servicios/operaciones/operacion-factory.service';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { ValoresTarifaService, CandidatoTarifa, CandidatosLado } from 'src/app/servicios/tarifario/valores-tarifa.service';
import Swal from 'sweetalert2';

/** Grupo de exhibición: una tabla por cliente. Viewmodel efímero del componente. */
interface GrupoEditor {
  idCliente:   string;
  razonSocial: string;
  /** tarifaTipo del CLIENTE (informativo, para el badge del encabezado). */
  tipoCliente: 'general' | 'especial' | 'eventual' | 'personalizada';
  creadas:     OperacionCreada[];
}

/** Selección en curso de Sección/Categoría para un lado (cliente o chofer), mientras
 *  el candidato elegido tenga más de una sección (típico Personalizada). Estado de UI
 *  puro — no toca la Operacion hasta que ambos valores > 0. */
interface SeleccionSeccionCategoria {
  candidato: CandidatoTarifa | null;
  seccion:   number;
  categoria: number;
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

  /** Candidatos de tarifa del sistema nuevo (Bloque 6/7), por lado y por op (clave
   *  idItem). Se calculan una vez que chofer y vehículo están resueltos; ausente
   *  mientras alguno esté pendiente o la op sea eventual. */
  private candidatosPorOp = new Map<string, { cliente: CandidatosLado; chofer: CandidatosLado }>();

  /** Candidato elegido + Sección/Categoría en curso por lado y por op (clave idItem).
   *  Estado de UI puro — recién se escribe en op.tarifaAplicadaCliente/Chofer cuando
   *  la resolución (automática o manual) queda completa. */
  private seleccionPorOp = new Map<string, { cliente: SeleccionSeccionCategoria; chofer: SeleccionSeccionCategoria }>();

  /** idItem de las ops cuyo cliente está habilitado para tarifa Personalizada —
   *  en ese caso el lado chofer/proveedor no elige nada propio (ver
   *  recalcularTarifasNuevoSistema/aplicarRef): la Personalizada del cliente
   *  determina ambos lados de la operación (misma tarifa, misma categoría,
   *  aCobrar y aPagar salen del mismo documento). */
  private personalizadaPorOp = new Set<string>();

  fecha: string = "";

  constructor(
    public  activeModal:          NgbActiveModal,
    private operacionFactory:     OperacionFactoryService,
    private clienteService:       ClienteService,
    private choferService:        ChoferService,
    private proveedorService:     ProveedorService,
    private valoresTarifaService: ValoresTarifaService,
  ) {}

  // ===========================================================================
  // INIT — agrupar por cliente + sembrar tarifaOriginal
  // ===========================================================================

  ngOnInit(): void {
    this.fecha = this.operacionesCreadas[0].operacion.fecha;

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
        const clienteVivo = this.clienteService.getClientePorId(idCliente);
        grupo = {
          idCliente,
          razonSocial: c.operacion.cliente.razonSocial,
          tipoCliente: clienteVivo
            // TODO: refactor Tarifas — operaciones-editor con multiplicidad
            ? this.tipoClienteLabel(tarifaTipoDesdeHabilitadas(clienteVivo.tarifasHabilitadas))
            : this.tipoClienteLabel(c.operacion.tarifaTipo),  // fallback: cliente en papelera
          creadas: [],
        };
        mapa.set(idCliente, grupo);
      }
      grupo.creadas.push(c);

      // Candidatos de tarifa (sistema nuevo): se calculan una sola vez por op — si
      // reagrupar() se vuelve a llamar por otro motivo (ej. eliminarOperacion de OTRA
      // fila) no se pisa una selección manual ya hecha.
      if (!this.candidatosPorOp.has(c.item.idItem)) {
        this.recalcularTarifasNuevoSistema(c);
      }
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
      this.operacionFactory.aplicarTarifaTipo(op, nuevoTipo);

      // Re-sembrar el tipo original (este pasa a ser el nuevo punto de retorno del toggle).
      this.tarifaOriginal.set(c.item.idItem, { ...nuevoTipo });
    }

    // Sistema nuevo (Bloque 6/7): el chofer recién resuelto cambia los candidatos
    // del lado chofer — recalcular.
    this.recalcularTarifasNuevoSistema(c);
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
  onVehiculoSeleccionado(c: OperacionCreada, idVehiculo: string): void {
    if (!idVehiculo) return;
    const v = this.choferService.getVehiculoPorId(idVehiculo);
    if (!v) return;
    c.operacion.vehiculo = { id: v.id, dominio: v.dominio, categoria: v.categoria };

    // Sistema nuevo: la categoría del vehículo recién resuelto puede cambiar qué
    // categoría matchea dentro de la tarifa — recalcular.
    this.recalcularTarifasNuevoSistema(c);
  }

  // ===========================================================================
  // TARIFA EVENTUAL (toggle reversible) — delega la mutación en el factory
  // ===========================================================================

  /** True si la op está actualmente en tarifa eventual. */
  esEventual(op: Operacion): boolean {
    return op.tarifaTipo.eventual;
  }

  /** Toggle eventual. La mutación coherente (tarifaTipo + datosTarifaX) vive en el factory.
   *  El punto de retorno es el tarifaOriginal sembrado para esta op. */
  onEventualToggle(c: OperacionCreada, activar: boolean): void {
    const original = this.tarifaOriginal.get(c.item.idItem)
      ?? { ...c.operacion.tarifaTipo };
    this.operacionFactory.aplicarTarifaEventual(c.operacion, activar, original);

    // Sistema nuevo: eventual no usa tarifaAplicada*; al entrar se limpia todo, al
    // salir se recalculan candidatos desde cero (puede haber cambiado el nivel).
    this.recalcularTarifasNuevoSistema(c);
  }

  // ===========================================================================
  // TARIFA CLIENTE / CHOFER-PROVEEDOR (sistema nuevo — Bloque 6/7, mini-frente)
  // ===========================================================================

  /** Recalcula candidatos y, si corresponde, resuelve automáticamente ambos lados para
   *  una op. Se llama al agrupar por primera vez y cada vez que cambia algo que puede
   *  alterar los candidatos: chofer, vehículo o el toggle eventual. */
  private recalcularTarifasNuevoSistema(c: OperacionCreada): void {
    const op = c.operacion;

    if (op.datosTarifaEventual !== null) {
      op.tarifaAplicadaCliente = null;
      op.tarifaAplicadaChofer = null;
      this.candidatosPorOp.delete(c.item.idItem);
      this.seleccionPorOp.delete(c.item.idItem);
      this.personalizadaPorOp.delete(c.item.idItem);
      return;
    }

    if (this.choferPendiente(op) || this.vehiculoPendiente(op)) {
      op.tarifaAplicadaCliente = null;
      op.tarifaAplicadaChofer = null;
      this.candidatosPorOp.delete(c.item.idItem);
      this.seleccionPorOp.delete(c.item.idItem);
      this.personalizadaPorOp.delete(c.item.idItem);
      return;
    }

    const cliente = this.clienteService.getClientePorId(op.cliente.id);
    const chofer = this.choferService.getChoferPorId(op.chofer.id);
    if (!cliente || !chofer) {
      this.candidatosPorOp.delete(c.item.idItem);
      this.seleccionPorOp.delete(c.item.idItem);
      this.personalizadaPorOp.delete(c.item.idItem);
      return;
    }

    const esProveedor = chofer.contratacion.tipo === 'proveedor';
    const idEntidadChofer = esProveedor
      ? (chofer.contratacion as { tipo: 'proveedor'; idProveedor: string }).idProveedor
      : chofer.id;
    const entidadTipoChofer: EntidadTipo = esProveedor ? 'proveedor' : 'chofer';
    const habilitadasChofer = this.proveedorService.resolverTarifasHabilitadasChofer(chofer);

    const ladoCliente = this.valoresTarifaService.listarCandidatosLado(
      'cliente', cliente.id, cliente.tarifasHabilitadas, op.vehiculo.categoria, op.cliente.id);

    // Personalizada es exclusiva de Clientes y determina AMBOS lados de la
    // operación — cuando el cliente está habilitado para personalizada, el
    // chofer/proveedor NO resuelve su propia jerarquía: el lado chofer queda
    // espejado al mismo candidato/referencia que se resuelva del lado cliente
    // (ver aplicarRef).
    const esPersonalizada = tarifaTipoDesdeHabilitadas(cliente.tarifasHabilitadas).personalizada;
    if (esPersonalizada) this.personalizadaPorOp.add(c.item.idItem);
    else this.personalizadaPorOp.delete(c.item.idItem);

    const ladoChofer: CandidatosLado = esPersonalizada
      ? { nivelResuelto: null, candidatos: [], motivoSinCandidatos: null }
      : this.valoresTarifaService.listarCandidatosLado(
          entidadTipoChofer, idEntidadChofer, habilitadasChofer, op.vehiculo.categoria, op.cliente.id);

    this.candidatosPorOp.set(c.item.idItem, { cliente: ladoCliente, chofer: ladoChofer });
    this.seleccionPorOp.delete(c.item.idItem);
    op.tarifaAplicadaCliente = null;
    op.tarifaAplicadaChofer = null;

    this.autoSeleccionarSiCorresponde(c, ladoCliente, 'cliente');
    if (!esPersonalizada) {
      this.autoSeleccionarSiCorresponde(c, ladoChofer, 'chofer');
    }
  }

  /** Si hay un único candidato en el lado, lo selecciona automáticamente (y resuelve
   *  Sección/Categoría si tiene una sola sección). Con 2+ candidatos el usuario elige
   *  a mano en el select — no hay forma automática de desambiguar entre tarifas
   *  vigentes simultáneas. */
  private autoSeleccionarSiCorresponde(c: OperacionCreada, lado: CandidatosLado, cual: 'cliente' | 'chofer'): void {
    if (lado.candidatos.length !== 1) return;
    this.seleccionarTarifa(c, cual, lado.candidatos[0].idTarifa);
  }

  private ensureSeleccion(idItem: string): { cliente: SeleccionSeccionCategoria; chofer: SeleccionSeccionCategoria } {
    let sel = this.seleccionPorOp.get(idItem);
    if (!sel) {
      sel = {
        cliente: { candidato: null, seccion: -1, categoria: -1 },
        chofer:  { candidato: null, seccion: -1, categoria: -1 },
      };
      this.seleccionPorOp.set(idItem, sel);
    }
    return sel;
  }

  private aplicarRef(c: OperacionCreada, cual: 'cliente' | 'chofer', ref: Operacion['tarifaAplicadaCliente']): void {
    const op = c.operacion;
    if (cual === 'cliente') {
      op.tarifaAplicadaCliente = ref;
      // Personalizada determina también el lado chofer/proveedor (ver
      // recalcularTarifasNuevoSistema) — se espeja automáticamente, no hay
      // selección propia del lado chofer que pueda pisar esto.
      if (this.personalizadaPorOp.has(c.item.idItem)) {
        op.tarifaAplicadaChofer = ref;
      }
    } else {
      op.tarifaAplicadaChofer = ref;
    }
  }

  /** Elegir un candidato en el select principal (Tarifa Cliente / Tarifa Chofer-Prov).
   *  Intenta resolver Sección/Categoría automáticamente; si la tarifa tiene más de una
   *  sección queda pendiente de completarse en la fila expandible. */
  private seleccionarTarifa(c: OperacionCreada, cual: 'cliente' | 'chofer', idTarifa: string): void {
    const candidatos = cual === 'cliente' ? this.candidatosCliente(c) : this.candidatosChofer(c);
    const candidato = candidatos.find(cand => cand.idTarifa === idTarifa) ?? null;
    const sel = this.ensureSeleccion(c.item.idItem);
    // Con una sola sección no hay nada que elegir ahí — se preselecciona para que,
    // si hace falta completar a mano, el picker de la fila expandible arranque
    // directo en Categoría (típico Personalizada por km).
    const seccionUnica = candidato?.secciones.length === 1 ? candidato.secciones[0].orden : -1;
    sel[cual] = { candidato, seccion: seccionUnica, categoria: -1 };

    if (!candidato) {
      this.aplicarRef(c, cual, null);
      return;
    }
    const res = this.valoresTarifaService.resolverSeccionCategoria(candidato, c.operacion.vehiculo.categoria);
    this.aplicarRef(c, cual, res.ref);
  }

  onTarifaClienteChange(c: OperacionCreada, idTarifa: string): void {
    this.seleccionarTarifa(c, 'cliente', idTarifa);
  }

  onTarifaChoferChange(c: OperacionCreada, idTarifa: string): void {
    this.seleccionarTarifa(c, 'chofer', idTarifa);
  }

  candidatosCliente(c: OperacionCreada): CandidatoTarifa[] {
    return this.candidatosPorOp.get(c.item.idItem)?.cliente.candidatos ?? [];
  }

  candidatosChofer(c: OperacionCreada): CandidatoTarifa[] {
    return this.candidatosPorOp.get(c.item.idItem)?.chofer.candidatos ?? [];
  }

  /** True si el cliente de la op está habilitado para tarifa Personalizada —
   *  en ese caso el lado chofer/proveedor no elige nada propio (ver
   *  recalcularTarifasNuevoSistema/aplicarRef). */
  clienteEsPersonalizada(c: OperacionCreada): boolean {
    return this.personalizadaPorOp.has(c.item.idItem);
  }

  motivoSinTarifaCliente(c: OperacionCreada): string {
    return this.candidatosPorOp.get(c.item.idItem)?.cliente.motivoSinCandidatos ?? '';
  }

  motivoSinTarifaChofer(c: OperacionCreada): string {
    return this.candidatosPorOp.get(c.item.idItem)?.chofer.motivoSinCandidatos ?? '';
  }

  candidatoElegidoCliente(c: OperacionCreada): CandidatoTarifa | null {
    return this.seleccionPorOp.get(c.item.idItem)?.cliente.candidato ?? null;
  }

  candidatoElegidoChofer(c: OperacionCreada): CandidatoTarifa | null {
    return this.seleccionPorOp.get(c.item.idItem)?.chofer.candidato ?? null;
  }

  /** True si el lado tiene un candidato elegido con más de una sección — requiere
   *  completar Sección/Categoría a mano en la fila expandible (típico Personalizada). */
  requiereSeccionClienteManual(c: OperacionCreada): boolean {
    const cand = this.candidatoElegidoCliente(c);
    if (!cand) return false;
    if (cand.secciones.length > 1) return true;
    // Personalizada por km con 2+ categorías libres en su única sección: tampoco se
    // puede resolver sola (no matchean por categoría de vehículo) — mismo picker manual.
    return cand.modoTarifacion === 'km' && (cand.secciones[0]?.categorias.length ?? 0) > 1;
  }

  requiereSeccionChoferManual(c: OperacionCreada): boolean {
    const cand = this.candidatoElegidoChofer(c);
    if (!cand) return false;
    if (cand.secciones.length > 1) return true;
    return cand.modoTarifacion === 'km' && (cand.secciones[0]?.categorias.length ?? 0) > 1;
  }

  seccionesDisponiblesCliente(c: OperacionCreada) {
    return this.candidatoElegidoCliente(c)?.secciones ?? [];
  }

  seccionesDisponiblesChofer(c: OperacionCreada) {
    return this.candidatoElegidoChofer(c)?.secciones ?? [];
  }

  categoriasDisponiblesCliente(c: OperacionCreada): any[] {
    const sel = this.seleccionPorOp.get(c.item.idItem)?.cliente;
    const sec = sel?.candidato?.secciones.find(s => s.orden === sel.seccion);
    return sec?.categorias ?? [];
  }

  categoriasDisponiblesChofer(c: OperacionCreada): any[] {
    const sel = this.seleccionPorOp.get(c.item.idItem)?.chofer;
    const sec = sel?.candidato?.secciones.find(s => s.orden === sel.seccion);
    return sec?.categorias ?? [];
  }

  seccionEnCursoCliente(c: OperacionCreada): number {
    return this.seleccionPorOp.get(c.item.idItem)?.cliente.seccion ?? 0;
  }

  categoriaEnCursoCliente(c: OperacionCreada): number {
    return this.seleccionPorOp.get(c.item.idItem)?.cliente.categoria ?? 0;
  }

  seccionEnCursoChofer(c: OperacionCreada): number {
    return this.seleccionPorOp.get(c.item.idItem)?.chofer.seccion ?? 0;
  }

  categoriaEnCursoChofer(c: OperacionCreada): number {
    return this.seleccionPorOp.get(c.item.idItem)?.chofer.categoria ?? 0;
  }

  private actualizarSeccionCategoria(c: OperacionCreada, cual: 'cliente' | 'chofer', ordenSeccion: number, ordenCategoria: number): void {
    const sel = this.ensureSeleccion(c.item.idItem)[cual];
    sel.seccion = ordenSeccion;
    sel.categoria = ordenCategoria;
    if (sel.candidato && ordenSeccion >= 0 && ordenCategoria >= 0) {
      const ref = this.valoresTarifaService.armarRefManual(sel.candidato, ordenSeccion, ordenCategoria);
      this.aplicarRef(c, cual, ref);
    } else {
      this.aplicarRef(c, cual, null);
    }
  }

  onSeccionClienteChange(c: OperacionCreada, orden: number): void {
    this.actualizarSeccionCategoria(c, 'cliente', orden, -1);
  }

  onCategoriaClienteChange(c: OperacionCreada, orden: number): void {
    this.actualizarSeccionCategoria(c, 'cliente', this.seccionEnCursoCliente(c), orden);
  }

  onSeccionChoferChange(c: OperacionCreada, orden: number): void {
    this.actualizarSeccionCategoria(c, 'chofer', orden, -1);
  }

  onCategoriaChoferChange(c: OperacionCreada, orden: number): void {
    this.actualizarSeccionCategoria(c, 'chofer', this.seccionEnCursoChofer(c), orden);
  }

  /** True si la fila tiene algo para mostrar en la sección expandible: campos de
   *  Eventual, o Sección/Categoría pendiente de completar a mano en algún lado. */
  mostrarDetalle(c: OperacionCreada): boolean {
    return this.esEventual(c.operacion)
      || this.requiereSeccionClienteManual(c)
      || this.requiereSeccionChoferManual(c);
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

    if (op.datosTarifaEventual) {
      if (!op.datosTarifaEventual.chofer.concepto)  errores.push('Concepto chofer');
      if (!op.datosTarifaEventual.cliente.concepto) errores.push('Concepto cliente');
    } else if (op.chofer.id !== '' && op.vehiculo.id !== '') {
      // Exigible recién con chofer y vehículo resueltos: los candidatos de tarifa
      // dependen de ambos.
      if (!op.tarifaAplicadaCliente) errores.push('Falta resolver tarifa cliente');
      if (!op.tarifaAplicadaChofer)  errores.push('Falta resolver tarifa chofer/proveedor');
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
