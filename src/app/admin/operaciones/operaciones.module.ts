import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { OperacionesRoutingModule } from './operaciones-routing.module';
import { OpControlComponent } from './op-control/op-control.component';
import { OpAltaComponent } from './op-alta/op-alta.component';
import { OpDiariasComponent } from './op-diarias/op-diarias.component';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { Ng2SearchPipeModule } from 'ng2-search-filter';
import { ConsultaOpComponent } from './consulta-op/consulta-op.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { OpAbiertasComponent } from './op-abiertas/op-abiertas.component';
import { ModalOpAbiertaComponent } from './modal-op-abierta/modal-op-abierta.component';
import { TableroOpComponent } from './tablero-op/tablero-op.component';
import { ModalOpCierreComponent } from './modal-op-cierre/modal-op-cierre.component';
import { ModalFacturacionComponent } from './modal-facturacion/modal-facturacion.component';


@NgModule({
  declarations: [
    OpControlComponent,
    OpAltaComponent,
    OpDiariasComponent,
    ConsultaOpComponent,   
    OpAbiertasComponent, ModalOpAbiertaComponent, TableroOpComponent, ModalOpCierreComponent, ModalFacturacionComponent,
  ],
  imports: [
    CommonModule,
    OperacionesRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    Ng2SearchPipeModule,
    NgbModule,
    NgxDatatableModule
  ]
})
export class OperacionesModule { }
