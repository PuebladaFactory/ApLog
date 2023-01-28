import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChoferHistorialComponent } from './chofer-historial/chofer-historial.component';
import { ChoferHomeComponent } from './chofer-home/chofer-home.component';
import { ChoferLegajoComponent } from './chofer-legajo/chofer-legajo.component';
import { ChoferLiquidacionComponent } from './chofer-liquidacion/chofer-liquidacion.component';
import { ChoferOperacionComponent } from './chofer-operacion/chofer-operacion.component';
import { ChoferPerfilComponent } from './chofer-perfil/chofer-perfil.component';

const routes: Routes = [
  /* { path: '', component: ChoferHomeComponent},
  { path: 'perfil', component: ChoferPerfilComponent} */
  {
    path: '',
    component: ChoferHomeComponent,    
    children: [
      {
        path: '',
        component: ChoferOperacionComponent,   
        pathMatch: 'full',
      },
      {
        path: 'perfil',
        component: ChoferPerfilComponent,   
        pathMatch: 'full',
      },
      {
        path: 'legajo',
        component: ChoferLegajoComponent,   
        pathMatch: 'full',
      },
      {
        path: 'opActivas',
        component: ChoferOperacionComponent,   
        pathMatch: 'full',
      },
      {
        path: 'historial',
        component: ChoferHistorialComponent,   
        pathMatch: 'full',
      },
      {
        path: 'liquidaciones',
        component: ChoferLiquidacionComponent,   
        pathMatch: 'full',
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ChoferRoutingModule { }
