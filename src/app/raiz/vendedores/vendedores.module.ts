import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { VendedoresRoutingModule } from './vendedores-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { FilterPipeModule } from 'ngx-filter-pipe';
import { AgGridModule } from 'ag-grid-angular';
import { VendedorControlComponent } from './vendedor-control/vendedor-control.component';
import { TableroActividadComponent } from './tablero-actividad/tablero-actividad.component';
import { VendedorAltaComponent } from './vendedor-alta/vendedor-alta.component';
import { VendedoresListadoComponent } from './vendedores-listado/vendedores-listado.component';
import { VendedorHistorialComponent } from './vendedor-historial/vendedor-historial.component';


@NgModule({
  declarations: [
    VendedorControlComponent,
    TableroActividadComponent,
    VendedorAltaComponent,
    VendedoresListadoComponent,
    VendedorHistorialComponent
  ],
  imports: [
    CommonModule,
    VendedoresRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    FilterPipeModule,
    
    AgGridModule 
  ]
})
export class VendedoresModule { }
