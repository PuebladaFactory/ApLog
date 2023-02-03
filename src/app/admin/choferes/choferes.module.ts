import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ChoferesRoutingModule } from './choferes-routing.module';
import { ChoferesControlComponent } from './choferes-control/choferes-control.component';
import { ChoferesListadoComponent } from './choferes-listado/choferes-listado.component';
import { ChoferesAltaComponent } from './choferes-alta/choferes-alta.component';
import { ChoferesBajaComponent } from './choferes-baja/choferes-baja.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { Ng2SearchPipeModule } from 'ng2-search-filter';
import { ChoferesTarifaComponent } from './choferes-tarifa/choferes-tarifa.component';




@NgModule({
  declarations: [
    ChoferesControlComponent,
    ChoferesListadoComponent,
    ChoferesAltaComponent,
    ChoferesBajaComponent,
    ChoferesTarifaComponent,
    
  ],
  imports: [
    CommonModule,
    ChoferesRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    Ng2SearchPipeModule
  ]
})
export class ChoferesModule { }
