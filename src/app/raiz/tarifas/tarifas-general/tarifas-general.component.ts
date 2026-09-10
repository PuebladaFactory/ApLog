import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ConIdType } from 'src/app/interfaces/conId';
import { MetadataAumento, Tarifa } from 'src/app/interfaces/tarifa';
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
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

  /** % de variación aproximado contra la versión anterior — mismo criterio que
   *  TarifasHistorialComponent.deltaPersonalizada (General usa la misma
   *  interfaz Tarifa, el cálculo es idéntico). Suma de todas las categorías,
   *  no por categoría individual. null si no hay anterior o si la base es 0. */
  deltaGeneral(actual: ConIdType<Tarifa>, anterior?: ConIdType<Tarifa>): { cobrar: number | null; pagar: number | null } {
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

  /** Texto descriptivo de metadataAumento para el historial, o null si la
   *  versión no vino de la herramienta de aumento (edición manual, o versión
   *  anterior a este campo). */
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
