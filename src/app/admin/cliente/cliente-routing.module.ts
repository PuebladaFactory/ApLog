import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClienteAltaComponent } from './cliente-alta/cliente-alta.component';

import { ClienteControlComponent } from './cliente-control/cliente-control.component';
import { ClienteListadoComponent } from './cliente-listado/cliente-listado.component';
import { ClienteTarifaComponent } from './cliente-tarifa/cliente-tarifa.component';
import { ClienteTarifaPersonalizadaComponent } from './cliente-tarifa-personalizada/cliente-tarifa-personalizada.component';

const routes: Routes = [
  {path: '', component:ClienteControlComponent,
  children: [        
    {path: 'alta', component:ClienteAltaComponent},
    
    {path: 'listado', component:ClienteListadoComponent},
    {path: 'tarifa', component:ClienteTarifaComponent},
    {path: 'personalizada', component:ClienteTarifaPersonalizadaComponent},
]  },
  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ClienteRoutingModule { }
