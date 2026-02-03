import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-periodo-modal',
  standalone: false,
  templateUrl: './periodo-modal.component.html',
  styleUrl: './periodo-modal.component.scss'
})
export class PeriodoModalComponent {

  periodoBoolean!: boolean; // true = Mes | false = Quincena

  constructor(public activeModal: NgbActiveModal) {}

  seleccionarPeriodo(esMes: boolean): void {
    this.periodoBoolean = esMes;

    // Cerramos el modal devolviendo el valor
    this.activeModal.close(this.periodoBoolean);
  }
}
