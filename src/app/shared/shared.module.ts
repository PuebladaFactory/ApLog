import { NgModule } from '@angular/core';
import { CommonModule, JsonPipe, TitleCasePipe } from '@angular/common';
// RouterModule directo (antes llegaba vía SharedRoutingModule, vacío):
// routerLink/queryParams en componentes de Shared (ej. tabla-listado).
import { RouterModule } from '@angular/router';

import { BtnAgregarComponent } from './botones/btn-agregar/btn-agregar.component';
import { BtnEditarComponent } from './botones/btn-editar/btn-editar.component';
import { BtnEliminarComponent } from './botones/btn-eliminar/btn-eliminar.component';
import { BtnLeerComponent } from './botones/btn-leer/btn-leer.component';
import { AccionGenericaComponent } from './botones/accion-generica/accion-generica.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TableroCalendarioComponent } from './tablero-calendario/tablero-calendario.component';
import { NgbDropdownModule, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgbCalendar, NgbDate, NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';

import { CarruselComponent, SafeUrlPipe } from './carrusel/carrusel.component';
import { CuitFormatDirective } from './directives/cuit-format.directive';
import { SoloNumerosDirective } from './directives/solo-numeros.directive';
import { FormatearValorPipe } from './pipes/formatear-valor.pipe';
import { EtiquetaNivelTarifaPipe } from './pipes/etiqueta-nivel-tarifa.pipe';
import { ClaseNivelTarifaPipe } from './pipes/clase-nivel-tarifa.pipe';

import { SoloLetrasDirective } from './directives/solo-letras.directive';


import { RoleDirective } from './directives/role.directive';
import { PermisoDirective } from './directives/permiso.directive';

import { BajaObjetoComponent } from './modales/baja-objeto/baja-objeto.component';
import { ObjetoPapeleraComponent } from './modales/objeto-papelera/objeto-papelera.component';
import { FechaValidaDirective } from './directives/fecha-valida.directive';

import { InformeLiqDetalleComponent } from './modales/informe-liq-detalle/informe-liq-detalle.component';

import { ScrollToTopComponent } from './scroll-to-top/scroll-to-top.component';
import { CalcularPorcentajePipe } from './pipes/calcular-porcentaje.pipe';
import { SpinnerComponent } from './spinner/spinner.component';
import { FilterPipeModule } from 'ngx-filter-pipe';
import { GlobalFilterPipe } from './pipes/global-filter.pipe';
import { InformeOpDetalleComponent } from './modales/informe-op-detalle/informe-op-detalle.component';
import { InformeOpEditorComponent } from './modales/informe-op-editor/informe-op-editor.component';
import { DescuentosComponent } from './modales/descuentos/descuentos.component';
import { AjustesLiqComponent } from './modales/ajustes-liq/ajustes-liq.component';
import { InformeLiqNuevoDetalleComponent } from './modales/informe-liq-nuevo-detalle/informe-liq-nuevo-detalle.component';
import { CompensacionesLiqComponent } from './modales/compensaciones-liq/compensaciones-liq.component';
import { BuscarPorChoferPipe } from './pipes/buscar-por-chofer.pipe';
import { VisibilidadListadosComponent } from './modales/visibilidad-listados/visibilidad-listados.component';
import { TableroFechasComponent } from './tablero-fechas/tablero-fechas.component';
import { InformesAccionesCellComponent } from './tabla/informes-acciones-cell/informes-acciones-cell.component';

import { DecimalInputDirective } from './directives/decimal-input.directive';


import { MontoDirective } from './directives/monto.directive';
import { SortableDirective } from './directives/sortable.directive';
import { CalcularPorcentajeV2Pipe } from './pipes/calcular-porcentaje-v2.pipe';
import { FiltroPeriodoComponent } from './filtro-periodo/filtro-periodo.component';
import { TablaAccionesComponent } from './tabla/tabla-acciones/tabla-acciones.component';
import { TablaGenericaComponent } from './tabla/tabla-generica/tabla-generica.component';
import { TablaListadoComponent } from './tabla/tabla-listado/tabla-listado.component';
import { IconoArchivoPipe } from './pipes/icono-archivo.pipe';
import { AcortarNombreArchivoPipe } from './pipes/acortar-nombre-archivo.pipe';



@NgModule({
  declarations: [
    BtnAgregarComponent,
    BtnEditarComponent,
    BtnEliminarComponent,
    BtnLeerComponent,
    AccionGenericaComponent,
    TableroCalendarioComponent,
    CarruselComponent,
    SafeUrlPipe,
    CuitFormatDirective,
    SoloNumerosDirective,
    FormatearValorPipe,
    EtiquetaNivelTarifaPipe,
    ClaseNivelTarifaPipe,

    SoloLetrasDirective,

    RoleDirective, PermisoDirective, BajaObjetoComponent,
    ObjetoPapeleraComponent,
    FechaValidaDirective, 
    InformeLiqDetalleComponent, 
    ScrollToTopComponent, 
    CalcularPorcentajePipe, 
    SpinnerComponent, 
    GlobalFilterPipe,

    InformeOpDetalleComponent,
    InformeOpEditorComponent,
    DescuentosComponent,
    AjustesLiqComponent,              // modal (NgbModal.open), no se exporta
    InformeLiqNuevoDetalleComponent,  // modal (NgbModal.open), no se exporta
    CompensacionesLiqComponent,       // modal (NgbModal.open), no se exporta
    BuscarPorChoferPipe,
    VisibilidadListadosComponent,
    TableroFechasComponent,
    InformesAccionesCellComponent,
    
    DecimalInputDirective,
    
    
    MontoDirective,
    SortableDirective,
    CalcularPorcentajeV2Pipe,
    FiltroPeriodoComponent,
    TablaAccionesComponent,
    TablaGenericaComponent,
    TablaListadoComponent,
    IconoArchivoPipe,
    AcortarNombreArchivoPipe,

  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    NgbDropdownModule,
    JsonPipe,
    NgbDatepickerModule,
    NgbModule,
    FilterPipeModule,
    TitleCasePipe
  ],
  exports:[
    BtnAgregarComponent,
    BtnEditarComponent,
    BtnEliminarComponent,
    BtnLeerComponent,
    AccionGenericaComponent,
    TableroCalendarioComponent,
    CarruselComponent,
    SafeUrlPipe,
    CuitFormatDirective,
    SoloNumerosDirective,
    FormatearValorPipe,
    EtiquetaNivelTarifaPipe,
    ClaseNivelTarifaPipe,

    SoloLetrasDirective,

    RoleDirective,
    PermisoDirective,
    BajaObjetoComponent,
    FechaValidaDirective,
    InformeLiqDetalleComponent, 
    ScrollToTopComponent,
    CalcularPorcentajePipe,
    SpinnerComponent,
    GlobalFilterPipe,
    DescuentosComponent,
    BuscarPorChoferPipe,
    VisibilidadListadosComponent,
    TableroFechasComponent,
    InformesAccionesCellComponent,
    
    DecimalInputDirective,
    
    
    MontoDirective,
    SortableDirective,
    CalcularPorcentajeV2Pipe,
    FiltroPeriodoComponent,
    TablaAccionesComponent,
    TablaGenericaComponent,
    TablaListadoComponent,
    IconoArchivoPipe,
    AcortarNombreArchivoPipe,
  ]
})
export class SharedModule { }
