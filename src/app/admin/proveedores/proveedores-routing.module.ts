import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProveedoresAltaComponent } from './proveedores-alta/proveedores-alta.component';
import { ProveedoresListadoComponent } from './proveedores-listado/proveedores-listado.component';
import { ProveedoresControlComponent } from './proveedores-control/proveedores-control.component';
import { ProveedoresTarifaGralComponent } from './proveedores-tarifa-gral/proveedores-tarifa-gral.component';
import { ProveedoresTarifaEspecialComponent } from './proveedores-tarifa-especial/proveedores-tarifa-especial.component';
import { TarifasEventualesComponent } from 'src/app/shared/tarifas-eventuales/tarifas-eventuales.component';
import { RoleGuard } from 'src/app/guards/role.guard';
import { ListadoNuevoProveedorComponent } from './listado-nuevo-proveedor/listado-nuevo-proveedor.component';

const routes: Routes = [
  {path: '', component:ProveedoresControlComponent,
    children: [      
      {path: 'alta', component:ProveedoresAltaComponent,
            canActivate: [RoleGuard],
            data: { roles: ['god', 'admin', 'manager'] }, // no se permiten usuarios
      },      
      {path: 'listado', component:ProveedoresListadoComponent},
      {path: 'general', component:ProveedoresTarifaGralComponent},
      {path: 'especial', component:ProveedoresTarifaEspecialComponent},      
      {path: 'eventual', component:TarifasEventualesComponent},
      {path: 'prueba', component:ListadoNuevoProveedorComponent},
     ]},
 
]; 


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProveedoresRoutingModule { }
