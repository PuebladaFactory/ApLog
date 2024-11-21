import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LegajosRoutingModule } from './legajos-routing.module';
import { ControlComponent } from './control/control.component';
import { TableroLegajosComponent } from './tablero-legajos/tablero-legajos.component';
import { ConsultaLegajosComponent } from './consulta-legajos/consulta-legajos.component';
import { CargarDocumentosComponent } from './cargar-documentos/cargar-documentos.component';


@NgModule({
  declarations: [
    ControlComponent,
    TableroLegajosComponent,
    ConsultaLegajosComponent,
    CargarDocumentosComponent
  ],
  imports: [
    CommonModule,
    LegajosRoutingModule
  ]
})
export class LegajosModule { }
