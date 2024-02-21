import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LiquidacionRoutingModule } from './liquidacion-routing.module';
import { LiqProveedorComponent } from './liq-proveedor/liq-proveedor.component';
import { LiqChoferComponent } from './liq-chofer/liq-chofer.component';
import { LiqGralComponent } from './liq-gral/liq-gral.component';
import { LiqClienteComponent } from './liq-cliente/liq-cliente.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { Ng2SearchPipeModule } from 'ng2-search-filter';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FacturacionModule } from '../facturacion/facturacion.module';


@NgModule({
  declarations: [
    LiqProveedorComponent,
    LiqChoferComponent,
    LiqGralComponent,
    LiqClienteComponent
  ],
  imports: [
    CommonModule,
    LiquidacionRoutingModule,
    NgbModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    Ng2SearchPipeModule, 
    FacturacionModule
  ]
})
export class LiquidacionModule { }
