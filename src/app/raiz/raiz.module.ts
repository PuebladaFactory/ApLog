import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RaizRoutingModule } from './raiz-routing.module';
import { HomeComponent } from './home/home.component';
import { SidebarComponent } from './sidebar/sidebar.component';

import { ChoferesModule } from './choferes/choferes.module';

import { ProveedoresModule } from './proveedores/proveedores.module';
import { FacturacionModule } from './facturacion/facturacion.module';
import { LiquidacionModule } from './liquidacion/liquidacion.module';
import { SharedModule } from "../shared/shared.module";
import { FilterPipeModule } from 'ngx-filter-pipe';
import { AgGridModule } from 'ag-grid-angular';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { AjustesModule } from './ajustes/ajustes.module';
import { LegajosModule } from './legajos/legajos.module';


@NgModule({
    declarations: [
        HomeComponent,
        SidebarComponent,
    ],
    exports: [
        HomeComponent,
    ],
    imports: [
        CommonModule,
        RaizRoutingModule,
        AjustesModule,
        ChoferesModule,
        LegajosModule,
        ProveedoresModule,
        FacturacionModule,
        LiquidacionModule,
        SharedModule,
        FilterPipeModule,
        AgGridModule,
        DragDropModule
    ],
})
export class RaizModule { }
