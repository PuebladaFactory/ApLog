import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DesarrolloRoutingModule } from './desarrollo-routing.module';
import { SharedModule } from '../shared/shared.module';
import { MigracionComponent } from './migracion/migracion.component';
import { LimpiezaDemoComponent } from './limpieza-demo/limpieza-demo.component';
import { GeneradorOperacionesComponent } from './generador-operaciones/generador-operaciones.component';
import { GeneradorCircuitoComponent } from './generador-circuito/generador-circuito.component';
import { GeneradorCobrosComponent } from './generador-cobros/generador-cobros.component';
import { RecalculoResumenesComponent } from './recalculo-resumenes/recalculo-resumenes.component';
import { RecalculoComisionesComponent } from './recalculo-comisiones/recalculo-comisiones.component';

// Frente lazy-fechas (LZ6): herramientas de desarrollo (/migracion, solo
// rol dev). Módulo lazy propio para que su código no viaje en el chunk de
// Raiz, que descargan todos los usuarios. NO importarlo en ningún otro
// módulo: se carga solo desde raiz-routing.
@NgModule({
  declarations: [
    MigracionComponent,
    LimpiezaDemoComponent,
    GeneradorOperacionesComponent,
    GeneradorCircuitoComponent,
    GeneradorCobrosComponent,
    RecalculoResumenesComponent,
    RecalculoComisionesComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    DesarrolloRoutingModule,
  ],
})
export class DesarrolloModule { }
