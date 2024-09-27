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
import { ProveedoresControlComponent } from './proveedores-control/proveedores-control.component';
import { ProveedoresTarifaGralComponent } from './proveedores-tarifa-gral/proveedores-tarifa-gral.component';
import { ProveedoresTarifaEspecialComponent } from './proveedores-tarifa-especial/proveedores-tarifa-especial.component';
import { ModalContactoProveedoresComponent } from './modal-contacto-proveedores/modal-contacto-proveedores.component';


@NgModule({
  declarations: [
    ProveedoresAltaComponent,
    /* ProveedoresBajaComponent, */
    ProveedoresListadoComponent,
    ProveedoresTarifaComponent,
    ModalAltaTarifaComponent,
    ProveedoresControlComponent,
    ProveedoresTarifaGralComponent,
    ProveedoresTarifaEspecialComponent,
    ModalContactoProveedoresComponent
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
