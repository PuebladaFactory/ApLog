import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HistorialGeneralComponent } from './historial-general/historial-general.component';
import { HistorialControlComponent } from './historial-control/historial-control.component';
import { HistorialClienteComponent } from './historial-cliente/historial-cliente.component';
import { HistorialChoferComponent } from './historial-chofer/historial-chofer.component';
import { HistorialProveedorComponent } from './historial-proveedor/historial-proveedor.component';

const routes: Routes = [
  {path: '', component:HistorialControlComponent,
    children: [        
      {path: 'gral', component:HistorialGeneralComponent},    
      {path: 'clientes', component:HistorialClienteComponent},
      {path: 'choferes', component:HistorialChoferComponent},
      {path: 'proveedores', component:HistorialProveedorComponent},
    ]
  },  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HistorialRoutingModule { }
