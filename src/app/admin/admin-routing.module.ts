import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminHomeComponent } from './admin-home/admin-home.component';
import { ClienteAltaComponent } from './cliente/cliente-alta/cliente-alta.component';

const routes: Routes = [
  {path: '', component: AdminHomeComponent,
   children: [
    { path: '', redirectTo: '/op/op-alta', pathMatch: 'full' },    
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
    {
      path: 'proveedores',
      loadChildren: () => import('./proveedores/proveedores.module').then(m => m.ProveedoresModule)
    },  
    {
      path: 'facturacion',
      loadChildren: () => import('./facturacion/facturacion.module').then(m => m.FacturacionModule)
    },  
    {
      path: 'liquidacion',
      loadChildren: () => import('./liquidacion/liquidacion.module').then(m => m.LiquidacionModule)
    },  
    {
      path: 'historial',
      loadChildren: () => import('./historial/historial.module').then(m => m.HistorialModule)
    },  
    {
      path: 'ajustes',
      loadChildren: () => import('./configuraciones/configuraciones.module').then(m => m.ConfiguracionesModule)
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
