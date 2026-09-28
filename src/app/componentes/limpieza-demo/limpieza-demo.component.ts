import { Component } from '@angular/core';
import {
  InventarioLimpieza, LimpiezaDemoService, ResultadoLimpieza,
} from 'src/app/servicios/desarrollo/limpieza-demo.service';

/** Sección "Limpieza de demo" de la pantalla /migracion. Dos pasos:
 *  Contar (inventario, sin escribir) → Limpiar (requiere escribir el
 *  texto de confirmación). Sin ngModel a propósito (RaizModule no importa
 *  FormsModule): el input usa una template ref. */
@Component({
  selector: 'app-limpieza-demo',
  standalone: false,
  templateUrl: './limpieza-demo.component.html',
})
export class LimpiezaDemoComponent {

  readonly TEXTO_CONFIRMACION = 'LIMPIAR DEMO';

  readonly esDemo: boolean;
  readonly proyecto: string;

  inventario: InventarioLimpieza | null = null;
  resultado: ResultadoLimpieza | null = null;
  textoConfirmacion = '';
  ejecutando = false;
  progreso = '';
  error = '';

  constructor(private limpieza: LimpiezaDemoService) {
    this.esDemo = limpieza.esEntornoDemo();
    this.proyecto = limpieza.proyecto;
  }

  get totalDocumentos(): number {
    return (this.inventario?.colecciones ?? []).reduce((acc, c) => acc + c.cantidad, 0);
  }

  get totalBorrados(): number {
    return (this.resultado?.colecciones ?? []).reduce((acc, c) => acc + c.cantidad, 0);
  }

  get puedeLimpiar(): boolean {
    return !!this.inventario && this.textoConfirmacion === this.TEXTO_CONFIRMACION && !this.ejecutando;
  }

  async contar(): Promise<void> {
    this.error = '';
    this.resultado = null;
    this.ejecutando = true;
    this.progreso = 'Contando…';
    try {
      this.inventario = await this.limpieza.inventario();
    } catch (e: any) {
      this.error = e?.message ?? String(e);
    } finally {
      this.ejecutando = false;
      this.progreso = '';
    }
  }

  async limpiar(): Promise<void> {
    if (!this.puedeLimpiar) return;
    this.error = '';
    this.ejecutando = true;
    try {
      this.resultado = await this.limpieza.limpiar(msg => (this.progreso = msg));
      this.inventario = null;
    } catch (e: any) {
      this.error = `La limpieza se interrumpió: ${e?.message ?? e}. Se puede volver a ejecutar (sigue desde donde quedó).`;
    } finally {
      this.ejecutando = false;
      this.progreso = '';
      this.textoConfirmacion = '';
    }
  }
}
