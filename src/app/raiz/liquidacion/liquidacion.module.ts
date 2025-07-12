import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LiquidacionRoutingModule } from './liquidacion-routing.module';


import { LiqGralComponent } from './liq-gral/liq-gral.component';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FacturacionModule } from '../facturacion/facturacion.module';

import { DescuentosComponent } from './modales/descuentos/descuentos.component';
import { ResumenOpLiquidadasComponent } from './modales/resumen-op-liquidadas/resumen-op-liquidadas.component';
import { EditarTarifaOpComponent } from './modales/editar-tarifa-op/editar-tarifa-op.component';
import { ProformaComponent } from './proforma/proforma.component';
import { FilterPipeModule } from 'ngx-filter-pipe';
import { LiquidacionesOpComponent } from './liquidaciones-op/liquidaciones-op.component';



@NgModule({
  declarations: [
    
    
    LiqGralComponent,
    
    LiquidacionesOpComponent,
    
    DescuentosComponent,
    ResumenOpLiquidadasComponent,
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
