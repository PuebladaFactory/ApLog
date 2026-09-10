import { Component, OnDestroy, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { merge, Subject, takeUntil } from 'rxjs';
import { ConIdType } from 'src/app/interfaces/conId';
import { Cliente } from 'src/app/interfaces/cliente';
import { Chofer } from 'src/app/interfaces/chofer';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { EntidadTipo, MetadataAumento } from 'src/app/interfaces/tarifa';
import { TarifaEspecial } from 'src/app/interfaces/tarifa-especial';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
import { TarifaEspecialFormData } from 'src/app/servicios/tarifario/tarifa-especial-factory.service';
import { TarifaGuardadoService } from 'src/app/servicios/tarifario/tarifa-guardado.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';

interface EntidadOpcion {
  id: string;
  nombre: string;
}

@Component({
  selector: 'app-tarifas-especial',
  templateUrl: './tarifas-especial.component.html',
  styleUrls: ['./tarifas-especial.component.scss'],
  standalone: false,
})
export class TarifasEspecialComponent implements OnInit, OnDestroy {

  entidadTipo: EntidadTipo = 'cliente';
  clientesHabilitados: ConIdType<Cliente>[] = [];
  choferesHabilitados: ConIdType<Chofer>[] = [];
  proveedoresHabilitados: ConIdType<Proveedor>[] = [];
  /** Sin filtrar por capacidad — para resolver nombres de alcance en el
   *  listado/viewer (una tarifa especial de chofer/proveedor puede tener
   *  alcance acotado a CUALQUIER cliente, no solo los habilitados para
   *  'especial'). */
  clientesTodos: ConIdType<Cliente>[] = [];

  entidadSeleccionada: EntidadOpcion | null = null;
  tarifas: ConIdType<TarifaEspecial>[] = [];
  modo: 'listado' | 'viewer' | 'form' | 'aumento' | 'duplicar' | 'historial' = 'listado';
  tarifaSeleccionada: ConIdType<TarifaEspecial> | null = null;
  historial: ConIdType<TarifaEspecial>[] = [];
  tarifaHistorialSeleccionada: ConIdType<TarifaEspecial> | null = null;
  entidadDestino: EntidadOpcion | null = null;
  puedeEditar = false;
  guardando = false;

  private destroy$ = new Subject<void>();
  private cambioEntidad$ = new Subject<void>();

  constructor(
    private clienteService: ClienteService,
    private choferService: ChoferService,
    private proveedorService: ProveedorService,
    private tarifarioService: TarifarioService,
    private tarifaGuardadoService: TarifaGuardadoService,
    private usuarioSesion: UsuarioSesionService,
  ) {}

  ngOnInit(): void {
    const usuario = this.usuarioSesion.getUsuarioActual();
    this.puedeEditar = !!usuario && ['dev', 'admin'].includes(usuario.role);

    this.clienteService.getActivos()
      .pipe(takeUntil(this.destroy$))
      .subscribe(clientes => {
        this.clientesTodos = clientes;
        this.clientesHabilitados = clientes.filter(c => c.tarifasHabilitadas.some(t => t.nivel === 'especial'));
      });

    this.choferService.getActivos()
      .pipe(takeUntil(this.destroy$))
      .subscribe(choferes => {
        // Choferes de proveedor tienen tarifasHabilitadas === null (heredan
        // del proveedor, no pueden tener especial propia) — se excluyen acá.
        this.choferesHabilitados = choferes.filter(c => c.tarifasHabilitadas !== null && c.tarifasHabilitadas.some(t => t.nivel === 'especial'));
      });

    this.proveedorService.getActivos()
      .pipe(takeUntil(this.destroy$))
      .subscribe(proveedores => {
        this.proveedoresHabilitados = proveedores.filter(p => p.tarifasHabilitadas.some(t => t.nivel === 'especial'));
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cambioEntidad$.complete();
  }

  get opcionesEntidad(): EntidadOpcion[] {
    if (this.entidadTipo === 'cliente') {
      return [...this.clientesHabilitados]
        .sort((a, b) => a.razonSocial.localeCompare(b.razonSocial, 'es', { sensitivity: 'base' }))
        .map(c => ({ id: c.idCliente, nombre: c.razonSocial }));
    }
    if (this.entidadTipo === 'chofer') {
      return [...this.choferesHabilitados]
        .sort((a, b) => {
          const porApellido = a.datosPersonales.apellido.localeCompare(b.datosPersonales.apellido, 'es', { sensitivity: 'base' });
          if (porApellido !== 0) return porApellido;
          return a.datosPersonales.nombre.localeCompare(b.datosPersonales.nombre, 'es', { sensitivity: 'base' });
        })
        .map(c => ({ id: c.idChofer, nombre: `${c.datosPersonales.apellido}, ${c.datosPersonales.nombre}` }));
    }
    return [...this.proveedoresHabilitados]
      .sort((a, b) => a.razonSocial.localeCompare(b.razonSocial, 'es', { sensitivity: 'base' }))
      .map(p => ({ id: p.idProveedor, nombre: p.razonSocial }));
  }

  /** Mismo entidadTipo que la entidad actual (no tiene sentido duplicar el
   *  parche de una columna a otra). Incluye a la entidad actual — duplicar a
   *  la misma entidad es un flujo válido (crea un linaje nuevo e
   *  independiente, sin tocar el original) desde el ajuste del 10/09/2026.
   *  El `.html` avisa cuando se elige la misma entidad vigente. */
  get opcionesEntidadDestino(): EntidadOpcion[] {
    return this.opcionesEntidad;
  }

  get duplicandoALaMismaEntidad(): boolean {
    return this.entidadDestino?.id === this.entidadSeleccionada?.id;
  }

  onCambioEntidadTipo(e: any): void {
    this.entidadTipo = e.target.value as EntidadTipo;
    this.entidadSeleccionada = null;
    this.tarifaSeleccionada = null;
    this.historial = [];
    this.tarifaHistorialSeleccionada = null;
    this.modo = 'listado';
    this.cambioEntidad$.next();
    this.tarifas = [];
  }

  private suscribirTarifasDe(idEntidad: string): void {
    this.cambioEntidad$.next();
    this.tarifarioService.tarifasEspeciales$
      .pipe(takeUntil(merge(this.destroy$, this.cambioEntidad$)))
      .subscribe(() => {
        this.tarifas = this.tarifarioService.getTarifasEspecialesVigentes(idEntidad);
      });
  }

  seleccionarEntidad(e: any): void {
    const id: string = e.target.value;
    const entidad = this.opcionesEntidad.find(o => o.id === id) ?? null;
    this.entidadSeleccionada = entidad;
    this.tarifaSeleccionada = null;
    this.historial = [];
    this.tarifaHistorialSeleccionada = null;
    this.modo = 'listado';

    if (!entidad) {
      this.cambioEntidad$.next();
      this.tarifas = [];
      return;
    }

    this.suscribirTarifasDe(entidad.id);
  }

  /** Nombre a mostrar para tarifa.alcance cuando es 'entidadCliente' —
   *  resuelto acá porque el viewer/form no inyectan ClienteService. */
  nombreClientePorId(idCliente: string): string | null {
    return this.clientesTodos.find(c => c.idCliente === idCliente)?.razonSocial ?? null;
  }

  ver(tarifa: ConIdType<TarifaEspecial>): void {
    this.tarifaSeleccionada = tarifa;
    this.modo = 'viewer';
  }

  volverAlListado(): void {
    this.tarifaSeleccionada = null;
    this.modo = 'listado';
  }

  nuevaTarifa(): void {
    this.tarifaSeleccionada = null;
    this.modo = 'form';
  }

  editar(): void {
    if (!this.tarifaSeleccionada) return;
    this.modo = 'form';
  }

  async onGuardado(formData: TarifaEspecialFormData): Promise<void> {
    this.guardando = true;
    const ok = await this.tarifaGuardadoService.guardarTarifaEspecial(formData, this.tarifaSeleccionada);
    this.guardando = false;
    if (ok) { this.modo = 'listado'; }
  }

  onCancelarForm(): void {
    this.modo = this.tarifaSeleccionada ? 'viewer' : 'listado';
  }

  aumentar(): void {
    if (!this.tarifaSeleccionada) return;
    this.modo = 'aumento';
  }

  async onAumentoGuardado(formData: TarifaEspecialFormData): Promise<void> {
    this.guardando = true;
    const ok = await this.tarifaGuardadoService.guardarTarifaEspecial(formData, this.tarifaSeleccionada, 'Aumento aplicado');
    this.guardando = false;
    if (ok) { this.modo = 'listado'; }
  }

  onAumentoCancelado(): void {
    this.modo = 'viewer';
  }

  duplicar(): void {
    if (!this.tarifaSeleccionada) return;
    this.entidadDestino = null;
    this.modo = 'duplicar';
  }

  seleccionarEntidadDestino(e: any): void {
    const id: string = e.target.value;
    this.entidadDestino = this.opcionesEntidadDestino.find(o => o.id === id) ?? null;
  }

  async onDuplicarGuardado(formData: TarifaEspecialFormData): Promise<void> {
    if (!this.entidadDestino) return;
    this.guardando = true;
    const ok = await this.tarifaGuardadoService.guardarTarifaEspecial(formData, null);
    this.guardando = false;
    if (!ok) return;

    const destino = this.entidadDestino;
    this.entidadSeleccionada = destino;
    this.entidadDestino = null;
    this.tarifaSeleccionada = null;
    this.modo = 'listado';
    this.suscribirTarifasDe(destino.id);
  }

  onDuplicarCancelado(): void {
    this.entidadDestino = null;
    this.modo = 'viewer';
  }

  /** Baja definitiva sin reemplazo — mismo criterio que
   *  TarifasPersonalizadaComponent.darDeBaja(): irreversible, sin reactivar. */
  async darDeBaja(): Promise<void> {
    if (!this.tarifaSeleccionada) return;
    const respuesta = await Swal.fire({
      title: 'Dar de baja esta tarifa',
      html: 'Esta acción es <strong>definitiva</strong> y no se puede deshacer. La tarifa dejará de estar disponible como opción para operaciones nuevas.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, dar de baja',
      cancelButtonText: 'Cancelar',
    });
    if (!respuesta.isConfirmed) return;

    this.guardando = true;
    const ok = await this.tarifaGuardadoService.darDeBajaTarifaEspecial(this.tarifaSeleccionada);
    this.guardando = false;
    if (ok) {
      this.tarifaSeleccionada = null;
      this.modo = 'listado';
    }
  }

  /** Historial del LINAJE de la tarifa que se está viendo — reconstruye la
   *  cadena de versiones siguiendo versionAnteriorId hacia atrás desde
   *  tarifaSeleccionada (que siempre es la vigente de su linaje, ya que solo
   *  se llega acá desde el viewer). No confundir con la pestaña "Historial"
   *  (TarifasHistorialComponent): esa muestra TODOS los linajes de Especial
   *  (y Personalizada) de una entidad; esto muestra solo el linaje puntual
   *  de la tarifa que se estaba viendo — una entidad puede tener varias
   *  tarifas especiales vigentes a la vez (distinto alcance), cada una con
   *  su propio linaje independiente. */
  verHistorial(): void {
    const vigente = this.tarifaSeleccionada;
    if (!vigente) return;
    const propias = this.tarifarioService.getTarifasEspecialesActuales()
      .filter(t => t.idEntidadDueño === vigente.idEntidadDueño && t.entidadTipo === vigente.entidadTipo);
    const porId = new Map(propias.map(t => [t.idTarifa, t]));
    const cadena: ConIdType<TarifaEspecial>[] = [vigente];
    let actual: ConIdType<TarifaEspecial> = vigente;
    while (actual.versionAnteriorId) {
      const anterior = porId.get(actual.versionAnteriorId);
      if (!anterior) break;
      cadena.push(anterior);
      actual = anterior;
    }
    this.historial = cadena;
    this.tarifaHistorialSeleccionada = null;
    this.modo = 'historial';
  }

  verVersionHistorial(t: ConIdType<TarifaEspecial>): void {
    this.tarifaHistorialSeleccionada = t;
  }

  volverDesdeVersion(): void {
    this.tarifaHistorialSeleccionada = null;
  }

  volverDesdeHistorial(): void {
    this.modo = 'viewer';
    this.tarifaHistorialSeleccionada = null;
  }

  /** % de variación aproximado contra la versión inmediata anterior del
   *  mismo linaje — mismo criterio que TarifasHistorialComponent.
   *  deltaEspecial (Especial tiene un solo `valor` por categoría, no
   *  aCobrar/aPagar separados). null si no hay anterior o si la base es 0. */
  deltaEspecial(actual: ConIdType<TarifaEspecial>, anterior?: ConIdType<TarifaEspecial>): number | null {
    if (!anterior) return null;
    const sumar = (t: ConIdType<TarifaEspecial>) =>
      t.secciones.flatMap(s => s.categorias).reduce((acc, c) => acc + c.valor, 0);
    const base = sumar(anterior);
    if (base === 0) return null;
    return ((sumar(actual) - base) / base) * 100;
  }

  /** Texto descriptivo de metadataAumento — mismo criterio que
   *  TarifasGeneralComponent/TarifasHistorialComponent. */
  textoAumento(t: { metadataAumento?: MetadataAumento }): string | null {
    const m = t.metadataAumento;
    if (!m) return null;
    const redondeo = m.redondeo ? `, redondeo ${m.redondeo}` : '';
    const ajuste = m.ajustadoManualmente ? ' (con ajuste manual)' : '';
    if (m.modo === 'manual') return `Aumento manual${redondeo}`;
    if (m.modo === 'unico') return `Aumento único +${m.porcentajeUnico}%${redondeo}${ajuste}`;
    const partes = [
      m.porcentajeCobrar !== undefined ? `cobrar +${m.porcentajeCobrar}%` : null,
      m.porcentajePagar !== undefined ? `pagar +${m.porcentajePagar}%` : null,
      m.porcentajeProveedor !== undefined ? `proveedor +${m.porcentajeProveedor}%` : null,
    ].filter((p): p is string => p !== null);
    return `Aumento segmentado — ${partes.join(', ')}${redondeo}${ajuste}`;
  }
}
