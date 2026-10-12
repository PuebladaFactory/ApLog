import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProveedoresAltaComponent } from './proveedores-alta/proveedores-alta.component';
import { ProveedoresControlComponent } from './proveedores-control/proveedores-control.component';
import { RoleGuard } from 'src/app/guards/role.guard';
import { ProveedoresListadoComponent } from './proveedores-listado/proveedores-listado.component';

const routes: Routes = [
  {path: '', component:ProveedoresControlComponent,
    children: [      
      {path: '', redirectTo: 'listado', pathMatch: 'full' },                                 
      {path: 'alta', component:ProveedoresAltaComponent,
            canActivate: [RoleGuard],
            data: { roles: ['dev', 'admin', 'manager'] }, // no se permiten usuarios
      },            
      // Tarifas de proveedores: módulo Tarifas (/tarifas). Las rutas viejas
      // (general, especial, eventual) se retiraron en TC-R2.
      {path: 'listado', component:ProveedoresListadoComponent},
     ]},
 
]; 


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProveedoresRoutingModule { }
