import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ajustes-control',
  template: `
  <div class="d-flex justify-content-between mt-3">
    <h1>Ajustes</h1>    
  </div>   
  <div class="tab-container">
      <div class="tab" [class.active]="selectedTab === 'tab1'" (click)="selectTab('tab1')">Usuarios</div>      
      
  </div>
  <router-outlet></router-outlet>
  `,
  styleUrls: ['./ajustes-control.component.scss']
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
    }

}
