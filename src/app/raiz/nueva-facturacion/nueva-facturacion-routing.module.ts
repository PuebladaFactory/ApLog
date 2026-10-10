import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ControlComponent } from './control/control.component';
import { FacturacionEmitidosComponent } from './emitidos/facturacion-emitidos.component';
import { FacturacionRevertidosComponent } from './revertidos/facturacion-revertidos.component';
import { FacturacionFacturadosComponent } from './facturados/facturacion-facturados.component';

const routes: Routes = [
    {path: '', component:ControlComponent,
      children: [
        {path: '', redirectTo: 'emitidos', pathMatch: 'full' },
        {path: 'emitidos', component: FacturacionEmitidosComponent},
        {path: 'facturados', component: FacturacionFacturadosComponent},
        {path: 'revertidos', component: FacturacionRevertidosComponent},
    ]  },


];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class NuevaFacturacionRoutingModule { }
