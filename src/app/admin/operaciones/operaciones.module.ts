import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { OperacionesRoutingModule } from './operaciones-routing.module';
import { OpControlComponent } from './op-control/op-control.component';

import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';

import { ConsultaOpComponent } from './consulta-op/consulta-op.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { TableroOpComponent } from './tablero-op/tablero-op.component';
import { ModalFacturacionComponent } from './modal-facturacion/modal-facturacion.component';
import { CargaMultipleComponent } from './carga-multiple/carga-multiple.component';
import { ModalOpAltaComponent } from './modal-op-alta/modal-op-alta.component';
import { FilterPipeModule } from 'ngx-filter-pipe';
import { AgGridModule } from 'ag-grid-angular';
import { NuevaTablaComponent } from './nueva-tabla/nueva-tabla.component';




@NgModule({
  declarations: [
    OpControlComponent,      
    ConsultaOpComponent,           
    TableroOpComponent,     
    ModalFacturacionComponent, CargaMultipleComponent, ModalOpAltaComponent,
    NuevaTablaComponent,
    
  ],
  imports: [
    CommonModule,
    OperacionesRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    FilterPipeModule,
    NgbModule,
    NgxDatatableModule,
    AgGridModule,
  ],
})
export class OperacionesModule { }
