import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LiqGralComponent } from './liq-gral/liq-gral.component';

import { ProformaComponent } from './proforma/proforma.component';
import { LiquidacionesOpComponent } from './liquidaciones-op/liquidaciones-op.component';
import { MigrarDatosComponent } from './migrar-datos/migrar-datos.component';
import { RoleGuard } from 'src/app/guards/role.guard';

const routes: Routes = [
  {path: '', component:LiqGralComponent,
    children: [              
      {path: 'proformas', component:ProformaComponent},
      {path: 'cliente', component:LiquidacionesOpComponent},
      {path: 'chofer', component:LiquidacionesOpComponent},
      {path: 'proveedor', component:LiquidacionesOpComponent},
      {path: 'migrar', component:MigrarDatosComponent,
      canActivate: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['god'] }, // Accesible para todos los roles
      },
    ]
  },  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LiquidacionRoutingModule { }
