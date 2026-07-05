import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OpControlComponent } from './op-control/op-control.component';
import { TableroOpComponent } from './tablero-op/tablero-op.component';
import { TableroAsignacionesComponent } from './tablero-asignaciones/tablero-asignaciones.component';


const routes: Routes = [
    {path: '', component:OpControlComponent,
      children: [
        {path: '', redirectTo: 'tablero', pathMatch: 'full' },
        {path: 'tablero', component:TableroOpComponent},
        {path: 'asignaciones', component:TableroAsignacionesComponent},
    ]  },
  
    
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OperacionesRoutingModule { }
