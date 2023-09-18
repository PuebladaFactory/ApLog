import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { OperacionesRoutingModule } from './operaciones-routing.module';
import { OpControlComponent } from './op-control/op-control.component';
import { OpAltaComponent } from './op-alta/op-alta.component';
import { OpDiariasComponent } from './op-diarias/op-diarias.component';
import { OpHistorialComponent } from './op-historial/op-historial.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { Ng2SearchPipeModule } from 'ng2-search-filter';
import { ConsultaOpComponent } from './consulta-op/consulta-op.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { OpCargaManualComponent } from './op-carga-manual/op-carga-manual.component';
import { OpCerradasComponent } from './op-cerradas/op-cerradas.component';


@NgModule({
  declarations: [
    OpControlComponent,
    OpAltaComponent,
    OpDiariasComponent,
    OpHistorialComponent,
    ConsultaOpComponent,
    OpCargaManualComponent,
    OpCerradasComponent,
  ],
  imports: [
    CommonModule,
    OperacionesRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    Ng2SearchPipeModule,
    NgbModule
  ]
})
export class OperacionesModule { }
