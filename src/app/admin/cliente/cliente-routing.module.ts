import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClienteAltaComponent } from './cliente-alta/cliente-alta.component';

import { ClienteControlComponent } from './cliente-control/cliente-control.component';
import { ClienteListadoComponent } from './cliente-listado/cliente-listado.component';
import { ClienteTarifaPersonalizadaComponent } from './cliente-tarifa-personalizada/cliente-tarifa-personalizada.component';
import { ClienteTarifaGralComponent } from './cliente-tarifa-gral/cliente-tarifa-gral.component';
import { ClienteTarifaEspecialComponent } from './cliente-tarifa-especial/cliente-tarifa-especial.component';
import { TarifasEventualesComponent } from 'src/app/shared/tarifas-eventuales/tarifas-eventuales.component';

const routes: Routes = [
  {path: '', component:ClienteControlComponent,
  children: [        
    {path: 'alta', component:ClienteAltaComponent},    
    {path: 'listado', component:ClienteListadoComponent},
    {path: 'general', component:ClienteTarifaGralComponent},
    {path: 'especial', component:ClienteTarifaEspecialComponent},
    {path: 'personalizada', component:ClienteTarifaPersonalizadaComponent},
    {path: 'eventual', component:TarifasEventualesComponent},
]  },
  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ClienteRoutingModule { }
