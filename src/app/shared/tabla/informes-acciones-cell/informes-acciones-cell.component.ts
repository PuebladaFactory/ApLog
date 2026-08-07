import { Component, EventEmitter, Input, Output } from '@angular/core';
import { InformeLiq } from 'src/app/interfaces/informe-liq';
import { AccionInformesTabla } from 'src/app/interfaces/informes-tabla';
import { ModuloPermiso, AccionPermiso } from 'src/app/interfaces/permiso';

@Component({
  selector: 'app-informes-acciones-cell',
  standalone: false,
  templateUrl: './informes-acciones-cell.component.html',
  styleUrl: './informes-acciones-cell.component.scss'
})
export class InformesAccionesCellComponent {
  @Input() item!: InformeLiq;
  @Input() acciones: AccionInformesTabla<InformeLiq>[] = [];
  @Input() modulo?: ModuloPermiso;

  @Output() accion = new EventEmitter<{ accion: string; item: InformeLiq }>();

  ejecutar(accion: AccionInformesTabla<InformeLiq>) {
    if (accion.disabled?.(this.item)) return;
    this.accion.emit({ accion: accion.id, item: this.item });
  }

  // `id` es la identidad de negocio; `accionPermiso` la desambigua cuando
  // no coincide con el AccionPermiso real (ver interfaces/informes-tabla.ts).
  accionPermiso(accion: AccionInformesTabla<InformeLiq>): AccionPermiso {
    return accion.accionPermiso ?? (accion.id as AccionPermiso);
  }

  estaDeshabilitada(accion: AccionInformesTabla<InformeLiq>): boolean {
    return accion.disabled?.(this.item) ?? false;
  }
}
