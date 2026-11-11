import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ControlComponent } from './control/control.component';
import { TableroLegajosComponent } from './tablero-legajos/tablero-legajos.component';
import { ConsultaLegajosComponent } from './consulta-legajos/consulta-legajos.component';
import { CargarDocumentosComponent } from './cargar-documentos/cargar-documentos.component';
import { VencimientosComponent } from './vencimientos/vencimientos.component';
import { RoleGuard } from 'src/app/guards/role.guard';

export const routes: Routes = [
  {path: '', component:ControlComponent,
    children: [
      {path: '', redirectTo: 'tablero', pathMatch: 'full' },
      {path: 'tablero', component:TableroLegajosComponent},
      {path: 'consulta', component:ConsultaLegajosComponent},
      {path: 'cargarDoc', component:CargarDocumentosComponent,
        canActivate: [RoleGuard],
        data: { roles: ['dev', 'admin', 'user'], lee: ['legajos', 'entidades'] }, // legajos.crear, el mismo permiso que la pestaña (legajos.agregar)
      },
      {path: 'vencimientos', component:VencimientosComponent},
  ]  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LegajosRoutingModule { }
