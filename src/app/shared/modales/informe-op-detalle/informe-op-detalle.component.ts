import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ConId } from 'src/app/interfaces/conId';
import { InformeOpNuevo } from 'src/app/interfaces/informe-op-nuevo';
import { NivelTarifa } from 'src/app/interfaces/tarifa';
import { nombreEntidadInforme, claseBadgeEstadoInforme } from 'src/app/shared/utils/entidad-informe.util';

/** Detalle de un InformeOp en modo SOLO LECTURA — sin cálculo ni edición.
 *  Se abre desde el modal de edición (Chunk 3) para mostrar la contraparte
 *  sin darle acceso a modificarla. */
@Component({
  selector: 'app-informe-op-detalle',
  standalone: false,
  templateUrl: './informe-op-detalle.component.html',
  styleUrls: ['./informe-op-detalle.component.scss'],
})
export class InformeOpDetalleComponent {

  @Input() informeOp!: ConId<InformeOpNuevo>;

  constructor(public activeModal: NgbActiveModal) {}

  get nombreEntidad(): string {
    return nombreEntidadInforme(this.informeOp);
  }

  get esEventual(): boolean {
    return this.informeOp.datosOperacion.tarifaAplicada === null;
  }

  get claseBadgeEstado(): string {
    return claseBadgeEstadoInforme(this.informeOp.estado);
  }

  /** true = este lado es el del cliente — solo para elegir color de borde
   *  (primary/warning), mismo criterio que
   *  InformeOpEditorComponent.esLadoCliente. */
  get esLadoCliente(): boolean {
    return this.informeOp.tipo === 'cliente';
  }

  /** Nivel de la tarifa aplicada — 'eventual' cuando no hay
   *  RefTarifaAplicada, mismo criterio que esEventual. Puramente derivado
   *  (sin fetch), alimenta el badge de nivel — mismo getter que
   *  InformeOpEditorComponent.nivelTarifaAplicada. */
  get nivelTarifaAplicada(): NivelTarifa {
    return this.informeOp.datosOperacion.tarifaAplicada?.nivel ?? 'eventual';
  }
}
