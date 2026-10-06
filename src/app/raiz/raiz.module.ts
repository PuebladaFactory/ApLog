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

import { ChoferesModule } from './choferes/choferes.module';

import { ProveedoresModule } from './proveedores/proveedores.module';
import { LiquidacionModule } from './liquidacion/liquidacion.module';
import { SharedModule } from "../shared/shared.module";
import { FilterPipeModule } from 'ngx-filter-pipe';
import { AgGridModule } from 'ag-grid-angular';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { AjustesModule } from './ajustes/ajustes.module';
import { LegajosModule } from './legajos/legajos.module';
import { VendedoresModule } from './vendedores/vendedores.module';
import { FinanzasModule } from './finanzas/finanzas.module';
import { NuevaFacturacionModule } from './nueva-facturacion/nueva-facturacion.module';
import { ReportesModule } from './reportes/reportes.module';
/* import { NuevaFacturacionModule } from './nueva-facturacion/nueva-facturacion.module'; */


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
    exports: [
        HomeComponent,
    ],
    imports: [
        CommonModule,
        FormsModule,
        RaizRoutingModule,
        AjustesModule,
        ChoferesModule,
        LegajosModule,
        ProveedoresModule,
        LiquidacionModule,
        VendedoresModule,
        SharedModule,
        FilterPipeModule,
        AgGridModule,
        DragDropModule, 
        NuevaFacturacionModule,
        FinanzasModule,
        ReportesModule
    ],
})
export class RaizModule { }
