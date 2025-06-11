import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { SharedModule } from '../../../shared.module';

@Component({
  selector: 'app-acciones-cell-renderer',
  standalone: true,
  templateUrl: './acciones-cell-renderer.component.html',
  styleUrl: './acciones-cell-renderer.component.scss',
  imports: [CommonModule, SharedModule],
})
export class AccionesCellRendererComponent implements ICellRendererAngularComp {
  public params: any;
  estado: string = '';
  botones: string[] = [];
  disableOn: { [key: string]: string } = {};

  agInit(params: any): void {
    this.params = params;
    this.estado = params.data.estado || '';
    this.botones = params.buttons || [];
    this.disableOn = params.disableOn || {};
  }

  refresh(): boolean {
    return false;
  }

  isDisabled(button: string): boolean {
    const requiredEstado = this.disableOn[button];
    return requiredEstado ? this.estado !== requiredEstado : false;
  }

  callHandler(action: string): void {
    const handler = this.params[`on${this.capitalize(action)}`];
    if (typeof handler === 'function') {
      handler(this.params.data);
    }
  }

  private capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
}
