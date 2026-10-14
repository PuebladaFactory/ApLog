import { Component, Input } from '@angular/core';
import { Vehiculo } from 'src/app/interfaces/chofer';

/** Tabla de vehículos de la ficha (chofer o proveedor). Solo presentación. */
@Component({
  selector: 'app-ficha-vehiculos',
  standalone: false,
  templateUrl: './ficha-vehiculos.component.html',
})
export class FichaVehiculosComponent {

  @Input() vehiculos: Vehiculo[] = [];
  @Input() mensajeVacio = 'Sin vehículos.';

  siNo(valor: boolean | null | undefined): string {
    return valor === true ? 'Sí' : valor === false ? 'No' : '—';
  }

  combustible(v: Vehiculo): string {
    return v.tipoCombustible?.length ? v.tipoCombustible.join(', ') : '—';
  }

  satelital(v: Vehiculo): string {
    if (!v.segSat) return 'No';
    return v.satelital?.trim() ? `Sí (${v.satelital.trim()})` : 'Sí';
  }
}
