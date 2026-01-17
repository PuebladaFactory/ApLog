import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ControlComponent } from './control/control.component';
import { FacturacionListadoComponent } from './facturacion-listado/facturacion-listado.component';
import { FacturacionHistoricoComponent } from './facturacion-historico/facturacion-historico.component';

const routes: Routes = [
    {path: '', component:ControlComponent,
      children: [               
        {path: 'listado', component:FacturacionListadoComponent},
        {path: 'historial', component:FacturacionHistoricoComponent},                              
    ]  },
  
    
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class NuevaFacturacionRoutingModule { }
