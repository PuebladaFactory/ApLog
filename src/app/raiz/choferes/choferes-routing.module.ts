import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChoferesAltaComponent } from './choferes-alta/choferes-alta.component';
import { ChoferesControlComponent } from './choferes-control/choferes-control.component';
import { ChoferesTarifaGralComponent } from './choferes-tarifa-gral/choferes-tarifa-gral.component';
import { ChoferesTarifaEspecialComponent } from './choferes-tarifa-especial/choferes-tarifa-especial.component';
import { TarifasEventualesComponent } from 'src/app/shared/tarifas-eventuales/tarifas-eventuales.component';
import { RoleGuard } from 'src/app/guards/role.guard';
import { ChoferesListadoComponent } from './choferes-listado/choferes-listado.component';


const routes: Routes = [
  {path: '', component:ChoferesControlComponent,
  children: [       
    {path: 'alta', component:ChoferesAltaComponent,
          canActivate: [RoleGuard],
          data: { roles: ['god', 'admin', 'manager'] }, // no se permiten usuarios
    },        
    {path: 'general', component:ChoferesTarifaGralComponent},
    {path: 'especial', component:ChoferesTarifaEspecialComponent},
    {path: 'eventual', component:TarifasEventualesComponent},    
    {path: 'listado', component:ChoferesListadoComponent},
]  },
  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ChoferesRoutingModule { }
