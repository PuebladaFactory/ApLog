import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OpAltaComponent } from './op-alta/op-alta.component';
import { OpDiariasComponent } from './op-diarias/op-diarias.component';
import { OpAbiertasComponent } from './op-abiertas/op-abiertas.component';
import { OpControlComponent } from './op-control/op-control.component';
import { TableroOpComponent } from './tablero-op/tablero-op.component';

const routes: Routes = [
    {path: '', component:OpControlComponent,
      children: [       
        {path: 'tablero', component:TableroOpComponent},    
    ]  },
   /*  {path: 'alta', component:OpAltaComponent},
    {path: 'op-alta', component:OpDiariasComponent},
    {path: 'op-abiertas', component:OpAbiertasComponent}, */
    
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OperacionesRoutingModule { }
