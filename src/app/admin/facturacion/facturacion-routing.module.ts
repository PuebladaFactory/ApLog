import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FacturacionClienteComponent } from './facturacion-cliente/facturacion-cliente.component';
import { FacturacionChoferComponent } from './facturacion-chofer/facturacion-chofer.component';
import { FacturacionGeneralComponent } from './facturacion-general/facturacion-general.component';



const routes: Routes = [
  //{path: 'cliente', component:FacturacionClienteComponent},
  //{path: 'chofer', component:FacturacionChoferComponent},
  {path: 'general', component:FacturacionGeneralComponent},  
  {
    path: 'historial',
    loadChildren: () => import('./historial/historial.module').then(m => m.HistorialModule)
  },  
  
   
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FacturacionRoutingModule { }

