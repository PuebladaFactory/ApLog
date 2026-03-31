import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FinanzasControlComponent } from './finanzas-control/finanzas-control.component';
import { FinanzasCobrosComponent } from './finanzas-cobros/finanzas-cobros.component';
import { FinanzasPagosComponent } from './finanzas-pagos/finanzas-pagos.component';
import { HistorialMovimientosComponent } from './historial-movimientos/historial-movimientos.component';
import { MovimientoDetalleComponent } from './movimiento-detalle/movimiento-detalle.component';
import { CuentaCorrienteComponent } from './cuenta-corriente/cuenta-corriente.component';
import { DetalleCuentaCorrienteComponent } from './detalle-cuenta-corriente/detalle-cuenta-corriente.component';
import { InformeLiqCuentaCorrienteComponent } from './informe-liq-cuenta-corriente/informe-liq-cuenta-corriente.component';
import { LedgerComponent } from './ledger/ledger.component';
import { AgingListadoComponent } from './aging-listado/aging-listado.component';


const routes: Routes = [
  {path: '', component:FinanzasControlComponent,
        children: [  
          { path: '', redirectTo: 'cuenta-corriente', pathMatch: 'full' },             
          {path: 'cobros', component:FinanzasCobrosComponent},
          {path: 'pagos', component:FinanzasPagosComponent},
          {path: 'historial', component:HistorialMovimientosComponent},
          {path: 'movimiento/:id',component: MovimientoDetalleComponent},          
          {path: 'cuenta-corriente',component: CuentaCorrienteComponent},
          {path: 'cuenta-corriente/:id',component: DetalleCuentaCorrienteComponent},
          {path: 'informe/:id', component: InformeLiqCuentaCorrienteComponent },
          {path: 'ledger', component: LedgerComponent},
          {path: 'aging', component: AgingListadoComponent},
                                        
      ]  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FinanzasRoutingModule { }
