import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LiqGralComponent } from './liq-gral/liq-gral.component';
import { LiqClienteComponent } from './liq-cliente/liq-cliente.component';
import { LiqChoferComponent } from './liq-chofer/liq-chofer.component';
import { LiqProveedorComponent } from './liq-proveedor/liq-proveedor.component';
import { ProformaComponent } from './proforma/proforma.component';
import { NuevaLiqComponent } from './nueva-liq/nueva-liq.component';

const routes: Routes = [
  {path: '', component:LiqGralComponent,
    children: [        
      {path: 'clientes', component:LiqClienteComponent},    
      {path: 'choferes', component:LiqChoferComponent},
      {path: 'proveedores', component:LiqProveedorComponent},
      {path: 'proformas', component:ProformaComponent},
      {path: 'cliente', component:NuevaLiqComponent},
      {path: 'chofer', component:NuevaLiqComponent},
      {path: 'proveedor', component:NuevaLiqComponent},
    ]
  },  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LiquidacionRoutingModule { }
