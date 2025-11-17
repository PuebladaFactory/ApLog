import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Vendedor } from 'src/app/interfaces/vendedor';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-vendedor-control',
  standalone: false,
  template: ` 
  <div class="d-flex justify-content-between mt-3">
    <h1>Vendedores</h1>    
  </div>   
  <div class="tab-container">
    @for (tab of tabs; track tab) {
      <div
        class="tab"
        [class.active]="selectedTab === tab.id"
        (click)="selectTab(tab.id)">
        {{ tab.name }}
      </div>
    }
  </div>
  <app-tablero-calendario [modo]="modo" [ngClass]="{'invisible': ocultarCalendario}"></app-tablero-calendario>
  <router-outlet></router-outlet>

    `,
  styleUrl: './vendedor-control.component.scss'
})
export class VendedorControlComponent implements OnInit {

  modo: string = 'vendedores';
  ocultarCalendario: boolean = false;
  selectedTab: string = 'tab1';
  tabs = [
    { id: 'tab1', name: 'Tablero de Actividad', route: 'vendedores/tableroVendedores' },    
    { id: 'tab2', name: 'Listado', route: 'vendedores/listado' }, 
  ];

  constructor(
    private router: Router,
    private storageService: StorageService, 
  ) {}

  ngOnInit(): void {
    this.storageService.listenForChanges<Vendedor>("vendedores");
    this.selectTab("tab1");
  }

  selectTab(tabId: string) {
    this.selectedTab = tabId;
    if(tabId === 'tab2'){this.ocultarCalendario = true} else {this.ocultarCalendario = false}
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      this.router.navigate([tab.route]);
    }
  }

}
