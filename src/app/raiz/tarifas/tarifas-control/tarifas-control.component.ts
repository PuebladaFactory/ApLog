import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-tarifas-control',
    template: `
  <div class="d-flex justify-content-between mt-3">
    <h1>Tarifas</h1>
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
    styleUrls: ['./tarifas-control.component.scss'],
    standalone: false
})
export class TarifasControlComponent implements OnInit, OnDestroy {

  selectedTab: string = 'tab1';
  tabs = [
    { id: 'tab1', name: 'General', route: 'tarifas/general' },
    { id: 'tab2', name: 'Personalizada', route: 'tarifas/personalizada' },
    { id: 'tab3', name: 'Especial', route: 'tarifas/especial' },
    { id: 'tab4', name: 'Eventual', route: 'tarifas/eventual' },
    { id: 'tab5', name: 'Historial', route: 'tarifas/historial' },
  ];

  private destroy$ = new Subject<void>();

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Sincroniza el tab resaltado con la ruta real. Sin esto, entrar por un
    // link directo, recargar la página, o navegar con atrás/adelante del
    // navegador deja el resaltado en 'tab1' (o en lo último clickeado acá)
    // aunque el router-outlet ya esté mostrando otra pestaña — selectTab()
    // solo actualizaba selectedTab cuando el cambio de ruta salía de un click
    // en este mismo componente.
    this.actualizarTabDesdeUrl(this.router.url);
    this.router.events
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        if (event instanceof NavigationEnd) {
          this.actualizarTabDesdeUrl(event.urlAfterRedirects);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private actualizarTabDesdeUrl(url: string): void {
    const tab = this.tabs.find(t => url.includes(t.route));
    if (tab) this.selectedTab = tab.id;
  }

  selectTab(tabId: string) {
    this.selectedTab = tabId;
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      this.router.navigate([tab.route]);
    }
  }

}
