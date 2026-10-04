import { Component, HostListener } from '@angular/core';
import Swal from 'sweetalert2';
import {
  GeneradorOperacionesService, PARAMETROS_GENERADOR_POR_DEFECTO, ParametrosGenerador, PlanGeneracion,
  ResultadoEjecucion,
} from 'src/app/servicios/desarrollo/generador-operaciones.service';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { igualesPorContenido } from 'src/app/shared/utils/igualdad.util';

/** Sección "Generador de operaciones de prueba" de /migracion (solo demo).
 *  "Simular" arma el plan en memoria y muestra el resumen (no escribe).
 *  "Generar" (P4) ejecuta ESE plan: se habilita solo si los parámetros no
 *  cambiaron desde la simulación (el servicio lo vuelve a armar con los
 *  mismos parámetros y semilla → mismo plan). Mientras genera, la pestaña
 *  avisa antes de cerrarse. */
@Component({
  selector: 'app-generador-operaciones',
  standalone: false,
  templateUrl: './generador-operaciones.component.html',
})
export class GeneradorOperacionesComponent {

  readonly esDemo: boolean;

  parametros: ParametrosGenerador;
  plan: PlanGeneracion | null = null;
  simulando = false;
  ejecutando = false;
  progreso = '';
  resultado: ResultadoEjecucion | null = null;
  error = '';

  /** Cuántas exclusiones se listan (el total se muestra igual). */
  readonly MAX_EXCLUSIONES_VISIBLES = 30;

  constructor(private generador: GeneradorOperacionesService) {
    this.esDemo = generador.esEntornoDemo();
    // Por defecto: el mes anterior completo (fechas pasadas → se pueden cerrar).
    const hoy = new Date();
    const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    this.parametros = {
      ...PARAMETROS_GENERADOR_POR_DEFECTO,
      desde: toISODateString(desde),
      hasta: toISODateString(hasta),
      semilla: this.semillaNueva(),
    };
  }

  /** Los parámetros en pantalla ya no son los del plan simulado. */
  get parametrosCambiaron(): boolean {
    return !!this.plan && !igualesPorContenido(this.parametros, this.plan.parametros);
  }

  get puedeEjecutar(): boolean {
    return !!this.plan && this.plan.resumen.totalOps > 0 && !this.simulando && !this.ejecutando && !this.parametrosCambiaron;
  }

  /** Aviso del navegador si se intenta cerrar/recargar mientras genera. */
  @HostListener('window:beforeunload', ['$event'])
  avisarSiEjecutando(evento: BeforeUnloadEvent): void {
    if (this.ejecutando) {
      evento.preventDefault();
      evento.returnValue = '';
    }
  }

  nuevaSemilla(): void {
    this.parametros.semilla = this.semillaNueva();
  }

  async simular(): Promise<void> {
    this.error = '';
    this.plan = null;
    this.resultado = null;
    this.simulando = true;
    try {
      this.plan = await this.generador.planificar({ ...this.parametros });
    } catch (e: any) {
      this.error = e?.message ?? String(e);
    } finally {
      this.simulando = false;
    }
  }

  async ejecutar(): Promise<void> {
    if (!this.plan || !this.puedeEjecutar) return;
    this.error = '';

    let existentes = 0;
    try {
      existentes = await this.generador.contarOperacionesExistentes();
    } catch (e: any) {
      this.error = e?.message ?? String(e);
      return;
    }

    const r = await Swal.fire({
      title: `¿Generar ${this.plan.resumen.totalOps} operaciones?`,
      html:
        `<p>Se dan de alta día por día (con su tablero) y se cierran ${this.plan.resumen.aCerrar} ` +
        `(${this.plan.resumen.aCerrarConComision} con comisión de venta). ` +
        `Tarda varios minutos: <b>no cierres ni recargues esta pestaña</b>.</p>` +
        (existentes > 0
          ? `<p class="text-danger">Ya hay ${existentes} operaciones en la base: las nuevas se suman ` +
            `(en los días que ya tienen tablero confirmado, sus ítems se agregan).</p>`
          : '') +
        `<p>Para deshacer: Limpieza de demo.</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Generar',
      cancelButtonText: 'Cancelar',
    });
    if (!r.isConfirmed) return;

    this.ejecutando = true;
    this.resultado = null;
    try {
      this.resultado = await this.generador.ejecutar({ ...this.plan.parametros }, msg => (this.progreso = msg));
      this.plan = null;
    } catch (e: any) {
      this.error = e?.message ?? String(e);
    } finally {
      this.ejecutando = false;
      this.progreso = '';
    }
  }

  private semillaNueva(): number {
    return Math.floor(Math.random() * 1_000_000);
  }
}
