import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FinanzasControlComponent } from './finanzas-control/finanzas-control.component';
import { FinanzasCobrosComponent } from './finanzas-cobros/finanzas-cobros.component';
import { FinanzasPagosComponent } from './finanzas-pagos/finanzas-pagos.component';
import { HistorialMovimientosComponent } from './historial-movimientos/historial-movimientos.component';

const routes: Routes = [
  {path: '', component:FinanzasControlComponent,
        children: [               
          {path: 'cobros', component:FinanzasCobrosComponent},
          {path: 'pagos', component:FinanzasPagosComponent},
          {path: 'historial', component:HistorialMovimientosComponent},
                                        
      ]  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FinanzasRoutingModule { }
