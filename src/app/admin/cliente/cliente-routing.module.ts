import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClienteAltaComponent } from './cliente-alta/cliente-alta.component';

import { ClienteControlComponent } from './cliente-control/cliente-control.component';
import { ClienteListadoComponent } from './cliente-listado/cliente-listado.component';
import { ClienteTarifaPersonalizadaComponent } from './cliente-tarifa-personalizada/cliente-tarifa-personalizada.component';
import { ClienteTarifaGralComponent } from './cliente-tarifa-gral/cliente-tarifa-gral.component';
import { ClienteTarifaEspecialComponent } from './cliente-tarifa-especial/cliente-tarifa-especial.component';
import { TarifasEventualesComponent } from 'src/app/shared/tarifas-eventuales/tarifas-eventuales.component';
import { RoleGuard } from 'src/app/guards/role.guard';
import { ListadoNuevoComponent } from './listado-nuevo/listado-nuevo.component';

const routes: Routes = [
  {path: '', component:ClienteControlComponent,
  children: [        
    {path: 'alta', component:ClienteAltaComponent,
      canActivate: [RoleGuard],
      data: { roles: ['god', 'admin', 'manager'] }, // no se permiten usuarios
    },    
    {path: 'listado', component:ClienteListadoComponent},
    {path: 'general', component:ClienteTarifaGralComponent},
    {path: 'especial', component:ClienteTarifaEspecialComponent},
    {path: 'personalizada', component:ClienteTarifaPersonalizadaComponent},
    {path: 'eventual', component:TarifasEventualesComponent},
    {path: 'prueba', component:ListadoNuevoComponent},
]  },
  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ClienteRoutingModule { }
