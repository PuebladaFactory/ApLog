import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LiquidacionRoutingModule } from './liquidacion-routing.module';


import { LiqGralComponent } from './liq-gral/liq-gral.component';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { DateRangeService } from 'src/app/servicios/fechas/date-range.service';
import { InformeOpListadoComponent } from './informe-op-listado/informe-op-listado.component';
import { LiquidacionNuevaComponent } from './modales/liquidacion-nueva/liquidacion-nueva.component';
import { BorradoresLiqComponent } from './borradores-liq/borradores-liq.component';
import { InformeOpAnuladosComponent } from './informe-op-anulados/informe-op-anulados.component';




@NgModule({
  declarations: [


    LiqGralComponent,
    InformeOpListadoComponent,
    LiquidacionNuevaComponent,
    BorradoresLiqComponent,
    InformeOpAnuladosComponent

  ],
  imports: [
    CommonModule,
    LiquidacionRoutingModule,
    NgbModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
  ],
  providers: [
    DateRangeService
  ] 
})
export class LiquidacionModule { }
