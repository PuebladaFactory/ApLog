import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { FinanzasNuevaRoutingModule } from './finanzas-nueva-routing.module';
import { FinanzasNuevaControlComponent } from './control/finanzas-nueva-control.component';
import { FinanzasCuentasComponent } from './cuentas/finanzas-cuentas.component';

/** Módulo Finanzas — camino nuevo (Frente Finanzas), en paralelo a
 *  raiz/finanzas (módulo viejo, se retira al cerrar el frente). Solo lazy
 *  desde raiz-routing (`finanzasNueva`): NO se importa en RaizModule. */
@NgModule({
  declarations: [
    FinanzasNuevaControlComponent,
    FinanzasCuentasComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    FinanzasNuevaRoutingModule,
  ],
})
export class FinanzasNuevaModule { }
