import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { RoleGuard } from '../guards/role.guard';


const routes: Routes = [
  {path: '', component: HomeComponent,
   children: [
    { path: '', redirectTo: '/op', pathMatch: 'full' },    
    {
      path: 'clientes',
      loadChildren: () => import('./clientes/clientes.module').then(m => m.ClientesModule),
      canActivate: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['god','admin','manager','user', 'demo'] }, // Accesible para todos los roles
    },  
    {
      path: 'choferes',
      loadChildren: () => import('./choferes/choferes.module').then(m => m.ChoferesModule),
      canActivate: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['god','admin','manager','user', 'demo'] }, // Accesible para todos los roles
    },  
    {
      path: 'op',
      loadChildren: () => import('./operaciones/operaciones.module').then(m => m.OperacionesModule),
      canActivate: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['god','admin','manager','user', 'demo'] }, // Accesible para todos los roles
    },  
    {
      path: 'proveedores',
      loadChildren: () => import('./proveedores/proveedores.module').then(m => m.ProveedoresModule),
      canActivate: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['god','admin','manager','user', 'demo'] }, // Accesible para todos los roles
    },  
    {
      path: 'facturacion',
      loadChildren: () => import('./facturacion/facturacion.module').then(m => m.FacturacionModule),
      canActivate: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['god','admin','manager','user', 'demo'] }, // Accesible para todos los roles
    },  
    {
      path: 'liquidacion',
      loadChildren: () => import('./liquidacion/liquidacion.module').then(m => m.LiquidacionModule),
      canActivate: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['god','admin','manager','user', 'demo'] }, // Accesible para todos los roles
    },             
    {
      path: 'legajos',
      loadChildren: () => import('./legajos/legajos.module').then(m => m.LegajosModule),
      canActivate: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['god','admin','manager','user'] }, // Accesible para todos los roles
    },
    {
      path: 'ajustes',
      loadChildren: () => import('./ajustes/ajustes.module').then(m => m.AjustesModule),
      canActivate: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['god','admin',] }, // Accesible para todos los roles
    },
    {
      path: 'nuevaFacturacion',
      loadChildren: () => import('./nueva-facturacion/nueva-facturacion.module').then(m => m.NuevaFacturacionModule),
      canActivate: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['god','admin'] }, 
    },
    {
      path: 'vendedores',
      loadChildren: () => import('./vendedores/vendedores.module').then(m => m.VendedoresModule),
      canActivate: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['god','admin', 'manager','user', 'demo'] }, // Accesible para todos los roles
    },
    {
      path: 'finanzas',
      loadChildren: () => import('./finanzas/finanzas.module').then(m => m.FinanzasModule),
      canActivate: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['god','admin'] }, // 
    },
    {
      path: 'finanzas',
      loadChildren: () => import('./finanzas/finanzas.module').then(m => m.FinanzasModule),
      canActivate: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['god','admin'] }, // 
    },
    {
      path: 'finanzas',
      loadChildren: () => import('./finanzas/finanzas.module').then(m => m.FinanzasModule),
      canActivate: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['god','admin'] }, // 
    },
    {
      path: 'finanzas',
      loadChildren: () => import('./finanzas/finanzas.module').then(m => m.FinanzasModule),
      canActivate: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['god','admin'] }, // 
    },
    {
      path: 'finanzas',
      loadChildren: () => import('./finanzas/finanzas.module').then(m => m.FinanzasModule),
      canActivate: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['god','admin'] }, // 
    },
    
    
    
]  },  

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RaizRoutingModule { }
