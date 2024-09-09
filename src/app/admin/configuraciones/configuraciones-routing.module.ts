import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConfiguracionesComponent } from './configuraciones/configuraciones.component';
import { TarifaChoferComponent } from './tarifa-chofer/tarifa-chofer.component';
import { TarifaClienteComponent } from './tarifa-cliente/tarifa-cliente.component';

const routes: Routes = [
  {path: '', component:ConfiguracionesComponent,
    children: [        
      {path: 'clientes', component:TarifaClienteComponent},
      {path: 'choferes', component:TarifaChoferComponent},
      {path: 'proveedores', component:TarifaChoferComponent},
  ]  
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ConfiguracionesRoutingModule { }
