import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ReportesRoutingModule } from './reportes-routing.module';
import { SharedModule } from 'src/app/shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FilterPipeModule } from 'ngx-filter-pipe';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ReportesControlComponent } from './reportes-control/reportes-control.component';
import { ResumenOpGeneralComponent } from './resumen-op-general/resumen-op-general.component';
import { ResumenOpEntidadComponent } from './resumen-op-entidad/resumen-op-entidad.component';
import { TablaResumenComponent } from './tabla-resumen/tabla-resumen.component';


@NgModule({
  declarations: [
    ReportesControlComponent,
    ResumenOpGeneralComponent,
    ResumenOpEntidadComponent,
    TablaResumenComponent
  ],
  imports: [
    CommonModule,
    ReportesRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    FilterPipeModule,
    NgbModule,
  ]
})
export class ReportesModule { }
