import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ControlComponent } from './control/control.component';
import { TableroLegajosComponent } from './tablero-legajos/tablero-legajos.component';
import { ConsultaLegajosComponent } from './consulta-legajos/consulta-legajos.component';
import { CargarDocumentosComponent } from './cargar-documentos/cargar-documentos.component';

const routes: Routes = [
  {path: '', component:ControlComponent,
    children: [        
      {path: 'tablero', component:TableroLegajosComponent},    
      {path: 'consulta', component:ConsultaLegajosComponent},
      {path: 'cargarDoc', component:CargarDocumentosComponent},      
  ]  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LegajosRoutingModule { }
