import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProveedoresAltaComponent } from './proveedores-alta/proveedores-alta.component';
import { ProveedoresBajaComponent } from './proveedores-baja/proveedores-baja.component';
import { ProveedoresListadoComponent } from './proveedores-listado/proveedores-listado.component';
import { ProveedoresTarifaComponent } from './proveedores-tarifa/proveedores-tarifa.component';

const routes: Routes = [
  {path: 'alta', component:ProveedoresAltaComponent},
  {path: 'baja', component:ProveedoresBajaComponent},
  {path: 'listado', component:ProveedoresListadoComponent},
  {path: 'tarifa', component:ProveedoresTarifaComponent}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProveedoresRoutingModule { }
