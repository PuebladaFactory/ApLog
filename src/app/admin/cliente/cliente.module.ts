import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ClienteRoutingModule } from './cliente-routing.module';
import { ClienteControlComponent } from './cliente-control/cliente-control.component';
import { ClienteListadoComponent } from './cliente-listado/cliente-listado.component';
import { ClienteAltaComponent } from './cliente-alta/cliente-alta.component';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { Ng2SearchPipeModule } from 'ng2-search-filter';
import { ClienteTarifaComponent } from './cliente-tarifa/cliente-tarifa.component';
import { ModalAltaTarifaComponent } from './modal-alta-tarifa/modal-alta-tarifa.component';







@NgModule({
  declarations: [
    ClienteControlComponent,
    ClienteListadoComponent,
    ClienteAltaComponent,    
    ClienteTarifaComponent, ModalAltaTarifaComponent, 
    

  ],
  imports: [
    CommonModule,
    ClienteRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    Ng2SearchPipeModule,
    NgxDatatableModule
  ]
})
export class ClienteModule { }
