import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClienteAltaComponent } from './cliente-alta/cliente-alta.component';
import { ClienteBajaComponent } from './cliente-baja/cliente-baja.component';
import { ClienteControlComponent } from './cliente-control/cliente-control.component';
import { ClienteListadoComponent } from './cliente-listado/cliente-listado.component';
import { ClienteTarifaComponent } from './cliente-tarifa/cliente-tarifa.component';

const routes: Routes = [
  {path: '', component:ClienteControlComponent,
  children: [        
    {path: 'alta', component:ClienteAltaComponent},
    {path: 'baja', component:ClienteBajaComponent},
    {path: 'listado', component:ClienteListadoComponent},
    {path: 'tarifa', component:ClienteTarifaComponent},
]  },
  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ClienteRoutingModule { }
