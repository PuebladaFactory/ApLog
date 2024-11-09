import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FacturacionClienteComponent } from './facturacion-cliente/facturacion-cliente.component';
import { FacturacionChoferComponent } from './facturacion-chofer/facturacion-chofer.component';
import { FacturacionGeneralComponent } from './facturacion-general/facturacion-general.component';
import { FacturacionControlComponent } from './facturacion-control/facturacion-control.component';
import { FacturacionProveedorComponent } from './facturacion-proveedor/facturacion-proveedor.component';
import { PagenotfoundComponent } from 'src/app/pagenotfound/pagenotfound.component';



const routes: Routes = [
  {path: '', component:FacturacionControlComponent,
    children: [        
      {path: 'gral', component:FacturacionGeneralComponent},    
      /* {path: 'clientes', component:FacturacionClienteComponent},
      {path: 'choferes', component:FacturacionChoferComponent},
      {path: 'proveedores', component:FacturacionProveedorComponent}, */      
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

