import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SharedRoutingModule } from './shared-routing.module';
import { BtnAgregarComponent } from './btn-agregar/btn-agregar.component';
import { BtnEditarComponent } from './btn-editar/btn-editar.component';
import { BtnEliminarComponent } from './btn-eliminar/btn-eliminar.component';
import { BtnReimpresionComponent } from './btn-reimpresion/btn-reimpresion.component';
import { BtnLeerComponent } from './btn-leer/btn-leer.component';
import { ConsolaTarifaComponent } from './consola-tarifa/consola-tarifa.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    BtnAgregarComponent,
    BtnEditarComponent,
    BtnEliminarComponent,
    BtnReimpresionComponent,
    BtnLeerComponent,
    ConsolaTarifaComponent
  ],
  imports: [
    CommonModule,
    SharedRoutingModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  exports:[
    BtnAgregarComponent,
    BtnEditarComponent,
    BtnEliminarComponent,
    BtnReimpresionComponent,
    BtnLeerComponent,
    ConsolaTarifaComponent
  ]
})
export class SharedModule { }
