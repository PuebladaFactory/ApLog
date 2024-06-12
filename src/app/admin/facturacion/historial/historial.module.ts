import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HistorialRoutingModule } from './historial-routing.module';
import { HistorialGeneralComponent } from './historial-general/historial-general.component';
import { HistorialClienteComponent } from './historial-cliente/historial-cliente.component';
import { HistorialChoferComponent } from './historial-chofer/historial-chofer.component';
import { HistorialProveedorComponent } from './historial-proveedor/historial-proveedor.component';

import { FacturacionModule } from '../facturacion.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { Ng2SearchPipeModule } from 'ng2-search-filter';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { ModalDetalleComponent } from './modal-detalle/modal-detalle.component';



@NgModule({
  declarations: [
    HistorialGeneralComponent,
    HistorialClienteComponent,
    HistorialChoferComponent,
    HistorialProveedorComponent,
    ModalDetalleComponent,
    
  ],
  imports: [
    CommonModule,    
    NgbModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    Ng2SearchPipeModule, 
    NgxDatatableModule,
    HistorialRoutingModule,
    FacturacionModule
  ]
})
export class HistorialModule { }
