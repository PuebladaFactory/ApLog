import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CLASE_ESTADO_LEGAJO, ETIQUETA_ESTADO_LEGAJO, FilaChoferFicha } from '../ficha-entidad.util';

/** Pestaña "Choferes" de la ficha de un proveedor: el nombre de cada chofer
 *  abre su ficha (en el mismo modal, ver FichaEntidadComponent.abrirFicha).
 *  Solo presentación. */
@Component({
  selector: 'app-ficha-choferes',
  standalone: false,
  templateUrl: './ficha-choferes.component.html',
  styleUrl: './ficha-choferes.component.scss',
})
export class FichaChoferesComponent {

  @Input() choferes: FilaChoferFicha[] = [];
  /** id del chofer elegido. */
  @Output() abrir = new EventEmitter<string>();

  readonly etiquetaEstado = ETIQUETA_ESTADO_LEGAJO;
  readonly claseEstado = CLASE_ESTADO_LEGAJO;
}
