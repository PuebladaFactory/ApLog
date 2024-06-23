import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ProveedoresRoutingModule } from './proveedores-routing.module';
import { ProveedoresAltaComponent } from './proveedores-alta/proveedores-alta.component';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { ProveedoresListadoComponent } from './proveedores-listado/proveedores-listado.component';
import { ProveedoresTarifaComponent } from './proveedores-tarifa/proveedores-tarifa.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { Ng2SearchPipeModule } from 'ng2-search-filter';
import { ModalAltaTarifaComponent } from './modal-alta-tarifa/modal-alta-tarifa.component';


@NgModule({
  declarations: [
    ProveedoresAltaComponent,
    /* ProveedoresBajaComponent, */
    ProveedoresListadoComponent,
    ProveedoresTarifaComponent,
    ModalAltaTarifaComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ProveedoresRoutingModule,
    SharedModule,
    Ng2SearchPipeModule,
    NgxDatatableModule
  ]
})
export class ProveedoresModule { }
