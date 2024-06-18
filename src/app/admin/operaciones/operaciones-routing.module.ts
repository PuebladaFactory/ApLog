import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OpAltaComponent } from './op-alta/op-alta.component';
import { OpDiariasComponent } from './op-diarias/op-diarias.component';
import { OpAbiertasComponent } from './op-abiertas/op-abiertas.component';

const routes: Routes = [
    {path: 'alta', component:OpAltaComponent},
    {path: 'op-alta', component:OpDiariasComponent},
    {path: 'op-abiertas', component:OpAbiertasComponent},
    
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OperacionesRoutingModule { }
