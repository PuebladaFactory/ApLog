import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ControlComponent } from './control/control.component';
import { FacturacionListadoComponent } from './facturacion-listado/facturacion-listado.component';

const routes: Routes = [
    {path: '', component:ControlComponent,
      children: [               
        {path: 'listado', component:FacturacionListadoComponent},                              
    ]  },
  
    
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class NuevaFacturacionRoutingModule { }
