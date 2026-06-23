import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';


import { FacturacionControlComponent } from './facturacion-control/facturacion-control.component';

import { PagenotfoundComponent } from 'src/app/pagenotfound/pagenotfound.component';
import { RoleGuard } from 'src/app/guards/role.guard';




const routes: Routes = [
  {path: '', component:FacturacionControlComponent,
    children: [     
      {path: '', redirectTo: 'gral', pathMatch: 'full' },    
      
      
    ]
  },
  {path: 'facturacion/clientes', component:PagenotfoundComponent},
  {path: 'facturacion/choferes', component:PagenotfoundComponent},
  {path: 'facturacion/proveedores', component:PagenotfoundComponent},  
  
  
  
  
   
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FacturacionRoutingModule { }

