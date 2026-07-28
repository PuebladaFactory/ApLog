import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { UsuarioSesionService } from "src/app/servicios/usuario-sesion/usuario-sesion.service";

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
    </div>
    <router-outlet></router-outlet>
  `,
  styleUrls: ["./control.component.scss"],
  standalone: false,
})
export class ControlComponent implements OnInit {
  selectedTab: string = "tab1";

  constructor(
    private router: Router,
    public usuarioSesion: UsuarioSesionService,
  ) {}

  ngOnInit(): void {
    //this.selectTab("tab1");
  }

  selectTab(tab: string) {
    this.selectedTab = tab;
    if (tab === "tab1") {
      this.router.navigate(["legajos/tablero"]);
    } else if (tab === "tab2") {
      this.router.navigate(["legajos/cargarDoc"]);
    } else if (tab === "tab3") {
      this.router.navigate(["legajos/consulta"]);
    }
  }
}
