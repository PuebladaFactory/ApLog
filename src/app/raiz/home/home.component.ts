import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';
import { CategoriaDocumentacionService } from 'src/app/servicios/categoria-documentacion/categoria-documentacion.service';
import { LegajoService } from 'src/app/servicios/legajos/legajo.service';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
import { NoDisponibilidadService } from 'src/app/servicios/no-disponibilidad/no-disponibilidad.service';
import { PermisosService } from 'src/app/servicios/permisos/permisos.service';

let version = 'v0.0.0'; // fallback por defecto

try {
  version = require('src/environments/version').appVersion;
} catch (e) {
  console.warn('⚠️ version.ts no encontrado, usando versión por defecto.');
}

/** Ancho desde el que el sidebar va fijo al lado del contenido. Por debajo,
 *  se superpone al contenido y se cierra al navegar. */
const BREAKPOINT_SIDEBAR = '(min-width: 1600px)';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css'],
    standalone: false
})
export class HomeComponent implements OnInit, OnDestroy {

  appVersion = version;

  /** Sidebar — dos modos según el ancho (BREAKPOINT_SIDEBAR):
   *  - ancho: fijo al lado del contenido (lo empuja), abierto por defecto;
   *  - angosto: superpuesto con fondo oscuro, cerrado por defecto; se cierra
   *    al navegar, con Esc o tocando el fondo.
   *  El modo se recalcula solo al CRUZAR el breakpoint (matchMedia), así se
   *  respeta lo que el usuario eligió con el botón mientras el ancho no cambia
   *  de lado. */
  esAncho = false;
  sidebarAbierto = false;

  private consultaAncho = window.matchMedia(BREAKPOINT_SIDEBAR);
  private alCambiarAncho = (e: MediaQueryListEvent) => this.aplicarModo(e.matches);
  private destroy$ = new Subject<void>();

  constructor(private categoriaDocumentacionService: CategoriaDocumentacionService, private legajoService: LegajoService, private choferService: ChoferService, private proveedorService: ProveedorService, private clienteService: ClienteService, private tarifarioService: TarifarioService, private noDisponibilidadService: NoDisponibilidadService, private permisosService: PermisosService, private router: Router) { }

  ngOnInit(): void {
    this.choferService.init();
    this.proveedorService.init();
    this.clienteService.init();
    this.tarifarioService.init();
    this.categoriaDocumentacionService.init();
    this.legajoService.init();
    // Sólo con lectura del módulo 'operaciones' (donde las reglas mapean
    // noDisponibilidades): sin ella el listener lo rechaza Firestore.
    if (this.permisosService.puede('operaciones')) this.noDisponibilidadService.init();
    // TC-R3: fuera los listeners de las 7 colecciones de tarifas viejas
    // (tarifasGral/Esp/PersCliente, tarifasGral/EspChofer,
    // tarifasGral/EspProveedor) — sin lectores desde TC-R1/TC-R2. Las
    // tarifas se cargan con tarifarioService.init().

    this.aplicarModo(this.consultaAncho.matches);
    this.consultaAncho.addEventListener('change', this.alCambiarAncho);

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd), takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.esAncho) this.sidebarAbierto = false;
      });
  }

  ngOnDestroy(): void {
    this.consultaAncho.removeEventListener('change', this.alCambiarAncho);
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Al entrar o al cruzar el breakpoint: ancho → abierto; angosto → cerrado. */
  private aplicarModo(esAncho: boolean): void {
    this.esAncho = esAncho;
    this.sidebarAbierto = esAncho;
  }

  toggleSidebar(): void {
    this.sidebarAbierto = !this.sidebarAbierto;
  }

  cerrarSidebar(): void {
    this.sidebarAbierto = false;
  }

  @HostListener('document:keydown.escape')
  alPresionarEsc(): void {
    if (!this.esAncho && this.sidebarAbierto) this.sidebarAbierto = false;
  }

}
