import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ProveedoresRoutingModule } from './proveedores-routing.module';
import { ProveedoresAltaComponent } from './proveedores-alta/proveedores-alta.component';
/* import { ProveedoresBajaComponent } from './proveedores-baja/proveedores-baja.component'; */
import { ProveedoresListadoComponent } from './proveedores-listado/proveedores-listado.component';
import { ProveedoresTarifaComponent } from './proveedores-tarifa/proveedores-tarifa.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { Ng2SearchPipeModule } from 'ng2-search-filter';


@NgModule({
  declarations: [
    ProveedoresAltaComponent,
    /* ProveedoresBajaComponent, */
    ProveedoresListadoComponent,
    ProveedoresTarifaComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ProveedoresRoutingModule,
    SharedModule,
    Ng2SearchPipeModule
  ]
})
export class ProveedoresModule { }
