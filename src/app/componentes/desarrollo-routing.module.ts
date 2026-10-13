import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MigracionComponent } from './migracion/migracion.component';

// Frente lazy-fechas (LZ6): rutas del módulo de herramientas de desarrollo.
// raiz-routing carga este módulo en '/migracion' (con RoleGuard, solo dev).
const routes: Routes = [
  { path: '', component: MigracionComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DesarrolloRoutingModule { }
