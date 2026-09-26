import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

import { LiquidacionRoutingModule } from './liquidacion-routing.module';


import { LiqGralComponent } from './liq-gral/liq-gral.component';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FacturacionModule } from '../facturacion/facturacion.module';

import { DescuentosComponent } from './modales/descuentos/descuentos.component';
import { ResumenOpLiquidadasComponent } from './modales/resumen-op-liquidadas/resumen-op-liquidadas.component';
import { EditarTarifaOpComponent } from './modales/editar-tarifa-op/editar-tarifa-op.component';
import { ProformaComponent } from './proforma/proforma.component';
import { FilterPipeModule } from 'ngx-filter-pipe';
import { LiquidacionesOpComponent } from './liquidaciones-op/liquidaciones-op.component';
import { MigrarDatosComponent } from './migrar-datos/migrar-datos.component';
import { DateRangeService } from 'src/app/servicios/fechas/date-range.service';
import { PeriodoModalComponent } from './modales/periodo-modal/periodo-modal.component';
import { InformeOpListadoComponent } from './informe-op-listado/informe-op-listado.component';
import { LiquidacionNuevaComponent } from './modales/liquidacion-nueva/liquidacion-nueva.component';
import { BorradoresLiqComponent } from './borradores-liq/borradores-liq.component';
import { InformeLiqNuevoDetalleComponent } from './modales/informe-liq-nuevo-detalle/informe-liq-nuevo-detalle.component';
import { InformeOpAnuladosComponent } from './informe-op-anulados/informe-op-anulados.component';




@NgModule({
  declarations: [


    LiqGralComponent,

    LiquidacionesOpComponent,
    MigrarDatosComponent,
    DescuentosComponent,
    ResumenOpLiquidadasComponent,
    EditarTarifaOpComponent,
    ProformaComponent,
    PeriodoModalComponent,
    InformeOpListadoComponent,
    LiquidacionNuevaComponent,
    BorradoresLiqComponent,
    InformeLiqNuevoDetalleComponent,
    InformeOpAnuladosComponent

  ],
  imports: [
    CommonModule,
    LiquidacionRoutingModule,
    NgbModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    FilterPipeModule,
    FacturacionModule
  ],
   exports:[
      MigrarDatosComponent,
    ],

  providers: [
    DatePipe, 
    DateRangeService
  ] 
})
export class LiquidacionModule { }
