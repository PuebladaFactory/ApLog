import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FinanzasControlComponent } from './finanzas-control/finanzas-control.component';
import { FinanzasCobrosComponent } from './finanzas-cobros/finanzas-cobros.component';
import { FinanzasPagosComponent } from './finanzas-pagos/finanzas-pagos.component';

const routes: Routes = [
  {path: '', component:FinanzasControlComponent,
        children: [               
          {path: 'cobros', component:FinanzasCobrosComponent},
          {path: 'historial', component:FinanzasPagosComponent},                              
      ]  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FinanzasRoutingModule { }
