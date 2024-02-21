import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LiqGralComponent } from './liq-gral/liq-gral.component';

const routes: Routes = [
  {path: '', component:LiqGralComponent},  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LiquidacionRoutingModule { }
