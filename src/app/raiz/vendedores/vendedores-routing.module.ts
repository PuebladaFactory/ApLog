import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { VendedorControlComponent } from './vendedor-control/vendedor-control.component';
import { VendedoresListadoComponent } from './vendedores-listado/vendedores-listado.component';
import { TableroActividadComponent } from './tablero-actividad/tablero-actividad.component';
import { VendedorHistorialComponent } from './vendedor-historial/vendedor-historial.component';

// Acceso al módulo: dev/admin/demo (guard en raiz-routing). El alta/edición
// de vendedores es un modal (VendedorAltaComponent), sin ruta propia.
const routes: Routes = [
  {path: '', component:VendedorControlComponent,
  children: [
    {path: '', redirectTo: 'tableroVendedores', pathMatch: 'full' },
    {path: 'listado', component:VendedoresListadoComponent},
    {path: 'tableroVendedores', component:TableroActividadComponent},
    {path: 'historial', component:VendedorHistorialComponent},
]  },

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class VendedoresRoutingModule { }
