import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LiqGralComponent } from './liq-gral/liq-gral.component';

import { ProformaComponent } from './proforma/proforma.component';
import { LiquidacionesOpComponent } from './liquidaciones-op/liquidaciones-op.component';
import { MigrarDatosComponent } from './migrar-datos/migrar-datos.component';
import { RoleGuard } from 'src/app/guards/role.guard';
import { InformeOpListadoComponent } from './informe-op-listado/informe-op-listado.component';
import { BorradoresLiqComponent } from './borradores-liq/borradores-liq.component';
import { InformeOpAnuladosComponent } from './informe-op-anulados/informe-op-anulados.component';

const routes: Routes = [
  {path: '', component:LiqGralComponent,
    children: [
      {path: '', redirectTo: 'informes', pathMatch: 'full' },
      //{path: 'proformas', component:ProformaComponent},
      //{path: 'cliente', component:LiquidacionesOpComponent},
      //{path: 'chofer', component:LiquidacionesOpComponent},
      //{path: 'proveedor', component:LiquidacionesOpComponent},
      {path: 'informes', component:InformeOpListadoComponent},
      {path: 'borradores', component: BorradoresLiqComponent},
      {path: 'anulados', component: InformeOpAnuladosComponent},
      /* {path: 'migrar', component:MigrarDatosComponent,
      canActivate: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['dev'] }, // Accesible para todos los roles
      }, */
    ]
  },  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LiquidacionRoutingModule { }
