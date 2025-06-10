import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ProveedoresRoutingModule } from './proveedores-routing.module';
import { ProveedoresAltaComponent } from './proveedores-alta/proveedores-alta.component';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { ProveedoresListadoComponent } from './proveedores-listado/proveedores-listado.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';

import { ProveedoresControlComponent } from './proveedores-control/proveedores-control.component';
import { ProveedoresTarifaGralComponent } from './proveedores-tarifa-gral/proveedores-tarifa-gral.component';
import { ProveedoresTarifaEspecialComponent } from './proveedores-tarifa-especial/proveedores-tarifa-especial.component';
import { ModalContactoProveedoresComponent } from './modal-contacto-proveedores/modal-contacto-proveedores.component';
import { FilterPipeModule } from 'ngx-filter-pipe';
import { ListadoNuevoProveedorComponent } from './listado-nuevo-proveedor/listado-nuevo-proveedor.component';
import { AgGridModule } from 'ag-grid-angular';


@NgModule({
  declarations: [
    ProveedoresAltaComponent,    
    ProveedoresListadoComponent,        
    ProveedoresControlComponent,
    ProveedoresTarifaGralComponent,
    ProveedoresTarifaEspecialComponent,
    ModalContactoProveedoresComponent,
    ListadoNuevoProveedorComponent    
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ProveedoresRoutingModule,
    SharedModule,
    FilterPipeModule,
    NgxDatatableModule,
    AgGridModule
  ]
})
export class ProveedoresModule { }
