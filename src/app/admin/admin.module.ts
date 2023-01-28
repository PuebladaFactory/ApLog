import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminRoutingModule } from './admin-routing.module';
import { AdminHomeComponent } from './admin-home/admin-home.component';
import { AdminSidebarComponent } from './admin-sidebar/admin-sidebar.component';
import { ClienteModule } from './cliente/cliente.module';
import { ChoferesModule } from './choferes/choferes.module';
import { OperacionesModule } from './operaciones/operaciones.module';

@NgModule({
  declarations: [
    AdminHomeComponent,
    AdminSidebarComponent
  ],
  imports: [
    CommonModule,
    AdminRoutingModule,
    ClienteModule,
    ChoferesModule, 
    OperacionesModule
  ]
})
export class AdminModule { }
