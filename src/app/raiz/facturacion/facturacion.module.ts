import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FacturacionRoutingModule } from './facturacion-routing.module';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { ModalDetalleComponent } from './modal-detalle/modal-detalle.component';
import { FacturacionControlComponent } from './facturacion-control/facturacion-control.component';
import { FilterPipeModule } from 'ngx-filter-pipe';

import { ModalVincularFacturaComponent } from './modales/modal-vincular-factura/modal-vincular-factura.component';




@NgModule({
  declarations: [    
    ModalDetalleComponent,
    FacturacionControlComponent,    
    ModalVincularFacturaComponent
    
  ],
  imports: [
    CommonModule,
    FacturacionRoutingModule,
    NgbModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    FilterPipeModule,
    

  ],
  exports:[          
  ]
})
export class FacturacionModule { }
