import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { RoleGuard } from '../guards/role.guard';


const routes: Routes = [
  {path: '', component: HomeComponent,
   children: [
    { path: '', redirectTo: 'op', pathMatch: 'full' },
    {
      path: 'clientes',
      loadChildren: () => import('./clientes/clientes.module').then(m => m.ClientesModule),
      canMatch: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['dev','admin','manager','user', 'demo'] }, // Accesible para todos los roles
    },  
    {
      path: 'choferes',
      loadChildren: () => import('./choferes/choferes.module').then(m => m.ChoferesModule),
      canMatch: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['dev','admin','manager','user', 'demo'] }, // Accesible para todos los roles
    },  
    {
      path: 'op',
      loadChildren: () => import('./operaciones/operaciones.module').then(m => m.OperacionesModule),
      canMatch: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['dev','admin','manager','user', 'demo'] }, // Accesible para todos los roles
    },  
    {
      path: 'proveedores',
      loadChildren: () => import('./proveedores/proveedores.module').then(m => m.ProveedoresModule),
      canMatch: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['dev','admin','manager','user', 'demo'] }, // Accesible para todos los roles
    },  
    {
      path: 'liquidacion',
      loadChildren: () => import('./liquidacion/liquidacion.module').then(m => m.LiquidacionModule),
      canMatch: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['dev','admin','manager','user', 'demo'] }, // Accesible para todos los roles
    },             
    {
      path: 'legajos',
      loadChildren: () => import('./legajos/legajos.module').then(m => m.LegajosModule),
      canMatch: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['dev','admin','manager','user', 'demo'] }, // Accesible para todos los roles
    },
    {
      path: 'ajustes',
      loadChildren: () => import('./ajustes/ajustes.module').then(m => m.AjustesModule),
      canMatch: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['dev','admin', 'demo'] }, // Accesible para todos los roles
    },
    {
      path: 'nuevaFacturacion',
      loadChildren: () => import('./nueva-facturacion/nueva-facturacion.module').then(m => m.NuevaFacturacionModule),
      canMatch: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['dev','admin', 'demo'] },       
    },
    {
      path: 'vendedores',
      loadChildren: () => import('./vendedores/vendedores.module').then(m => m.VendedoresModule),
      canMatch: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['dev','admin', 'demo'] }, // Frente Vendedores: solo los roles que leen 'vendedores' en las reglas
    },
    {
      path: 'tarifas',
      loadChildren: () => import('./tarifas/tarifas.module').then(m => m.TarifasModule),
      canMatch: [RoleGuard],
      data: { roles: ['dev','admin','user','demo'] },
    },
    {
      // Frente Finanzas (F9): el módulo viejo se retiró; la ruta 'finanzas'
      // es el módulo nuevo (carpeta finanzas-nueva). Solo lazy: NO se
      // importa en RaizModule. demo lee (reglas 'finanzas').
      path: 'finanzas',
      loadChildren: () => import('./finanzas-nueva/finanzas-nueva.module').then(m => m.FinanzasNuevaModule),
      canMatch: [RoleGuard],
      data: { roles: ['dev', 'admin', 'demo'] },
    },
    {
      path: 'reportes',
      loadChildren: () => import('./reportes/reportes.module').then(m => m.ReportesModule),
      canMatch: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['dev','admin', 'demo'] }, // 
    },
    {
      // LZ6: herramientas de desarrollo en un módulo lazy propio.
      path: 'migracion',
      loadChildren: () => import('../componentes/desarrollo.module').then(m => m.DesarrolloModule),
      canMatch: [RoleGuard],
      data: { roles: ['dev'] },
    },



]  },

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RaizRoutingModule { }
