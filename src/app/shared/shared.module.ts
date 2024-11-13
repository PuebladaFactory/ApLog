import { NgModule } from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';

import { SharedRoutingModule } from './shared-routing.module';
import { BtnAgregarComponent } from './btn-agregar/btn-agregar.component';
import { BtnEditarComponent } from './btn-editar/btn-editar.component';
import { BtnEliminarComponent } from './btn-eliminar/btn-eliminar.component';
import { BtnReimpresionComponent } from './btn-reimpresion/btn-reimpresion.component';
import { BtnLeerComponent } from './btn-leer/btn-leer.component';
import { ConsolaTarifaComponent } from './consola-tarifa/consola-tarifa.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TableroCalendarioComponent } from './tablero-calendario/tablero-calendario.component';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { NgbCalendar, NgbDate, NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
import { HistorialTarifasGralComponent } from './historial-tarifas-gral/historial-tarifas-gral.component';

@NgModule({
  declarations: [
    BtnAgregarComponent,
    BtnEditarComponent,
    BtnEliminarComponent,
    BtnReimpresionComponent,
    BtnLeerComponent,
    ConsolaTarifaComponent,
    TableroCalendarioComponent,
    HistorialTarifasGralComponent
  ],
  imports: [
    CommonModule,
    SharedRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    NgbDropdownModule,
    JsonPipe,
    NgbDatepickerModule
  ],
  exports:[
    BtnAgregarComponent,
    BtnEditarComponent,
    BtnEliminarComponent,
    BtnReimpresionComponent,
    BtnLeerComponent,
    ConsolaTarifaComponent,
    TableroCalendarioComponent, 
    HistorialTarifasGralComponent
  ]
})
export class SharedModule { }
