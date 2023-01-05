import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminRoutingModule } from './admin-routing.module';
import { AdminHomeComponent } from './admin-home/admin-home.component';
import { AdminSidebarComponent } from './admin-sidebar/admin-sidebar.component';


@NgModule({
  declarations: [
    AdminHomeComponent,
    AdminSidebarComponent
  ],
  imports: [
    CommonModule,
    AdminRoutingModule
  ]
})
export class AdminModule { }
