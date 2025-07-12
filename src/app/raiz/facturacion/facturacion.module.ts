import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FacturacionRoutingModule } from './facturacion-routing.module';
import { FacturacionClienteComponent } from './facturacion-cliente/facturacion-cliente.component';
import { FacturacionChoferComponent } from './facturacion-chofer/facturacion-chofer.component';
import { FacturacionGeneralComponent } from './facturacion-general/facturacion-general.component';
import { FacturacionConsultaComponent } from './facturacion-consulta/facturacion-consulta.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FacturacionProveedorComponent } from './facturacion-proveedor/facturacion-proveedor.component';
import { ModalDetalleComponent } from './modal-detalle/modal-detalle.component';
import { FacturacionControlComponent } from './facturacion-control/facturacion-control.component';
import { FilterPipeModule } from 'ngx-filter-pipe';




@NgModule({
  declarations: [
    FacturacionClienteComponent,
    FacturacionChoferComponent,
    FacturacionGeneralComponent,
    FacturacionConsultaComponent,
    FacturacionProveedorComponent,
    ModalDetalleComponent,
    FacturacionControlComponent,
    
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
    FacturacionConsultaComponent,       
  ]
})
export class FacturacionModule { }
