import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChoferesControlComponent } from './choferes-control/choferes-control.component';
import { ChoferesListadoComponent } from './choferes-listado/choferes-listado.component';


const routes: Routes = [
  {path: '', component:ChoferesControlComponent,
  children: [
    { path: '', redirectTo: 'listado', pathMatch: 'full' },         
    // Tarifas de choferes: módulo Tarifas (/tarifas). Las rutas viejas
    // (general, especial, eventual) se retiraron en TC-R2.
    {path: 'listado', component:ChoferesListadoComponent},
]  },
  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ChoferesRoutingModule { }
