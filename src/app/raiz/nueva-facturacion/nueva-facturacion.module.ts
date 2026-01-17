import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { NuevaFacturacionRoutingModule } from './nueva-facturacion-routing.module';
import { ControlComponent } from './control/control.component';
import { FacturacionListadoComponent } from './facturacion-listado/facturacion-listado.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { FilterPipeModule } from 'ngx-filter-pipe';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ModalDetalleComponent } from './modal-detalle/modal-detalle.component';
import { ModalVincularFacturaComponent } from './modal-vincular-factura/modal-vincular-factura.component';
import { FacturacionHistoricoComponent } from './facturacion-historico/facturacion-historico.component';
import { InformesTablaComponent } from './informes-tabla/informes-tabla.component';


@NgModule({
  declarations: [
    ControlComponent, 
    FacturacionListadoComponent,
    ModalDetalleComponent,
    ModalVincularFacturaComponent,
    FacturacionHistoricoComponent,
    InformesTablaComponent
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
