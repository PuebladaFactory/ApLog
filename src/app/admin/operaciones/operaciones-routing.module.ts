import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OpControlComponent } from './op-control/op-control.component';
import { TableroOpComponent } from './tablero-op/tablero-op.component';


const routes: Routes = [
    {path: '', component:OpControlComponent,
      children: [       
        {path: 'tablero', component:TableroOpComponent},             
    ]  },
  
    
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OperacionesRoutingModule { }
