import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OpAltaComponent } from './op-alta/op-alta.component';
import { OpDiariasComponent } from './op-diarias/op-diarias.component';
import { OpHistorialComponent } from './op-historial/op-historial.component';
import { OpCerradasComponent } from './op-cerradas/op-cerradas.component';

const routes: Routes = [
    {path: 'alta', component:OpAltaComponent},
    {path: 'op-diarias', component:OpDiariasComponent},
    {path: 'historial', component:OpHistorialComponent},
    {path: 'facturadas', component:OpCerradasComponent}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OperacionesRoutingModule { }
