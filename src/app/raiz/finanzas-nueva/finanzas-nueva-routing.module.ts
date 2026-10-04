import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FinanzasNuevaControlComponent } from './control/finanzas-nueva-control.component';
import { FinanzasCuentasComponent } from './cuentas/finanzas-cuentas.component';

const routes: Routes = [
  {
    path: '',
    component: FinanzasNuevaControlComponent,
    children: [
      { path: '', redirectTo: 'cuentas', pathMatch: 'full' },
      { path: 'cuentas', component: FinanzasCuentasComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FinanzasNuevaRoutingModule { }
