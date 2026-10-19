import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FilaTarifaFicha, TarifasFicha } from './ficha-tarifas.util';

/**
 * Pestaña "Tarifas" de la ficha (chofer, proveedor y cliente): niveles
 * habilitados y tarifas vigentes HOY (F3 (b)). "Ver valores" despliega debajo
 * del renglón el detalle del lado de la entidad (FI7, FichaTarifaDetalle).
 * "Ver en Tarifas" emite la pestaña de destino y el contenedor cierra la ficha
 * y navega. Solo presentación.
 */
@Component({
  selector: 'app-ficha-tarifas',
  standalone: false,
  templateUrl: './ficha-tarifas.component.html',
  styleUrl: './ficha-tarifas.component.scss',
})
export class FichaTarifasComponent {

  @Input({ required: true }) tarifas!: TarifasFicha;
  /** Pestaña del módulo Tarifas: 'general' | 'personalizada' | 'especial' | 'eventual'. */
  @Output() irATarifas = new EventEmitter<string>();

  /** idTarifa de los renglones con el detalle desplegado. */
  abiertas = new Set<string>();

  habilitado(nivel: string): boolean {
    return (this.tarifas.niveles as string[]).includes(nivel);
  }

  /** La columna Alcance solo tiene sentido en especiales de chofer/proveedor. */
  conAlcance(filas: FilaTarifaFicha[]): boolean {
    return filas.some(f => f.alcance !== null);
  }

  alternar(idTarifa: string): void {
    if (this.abiertas.has(idTarifa)) {
      this.abiertas.delete(idTarifa);
    } else {
      this.abiertas.add(idTarifa);
    }
  }
}
