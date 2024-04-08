import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FacturacionRoutingModule } from './facturacion-routing.module';
import { FacturacionClienteComponent } from './facturacion-cliente/facturacion-cliente.component';
import { FacturacionChoferComponent } from './facturacion-chofer/facturacion-chofer.component';
import { FacturacionGeneralComponent } from './facturacion-general/facturacion-general.component';
import { FacturacionConsultaComponent } from './facturacion-consulta/facturacion-consulta.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { Ng2SearchPipeModule } from 'ng2-search-filter';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FacturacionProveedorComponent } from './facturacion-proveedor/facturacion-proveedor.component';



@NgModule({
  declarations: [
    FacturacionClienteComponent,
    FacturacionChoferComponent,
    FacturacionGeneralComponent,
    FacturacionConsultaComponent,
    FacturacionProveedorComponent,    
  ],
  imports: [
    CommonModule,
    FacturacionRoutingModule,
    NgbModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    Ng2SearchPipeModule, 
    

  ],
  exports:[
    FacturacionConsultaComponent,       
  ]
})
export class FacturacionModule { }
