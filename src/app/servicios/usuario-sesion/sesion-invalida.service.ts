import { Injectable, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';
import { MonoTypeOperatorFunction, tap } from 'rxjs';
import Swal from 'sweetalert2';
import { UsuarioSesionService } from './usuario-sesion.service';
import { codigoDeError, esErrorDeSesion, hayAlgoQueCerrar } from './sesion-invalida.util';

/* Eje de sesión, bloque 2b: un solo lugar que reacciona a un error de sesión
 * en los listeners del arranque cerrando la sesión y mandando a /login con un
 * aviso. No es manejo de errores: el error sigue propagándose igual que antes.
 *
 * Inyecta sólo Auth, UsuarioSesionService, Router y NgZone. NO inyecta
 * AuthService (arrastraría LogRegistroService y su grafo hasta los servicios
 * por entidad) ni se inyecta en DbFirestoreService (la capa de datos no recibe
 * servicios). */
@Injectable({ providedIn: 'root' })
export class SesionInvalidaService {
  private auth = inject(Auth);
  private usuarioSesion = inject(UsuarioSesionService);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  /** Un `tap` sobre el error y nada más: no lo traga ni lo cambia. */
  vigilar<T>(): MonoTypeOperatorFunction<T> {
    return tap<T>({ error: (e: unknown) => this.reportar(e) });
  }

  private reportar(e: unknown): void {
    try {
      const codigo = codigoDeError(e);
      const sesionUid = this.usuarioSesion.getUsuarioActual()?.uid ?? null;
      const sesionPerdida = this.usuarioSesion.sesionPerdida;

      // Rastro de la decisión de no actuar por no poder clasificar el error,
      // sólo cuando había algo que cerrar (si no, sería ruido). Sin esto, la
      // falla del 2026-11-07 fue invisible.
      if (codigo === null && hayAlgoQueCerrar(sesionUid, sesionPerdida)) {
        console.warn('Sesión inválida: no se pudo clasificar el error de un listener; no se actúa.', e);
        return;
      }

      const actua = esErrorDeSesion(codigo, this.auth.currentUser?.uid ?? null, sesionUid, sesionPerdida);
      if (!actua) return;

      // PRIMERO y sincrónicamente, antes de entrar a la zona y de cualquier
      // await: para el próximo listener que falle ya no hay nada que cerrar,
      // así que los nueve fallando juntos dan un solo aviso y una sola
      // navegación, sin flag. Y el logout deliberado no avisa.
      this.usuarioSesion.limpiar();

      // Sin LOGOUT: no es un gesto, y sin token válido las reglas lo rechazan.
      console.warn(`Sesión inválida (${codigo}): se cierra la sesión y se vuelve a /login.`);

      // Este camino corre fuera de la zona de Angular (Auth la crea AngularFire
      // con runOutsideAngular): sin run(), la navegación puede no refrescar la vista.
      this.ngZone.run(() => this.salir());
    } catch (error) {
      // La red no puede alterar el error original que sigue propagándose.
      console.error('Sesión inválida: error al reportar', error);
    }
  }

  /** navegar → avisar → signOut best-effort. Lo que el usuario ve no depende
   *  de una llamada que puede no resolver. */
  private salir(): void {
    this.router.navigate(['/login']).catch(error =>
      console.error('Sesión inválida: error al navegar a /login', error));
    Swal.fire({ icon: 'warning', text: 'Su sesión se cerró o venció. Vuelva a iniciar sesión.' });
    // Si Auth ya está en null es inocuo.
    signOut(this.auth).catch(error =>
      console.error('Sesión inválida: error en signOut', error));
  }
}
