import { Component } from '@angular/core';
import {
  NormalizacionFechaNacService,
  SimulacionFechaNac,
} from 'src/app/servicios/desarrollo/normalizacion-fecha-nac.service';

/** Sección "Fecha de nacimiento de choferes" de /migracion (FI1c). Dos
 *  pasos: Simular (no escribe) → Ejecutar (requiere escribir el id del
 *  proyecto). Mismo criterio que los Recálculos. */
@Component({
  selector: 'app-normalizacion-fecha-nac',
  standalone: false,
  templateUrl: './normalizacion-fecha-nac.component.html',
})
export class NormalizacionFechaNacComponent {

  readonly proyecto: string;
  readonly esDemo: boolean;

  simulacion: SimulacionFechaNac | null = null;
  escritos: number | null = null;
  textoConfirmacion = '';
  ejecutando = false;
  error = '';

  constructor(private normalizacion: NormalizacionFechaNacService) {
    this.proyecto = normalizacion.proyecto;
    this.esDemo = normalizacion.esEntornoDemo();
  }

  get puedeEjecutar(): boolean {
    return !!this.simulacion
      && this.simulacion.convertir > 0
      && this.textoConfirmacion.trim() === this.proyecto
      && !this.ejecutando;
  }

  async simular(): Promise<void> {
    this.error = '';
    this.escritos = null;
    this.ejecutando = true;
    try {
      this.simulacion = await this.normalizacion.simular();
    } catch (e: any) {
      this.simulacion = null;
      this.error = e?.message ?? String(e);
    } finally {
      this.ejecutando = false;
    }
  }

  async ejecutar(): Promise<void> {
    if (!this.puedeEjecutar) return;
    this.error = '';
    this.ejecutando = true;
    try {
      this.escritos = await this.normalizacion.ejecutar(this.textoConfirmacion);
      this.textoConfirmacion = '';
      this.simulacion = await this.normalizacion.simular();
    } catch (e: any) {
      this.error = e?.message ?? String(e);
    } finally {
      this.ejecutando = false;
    }
  }
}
