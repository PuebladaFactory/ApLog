import { Component } from '@angular/core';
import {
  GeneradorOperacionesService, PARAMETROS_GENERADOR_POR_DEFECTO, ParametrosGenerador, PlanGeneracion,
} from 'src/app/servicios/desarrollo/generador-operaciones.service';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';

/** Sección "Generador de operaciones de prueba" de /migracion (solo demo).
 *  P3: parámetros + "Simular" (arma el plan en memoria y muestra el
 *  resumen; no escribe nada). La ejecución llega en P4. */
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

  nuevaSemilla(): void {
    this.parametros.semilla = this.semillaNueva();
  }

  async simular(): Promise<void> {
    this.error = '';
    this.plan = null;
    this.simulando = true;
    try {
      this.plan = await this.generador.planificar({ ...this.parametros });
    } catch (e: any) {
      this.error = e?.message ?? String(e);
    } finally {
      this.simulando = false;
    }
  }

  private semillaNueva(): number {
    return Math.floor(Math.random() * 1_000_000);
  }
}
