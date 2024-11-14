import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';


@Component({
  selector: 'app-cliente-control',
  template: ` 
  <div class="d-flex justify-content-between mt-3">
    <h1>Clientes</h1>    
  </div>   
  <div class="tab-container">
      <div class="tab" [class.active]="selectedTab === 'tab1'" (click)="selectTab('tab1')">Alta / Listado</div>
      <div class="tab" [class.active]="selectedTab === 'tab2'" (click)="selectTab('tab2')">Tarifa General</div>
      <div class="tab" [class.active]="selectedTab === 'tab3'" (click)="selectTab('tab3')">Tarifa Especial</div>    
      <div class="tab" [class.active]="selectedTab === 'tab4'" (click)="selectTab('tab4')">Tarifa Personalizada</div>    
      <div class="tab" [class.active]="selectedTab === 'tab5'" (click)="selectTab('tab5')">Tarifa Eventual</div>    
      
  </div>
  <router-outlet></router-outlet>
    `,
  styleUrls: ['./cliente-control.component.scss']
})
export class ClienteControlComponent implements OnInit {

  selectedTab: string = 'tab1';

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.selectTab("tab1");
  }

  selectTab(tab: string) {
    this.selectedTab = tab;
    if (tab === 'tab1') {
      this.router.navigate(['clientes/listado']);
    } else if (tab === 'tab2') {
      this.router.navigate(['clientes/general']);
    } else if (tab === 'tab3') {
      this.router.navigate(['clientes/especial']);
    } else if (tab === 'tab4') {
      this.router.navigate(['clientes/personalizada']);
    } else if (tab === 'tab5') {
      this.router.navigate(['clientes/eventual']);
    } 
  }

}
