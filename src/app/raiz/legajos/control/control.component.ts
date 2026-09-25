import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { UsuarioSesionService } from "src/app/servicios/usuario-sesion/usuario-sesion.service";
import { tabActivaDesdeUrl } from "src/app/shared/utils/tabs-url.util";

@Component({
  selector: "app-control",
  template: `
    <div class="d-flex justify-content-between mt-3">
      <h1>Legajos</h1>
    </div>
    <div class="tab-container">
      <div
        class="tab"
        [class.active]="selectedTab === 'tab1'"
        (click)="selectTab('tab1')"
      >
        Tablero Legajos
      </div>
      <div
        class="tab"
        [class.active]="selectedTab === 'tab2'"
        (click)="selectTab('tab2')"
        [ngClass]="{ isDisabled: usuarioSesion.esRol('demo') }"
      >
        Cargar Documentos
      </div>
      <div
        class="tab"
        [class.active]="selectedTab === 'tab3'"
        (click)="selectTab('tab3')"
      >
        Consultar Legajos
      </div>
      <div
        class="tab"
        [class.active]="selectedTab === 'tab4'"
        (click)="selectTab('tab4')"
      >
        Próximos Vencimientos
      </div>
    </div>
    <router-outlet></router-outlet>
  `,
  styleUrls: ["./control.component.scss"],
  standalone: false,
})
export class ControlComponent implements OnInit {
  tabs = [
    { id: 'tab1', route: 'legajos/tablero' },
    { id: 'tab2', route: 'legajos/cargarDoc' },
    { id: 'tab3', route: 'legajos/consulta' },
    { id: 'tab4', route: 'legajos/vencimientos' },
  ];

  /** Pestaña activa derivada de la URL real (ver tabs-url.util). */
  get selectedTab(): string {
    return tabActivaDesdeUrl(this.tabs, this.router.url);
  }

  constructor(
    private router: Router,
    public usuarioSesion: UsuarioSesionService,
  ) {}

  ngOnInit(): void {
    //this.selectTab("tab1");
  }

  selectTab(tabId: string) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      this.router.navigate([tab.route]);
    }
  }
}
