import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LegajosRoutingModule } from './legajos-routing.module';
import { ControlComponent } from './control/control.component';
import { TableroLegajosComponent } from './tablero-legajos/tablero-legajos.component';
import { ConsultaLegajosComponent, SafeUrlPipe } from './consulta-legajos/consulta-legajos.component';
import { CargarDocumentosComponent } from './cargar-documentos/cargar-documentos.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ModalChoferesComponent } from './modal-choferes/modal-choferes.component';
import { FilterPipeModule } from 'ngx-filter-pipe';


@NgModule({
  declarations: [
    ControlComponent,
    TableroLegajosComponent,
    ConsultaLegajosComponent,
    CargarDocumentosComponent,
    SafeUrlPipe,
    ModalChoferesComponent
  ],
  imports: [
    CommonModule,
    LegajosRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    FilterPipeModule,
    NgbModule,    
  ]
})
export class LegajosModule { }
