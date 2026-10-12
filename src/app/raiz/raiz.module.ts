import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { RaizRoutingModule } from './raiz-routing.module';
import { HomeComponent } from './home/home.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { MigracionComponent } from '../componentes/migracion/migracion.component';
import { LimpiezaDemoComponent } from '../componentes/limpieza-demo/limpieza-demo.component';
import { GeneradorOperacionesComponent } from '../componentes/generador-operaciones/generador-operaciones.component';
import { GeneradorCircuitoComponent } from '../componentes/generador-circuito/generador-circuito.component';
import { GeneradorCobrosComponent } from '../componentes/generador-cobros/generador-cobros.component';
import { RecalculoResumenesComponent } from '../componentes/recalculo-resumenes/recalculo-resumenes.component';
import { RecalculoComisionesComponent } from '../componentes/recalculo-comisiones/recalculo-comisiones.component';

import { SharedModule } from "../shared/shared.module";

// Frente lazy-fechas (LZ2): RaizModule NO importa módulos de feature. Cada
// feature se carga solo lazy desde raiz-routing (importarlos acá anulaba
// el lazy loading y registraba sus rutas sueltas dentro de Raiz).


@NgModule({
    declarations: [
        HomeComponent,
        SidebarComponent,
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
        RaizRoutingModule,
        SharedModule,
    ],
})
export class RaizModule { }
