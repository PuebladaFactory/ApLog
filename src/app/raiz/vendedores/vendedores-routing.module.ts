import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { VendedorControlComponent } from './vendedor-control/vendedor-control.component';
import { VendedorAltaComponent } from './vendedor-alta/vendedor-alta.component';
import { RoleGuard } from 'src/app/guards/role.guard';
import { VendedoresListadoComponent } from './vendedores-listado/vendedores-listado.component';
import { TableroActividadComponent } from './tablero-actividad/tablero-actividad.component';

const routes: Routes = [
  {path: '', component:VendedorControlComponent,
  children: [    
    {path: 'alta', component:VendedorAltaComponent,
          canActivate: [RoleGuard],
          data: { roles: ['god', 'admin', 'manager'] }, // no se permiten usuarios
        },        
    {path: 'listado', component:VendedoresListadoComponent},    
    {path: 'tablero', component:TableroActividadComponent},    
    
]  },
  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class VendedoresRoutingModule { }
