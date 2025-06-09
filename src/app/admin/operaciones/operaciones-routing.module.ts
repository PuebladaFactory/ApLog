import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OpControlComponent } from './op-control/op-control.component';
import { TableroOpComponent } from './tablero-op/tablero-op.component';
import { NuevaTablaComponent } from './nueva-tabla/nueva-tabla.component';


const routes: Routes = [
    {path: '', component:OpControlComponent,
      children: [       
        {path: 'tablero', component:TableroOpComponent},             
        {path: 'nuevo', component:NuevaTablaComponent},             
    ]  },
  
    
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OperacionesRoutingModule { }
