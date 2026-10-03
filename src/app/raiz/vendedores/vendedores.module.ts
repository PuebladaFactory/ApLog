import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { VendedoresRoutingModule } from './vendedores-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { VendedorControlComponent } from './vendedor-control/vendedor-control.component';
import { TableroActividadComponent } from './tablero-actividad/tablero-actividad.component';
import { VendedorAltaComponent } from './vendedor-alta/vendedor-alta.component';
import { VendedoresListadoComponent } from './vendedores-listado/vendedores-listado.component';
import { VendedorHistorialComponent } from './vendedor-historial/vendedor-historial.component';
import { LiquidacionVentaDetalleComponent } from './liquidacion-venta-detalle/liquidacion-venta-detalle.component';

/** Frente Vendedores: shell con pestañas (Tablero / Listado / Historial),
 *  modal de alta/edición y modal de detalle de liquidación. Sin
 *  DateRangeService: el tablero y el historial tienen sus propios filtros
 *  de mes. ReactiveFormsModule: lo usa VendedorAltaComponent. */
@NgModule({
  declarations: [
    VendedorControlComponent,
    TableroActividadComponent,
    VendedorAltaComponent,
    VendedoresListadoComponent,
    VendedorHistorialComponent,
    LiquidacionVentaDetalleComponent,
  ],
  imports: [
    CommonModule,
    VendedoresRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
  ],
})
export class VendedoresModule { }
