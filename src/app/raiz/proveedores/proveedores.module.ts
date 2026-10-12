import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ProveedoresRoutingModule } from './proveedores-routing.module';
import { ProveedoresAltaComponent } from './proveedores-alta/proveedores-alta.component';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';

import { ProveedoresControlComponent } from './proveedores-control/proveedores-control.component';
import { ModalContactoProveedoresComponent } from './modal-contacto-proveedores/modal-contacto-proveedores.component';
import { FilterPipeModule } from 'ngx-filter-pipe';
import { ProveedoresListadoComponent } from './proveedores-listado/proveedores-listado.component';
import { AgGridModule } from 'ag-grid-angular';


@NgModule({
  declarations: [
    ProveedoresAltaComponent,        
    ProveedoresControlComponent,
    ModalContactoProveedoresComponent,
    ProveedoresListadoComponent    
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ProveedoresRoutingModule,
    SharedModule,
    FilterPipeModule,
    
    AgGridModule
  ]
})
export class ProveedoresModule { }
