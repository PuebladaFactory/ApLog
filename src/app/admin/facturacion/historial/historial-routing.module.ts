import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HistorialGeneralComponent } from './historial-general/historial-general.component';

const routes: Routes = [
  {path: '', component:HistorialGeneralComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HistorialRoutingModule { }
