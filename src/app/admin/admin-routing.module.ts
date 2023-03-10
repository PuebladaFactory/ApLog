import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminHomeComponent } from './admin-home/admin-home.component';
import { ClienteAltaComponent } from './cliente/cliente-alta/cliente-alta.component';

const routes: Routes = [
  {path: '', component: AdminHomeComponent,
   children: [
    { path: '', redirectTo: '/op/op-diarias', pathMatch: 'full' },    
    {
      path: 'clientes',
      loadChildren: () => import('./cliente/cliente.module').then(m => m.ClienteModule)
    },  
    {
      path: 'choferes',
      loadChildren: () => import('./choferes/choferes.module').then(m => m.ChoferesModule)
    },  
    {
      path: 'op',
      loadChildren: () => import('./operaciones/operaciones.module').then(m => m.OperacionesModule)
    },  
]  },  
/* {
  path: 'clientes',
  loadChildren: () => import('./cliente/cliente.module').then(m => m.ClienteModule)
},   */
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
