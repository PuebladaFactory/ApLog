import { Component, Input } from '@angular/core';
import { ConIdType } from 'src/app/interfaces/conId';
import { Tarifa } from 'src/app/interfaces/tarifa';

@Component({
  selector: 'app-tarifa-viewer',
  templateUrl: './tarifa-viewer.component.html',
  styleUrls: ['./tarifa-viewer.component.scss'],
  standalone: false,
})
export class TarifaViewerComponent {
  @Input() tarifa!: ConIdType<Tarifa>;

  get tieneKm(): boolean {
    return this.tarifa.kmDistancia !== null;
  }

  get colspanGrupo(): number {
    return this.tieneKm ? 3 : 1;
  }

  get cantidadColumnas(): number {
    let n = 1 + this.colspanGrupo * 2;
    if (this.tarifa.usaValoresProveedor) n += this.colspanGrupo;
    return n;
  }

  get sufijoKm(): string {
    return this.tarifa.modoTarifacion === 'km' ? ' (por km)' : '';
  }
}
