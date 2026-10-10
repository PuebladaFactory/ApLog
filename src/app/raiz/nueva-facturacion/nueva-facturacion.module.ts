import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { NuevaFacturacionRoutingModule } from './nueva-facturacion-routing.module';
import { ControlComponent } from './control/control.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { FilterPipeModule } from 'ngx-filter-pipe';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FacturacionEmitidosComponent } from './emitidos/facturacion-emitidos.component';
import { FacturacionRevertidosComponent } from './revertidos/facturacion-revertidos.component';
import { FacturacionFacturadosComponent } from './facturados/facturacion-facturados.component';
import { VincularFacturaLiqComponent } from './vincular-factura-liq/vincular-factura-liq.component';


@NgModule({
  declarations: [
    ControlComponent,
    FacturacionEmitidosComponent,
    FacturacionRevertidosComponent,
    FacturacionFacturadosComponent,
    VincularFacturaLiqComponent,
  ],
  imports: [
    CommonModule,
    NuevaFacturacionRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    FilterPipeModule,
    NgbModule,
  ]
})
export class NuevaFacturacionModule { }
