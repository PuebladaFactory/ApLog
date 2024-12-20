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
import { NgbDropdownModule, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgbCalendar, NgbDate, NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
import { HistorialTarifasGralComponent } from './historial-tarifas-gral/historial-tarifas-gral.component';
import { TarifasEventualesComponent } from './tarifas-eventuales/tarifas-eventuales.component';
import { CarruselComponent, SafeUrlPipe } from './carrusel/carrusel.component';
import { CuitFormatDirective } from './directives/cuit-format.directive';
import { SoloNumerosDirective } from './directives/solo-numeros.directive';
import { FormatearValorPipe } from './pipes/formatear-valor.pipe';
import { FormatoNumericoDirective } from './directives/formato-numerico.directive';
import { SoloLetrasDirective } from './directives/solo-letras.directive';

@NgModule({
  declarations: [
    BtnAgregarComponent,
    BtnEditarComponent,
    BtnEliminarComponent,
    BtnReimpresionComponent,
    BtnLeerComponent,
    ConsolaTarifaComponent,
    TableroCalendarioComponent,
    HistorialTarifasGralComponent,
    TarifasEventualesComponent,
    CarruselComponent,
    SafeUrlPipe,
    CuitFormatDirective,
    SoloNumerosDirective,
    FormatearValorPipe,
    FormatoNumericoDirective,
    SoloLetrasDirective
  ],
  imports: [
    CommonModule,
    SharedRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    NgbDropdownModule,
    JsonPipe,
    NgbDatepickerModule,
    NgbModule,
  ],
  exports:[
    BtnAgregarComponent,
    BtnEditarComponent,
    BtnEliminarComponent,
    BtnReimpresionComponent,
    BtnLeerComponent,
    ConsolaTarifaComponent,
    TableroCalendarioComponent, 
    HistorialTarifasGralComponent, 
    TarifasEventualesComponent, 
    CarruselComponent,
    CuitFormatDirective,
    SoloNumerosDirective,
    FormatearValorPipe,
    FormatoNumericoDirective,
    SoloLetrasDirective
  ]
})
export class SharedModule { }
