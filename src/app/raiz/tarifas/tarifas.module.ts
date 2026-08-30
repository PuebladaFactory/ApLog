import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from 'src/app/shared/shared.module';

import { TarifasRoutingModule } from './tarifas-routing.module';
import { TarifasControlComponent } from './tarifas-control/tarifas-control.component';
import { TarifasGeneralComponent } from './tarifas-general/tarifas-general.component';
import { TarifaViewerComponent } from './tarifa-viewer/tarifa-viewer.component';
import { TarifaFormComponent } from './tarifa-form/tarifa-form.component';
import { TarifaAumentoComponent } from './tarifa-aumento/tarifa-aumento.component';
import { TarifasPersonalizadaComponent } from './tarifas-personalizada/tarifas-personalizada.component';
import { TarifaEspecialViewerComponent } from './tarifa-especial-viewer/tarifa-especial-viewer.component';
import { TarifaEspecialFormComponent } from './tarifa-especial-form/tarifa-especial-form.component';
import { TarifaEspecialAumentoComponent } from './tarifa-especial-aumento/tarifa-especial-aumento.component';
import { TarifasEspecialComponent } from './tarifas-especial/tarifas-especial.component';
import { TarifasEventualComponent } from './tarifas-eventual/tarifas-eventual.component';
import { TarifasHistorialComponent } from './tarifas-historial/tarifas-historial.component';

@NgModule({
  declarations: [
    TarifasControlComponent,
    TarifasGeneralComponent,
    TarifaViewerComponent,
    TarifaFormComponent,
    TarifaAumentoComponent,
    TarifasPersonalizadaComponent,
    TarifaEspecialViewerComponent,
    TarifaEspecialFormComponent,
    TarifaEspecialAumentoComponent,
    TarifasEspecialComponent,
    TarifasEventualComponent,
    TarifasHistorialComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SharedModule,
    TarifasRoutingModule,
  ]
})
export class TarifasModule { }
