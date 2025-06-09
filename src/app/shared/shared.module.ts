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
import { FormatoNumericoNgModelDirective } from './directives/formato-numerico-ng-model.directive';
import { TarigaGralEdicionComponent } from './tariga-gral-edicion/tariga-gral-edicion.component';
import { RoleDirective } from './directives/role.directive';
import { ModalBajaComponent } from './modal-baja/modal-baja.component';
import { ModalObjetoComponent } from './modal-objeto/modal-objeto.component';
import { FechaValidaDirective } from './directives/fecha-valida.directive';
import { ModalFacturaComponent } from './modal-factura/modal-factura.component';

import { ScrollToTopComponent } from './scroll-to-top/scroll-to-top.component';
import { CalcularPorcentajePipe } from './pipes/calcular-porcentaje.pipe';
import { SpinnerComponent } from './spinner/spinner.component';
import { FilterPipeModule } from 'ngx-filter-pipe';
import { GlobalFilterPipe } from './pipes/global-filter.pipe';
import { EstadoCellRendererComponent } from './estado-cell-renderer/estado-cell-renderer.component';
import { AccionesCellRendererComponent } from './tabla/ag-cell-renderers/acciones-cell-renderer/acciones-cell-renderer.component';



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
    SoloLetrasDirective,
    FormatoNumericoNgModelDirective,
    TarigaGralEdicionComponent,    
    RoleDirective, ModalBajaComponent, ModalObjetoComponent, FechaValidaDirective, ModalFacturaComponent, ScrollToTopComponent, CalcularPorcentajePipe, SpinnerComponent, GlobalFilterPipe,
    EstadoCellRendererComponent,
    
    
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
    FilterPipeModule
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
    SoloLetrasDirective,
    FormatoNumericoNgModelDirective,
    TarigaGralEdicionComponent,
    RoleDirective,
    ModalBajaComponent,
    FechaValidaDirective,
    ModalFacturaComponent, 
    ScrollToTopComponent,
    CalcularPorcentajePipe,
    SpinnerComponent,
    GlobalFilterPipe,
    EstadoCellRendererComponent,
    
  ]
})
export class SharedModule { }
