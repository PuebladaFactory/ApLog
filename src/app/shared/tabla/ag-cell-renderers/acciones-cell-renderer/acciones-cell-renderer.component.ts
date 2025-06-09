import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { SharedModule } from "../../../shared.module";

@Component({
  selector: 'app-acciones-cell-renderer',
  standalone: true,
  templateUrl: './acciones-cell-renderer.component.html',
  styleUrl: './acciones-cell-renderer.component.scss',
  imports: [CommonModule, SharedModule],
})
export class AccionesCellRendererComponent implements ICellRendererAngularComp  {
public params: any;
  estado: string = '';

  agInit(params: any): void {
    this.params = params;
    this.estado = params.data.estado;
  }

  refresh(): boolean {
    return false;
  }

  abrirVista() {
    this.params.context.componentParent.abrirVista(this.params.data);
  }

  abrirEdicion() {
    if (this.estado === 'Abierta') {
      this.params.context.componentParent.abrirEdicion(this.params.data);
    }
  }

  eliminarOperacion() {
    if (this.estado === 'Abierta') {
      this.params.context.componentParent.eliminarOperacion(this.params.data);
    }
  }

  crearFactura() {
    if (this.estado === 'Abierta') {
      this.params.context.componentParent.crearFacturaOp(this.params.data);
    }
  }
}
