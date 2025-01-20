import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AjustesControlComponent } from './ajustes-control/ajustes-control.component';
import { AjustesUsuariosComponent } from './ajustes-usuarios/ajustes-usuarios.component';
import { RoleGuard } from 'src/app/guards/role.guard';
import { RegistroComponent } from './registro/registro.component';

const routes: Routes = [
  {path: '', component:AjustesControlComponent,
    children: [        
      {path: 'usuarios', component:AjustesUsuariosComponent,
            canActivate: [RoleGuard],
            data: { roles: ['god', 'admin'] }, // no se permiten usuarios
      },          
      {path: 'registro', component:RegistroComponent,
        canActivate: [RoleGuard],
        data: { roles: ['god', 'admin'] }, // no se permiten usuarios
      },
  ]}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AjustesRoutingModule { }
