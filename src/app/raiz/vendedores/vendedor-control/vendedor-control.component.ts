import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { VendedorService } from 'src/app/servicios/vendedores/vendedor.service';
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
  <router-outlet></router-outlet>
    `,
  styleUrl: './vendedor-control.component.scss'
})
export class VendedorControlComponent implements OnInit {

  tabs = [
    { id: 'tab1', name: 'Tablero de Actividad', route: 'vendedores/tableroVendedores' },
    { id: 'tab2', name: 'Listado', route: 'vendedores/listado' },
    { id: 'tab3', name: 'Historial', route: 'vendedores/historial' },
  ];

  /** Pestaña activa derivada de la URL real (ver tabs-url.util). */
  get selectedTab(): string {
    return tabActivaDesdeUrl(this.tabs, this.router.url);
  }

  constructor(
    private router: Router,
    private vendedorService: VendedorService,
  ) {}

  ngOnInit(): void {
    // Listener en memoria de vendedores (modelo nuevo). Solo se abre acá:
    // la ruta del módulo es dev/admin/demo, los roles que leen 'vendedores'.
    this.vendedorService.init();
  }

  selectTab(tabId: string) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      this.router.navigate([tab.route]);
    }
  }

}
