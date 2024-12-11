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
import { ModalInformesClienteComponent } from './modal-informes-cliente/modal-informes-cliente.component';
import { EditarTarifaComponent } from './modales/cliente/editar-tarifa/editar-tarifa.component';
import { EditarTarifaChoferComponent } from './modales/chofer/editar-tarifa-chofer/editar-tarifa-chofer.component';
import { EditarTarifaProveedorComponent } from './modales/proveedor/editar-tarifa-proveedor/editar-tarifa-proveedor.component';
import { DescuentosComponent } from './modales/descuentos/descuentos.component';
import { FacturarOpComponent } from './modales/facturar-op/facturar-op.component';



@NgModule({
  declarations: [
    LiqProveedorComponent,
    LiqChoferComponent,
    LiqGralComponent,
    LiqClienteComponent,
    ModalInformesClienteComponent,
    
    EditarTarifaComponent,
    EditarTarifaChoferComponent,
    
    EditarTarifaProveedorComponent,
    
    DescuentosComponent,
    FacturarOpComponent
    
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
