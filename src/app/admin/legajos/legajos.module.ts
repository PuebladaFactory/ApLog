import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LegajosRoutingModule } from './legajos-routing.module';
import { ControlComponent } from './control/control.component';
import { TableroLegajosComponent } from './tablero-legajos/tablero-legajos.component';
import { ConsultaLegajosComponent } from './consulta-legajos/consulta-legajos.component';
import { CargarDocumentosComponent } from './cargar-documentos/cargar-documentos.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { Ng2SearchPipeModule } from 'ng2-search-filter';


@NgModule({
  declarations: [
    ControlComponent,
    TableroLegajosComponent,
    ConsultaLegajosComponent,
    CargarDocumentosComponent
  ],
  imports: [
    CommonModule,
    LegajosRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    Ng2SearchPipeModule,
  ]
})
export class LegajosModule { }
