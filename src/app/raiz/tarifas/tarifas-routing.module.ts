import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TarifasControlComponent } from './tarifas-control/tarifas-control.component';
import { TarifasGeneralComponent } from './tarifas-general/tarifas-general.component';
import { TarifasPersonalizadaComponent } from './tarifas-personalizada/tarifas-personalizada.component';
import { TarifasEspecialComponent } from './tarifas-especial/tarifas-especial.component';
import { TarifasEventualComponent } from './tarifas-eventual/tarifas-eventual.component';
import { TarifasHistorialComponent } from './tarifas-historial/tarifas-historial.component';

const routes: Routes = [
  { path: '', component: TarifasControlComponent,
    children: [
      { path: '', redirectTo: 'general', pathMatch: 'full' },
      { path: 'general', component: TarifasGeneralComponent },
      { path: 'personalizada', component: TarifasPersonalizadaComponent },
      { path: 'especial', component: TarifasEspecialComponent },
      { path: 'eventual', component: TarifasEventualComponent },
      { path: 'historial', component: TarifasHistorialComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TarifasRoutingModule { }
