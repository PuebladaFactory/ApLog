import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ChoferRoutingModule } from './chofer-routing.module';
import { ChoferHomeComponent } from './chofer-home/chofer-home.component';
import { ChoferPerfilComponent } from './chofer-perfil/chofer-perfil.component';
import { ChoferLegajoComponent } from './chofer-legajo/chofer-legajo.component';
import { ChoferLiquidacionComponent } from './chofer-liquidacion/chofer-liquidacion.component';
import { ChoferOperacionComponent } from './chofer-operacion/chofer-operacion.component';
import { ChoferSidebarComponent } from './chofer-sidebar/chofer-sidebar.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';



@NgModule({
  declarations: [
    ChoferHomeComponent,
    ChoferPerfilComponent,
    ChoferLegajoComponent,
    ChoferLiquidacionComponent,
    ChoferOperacionComponent,
    ChoferSidebarComponent,    
  ],
  imports: [
    CommonModule,
    ChoferRoutingModule,
    FormsModule,
    ReactiveFormsModule
  ]
})
export class ChoferModule { }
