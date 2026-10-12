import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClienteRoutingModule } from './clientes-routing.module';
import { ClientesControlComponent } from './clientes-control/clientes-control.component';
import { ClienteAltaComponent } from './cliente-alta/cliente-alta.component';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { ModalContactoComponent } from './modal-contacto/modal-contacto.component';
import { FilterPipeModule } from 'ngx-filter-pipe';
import { ClientesListadoComponent } from './clientes-listado/clientes-listado.component';
import { AgGridModule } from 'ag-grid-angular';









@NgModule({
  declarations: [
    ClientesControlComponent,
    ClienteAltaComponent,
    ModalContactoComponent,
    ClientesListadoComponent,
  ],
  imports: [
    CommonModule,
    ClienteRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    FilterPipeModule,
    
    AgGridModule 
  ]
})
export class ClientesModule { }
