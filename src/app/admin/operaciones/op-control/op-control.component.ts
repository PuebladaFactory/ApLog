import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-op-control',
  template: `     
  <div class="d-flex justify-content-between mt-3">
    <h1 class="text-center w-100">Operaciones</h1>    
  </div>   
  <div class="tab-container">
      <div class="tab" [class.active]="selectedTab === 'tab1'" (click)="selectTab('tab1')">Tablero de Operaciones</div>         
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
export class OpControlComponent implements OnInit {

  selectedTab: string = 'tab1';

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.selectTab("tab1");
  }

  selectTab(tab: string) {
    this.selectedTab = tab;
    if (tab === 'tab1') {
      this.router.navigate(['op/tablero']);
    } else if (tab === 'tab2') {
      this.router.navigate(['op/al']);
    } else if (tab === 'tab3') {
      this.router.navigate(['choferes/especial']);
    } else if (tab === 'tab4') {
      this.router.navigate(['choferes/personalizada']);
    } 
  }


}
