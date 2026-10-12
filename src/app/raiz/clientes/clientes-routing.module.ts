import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClienteAltaComponent } from './cliente-alta/cliente-alta.component';
import { ClientesControlComponent } from './clientes-control/clientes-control.component';
import { RoleGuard } from 'src/app/guards/role.guard';
import { ClientesListadoComponent } from './clientes-listado/clientes-listado.component';

const routes: Routes = [
  {path: '', component:ClientesControlComponent,
  children: [  
    { path: '', redirectTo: 'listado', pathMatch: 'full' },         
    {path: 'alta', component:ClienteAltaComponent,
      canActivate: [RoleGuard],
      data: { roles: ['dev', 'admin', 'manager'] }, // no se permiten usuarios
    },        
    // Tarifas de clientes: módulo Tarifas (/tarifas). Las rutas viejas
    // (general, especial, personalizada, eventual, personalizada/:id) se
    // retiraron en TC-R1.
    {path: 'listado', component:ClientesListadoComponent}
]  },
  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ClienteRoutingModule { }
