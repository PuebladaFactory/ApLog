import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LiqGralComponent } from './liq-gral/liq-gral.component';
import { InformeOpListadoComponent } from './informe-op-listado/informe-op-listado.component';
import { BorradoresLiqComponent } from './borradores-liq/borradores-liq.component';
import { InformeOpAnuladosComponent } from './informe-op-anulados/informe-op-anulados.component';

const routes: Routes = [
  {path: '', component:LiqGralComponent,
    children: [
      {path: '', redirectTo: 'informes', pathMatch: 'full' },
      {path: 'informes', component:InformeOpListadoComponent},
      {path: 'borradores', component: BorradoresLiqComponent},
      {path: 'anulados', component: InformeOpAnuladosComponent},
    ]
  },  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LiquidacionRoutingModule { }
