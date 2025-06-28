import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ChoferesRoutingModule } from './choferes-routing.module';
import { ChoferesControlComponent } from './choferes-control/choferes-control.component';

import { ChoferesAltaComponent } from './choferes-alta/choferes-alta.component';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';

import { ChoferesTarifaGralComponent } from './choferes-tarifa-gral/choferes-tarifa-gral.component';
import { ChoferesTarifaEspecialComponent } from './choferes-tarifa-especial/choferes-tarifa-especial.component';
import { ModalVehiculoComponent } from './modal-vehiculo/modal-vehiculo.component';
import { FilterPipeModule } from 'ngx-filter-pipe';
import { ListadoNuevoChoferComponent } from './listado-nuevo-chofer/listado-nuevo-chofer.component';
import { AgGridModule } from 'ag-grid-angular';





@NgModule({
  declarations: [
    ChoferesControlComponent,    
    ChoferesAltaComponent,   
    ChoferesTarifaGralComponent,
    ChoferesTarifaEspecialComponent,    
    ModalVehiculoComponent,
    ListadoNuevoChoferComponent    
  ],
  imports: [
    CommonModule,
    ChoferesRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    FilterPipeModule,
    
    AgGridModule
  ]
})
export class ChoferesModule { }
