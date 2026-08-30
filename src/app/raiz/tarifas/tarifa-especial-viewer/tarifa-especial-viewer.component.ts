import { Component, Input } from '@angular/core';
import { ConIdType } from 'src/app/interfaces/conId';
import { TarifaEspecial } from 'src/app/interfaces/tarifa-especial';

@Component({
  selector: 'app-tarifa-especial-viewer',
  templateUrl: './tarifa-especial-viewer.component.html',
  styleUrls: ['./tarifa-especial-viewer.component.scss'],
  standalone: false,
})
export class TarifaEspecialViewerComponent {
  @Input() tarifa!: ConIdType<TarifaEspecial>;
  /** Nombre de cliente a mostrar cuando tarifa.alcance.tipo === 'entidadCliente'
   *  — resuelto por el padre, que ya tiene la lista de clientes cargada; este
   *  componente no inyecta ClienteService. */
  @Input() nombreClienteAlcance: string | null = null;

  get tieneKm(): boolean {
    return this.tarifa.kmDistancia !== null;
  }

  get alcanceLabel(): string {
    if (this.tarifa.alcance.tipo === 'entidad') return 'Todos los clientes';
    return `Cliente: ${this.nombreClienteAlcance ?? this.tarifa.alcance.idCliente}`;
  }

  get cantidadColumnas(): number {
    return this.tieneKm ? 4 : 2;
  }
}
