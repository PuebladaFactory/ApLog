import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { VendedorControlComponent } from './vendedor-control/vendedor-control.component';
import { VendedorAltaComponent } from './vendedor-alta/vendedor-alta.component';
import { RoleGuard } from 'src/app/guards/role.guard';
import { VendedoresListadoComponent } from './vendedores-listado/vendedores-listado.component';
import { TableroActividadComponent } from './tablero-actividad/tablero-actividad.component';
import { VendedorHistorialComponent } from './vendedor-historial/vendedor-historial.component';

const routes: Routes = [
  {path: '', component:VendedorControlComponent,
  children: [    
    {path: 'alta', component:VendedorAltaComponent,
          canActivate: [RoleGuard],
          data: { roles: ['god', 'admin', 'manager'] }, // no se permiten usuarios
        },        
    {path: 'listado', component:VendedoresListadoComponent},    
    {path: 'tableroVendedores', component:TableroActividadComponent},    
    {path: 'historial', component:VendedorHistorialComponent},    
    
]  },
  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class VendedoresRoutingModule { }
