import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';

@Component({
  selector: 'app-choferes-control',
  template: `     
  <div class="d-flex justify-content-between mt-3">
    <h1>Choferes</h1>    
  </div>   
  <div class="tab-container">
      <div class="tab" [class.active]="selectedTab === 'tab1'" (click)="selectTab('tab1')">Alta / Listado</div>
      <div class="tab" [class.active]="selectedTab === 'tab2'" (click)="selectTab('tab2')">Tarifa General</div>
      <div class="tab" [class.active]="selectedTab === 'tab3'" (click)="selectTab('tab3')">Tarifa Especial</div>    
      <!-- <div class="tab" [class.active]="selectedTab === 'tab4'" (click)="selectTab('tab4')">Tarifa Personalizada</div>     -->
      
  </div>
  <router-outlet></router-outlet>    
    `,
  styles: [`
    .tab-container {
    display: flex;
    justify-content: flex-start;
    //background-color: #f1f1f1;
    border-bottom: 1px solid #ccc;
  }
  
  .tab {
    padding: 10px 20px;
    cursor: pointer;
    background-color: #e7e7e7;
    border: 1px solid #ccc;
    border-bottom: none;
    margin-right: 2px;
    border-radius: 20% 20% 0 0;
    font-size: 1.5rem;
  }
  
  .tab:hover {
    background-color: #ddd;
  }
  
  .tab.active {
    background-color: white;
    border-top: 2px solid #007bff;
    border-left: 1px solid #007bff;
    border-right: 1px solid #007bff;
    color: #007bff;
    font-size: 1.5rem;
  }
    `]
})
export class ChoferesControlComponent implements OnInit {

  selectedTab: string = 'tab1';

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.selectTab("tab1");
  }

  selectTab(tab: string) {
    this.selectedTab = tab;
    if (tab === 'tab1') {
      this.router.navigate(['choferes/listado']);
    } else if (tab === 'tab2') {
      this.router.navigate(['choferes/general']);
    } else if (tab === 'tab3') {
      this.router.navigate(['choferes/especial']);
    } 
  }
}
