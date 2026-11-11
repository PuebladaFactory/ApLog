import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { RoleGuard } from '../guards/role.guard';


export const routes: Routes = [
  {path: '', component: HomeComponent,
   children: [
    { path: '', redirectTo: 'op', pathMatch: 'full' },
    {
      path: 'clientes',
      loadChildren: () => import('./clientes/clientes.module').then(m => m.ClientesModule),
      canMatch: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['dev','admin','user','demo'], lee: ['entidades'] }, // Los roles que leen 'entidades' en las reglas
    },  
    {
      path: 'choferes',
      loadChildren: () => import('./choferes/choferes.module').then(m => m.ChoferesModule),
      canMatch: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['dev','admin','user','demo'], lee: ['entidades'] }, // Los roles que leen 'entidades' en las reglas
    },  
    {
      path: 'op',
      loadChildren: () => import('./operaciones/operaciones.module').then(m => m.OperacionesModule),
      canMatch: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['dev','admin','user','demo'], lee: ['operaciones', 'asignaciones', 'entidades', 'tarifas'] }, // Los roles que leen 'operaciones' en las reglas
    },  
    {
      path: 'proveedores',
      loadChildren: () => import('./proveedores/proveedores.module').then(m => m.ProveedoresModule),
      canMatch: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['dev','admin','user','demo'], lee: ['entidades'] }, // Los roles que leen 'entidades' en las reglas
    },  
    {
      path: 'liquidacion',
      loadChildren: () => import('./liquidacion/liquidacion.module').then(m => m.LiquidacionModule),
      canMatch: [RoleGuard], // Protege acceso dentro del módulo
      // Los roles que leen 'finanzas' en las reglas (informesLiq). 'user' sale: no
      // puede leer informesLiq, y lo único que hacía en el módulo era leer
      // informesOp, que ya ve en Operaciones.
      data: { roles: ['dev','admin','demo'], lee: ['operaciones', 'informesOp', 'finanzas'] },
    },             
    {
      path: 'legajos',
      loadChildren: () => import('./legajos/legajos.module').then(m => m.LegajosModule),
      canMatch: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['dev','admin','user','demo'], lee: ['legajos', 'entidades', 'vencimientos'] }, // Los roles que leen 'legajos' en las reglas
    },
    {
      path: 'ajustes',
      loadChildren: () => import('./ajustes/ajustes.module').then(m => m.AjustesModule),
      canMatch: [RoleGuard], // Protege acceso dentro del módulo
      // dev/admin. 'demo' pierde la pantalla de datos de la empresa, que nunca
      // tuvo puerta: el menú ya estaba gateado con usuarios.ver (dev/admin), así
      // que sólo se llegaba escribiendo la URL. Cierra F8b.
      // lee: [] porque el shell no lee nada y sus cinco hijas tienen canActivate
      // propio con su declaración de lo que leen. El vacío es una afirmación,
      // no una omisión: no completarlo con lo que leen las hijas.
      data: { roles: ['dev','admin'], lee: [] },
    },
    {
      path: 'nuevaFacturacion',
      loadChildren: () => import('./nueva-facturacion/nueva-facturacion.module').then(m => m.NuevaFacturacionModule),
      canMatch: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['dev','admin', 'demo'], lee: ['finanzas'] },       
    },
    {
      path: 'vendedores',
      loadChildren: () => import('./vendedores/vendedores.module').then(m => m.VendedoresModule),
      canMatch: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['dev','admin', 'demo'], lee: ['vendedores', 'comisiones', 'entidades'] }, // Frente Vendedores: solo los roles que leen 'vendedores' en las reglas
    },
    {
      path: 'tarifas',
      loadChildren: () => import('./tarifas/tarifas.module').then(m => m.TarifasModule),
      canMatch: [RoleGuard],
      data: { roles: ['dev','admin','user','demo'], lee: ['tarifas', 'entidades', 'informesOp'] },
    },
    {
      // Frente Finanzas (F9): el módulo viejo se retiró; la ruta 'finanzas'
      // es el módulo nuevo (carpeta finanzas-nueva). Solo lazy: NO se
      // importa en RaizModule. demo lee (reglas 'finanzas').
      path: 'finanzas',
      loadChildren: () => import('./finanzas-nueva/finanzas-nueva.module').then(m => m.FinanzasNuevaModule),
      canMatch: [RoleGuard],
      data: { roles: ['dev', 'admin', 'demo'], lee: ['finanzas', 'entidades'] },
    },
    {
      path: 'reportes',
      loadChildren: () => import('./reportes/reportes.module').then(m => m.ReportesModule),
      canMatch: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['dev','admin', 'demo'], lee: ['resumenes', 'entidades'] }, // 
    },
    {
      // LZ6: herramientas de desarrollo en un módulo lazy propio.
      path: 'migracion',
      loadChildren: () => import('../componentes/desarrollo.module').then(m => m.DesarrolloModule),
      canMatch: [RoleGuard],
      data: { roles: ['dev'], lee: ['vendedores'] },
    },



]  },

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RaizRoutingModule { }
