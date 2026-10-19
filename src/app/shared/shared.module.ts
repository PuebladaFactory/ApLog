import { NgModule } from '@angular/core';
import { CommonModule, JsonPipe, TitleCasePipe } from '@angular/common';
// RouterModule directo (antes llegaba vía SharedRoutingModule, vacío):
// routerLink/queryParams en componentes de Shared (ej. tabla-listado).
import { RouterModule } from '@angular/router';

import { BtnAgregarComponent } from './botones/btn-agregar/btn-agregar.component';
import { BtnEditarComponent } from './botones/btn-editar/btn-editar.component';
import { BtnEliminarComponent } from './botones/btn-eliminar/btn-eliminar.component';
import { BtnLeerComponent } from './botones/btn-leer/btn-leer.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbDropdownModule, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';

import { CarruselComponent, SafeUrlPipe } from './carrusel/carrusel.component';
import { CuitFormatDirective } from './directives/cuit-format.directive';
import { SoloNumerosDirective } from './directives/solo-numeros.directive';
import { FormatearValorPipe } from './pipes/formatear-valor.pipe';
import { EtiquetaNivelTarifaPipe } from './pipes/etiqueta-nivel-tarifa.pipe';
import { ClaseNivelTarifaPipe } from './pipes/clase-nivel-tarifa.pipe';

import { SoloLetrasDirective } from './directives/solo-letras.directive';


import { PermisoDirective } from './directives/permiso.directive';

import { BajaObjetoComponent } from './modales/baja-objeto/baja-objeto.component';
import { ObjetoPapeleraComponent } from './modales/objeto-papelera/objeto-papelera.component';


import { ScrollToTopComponent } from './scroll-to-top/scroll-to-top.component';
import { CalcularPorcentajePipe } from './pipes/calcular-porcentaje.pipe';
import { SpinnerComponent } from './spinner/spinner.component';
import { GlobalFilterPipe } from './pipes/global-filter.pipe';
import { InformeOpDetalleComponent } from './modales/informe-op-detalle/informe-op-detalle.component';
import { InformeOpEditorComponent } from './modales/informe-op-editor/informe-op-editor.component';
import { AjustesLiqComponent } from './modales/ajustes-liq/ajustes-liq.component';
import { InformeLiqNuevoDetalleComponent } from './modales/informe-liq-nuevo-detalle/informe-liq-nuevo-detalle.component';
import { CompensacionesLiqComponent } from './modales/compensaciones-liq/compensaciones-liq.component';
import { BuscarPorChoferPipe } from './pipes/buscar-por-chofer.pipe';
import { VisibilidadListadosComponent } from './modales/visibilidad-listados/visibilidad-listados.component';
import { TableroFechasComponent } from './tablero-fechas/tablero-fechas.component';

import { DecimalInputDirective } from './directives/decimal-input.directive';


import { MontoDirective } from './directives/monto.directive';
import { FiltroPeriodoComponent } from './filtro-periodo/filtro-periodo.component';
import { TablaAccionesComponent } from './tabla/tabla-acciones/tabla-acciones.component';
import { TablaGenericaComponent } from './tabla/tabla-generica/tabla-generica.component';
import { TablaListadoComponent } from './tabla/tabla-listado/tabla-listado.component';
import { IconoArchivoPipe } from './pipes/icono-archivo.pipe';
import { AcortarNombreArchivoPipe } from './pipes/acortar-nombre-archivo.pipe';
import { FichaEntidadComponent } from './ficha-entidad/ficha-entidad.component';
import { FichaChoferDatosComponent } from './ficha-entidad/ficha-chofer-datos/ficha-chofer-datos.component';
import { FichaVehiculosComponent } from './ficha-entidad/ficha-vehiculos/ficha-vehiculos.component';
import { FichaLegajoComponent } from './ficha-entidad/ficha-legajo/ficha-legajo.component';
import { FichaEmpresaDatosComponent } from './ficha-entidad/ficha-empresa-datos/ficha-empresa-datos.component';
import { FichaContactosComponent } from './ficha-entidad/ficha-contactos/ficha-contactos.component';
import { FichaChoferesComponent } from './ficha-entidad/ficha-choferes/ficha-choferes.component';
import { FichaTarifasComponent } from './ficha-entidad/ficha-tarifas/ficha-tarifas.component';
import { FichaTarifaDetalleComponent } from './ficha-entidad/ficha-tarifa-detalle/ficha-tarifa-detalle.component';



@NgModule({
  declarations: [
    BtnAgregarComponent,
    BtnEditarComponent,
    BtnEliminarComponent,
    BtnLeerComponent,
    CarruselComponent,
    SafeUrlPipe,
    CuitFormatDirective,
    SoloNumerosDirective,
    FormatearValorPipe,
    EtiquetaNivelTarifaPipe,
    ClaseNivelTarifaPipe,

    SoloLetrasDirective,

    PermisoDirective, BajaObjetoComponent,
    ObjetoPapeleraComponent,
    ScrollToTopComponent, 
    CalcularPorcentajePipe, 
    SpinnerComponent, 
    GlobalFilterPipe,

    InformeOpDetalleComponent,
    InformeOpEditorComponent,
    AjustesLiqComponent,              // modal (NgbModal.open), no se exporta
    InformeLiqNuevoDetalleComponent,  // modal (NgbModal.open), no se exporta
    CompensacionesLiqComponent,       // modal (NgbModal.open), no se exporta
    BuscarPorChoferPipe,
    VisibilidadListadosComponent,
    TableroFechasComponent,
    
    DecimalInputDirective,
    
    
    MontoDirective,
    FiltroPeriodoComponent,
    TablaAccionesComponent,
    TablaGenericaComponent,
    TablaListadoComponent,
    IconoArchivoPipe,
    AcortarNombreArchivoPipe,
    FichaEntidadComponent,      // modal (FichaEntidadService.abrir), no se exporta
    FichaChoferDatosComponent,  // pestañas de la ficha, solo las usa FichaEntidadComponent
    FichaVehiculosComponent,
    FichaLegajoComponent,
    FichaEmpresaDatosComponent,
    FichaContactosComponent,
    FichaChoferesComponent,
    FichaTarifasComponent,
    FichaTarifaDetalleComponent,

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
    TitleCasePipe
  ],
  exports:[
    BtnAgregarComponent,
    BtnEditarComponent,
    BtnEliminarComponent,
    BtnLeerComponent,
    CarruselComponent,
    SafeUrlPipe,
    CuitFormatDirective,
    SoloNumerosDirective,
    FormatearValorPipe,
    EtiquetaNivelTarifaPipe,
    ClaseNivelTarifaPipe,

    SoloLetrasDirective,

    PermisoDirective,
    BajaObjetoComponent,
    ScrollToTopComponent,
    CalcularPorcentajePipe,
    SpinnerComponent,
    GlobalFilterPipe,
    BuscarPorChoferPipe,
    VisibilidadListadosComponent,
    TableroFechasComponent,
    
    DecimalInputDirective,
    
    
    MontoDirective,
    FiltroPeriodoComponent,
    TablaAccionesComponent,
    TablaGenericaComponent,
    TablaListadoComponent,
    IconoArchivoPipe,
    AcortarNombreArchivoPipe,
  ]
})
export class SharedModule { }
