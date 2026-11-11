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
import { InactividadService } from 'src/app/servicios/usuario-sesion/inactividad.service';

let version = 'v0.0.0'; // fallback por defecto

try {
  version = require('src/environments/version').appVersion;
} catch (e) {
  console.warn('⚠️ version.ts no encontrado, usando versión por defecto.');
}

/** Módulos de reglas (moduloDe() de firestore.rules) que ngOnInit abre para
 *  todas las rutas, sin condición:
 *    - ChoferService.init: choferes, vehiculos → entidades
 *    - ProveedorService.init: proveedores → entidades
 *    - ClienteService.init: clientes → entidades
 *    - TarifarioService.init: tarifas, tarifasEspeciales → tarifas;
 *      registrosOpEventuales → informesOp
 *    - CategoriaDocumentacionService.init: categoriasDocumentacion → legajos
 *    - LegajoService.init: legajos → legajos
 *  noDisponibilidades queda afuera: es condicional (ver ngOnInit).
 *
 *  invariante-rutas.spec.ts afirma que todo rol que alguna ruta admite puede
 *  leer estos módulos. Es una declaración a mano: hay que mantenerla en paso
 *  con ngOnInit, y que coincida con lo que ngOnInit abre es lo único que el
 *  test no verifica. */
export const MODULOS_ARRANQUE = ['entidades', 'tarifas', 'informesOp', 'legajos'] as const;

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

  constructor(private categoriaDocumentacionService: CategoriaDocumentacionService, private legajoService: LegajoService, private choferService: ChoferService, private proveedorService: ProveedorService, private clienteService: ClienteService, private tarifarioService: TarifarioService, private noDisponibilidadService: NoDisponibilidadService, private permisosService: PermisosService, private router: Router, private inactividad: InactividadService) { }

  ngOnInit(): void {
    // Eje de sesión, bloque 4: vencimiento por inactividad. Idempotente: este
    // ngOnInit corre cada vez que se recrea el shell.
    this.inactividad.iniciar();
    this.choferService.init();
    this.proveedorService.init();
    this.clienteService.init();
    this.tarifarioService.init();
    this.categoriaDocumentacionService.init();
    this.legajoService.init();
    // Sólo con lectura del módulo 'operaciones' (donde las reglas mapean
    // noDisponibilidades). Hoy es un no-op: los cuatro roles que llegan a la
    // app (dev, admin, user, demo) leen 'operaciones', así que nunca da falso.
    // Se conserva porque es el patrón correcto para un listener del arranque
    // que no todos los roles podrían leer, no porque proteja de algo hoy.
    // Por eso no está en MODULOS_ARRANQUE.
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
