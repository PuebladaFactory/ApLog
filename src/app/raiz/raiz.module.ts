import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { RaizRoutingModule } from './raiz-routing.module';
import { HomeComponent } from './home/home.component';
import { SidebarComponent } from './sidebar/sidebar.component';

import { SharedModule } from "../shared/shared.module";

// Frente lazy-fechas (LZ2): RaizModule NO importa módulos de feature. Cada
// feature se carga solo lazy desde raiz-routing (importarlos acá anulaba
// el lazy loading y registraba sus rutas sueltas dentro de Raiz).
// LZ6: las herramientas de desarrollo (/migracion y sus hijos) están en
// componentes/desarrollo.module.ts, también lazy.


@NgModule({
    declarations: [
        HomeComponent,
        SidebarComponent,
    ],
    imports: [
        CommonModule,
        FormsModule,
        RaizRoutingModule,
        SharedModule,
    ],
})
export class RaizModule { }
