import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FacturacionRoutingModule } from './facturacion-routing.module';
import { FacturacionClienteComponent } from './facturacion-cliente/facturacion-cliente.component';
import { FacturacionChoferComponent } from './facturacion-chofer/facturacion-chofer.component';
import { FacturacionGeneralComponent } from './facturacion-general/facturacion-general.component';
import { FacturacionConsultaComponent } from './facturacion-consulta/facturacion-consulta.component';


@NgModule({
  declarations: [
    FacturacionClienteComponent,
    FacturacionChoferComponent,
    FacturacionGeneralComponent,
    FacturacionConsultaComponent
  ],
  imports: [
    CommonModule,
    FacturacionRoutingModule
  ]
})
export class FacturacionModule { }
