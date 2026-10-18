import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FilaTarifaFicha, TarifasFicha } from './ficha-tarifas.util';

/**
 * Pestaña "Tarifas" de la ficha (chofer, proveedor y cliente): niveles
 * habilitados y tarifas vigentes HOY, sin valores (F3 (b)). Los valores se ven
 * en el módulo Tarifas: "Ver en Tarifas" emite la pestaña de destino y el
 * contenedor cierra la ficha y navega. Solo presentación.
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

  habilitado(nivel: string): boolean {
    return (this.tarifas.niveles as string[]).includes(nivel);
  }

  /** La columna Alcance solo tiene sentido en especiales de chofer/proveedor. */
  conAlcance(filas: FilaTarifaFicha[]): boolean {
    return filas.some(f => f.alcance !== null);
  }
}
