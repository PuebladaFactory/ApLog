import { Component, OnDestroy, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { merge, Subject, takeUntil } from 'rxjs';
import { ConIdType } from 'src/app/interfaces/conId';
import { Cliente } from 'src/app/interfaces/cliente';
import { Chofer } from 'src/app/interfaces/chofer';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { EntidadTipo } from 'src/app/interfaces/tarifa';
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
  modo: 'listado' | 'viewer' | 'form' | 'aumento' | 'duplicar' = 'listado';
  tarifaSeleccionada: ConIdType<TarifaEspecial> | null = null;
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
    if (this.entidadTipo === 'cliente') return this.clientesHabilitados.map(c => ({ id: c.idCliente, nombre: c.razonSocial }));
    if (this.entidadTipo === 'chofer') return this.choferesHabilitados.map(c => ({ id: c.idChofer, nombre: `${c.datosPersonales.nombre} ${c.datosPersonales.apellido}` }));
    return this.proveedoresHabilitados.map(p => ({ id: p.idProveedor, nombre: p.razonSocial }));
  }

  /** Mismo entidadTipo que la entidad actual (no tiene sentido duplicar el
   *  parche de una columna a otra), excluyendo a la entidad actual. */
  get opcionesEntidadDestino(): EntidadOpcion[] {
    return this.opcionesEntidad.filter(o => o.id !== this.entidadSeleccionada?.id);
  }

  onCambioEntidadTipo(e: any): void {
    this.entidadTipo = e.target.value as EntidadTipo;
    this.entidadSeleccionada = null;
    this.tarifaSeleccionada = null;
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
}
