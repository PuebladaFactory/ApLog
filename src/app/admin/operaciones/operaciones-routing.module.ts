import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OpControlComponent } from './op-control/op-control.component';
import { NuevaTablaComponent } from './nueva-tabla/nueva-tabla.component';
import { TableroDiarioComponent } from './tablero-diario/tablero-diario.component';


const routes: Routes = [
    {path: '', component:OpControlComponent,
      children: [               
        {path: 'tablero', component:NuevaTablaComponent},             
        {path: 'diario', component:TableroDiarioComponent},             
    ]  },
  
    
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OperacionesRoutingModule { }
