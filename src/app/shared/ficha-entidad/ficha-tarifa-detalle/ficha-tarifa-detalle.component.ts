import { Component, Input, OnChanges } from '@angular/core';
import { DetalleTarifaFicha, RenglonDetalleTarifa } from '../ficha-tarifas/ficha-tarifas.util';

/**
 * Detalle de valores de una tarifa en la ficha (FI7): solo el lado de la
 * entidad, con las categorías de sus vehículos resaltadas. Vista inicial: si
 * hay vehículos que coinciden, solo sus categorías ("Ver todas" muestra el
 * resto como referencia). Solo presentación, sin edición.
 */
@Component({
  selector: 'app-ficha-tarifa-detalle',
  standalone: false,
  templateUrl: './ficha-tarifa-detalle.component.html',
  styleUrl: './ficha-tarifa-detalle.component.scss',
})
export class FichaTarifaDetalleComponent implements OnChanges {

  @Input({ required: true }) detalle!: DetalleTarifaFicha;

  soloSusCategorias = false;
  private inicializado = false;

  ngOnChanges(): void {
    // La vista inicial se decide una vez; si los datos se actualizan (datos
    // vivos) se respeta lo que eligió el usuario, salvo que ya no haya
    // vehículos que coincidan.
    if (!this.inicializado) {
      this.soloSusCategorias = this.detalle.conVehiculos;
      this.inicializado = true;
    } else if (!this.detalle.conVehiculos) {
      this.soloSusCategorias = false;
    }
  }

  get renglones(): RenglonDetalleTarifa[] {
    return this.soloSusCategorias
      ? this.detalle.renglones.filter(r => r.dominios.length > 0)
      : this.detalle.renglones;
  }

  get conAdicionalKm(): boolean {
    return this.detalle.kmDistancia !== null;
  }
}
