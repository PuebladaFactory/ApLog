import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SharedRoutingModule } from './shared-routing.module';
import { BtnAgregarComponent } from './btn-agregar/btn-agregar.component';
import { BtnEditarComponent } from './btn-editar/btn-editar.component';
import { BtnEliminarComponent } from './btn-eliminar/btn-eliminar.component';
import { BtnReimpresionComponent } from './btn-reimpresion/btn-reimpresion.component';


@NgModule({
  declarations: [
    BtnAgregarComponent,
    BtnEditarComponent,
    BtnEliminarComponent,
    BtnReimpresionComponent
  ],
  imports: [
    CommonModule,
    SharedRoutingModule
  ],
  exports:[
    BtnAgregarComponent,
    BtnEditarComponent,
    BtnEliminarComponent,
    BtnReimpresionComponent
  ]
})
export class SharedModule { }
