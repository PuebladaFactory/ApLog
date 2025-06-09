import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';

@Component({
  selector: 'app-estado-cell-renderer',
  standalone: false,
  template: `
    <span [ngClass]="cssClass">
      {{ value }}
    </span>
  `,
  styleUrls: ['./estado-cell-renderer.component.scss'], 
})
export class EstadoCellRendererComponent implements ICellRendererAngularComp {
  value: string = '';
  cssClass: string = '';

  agInit(params: any): void {
    this.value = params.value;
    this.cssClass = {
      'Abierta': 'estado-abierta',
      'Cerrada': 'estado-cerrada',
      'Cliente Fac': 'estado-facCliente',
      'Chofer Fac': 'estado-facChofer',
      'Facturada': 'estado-facturada',
      'Proforma': 'estado-proforma'
    }[this.value] || '';
  }

  refresh(): boolean {
    return false;
  }
}