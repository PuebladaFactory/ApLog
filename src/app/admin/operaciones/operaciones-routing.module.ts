import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OpAltaComponent } from './op-alta/op-alta.component';
import { OpDiariasComponent } from './op-diarias/op-diarias.component';
import { OpHistorialComponent } from './op-historial/op-historial.component';
import { OpCerradasComponent } from './op-cerradas/op-cerradas.component';
import { OpAbiertasComponent } from './op-abiertas/op-abiertas.component';

const routes: Routes = [
    {path: 'alta', component:OpAltaComponent},
    {path: 'op-alta', component:OpDiariasComponent},
    {path: 'op-abiertas', component:OpAbiertasComponent},
    {path: 'facturadas', component:OpCerradasComponent}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OperacionesRoutingModule { }
