import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FacturacionClienteComponent } from './facturacion-cliente/facturacion-cliente.component';
import { FacturacionChoferComponent } from './facturacion-chofer/facturacion-chofer.component';
import { FacturacionGeneralComponent } from './facturacion-general/facturacion-general.component';
import { FacturacionControlComponent } from './facturacion-control/facturacion-control.component';
import { FacturacionProveedorComponent } from './facturacion-proveedor/facturacion-proveedor.component';
import { PagenotfoundComponent } from 'src/app/pagenotfound/pagenotfound.component';
import { RoleGuard } from 'src/app/guards/role.guard';
import { FacturacionListadoComponent } from './facturacion-listado/facturacion-listado.component';



const routes: Routes = [
  {path: '', component:FacturacionControlComponent,
    children: [        
      {path: 'gral', component:FacturacionGeneralComponent},       
      {path: 'emitidos', component:FacturacionListadoComponent},       
      
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

