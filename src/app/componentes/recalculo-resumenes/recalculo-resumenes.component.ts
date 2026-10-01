import { Component } from '@angular/core';
import {
  RecalculoResumenesService,
  ResultadoRecalculo,
  SimulacionRecalculo,
} from 'src/app/servicios/desarrollo/recalculo-resumenes.service';

/** Sección "Recálculo de resúmenes" de /migracion. Dos pasos: Simular y
 *  verificar (no escribe) → Ejecutar (requiere escribir el id del
 *  proyecto). Inputs con template ref, mismo criterio que LimpiezaDemo. */
@Component({
  selector: 'app-recalculo-resumenes',
  standalone: false,
  templateUrl: './recalculo-resumenes.component.html',
})
export class RecalculoResumenesComponent {

  readonly MAX_DIFERENCIAS = 50;

  readonly proyecto: string;
  readonly esDemo: boolean;

  desde: string;
  hasta: string;

  simulacion: SimulacionRecalculo | null = null;
  resultado: ResultadoRecalculo | null = null;
  textoConfirmacion = '';
  ejecutando = false;
  progreso = '';
  error = '';

  constructor(private recalculo: RecalculoResumenesService) {
    this.proyecto = recalculo.proyecto;
    this.esDemo = recalculo.esEntornoDemo();
    const hoy = new Date();
    this.hasta = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    this.desde = this.hasta;
  }

  get puedeEjecutar(): boolean {
    return !!this.simulacion
      && this.simulacion.errores.length === 0
      && this.textoConfirmacion.trim() === this.proyecto
      && !this.ejecutando;
  }

  get diferenciasVisibles() {
    return (this.simulacion?.diferencias ?? []).slice(0, this.MAX_DIFERENCIAS);
  }

  cambiarRango(desde: string, hasta: string): void {
    this.desde = desde;
    this.hasta = hasta;
    this.simulacion = null;
    this.resultado = null;
    this.textoConfirmacion = '';
    this.error = '';
  }

  async simular(): Promise<void> {
    this.error = '';
    this.resultado = null;
    this.ejecutando = true;
    try {
      this.simulacion = await this.recalculo.simular(this.desde, this.hasta, msg => (this.progreso = msg));
    } catch (e: any) {
      this.simulacion = null;
      this.error = e?.message ?? String(e);
    } finally {
      this.ejecutando = false;
      this.progreso = '';
    }
  }

  async ejecutar(): Promise<void> {
    if (!this.puedeEjecutar) return;
    this.error = '';
    this.ejecutando = true;
    try {
      this.resultado = await this.recalculo.ejecutar(
        this.desde, this.hasta, this.textoConfirmacion, msg => (this.progreso = msg),
      );
      this.simulacion = null;
    } catch (e: any) {
      this.error = `El recálculo se interrumpió: ${e?.message ?? e}. Se puede volver a ejecutar.`;
    } finally {
      this.ejecutando = false;
      this.progreso = '';
      this.textoConfirmacion = '';
    }
  }
}
