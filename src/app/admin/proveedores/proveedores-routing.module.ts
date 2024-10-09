import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProveedoresAltaComponent } from './proveedores-alta/proveedores-alta.component';
import { ProveedoresListadoComponent } from './proveedores-listado/proveedores-listado.component';
import { ProveedoresControlComponent } from './proveedores-control/proveedores-control.component';
import { ProveedoresTarifaGralComponent } from './proveedores-tarifa-gral/proveedores-tarifa-gral.component';
import { ProveedoresTarifaEspecialComponent } from './proveedores-tarifa-especial/proveedores-tarifa-especial.component';

const routes: Routes = [
  {path: '', component:ProveedoresControlComponent,
    children: [      
      {path: 'alta', component:ProveedoresAltaComponent},      
      {path: 'listado', component:ProveedoresListadoComponent},
      {path: 'general', component:ProveedoresTarifaGralComponent},
      {path: 'especial', component:ProveedoresTarifaEspecialComponent},      
     ]},
 
]; 


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProveedoresRoutingModule { }
