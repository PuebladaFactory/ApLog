import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FinanzasNuevaControlComponent } from './control/finanzas-nueva-control.component';
import { FinanzasCuentasComponent } from './cuentas/finanzas-cuentas.component';
import { FinanzasMovimientosComponent } from './movimientos/finanzas-movimientos.component';
import { CuentaEntidadComponent } from './cuenta-entidad/cuenta-entidad.component';

const routes: Routes = [
  {
    path: '',
    component: FinanzasNuevaControlComponent,
    children: [
      { path: '', redirectTo: 'cuentas', pathMatch: 'full' },
      { path: 'cuentas', component: FinanzasCuentasComponent },
      { path: 'movimientos', component: FinanzasMovimientosComponent },
      { path: 'cuenta/:tipo/:id', component: CuentaEntidadComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FinanzasNuevaRoutingModule { }
