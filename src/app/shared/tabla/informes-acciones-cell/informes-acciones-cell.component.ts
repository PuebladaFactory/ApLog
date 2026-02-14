import { Component, EventEmitter, Input, Output } from '@angular/core';
import { InformeLiq } from 'src/app/interfaces/informe-liq';

@Component({
  selector: 'app-informes-acciones-cell',
  standalone: false,
  templateUrl: './informes-acciones-cell.component.html',
  styleUrl: './informes-acciones-cell.component.scss'
})
export class InformesAccionesCellComponent {
  @Input() item!: InformeLiq;
  @Input() acciones: string[] = [];

  @Output() accion = new EventEmitter<{ accion: string; item: InformeLiq }>();

  ejecutar(accion: string) {
    this.accion.emit({ accion, item: this.item });
  }

}
