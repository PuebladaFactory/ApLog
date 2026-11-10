import { Injectable, NgZone, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import Swal from 'sweetalert2';
import { SesionInvalidaService } from './sesion-invalida.service';
import {
  debeEscribirMarca,
  escribirUltimaActividad,
  estadoInactividad,
  leerUltimaActividad,
  msHastaVencer,
} from './inactividad.util';

/** Eventos que cuentan como interacción real. El movimiento del mouse no. */
const EVENTOS_ACTIVIDAD = ['click', 'keydown', 'scroll', 'touchstart'] as const;

/** Cada cuánto se compara la marca con el ahora (la decisión no acumula tics:
 *  una pestaña en segundo plano con el temporizador frenado decide bien igual). */
const INTERVALO_COMPROBACION_MS = 1000;

/** Clase del popup del aviso: distingue al aviso de inactividad de cualquier
 *  otro Swal, para no cerrar uno ajeno. */
const CLASE_AVISO = 'aviso-inactividad';

/* Eje de sesión, bloque 4: la sesión vence tras INACTIVIDAD_MAXIMA_MS sin
 * interacción en NINGUNA pestaña (la marca va en localStorage). Un minuto antes,
 * un aviso con cuenta regresiva y "Seguir conectado". Vencer sale por la misma
 * puerta que la red del 2b (SesionInvalidaService.cerrarSesionForzada): cierra
 * Firebase Auth, no sólo la app, y recarga /login con el aviso de inactividad.
 * Lo arranca HomeComponent.ngOnInit; `iniciar()` es idempotente. No se detiene:
 * todo camino que termina una sesión recarga la página. */
@Injectable({ providedIn: 'root' })
export class InactividadService {
  private router = inject(Router);
  private ngZone = inject(NgZone);
  private sesionInvalida = inject(SesionInvalidaService);

  private iniciado = false;
  private vencido = false;
  private avisoAbierto = false;
  /** Última escritura de la marca hecha por ESTA pestaña (para limitarlas). */
  private ultimaEscritura: number | null = null;

  iniciar(): void {
    if (this.iniciado) return;
    this.iniciado = true;

    // Primero la marca que ya hay: una sesión que quedó abierta (navegador
    // cerrado sin desloguearse) y lleva más del límite quieta vence ahora,
    // antes de que la llegada misma cuente como actividad.
    const previa = leerUltimaActividad(localStorage);
    if (previa !== null && estadoInactividad(previa, Date.now()) === 'vencer') {
      this.vencer();
      return;
    }
    // Llegar (login, F5, navegación) es actividad.
    this.registrarActividad(true);

    this.ngZone.runOutsideAngular(() => {
      const alActuar = () => this.registrarActividad();
      for (const evento of EVENTOS_ACTIVIDAD) {
        document.addEventListener(evento, alActuar, { capture: true, passive: true });
      }
      // Al volver a una pestaña en segundo plano, decidir enseguida (sin contar
      // como actividad: mirar no es interactuar).
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') this.comprobar();
      });
      setInterval(() => this.comprobar(), INTERVALO_COMPROBACION_MS);
    });

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.registrarActividad());
  }

  /** `forzar`: escribe sin el límite de frecuencia y aunque el aviso esté
   *  abierto (el botón "Seguir conectado" y la llegada). El aviso mismo no
   *  cuenta como actividad: mientras está abierto, la interacción con él o con
   *  el fondo se ignora, salvo el botón. */
  private registrarActividad(forzar = false): void {
    if (this.vencido) return;
    if (this.avisoAbierto && !forzar) return;
    const ahora = Date.now();
    if (forzar || debeEscribirMarca(this.ultimaEscritura, ahora)) {
      escribirUltimaActividad(localStorage, ahora);
      this.ultimaEscritura = ahora;
    }
  }

  private comprobar(): void {
    if (this.vencido) return;
    const ultima = leerUltimaActividad(localStorage);
    if (ultima === null) {
      // Sin marca (otra pestaña la borró, storage limpio): se reinicia desde ahora.
      this.registrarActividad(true);
      return;
    }
    const ahora = Date.now();
    switch (estadoInactividad(ultima, ahora)) {
      case 'vencer':
        this.vencer();
        return;
      case 'avisar':
        if (!this.avisoAbierto) this.abrirAviso();
        this.actualizarCuenta(msHastaVencer(ultima, ahora));
        return;
      case 'seguir':
        // Hubo actividad en otra pestaña (o acá, con el botón): el aviso sobra.
        if (this.avisoAbierto) this.cerrarAviso();
        return;
    }
  }

  private vencer(): void {
    if (this.vencido) return;
    this.vencido = true;
    this.cerrarAviso();
    console.warn('Sesión vencida por inactividad: se cierra la sesión y se vuelve a /login.');
    this.sesionInvalida.cerrarSesionForzada('inactividad');
  }

  private abrirAviso(): void {
    this.avisoAbierto = true;
    Swal.fire({
      icon: 'question',
      title: '¿Sigue ahí?',
      html: 'Por inactividad, su sesión se va a cerrar en <b class="cuenta-inactividad"></b> segundos.',
      confirmButtonText: 'Seguir conectado',
      allowOutsideClick: false,
      allowEscapeKey: false,
      customClass: { popup: CLASE_AVISO },
    }).then(resultado => {
      this.avisoAbierto = false;
      if (resultado.isConfirmed) this.registrarActividad(true);
    });
  }

  private actualizarCuenta(ms: number): void {
    if (!this.esNuestroAviso()) return;
    const cuenta = Swal.getHtmlContainer()?.querySelector('.cuenta-inactividad');
    if (cuenta) cuenta.textContent = String(Math.ceil(ms / 1000));
  }

  /** Cierra el aviso sólo si el Swal visible es el nuestro. */
  private cerrarAviso(): void {
    if (!this.avisoAbierto) return;
    this.avisoAbierto = false;
    if (this.esNuestroAviso()) Swal.close();
  }

  private esNuestroAviso(): boolean {
    return Swal.isVisible() && !!Swal.getPopup()?.classList.contains(CLASE_AVISO);
  }
}
