import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ClienteRoutingModule } from './cliente-routing.module';
import { ClienteControlComponent } from './cliente-control/cliente-control.component';
import { ClienteListadoComponent } from './cliente-listado/cliente-listado.component';
import { ClienteAltaComponent } from './cliente-alta/cliente-alta.component';
import { ClienteBajaComponent } from './cliente-baja/cliente-baja.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { Ng2SearchPipeModule } from 'ng2-search-filter';
import { ClienteTarifaComponent } from './cliente-tarifa/cliente-tarifa.component';



@NgModule({
  declarations: [
    ClienteControlComponent,
    ClienteListadoComponent,
    ClienteAltaComponent,
    ClienteBajaComponent,
    ClienteTarifaComponent
  ],
  imports: [
    CommonModule,
    ClienteRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    Ng2SearchPipeModule
  ]
})
export class ClienteModule { }
