import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClienteRoutingModule } from './clientes-routing.module';
import { ClientesControlComponent } from './clientes-control/clientes-control.component';
import { ClienteAltaComponent } from './cliente-alta/cliente-alta.component';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { ClienteTarifaPersonalizadaComponent } from './cliente-tarifa-personalizada/cliente-tarifa-personalizada.component';
import { ClienteTarifaGralComponent } from './cliente-tarifa-gral/cliente-tarifa-gral.component';
import { ClienteTarifaEspecialComponent } from './cliente-tarifa-especial/cliente-tarifa-especial.component';
import { ModalContactoComponent } from './modal-contacto/modal-contacto.component';
import { ModalTarifaPersonalizadaComponent } from './modal-tarifa-personalizada/modal-tarifa-personalizada.component';
import { FilterPipeModule } from 'ngx-filter-pipe';
import { ClientesListadoComponent } from './clientes-listado/clientes-listado.component';
import { AgGridModule } from 'ag-grid-angular';









@NgModule({
  declarations: [
    ClientesControlComponent,    
    ClienteAltaComponent,            
    ClienteTarifaPersonalizadaComponent, 
    ClienteTarifaGralComponent, 
    ClienteTarifaEspecialComponent, 
    ModalContactoComponent, 
    ModalTarifaPersonalizadaComponent, 
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
