import { NgModule } from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';

import { SharedRoutingModule } from './shared-routing.module';

import { BtnAgregarComponent } from './botones/btn-agregar/btn-agregar.component';
import { BtnEditarComponent } from './botones/btn-editar/btn-editar.component';
import { BtnEliminarComponent } from './botones/btn-eliminar/btn-eliminar.component';
import { BtnReimpresionComponent } from './botones/btn-reimpresion/btn-reimpresion.component';
import { BtnLeerComponent } from './botones/btn-leer/btn-leer.component';
import { ConsolaTarifaComponent } from './consola-tarifa/consola-tarifa.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TableroCalendarioComponent } from './tablero-calendario/tablero-calendario.component';
import { NgbDropdownModule, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgbCalendar, NgbDate, NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';

import { HistorialTarifasGralComponent } from './modales/historial-tarifas-gral/historial-tarifas-gral.component';
import { TarifasEventualesComponent } from './tarifas-eventuales/tarifas-eventuales.component';
import { CarruselComponent, SafeUrlPipe } from './carrusel/carrusel.component';
import { CuitFormatDirective } from './directives/cuit-format.directive';
import { SoloNumerosDirective } from './directives/solo-numeros.directive';
import { FormatearValorPipe } from './pipes/formatear-valor.pipe';
import { FormatoNumericoDirective } from './directives/formato-numerico.directive';
import { SoloLetrasDirective } from './directives/solo-letras.directive';
import { FormatoNumericoNgModelDirective } from './directives/formato-numerico-ng-model.directive';

import { TarigaGralEdicionComponent } from './modales/tariga-gral-edicion/tariga-gral-edicion.component';
import { RoleDirective } from './directives/role.directive';

import { BajaObjetoComponent } from './modales/baja-objeto/baja-objeto.component';
import { ObjetoPapeleraComponent } from './modales/objeto-papelera/objeto-papelera.component';
import { FechaValidaDirective } from './directives/fecha-valida.directive';

import { InformeLiqDetalleComponent } from './modales/informe-liq-detalle/informe-liq-detalle.component';

import { ScrollToTopComponent } from './scroll-to-top/scroll-to-top.component';
import { CalcularPorcentajePipe } from './pipes/calcular-porcentaje.pipe';
import { SpinnerComponent } from './spinner/spinner.component';
import { FilterPipeModule } from 'ngx-filter-pipe';
import { GlobalFilterPipe } from './pipes/global-filter.pipe';
import { EstadoCellRendererComponent } from './estado-cell-renderer/estado-cell-renderer.component';
import { AccionesCellRendererComponent } from './tabla/ag-cell-renderers/acciones-cell-renderer/acciones-cell-renderer.component';
import { EditarInfOpComponent } from './modales/editar-inf-op/editar-inf-op.component';
import { DescuentosComponent } from './modales/descuentos/descuentos.component';
import { BuscarPorChoferPipe } from './pipes/buscar-por-chofer.pipe';
import { InformesAccionesCellComponent } from './tabla/informes-acciones-cell/informes-acciones-cell.component';



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
    RoleDirective, BajaObjetoComponent, 
    ObjetoPapeleraComponent, 
    FechaValidaDirective, 
    InformeLiqDetalleComponent, 
    ScrollToTopComponent, 
    CalcularPorcentajePipe, 
    SpinnerComponent, 
    GlobalFilterPipe,

    EstadoCellRendererComponent,
    EditarInfOpComponent,
    DescuentosComponent,
    BuscarPorChoferPipe,
    InformesAccionesCellComponent
    
    
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
    BajaObjetoComponent,
    FechaValidaDirective,
    InformeLiqDetalleComponent, 
    ScrollToTopComponent,
    CalcularPorcentajePipe,
    SpinnerComponent,
    GlobalFilterPipe,
    EstadoCellRendererComponent,
    DescuentosComponent,
    BuscarPorChoferPipe,
    InformesAccionesCellComponent
  ]
})
export class SharedModule { }
