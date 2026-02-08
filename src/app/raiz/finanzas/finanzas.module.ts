import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FinanzasRoutingModule } from './finanzas-routing.module';
import { FinanzasControlComponent } from './finanzas-control/finanzas-control.component';
import { FinanzasCobrosComponent } from './finanzas-cobros/finanzas-cobros.component';
import { FinanzasPagosComponent } from './finanzas-pagos/finanzas-pagos.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { FilterPipeModule } from 'ngx-filter-pipe';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { MovimientoFinancieroComponent } from './modales/movimiento-financiero/movimiento-financiero.component';
import { HistorialMovimientosComponent } from './historial-movimientos/historial-movimientos.component';


@NgModule({
  declarations: [
    FinanzasControlComponent,
    FinanzasCobrosComponent,
    FinanzasPagosComponent,
    MovimientoFinancieroComponent,
    HistorialMovimientosComponent
  ],
  imports: [
    CommonModule,
    FinanzasRoutingModule,    
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    FilterPipeModule,
    NgbModule,
  ]
})
export class FinanzasModule { }
