import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReportesControlComponent } from './reportes-control/reportes-control.component';
import { ResumenOpGeneralComponent } from './resumen-op-general/resumen-op-general.component';
import { ResumenOpEntidadComponent } from './resumen-op-entidad/resumen-op-entidad.component';

const routes: Routes = [
    {path: '', component:ReportesControlComponent,
          children: [  
            { path: '', redirectTo: 'opGeneral', pathMatch: 'full' },             
            {path: 'opGeneral', component:ResumenOpGeneralComponent},
            {path: 'opEntidad', component:ResumenOpEntidadComponent},
            /*{path: 'historial', component:HistorialMovimientosComponent},
            {path: 'movimiento/:id',component: MovimientoDetalleComponent},          
            {path: 'cuenta-corriente',component: CuentaCorrienteComponent},
            {path: 'cuenta-corriente/:id',component: DetalleCuentaCorrienteComponent},
            {path: 'informe/:id', component: InformeLiqCuentaCorrienteComponent },
            {path: 'ledger', component: LedgerComponent},
            {path: 'aging', component: AgingListadoComponent},
            {path: 'ranking', component: RankingMorososComponent},          
                                          */
        ]   },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReportesRoutingModule { }
