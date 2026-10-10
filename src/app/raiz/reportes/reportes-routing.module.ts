import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReportesControlComponent } from './reportes-control/reportes-control.component';
import { ResumenOpGeneralComponent } from './resumen-op-general/resumen-op-general.component';
import { ResumenOpEntidadComponent } from './resumen-op-entidad/resumen-op-entidad.component';

const routes: Routes = [
    {path: '', component:ReportesControlComponent,
          children: [  
            { path: '', redirectTo: 'opGeneral', pathMatch: 'full' },             
            {path: 'opGeneral', component:ResumenOpGeneralComponent},
            {path: 'opEntidad', component:ResumenOpEntidadComponent},
        ]   },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReportesRoutingModule { }
