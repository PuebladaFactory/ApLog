import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { FinanzasNuevaRoutingModule } from './finanzas-nueva-routing.module';
import { FinanzasNuevaControlComponent } from './control/finanzas-nueva-control.component';
import { FinanzasCuentasComponent } from './cuentas/finanzas-cuentas.component';
import { RegistrarMovimientoComponent } from './modales/registrar-movimiento/registrar-movimiento.component';
import { FinanzasMovimientosComponent } from './movimientos/finanzas-movimientos.component';
import { DetalleMovimientoComponent } from './modales/detalle-movimiento/detalle-movimiento.component';
import { ImputarSaldoComponent } from './modales/imputar-saldo/imputar-saldo.component';
import { CuentaEntidadComponent } from './cuenta-entidad/cuenta-entidad.component';
import { FinanzasAntiguedadComponent } from './antiguedad/finanzas-antiguedad.component';
import { FinanzasResumenComponent } from './resumen/finanzas-resumen.component';
import { HistoriaComprobanteComponent } from './modales/historia-comprobante/historia-comprobante.component';

/** Módulo Finanzas — camino nuevo (Frente Finanzas), en paralelo a
 *  raiz/finanzas (módulo viejo, se retira al cerrar el frente). Solo lazy
 *  desde raiz-routing (`finanzasNueva`): NO se importa en RaizModule. */
@NgModule({
  declarations: [
    FinanzasNuevaControlComponent,
    FinanzasCuentasComponent,
    RegistrarMovimientoComponent,
    FinanzasMovimientosComponent,
    DetalleMovimientoComponent,
    ImputarSaldoComponent,
    CuentaEntidadComponent,
    HistoriaComprobanteComponent,
    FinanzasAntiguedadComponent,
    FinanzasResumenComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    FinanzasNuevaRoutingModule,
  ],
})
export class FinanzasNuevaModule { }
