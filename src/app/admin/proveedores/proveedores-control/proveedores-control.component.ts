import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-proveedores-control',
    template: ` 
  <div class="d-flex justify-content-between mt-3">
    <h1>Proveedores</h1>    
  </div>   
  <div class="tab-container">
      <div class="tab" [class.active]="selectedTab === 'tab1'" (click)="selectTab('tab1')">Alta / Listado</div>
      <div class="tab" [class.active]="selectedTab === 'tab2'" (click)="selectTab('tab2')">Tarifa General</div>
      <div class="tab" [class.active]="selectedTab === 'tab3'" (click)="selectTab('tab3')">Tarifa Especial</div>    
      <div class="tab" [class.active]="selectedTab === 'tab4'" (click)="selectTab('tab4')">Tarifa Eventual</div>    
      
      
  </div>
  <router-outlet></router-outlet>
    `,
    styleUrls: ['./proveedores-control.component.scss'],
    standalone: false
})
export class ProveedoresControlComponent implements OnInit {

  selectedTab: string = 'tab1';

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.selectTab("tab1");
  }

  selectTab(tab: string) {
    this.selectedTab = tab;
    if (tab === 'tab1') {
      this.router.navigate(['proveedores/listado']);
    } else if (tab === 'tab2') {
      this.router.navigate(['proveedores/general']);
    } else if (tab === 'tab3') {
      this.router.navigate(['proveedores/especial']);
    } else if (tab === 'tab4') {
      this.router.navigate(['proveedores/eventual']);
    } 
  }

}
