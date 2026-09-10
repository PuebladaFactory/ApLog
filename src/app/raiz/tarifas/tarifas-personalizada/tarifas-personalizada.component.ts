import { Component, OnDestroy, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { merge, Subject, takeUntil } from 'rxjs';
import { ConIdType } from 'src/app/interfaces/conId';
import { Cliente } from 'src/app/interfaces/cliente';
import { MetadataAumento, Tarifa } from 'src/app/interfaces/tarifa';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
import { TarifaFormData } from 'src/app/servicios/tarifario/tarifa-factory.service';
import { TarifaGuardadoService } from 'src/app/servicios/tarifario/tarifa-guardado.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';

@Component({
  selector: 'app-tarifas-personalizada',
  templateUrl: './tarifas-personalizada.component.html',
  styleUrls: ['./tarifas-personalizada.component.scss'],
  standalone: false,
})
export class TarifasPersonalizadaComponent implements OnInit, OnDestroy {

  clientes: ConIdType<Cliente>[] = [];
  clienteSeleccionado: ConIdType<Cliente> | null = null;
  tarifas: ConIdType<Tarifa>[] = [];
  modo: 'listado' | 'viewer' | 'form' | 'aumento' | 'duplicar' | 'historial' = 'listado';
  tarifaSeleccionada: ConIdType<Tarifa> | null = null;
  historial: ConIdType<Tarifa>[] = [];
  tarifaHistorialSeleccionada: ConIdType<Tarifa> | null = null;
  clienteDestino: ConIdType<Cliente> | null = null;
  puedeEditar = false;
  guardando = false;

  private destroy$ = new Subject<void>();
  private cambioCliente$ = new Subject<void>();

  constructor(
    private clienteService: ClienteService,
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
        this.clientes = clientes
          .filter(c => c.tarifasHabilitadas.some(t => t.nivel === 'personalizada'))
          .sort((a, b) => a.razonSocial.localeCompare(b.razonSocial, 'es', { sensitivity: 'base' }));
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cambioCliente$.complete();
  }

  /** Suscribe this.tarifas a las personalizadas vigentes del cliente dado,
   *  cortando cualquier suscripción anterior (cambio de cliente propio o
   *  destino de un Duplicar). Factorizado porque seleccionarCliente() y
   *  onDuplicarGuardado() necesitan hacer exactamente esto. */
  private suscribirTarifasDe(cliente: ConIdType<Cliente>): void {
    this.cambioCliente$.next();
    this.tarifarioService.tarifas$
      .pipe(takeUntil(merge(this.destroy$, this.cambioCliente$)))
      .subscribe(() => {
        this.tarifas = this.tarifarioService.getTarifasPersonalizadasVigentes(cliente.idCliente);
      });
  }

  /** (change) crudo del <select>, mismo patrón que selectProvincia/selectMunicipio
   *  en los -alta.component.ts (parámetro `any` para no pelear con strictTemplates). */
  seleccionarCliente(e: any): void {
    const idCliente: string = e.target.value;
    const cliente = this.clientes.find(c => c.idCliente === idCliente) ?? null;
    this.clienteSeleccionado = cliente;
    this.tarifaSeleccionada = null;
    this.historial = [];
    this.tarifaHistorialSeleccionada = null;
    this.modo = 'listado';

    if (!cliente) {
      this.cambioCliente$.next();
      this.tarifas = [];
      return;
    }

    this.suscribirTarifasDe(cliente);
  }

  modoTarifacionLabel(t: ConIdType<Tarifa>): string {
    return t.modoTarifacion === 'km' ? 'Por km' : 'Por categoría';
  }

  ver(tarifa: ConIdType<Tarifa>): void {
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

  async onGuardado(formData: TarifaFormData): Promise<void> {
    this.guardando = true;
    const ok = await this.tarifaGuardadoService.guardarTarifa(formData, this.tarifaSeleccionada);
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

  async onAumentoGuardado(formData: TarifaFormData): Promise<void> {
    this.guardando = true;
    const ok = await this.tarifaGuardadoService.guardarTarifa(formData, this.tarifaSeleccionada, 'Aumento aplicado');
    this.guardando = false;
    if (ok) { this.modo = 'listado'; }
  }

  onAumentoCancelado(): void {
    this.modo = 'viewer';
  }

  /** Incluye al cliente actual — duplicar al mismo cliente es un flujo válido
   *  (crea un linaje nuevo e independiente, sin tocar el original) desde el
   *  ajuste del 10/09/2026. El `.html` avisa cuando se elige el mismo cliente
   *  vigente. */
  get clientesParaDuplicar(): ConIdType<Cliente>[] {
    return this.clientes;
  }

  get duplicandoAlMismoCliente(): boolean {
    return this.clienteDestino?.idCliente === this.clienteSeleccionado?.idCliente;
  }

  duplicar(): void {
    if (!this.tarifaSeleccionada) return;
    this.clienteDestino = null;
    this.modo = 'duplicar';
  }

  seleccionarClienteDestino(e: any): void {
    const idCliente: string = e.target.value;
    this.clienteDestino = this.clientesParaDuplicar.find(c => c.idCliente === idCliente) ?? null;
  }

  async onDuplicarGuardado(formData: TarifaFormData): Promise<void> {
    if (!this.clienteDestino) return;
    this.guardando = true;
    const ok = await this.tarifaGuardadoService.guardarTarifa(formData, null);
    this.guardando = false;
    if (!ok) return;

    const destino = this.clienteDestino;
    this.clienteSeleccionado = destino;
    this.clienteDestino = null;
    this.tarifaSeleccionada = null;
    this.modo = 'listado';
    this.suscribirTarifasDe(destino);
  }

  onDuplicarCancelado(): void {
    this.clienteDestino = null;
    this.modo = 'viewer';
  }

  /** Baja definitiva sin reemplazo — para cuando la tarifa ya no debería ser
   *  candidata en operaciones nuevas (ej. la entidad cambió de modoTarifacion
   *  y esta quedó obsoleta) pero no es "una versión más" de sí misma, así que
   *  no corresponde nuevaVersionTarifa(). La confirmación deja explícito que
   *  es irreversible — no hay "reactivar". */
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
    const ok = await this.tarifaGuardadoService.darDeBajaTarifa(this.tarifaSeleccionada);
    this.guardando = false;
    if (ok) {
      this.tarifaSeleccionada = null;
      this.modo = 'listado';
    }
  }

  /** Historial del LINAJE de la tarifa que se está viendo — reconstruye la
   *  cadena de versiones siguiendo versionAnteriorId hacia atrás desde
   *  tarifaSeleccionada (que siempre es la vigente de su linaje, ya que solo
   *  se llega acá desde el viewer). Un cliente puede tener a lo sumo 1
   *  tarifa personalizada vigente (a diferencia de Especial), pero igual se
   *  camina el linaje por versionAnteriorId en vez de listar todo lo del
   *  cliente, por las dudas de que haya más de un linaje histórico (uno dado
   *  de baja y otro creado después, por ejemplo). */
  verHistorial(): void {
    const vigente = this.tarifaSeleccionada;
    if (!vigente) return;
    const propias = this.tarifarioService.getTarifasActuales()
      .filter(t => t.nivel === 'personalizada' && t.idEntidadDueño === vigente.idEntidadDueño);
    const porId = new Map(propias.map(t => [t.idTarifa, t]));
    const cadena: ConIdType<Tarifa>[] = [vigente];
    let actual: ConIdType<Tarifa> = vigente;
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

  verVersionHistorial(t: ConIdType<Tarifa>): void {
    this.tarifaHistorialSeleccionada = t;
  }

  volverDesdeVersion(): void {
    this.tarifaHistorialSeleccionada = null;
  }

  volverDesdeHistorial(): void {
    this.modo = 'viewer';
    this.tarifaHistorialSeleccionada = null;
  }

  /** % de variación aproximado contra la versión inmediata anterior del mismo
   *  linaje, separado cobrar/pagar — mismo criterio que
   *  TarifasGeneralComponent.deltaGeneral()/TarifasHistorialComponent.deltaPersonalizada(). */
  deltaPersonalizada(actual: ConIdType<Tarifa>, anterior?: ConIdType<Tarifa>): { cobrar: number | null; pagar: number | null } {
    if (!anterior) return { cobrar: null, pagar: null };
    const sumar = (t: ConIdType<Tarifa>, campo: 'aCobrar' | 'aPagar') =>
      t.secciones.flatMap(s => s.categorias).reduce((acc, c) => acc + c[campo], 0);
    const calc = (campo: 'aCobrar' | 'aPagar'): number | null => {
      const base = sumar(anterior, campo);
      if (base === 0) return null;
      return ((sumar(actual, campo) - base) / base) * 100;
    };
    return { cobrar: calc('aCobrar'), pagar: calc('aPagar') };
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
