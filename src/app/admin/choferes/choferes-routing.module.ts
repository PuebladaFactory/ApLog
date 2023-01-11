import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChoferesAltaComponent } from './choferes-alta/choferes-alta.component';
import { ChoferesBajaComponent } from './choferes-baja/choferes-baja.component';
import { ChoferesControlComponent } from './choferes-control/choferes-control.component';
import { ChoferesListadoComponent } from './choferes-listado/choferes-listado.component';

const routes: Routes = [
  {path: '', component:ChoferesControlComponent,
  children: [       
    {path: 'alta', component:ChoferesAltaComponent},
    {path: 'baja', component:ChoferesBajaComponent},
    {path: 'listado', component:ChoferesListadoComponent}
]  },
  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ChoferesRoutingModule { }
