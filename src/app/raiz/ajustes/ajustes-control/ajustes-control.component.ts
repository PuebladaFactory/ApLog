import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-ajustes-control',
    template: `
  <div class="d-flex justify-content-between mt-3">
    <h1>Configuración</h1>    
  </div>   
  <div class="tab-container">
      <div class="tab" [class.active]="selectedTab === 'tab1'" (click)="selectTab('tab1')">Usuarios</div>      
      <div class="tab" [class.active]="selectedTab === 'tab2'" (click)="selectTab('tab2')">Registro</div>      
      <div class="tab" [class.active]="selectedTab === 'tab3'" (click)="selectTab('tab3')">Papelera</div>      
      
  </div>
  <router-outlet></router-outlet>
  `,
    styleUrls: ['./ajustes-control.component.scss'],
    standalone: false
})
export class AjustesControlComponent implements OnInit {

   selectedTab: string = 'tab1';
  
    constructor(private router: Router) {}
  
    ngOnInit(): void {
      this.selectTab("tab1");
    }
  
    selectTab(tab: string) {
      this.selectedTab = tab;
      if (tab === 'tab1') {
        this.router.navigate(['ajustes/usuarios']);
      } 
      if (tab === 'tab2') {
        this.router.navigate(['ajustes/registro']);
      } 
      if (tab === 'tab3') {
        this.router.navigate(['ajustes/papelera']);
      } 
    }

}
