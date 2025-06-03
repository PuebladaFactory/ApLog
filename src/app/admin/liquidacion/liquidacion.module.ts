import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LiquidacionRoutingModule } from './liquidacion-routing.module';
import { LiqProveedorComponent } from './liq-proveedor/liq-proveedor.component';
import { LiqChoferComponent } from './liq-chofer/liq-chofer.component';
import { LiqGralComponent } from './liq-gral/liq-gral.component';
import { LiqClienteComponent } from './liq-cliente/liq-cliente.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FacturacionModule } from '../facturacion/facturacion.module';

import { DescuentosComponent } from './modales/descuentos/descuentos.component';
import { FacturarOpComponent } from './modales/facturar-op/facturar-op.component';
import { EditarTarifaOpComponent } from './modales/editar-tarifa-op/editar-tarifa-op.component';
import { ProformaComponent } from './proforma/proforma.component';
import { FilterPipeModule } from 'ngx-filter-pipe';



@NgModule({
  declarations: [
    LiqProveedorComponent,
    LiqChoferComponent,
    LiqGralComponent,
    LiqClienteComponent,    
    
    
    DescuentosComponent,
    FacturarOpComponent,
    EditarTarifaOpComponent,
    ProformaComponent
    
  ],
  imports: [
    CommonModule,
    LiquidacionRoutingModule,
    NgbModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    FilterPipeModule,
    FacturacionModule
  ]
})
export class LiquidacionModule { }
