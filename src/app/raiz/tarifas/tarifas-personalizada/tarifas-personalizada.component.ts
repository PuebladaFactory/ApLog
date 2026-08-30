import { Component, OnDestroy, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { merge, Subject, takeUntil } from 'rxjs';
import { ConIdType } from 'src/app/interfaces/conId';
import { Cliente } from 'src/app/interfaces/cliente';
import { Tarifa } from 'src/app/interfaces/tarifa';
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
  modo: 'listado' | 'viewer' | 'form' | 'aumento' | 'duplicar' = 'listado';
  tarifaSeleccionada: ConIdType<Tarifa> | null = null;
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
        this.clientes = clientes.filter(c => c.tarifasHabilitadas.some(t => t.nivel === 'personalizada'));
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

  get clientesParaDuplicar(): ConIdType<Cliente>[] {
    return this.clientes.filter(c => c.idCliente !== this.clienteSeleccionado?.idCliente);
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
}
