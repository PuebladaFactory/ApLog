import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Vendedor } from 'src/app/interfaces/vendedor';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { tabActivaDesdeUrl } from 'src/app/shared/utils/tabs-url.util';

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
  <!-- <app-tablero-calendario [modo]="modo" [ngClass]="{'invisible': ocultarCalendario}"></app-tablero-calendario> -->
  <div class="d-flex justify-content-center">
    <div style="width:420px">
        <app-tablero-fechas defaultTipo="mes" [ngClass]="{'invisible': ocultarCalendario}"></app-tablero-fechas>  
    </div>    
  </div>
  <router-outlet></router-outlet>

    `,
  styleUrl: './vendedor-control.component.scss'
})
export class VendedorControlComponent implements OnInit {

  modo: string = 'vendedores';
  tabs = [
    { id: 'tab1', name: 'Tablero de Actividad', route: 'vendedores/tableroVendedores' },
    { id: 'tab2', name: 'Listado', route: 'vendedores/listado', alias: ['vendedores/alta'] },
    { id: 'tab3', name: 'Historial', route: 'vendedores/historial' },
  ];

  /** Pestaña activa derivada de la URL real (ver tabs-url.util). */
  get selectedTab(): string {
    return tabActivaDesdeUrl(this.tabs, this.router.url);
  }

  /** El calendario no aplica a Listado ni Historial. Se deriva de la
   *  pestaña activa (antes se seteaba en el click y quedaba mal con F5). */
  get ocultarCalendario(): boolean {
    return this.selectedTab === 'tab2' || this.selectedTab === 'tab3';
  }

  constructor(
    private router: Router,
    private storageService: StorageService,
  ) {}

  ngOnInit(): void {
    this.storageService.listenForChanges<Vendedor>("vendedores");
    //this.selectTab("tab1");
  }

  selectTab(tabId: string) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      this.router.navigate([tab.route]);
    }
  }

}
