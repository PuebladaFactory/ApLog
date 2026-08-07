import { Component, Input } from '@angular/core';
import { AccionTablaGenerica } from 'src/app/interfaces/tabla-generica';
import { ModuloPermiso } from 'src/app/interfaces/permiso';

@Component({
  selector: 'app-tabla-acciones',
  templateUrl: './tabla-acciones.component.html',
  standalone: false,
})
export class TablaAccionesComponent {
  @Input() fila!: any;
  @Input() acciones: AccionTablaGenerica[] = [];
  @Input() modulo?: ModuloPermiso;

  ejecutar(tipo: string): void {
    if (this.estaDeshabilitada(tipo)) return;
    const accion = this.acciones.find(a => a.tipo === tipo);
    if (accion) accion.handler(this.fila);
  }

  tieneAccion(tipo: string): boolean {
    return this.acciones.some(a => a.tipo === tipo);
  }

  estaDeshabilitada(tipo: string): boolean {
    const accion = this.acciones.find(a => a.tipo === tipo);
    return accion?.disabled ? accion.disabled(this.fila) : false;
  }
}
