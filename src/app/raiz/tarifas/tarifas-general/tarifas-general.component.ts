import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ConIdType } from 'src/app/interfaces/conId';
import { Tarifa } from 'src/app/interfaces/tarifa';
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
import { deltaTarifa, textoAumentoTarifa } from 'src/app/shared/utils/historial-tarifa.util';
import { TarifaFormData } from 'src/app/servicios/tarifario/tarifa-factory.service';
import { TarifaGuardadoService } from 'src/app/servicios/tarifario/tarifa-guardado.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';

@Component({
  selector: 'app-tarifas-general',
  templateUrl: './tarifas-general.component.html',
  styleUrls: ['./tarifas-general.component.scss'],
  standalone: false,
})
export class TarifasGeneralComponent implements OnInit, OnDestroy {

  tarifaVigente: ConIdType<Tarifa> | null = null;
  modo: 'vista' | 'form' | 'aumento' | 'historial' = 'vista';
  puedeEditar = false;
  guardando = false;

  historial: ConIdType<Tarifa>[] = [];
  tarifaHistorialSeleccionada: ConIdType<Tarifa> | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private tarifarioService: TarifarioService,
    private tarifaGuardadoService: TarifaGuardadoService,
    private usuarioSesion: UsuarioSesionService,
  ) {}

  ngOnInit(): void {
    const usuario = this.usuarioSesion.getUsuarioActual();
    this.puedeEditar = !!usuario && ['dev', 'admin'].includes(usuario.role);

    this.tarifarioService.tarifas$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.tarifaVigente = this.tarifarioService.getTarifaGeneralVigente() ?? null;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  crear(): void {
    this.modo = 'form';
  }

  editar(): void {
    if (!this.tarifaVigente) return;
    this.modo = 'form';
  }

  async onGuardado(formData: TarifaFormData): Promise<void> {
    this.guardando = true;
    const ok = await this.tarifaGuardadoService.guardarTarifa(formData, this.tarifaVigente);
    this.guardando = false;
    if (ok) { this.modo = 'vista'; }
  }

  cancelar(): void {
    this.modo = 'vista';
  }

  aumentar(): void {
    if (!this.tarifaVigente) return;
    this.modo = 'aumento';
  }

  async onAumentoGuardado(formData: TarifaFormData): Promise<void> {
    this.guardando = true;
    const ok = await this.tarifaGuardadoService.guardarTarifa(formData, this.tarifaVigente, 'Aumento aplicado');
    this.guardando = false;
    if (ok) { this.modo = 'vista'; }
  }

  onAumentoCancelado(): void {
    this.modo = 'vista';
  }

  /** General es singleton — un solo linaje posible, no hace falta reconstruir
   *  nada vía versionAnteriorId, alcanza con listar todas las versiones de
   *  nivel 'general' ordenadas por fecha (más reciente primero). Empate de
   *  fecha (solo debería darse con datos de prueba) se resuelve poniendo la
   *  vigente primero. */
  verHistorial(): void {
    this.historial = this.tarifarioService.getTarifasActuales()
      .filter(t => t.nivel === 'general')
      .sort((a, b) => {
        const porFecha = b.vigenciaDesde.localeCompare(a.vigenciaDesde);
        if (porFecha !== 0) return porFecha;
        if (a.activo !== b.activo) return a.activo ? -1 : 1;
        return 0;
      });
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
    this.modo = 'vista';
    this.tarifaHistorialSeleccionada = null;
  }

  /** Helpers del historial (shared/utils/historial-tarifa.util — TC-P1),
   *  expuestos para el template. */
  readonly deltaGeneral = deltaTarifa;
  readonly textoAumento = textoAumentoTarifa;
}
