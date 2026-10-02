import { Component } from '@angular/core';
import {
  RecalculoComisionesService,
  ResultadoRecalculoComisiones,
  SimulacionRecalculoComisiones,
} from 'src/app/servicios/desarrollo/recalculo-comisiones.service';
import { VendedorService } from 'src/app/servicios/vendedores/vendedor.service';

/** Sección "Recálculo de comisiones" de /migracion. Dos pasos: Simular y
 *  verificar (no escribe) → Ejecutar (requiere escribir el id del
 *  proyecto). Mismo criterio que RecalculoResumenesComponent. */
@Component({
  selector: 'app-recalculo-comisiones',
  standalone: false,
  templateUrl: './recalculo-comisiones.component.html',
})
export class RecalculoComisionesComponent {

  readonly MAX_DIFERENCIAS = 50;

  readonly proyecto: string;
  readonly esDemo: boolean;

  desde: string;
  hasta: string;

  simulacion: SimulacionRecalculoComisiones | null = null;
  resultado: ResultadoRecalculoComisiones | null = null;
  textoConfirmacion = '';
  ejecutando = false;
  progreso = '';
  error = '';

  constructor(
    private recalculo: RecalculoComisionesService,
    private vendedorService: VendedorService,
  ) {
    this.proyecto = recalculo.proyecto;
    this.esDemo = recalculo.esEntornoDemo();
    // Nombres de vendedores para la tabla (listener idempotente).
    this.vendedorService.init();
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

  nombreVendedor(id: string): string {
    const v = this.vendedorService.getVendedorPorId(id);
    return v ? this.vendedorService.nombre(v) : id;
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
