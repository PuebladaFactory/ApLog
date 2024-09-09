import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ConfiguracionesRoutingModule } from './configuraciones-routing.module';
import { ConfiguracionesComponent } from './configuraciones/configuraciones.component';
import { TarifasGeneralesComponent } from './tarifas-generales/tarifas-generales.component';
import { TarifaClienteComponent } from './tarifa-cliente/tarifa-cliente.component';
import { TarifaChoferComponent } from './tarifa-chofer/tarifa-chofer.component';
import { TarifaProveedorComponent } from './tarifa-proveedor/tarifa-proveedor.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { Ng2SearchPipeModule } from 'ng2-search-filter';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { TarifaGralClienteComponent } from './clientes/tarifa-gral-cliente/tarifa-gral-cliente.component';
import { TarifaGralClienteHistComponent } from './clientes/tarifa-gral-cliente-hist/tarifa-gral-cliente-hist.component';


@NgModule({
  declarations: [
    ConfiguracionesComponent,
    TarifasGeneralesComponent,
    TarifaClienteComponent,
    TarifaChoferComponent,
    TarifaProveedorComponent,
    TarifaGralClienteComponent,
    TarifaGralClienteHistComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    Ng2SearchPipeModule,
    NgxDatatableModule,
    ConfiguracionesRoutingModule
  ]
})
export class ConfiguracionesModule { }
