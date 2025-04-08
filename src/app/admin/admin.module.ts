import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminRoutingModule } from './admin-routing.module';
import { AdminHomeComponent } from './admin-home/admin-home.component';
import { AdminSidebarComponent } from './admin-sidebar/admin-sidebar.component';
import { ClienteModule } from './cliente/cliente.module';
import { ChoferesModule } from './choferes/choferes.module';
import { OperacionesModule } from './operaciones/operaciones.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { FacturacionModule } from './facturacion/facturacion.module';
import { LiquidacionModule } from './liquidacion/liquidacion.module';


@NgModule({
  declarations: [
    AdminHomeComponent,
    AdminSidebarComponent,     
  ],
  imports: [
    CommonModule,
    AdminRoutingModule,
    ClienteModule,
    ChoferesModule, 
    OperacionesModule,
    ProveedoresModule,
    FacturacionModule,
    LiquidacionModule,
        
  ],
  exports:[
    AdminHomeComponent,
  ]
})
export class AdminModule { }
