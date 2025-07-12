import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { OperacionesRoutingModule } from './operaciones-routing.module';
import { OpControlComponent } from './op-control/op-control.component';


import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';


import { NgbModule } from '@ng-bootstrap/ng-bootstrap';


import { ModalResumenOpComponent } from './modal-resumen-op/modal-resumen-op.component';
import { CargaMultipleComponent } from './carga-multiple/carga-multiple.component';
import { ModalOpAltaComponent } from './modal-op-alta/modal-op-alta.component';
import { FilterPipeModule } from 'ngx-filter-pipe';
import { AgGridModule } from 'ag-grid-angular';
import { TableroOpComponent } from './tablero-op/tablero-op.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { TableroDiarioComponent } from './tablero-diario/tablero-diario.component';
import { CargaTableroDiarioComponent } from './carga-tablero-diario/carga-tablero-diario.component';




@NgModule({
  declarations: [
    OpControlComponent,      
    
    ModalResumenOpComponent, 
    CargaMultipleComponent, 
    ModalOpAltaComponent,
    TableroOpComponent,
    TableroDiarioComponent,
    CargaTableroDiarioComponent
    
  ],
  imports: [
    CommonModule,
    OperacionesRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    FilterPipeModule,
    NgbModule,
    
    AgGridModule,
    DragDropModule
  ],
})
export class OperacionesModule { }
