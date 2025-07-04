import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RaizRoutingModule } from './raiz-routing.module';
import { HomeComponent } from './home/home.component';
import { SharedModule } from '../shared/shared.module';
import { FilterPipeModule } from 'ngx-filter-pipe';
import { AgGridModule } from 'ag-grid-angular';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { SidebarComponent } from './sidebar/sidebar.component';
import { ClientesModule } from '../clientes/clientes.module';
import { OperacionesModule } from '../operaciones/operaciones.module';



@NgModule({
  declarations: [
    HomeComponent,
    SidebarComponent
  ],
  imports: [
    CommonModule,
    RaizRoutingModule,
    SharedModule,
    FilterPipeModule,
    AgGridModule,
    DragDropModule,
    ClientesModule,
    OperacionesModule
  ]
})
export class RaizModule { }
