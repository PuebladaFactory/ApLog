import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AjustesControlComponent } from './ajustes-control/ajustes-control.component';
import { GestionUsuariosComponent } from './gestion-usuarios/gestion-usuarios.component';
import { RoleGuard } from 'src/app/guards/role.guard';
import { RegistroComponent } from './registro/registro.component';
import { PapeleraComponent } from './papelera/papelera.component';
import { PapeleraLegadoComponent } from './papelera-legado/papelera-legado.component';
import { RegistroLogComponent } from './registro-log/registro-log.component';
import { DatosEmpresaComponent } from './datos-empresa/datos-empresa.component';

const routes: Routes = [
  {path: '', component:AjustesControlComponent,
    children: [
      { path: '', redirectTo: 'usuarios', pathMatch: 'full' },
      {path: 'usuarios', component:GestionUsuariosComponent,
            canActivate: [RoleGuard],
            data: { roles: ['dev', 'admin'] },
      },
      {path: 'registro', component:RegistroComponent,
        canActivate: [RoleGuard],
        data: { roles: ['dev', 'admin', 'demo'] }, // no se permiten usuarios
      },
      {path: 'registro-log', component:RegistroLogComponent,
        canActivate: [RoleGuard],
        data: { roles: ['dev', 'admin', 'demo'] }, // mismo criterio que 'registro' (screen de auditoría, no se permiten usuarios)
      },
      {path: 'papelera', component:PapeleraComponent,
        canActivate: [RoleGuard],
        data: { roles: ['dev', 'admin', 'demo'] }, // no se permiten usuarios
      },
      {path: 'papelera-legado', component:PapeleraLegadoComponent,
        canActivate: [RoleGuard],
        data: { roles: ['dev', 'admin', 'demo'] }, // no se permiten usuarios
      },
      {path: 'empresa', component:DatosEmpresaComponent,
        canActivate: [RoleGuard],
        data: { roles: ['dev', 'admin', 'demo'] }, // demo: solo lectura (F8b)
      },
  ]}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AjustesRoutingModule { }
