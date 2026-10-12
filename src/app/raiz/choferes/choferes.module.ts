import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ChoferesRoutingModule } from './choferes-routing.module';
import { ChoferesControlComponent } from './choferes-control/choferes-control.component';

import { ChoferesAltaComponent } from './choferes-alta/choferes-alta.component';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';

import { ModalVehiculoComponent } from './modal-vehiculo/modal-vehiculo.component';
import { ChoferesListadoComponent } from './choferes-listado/choferes-listado.component';





@NgModule({
  declarations: [
    ChoferesControlComponent,
    ChoferesAltaComponent,
    ModalVehiculoComponent,
    ChoferesListadoComponent,
  ],
  imports: [
    CommonModule,
    ChoferesRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    
  ]
})
export class ChoferesModule { }
