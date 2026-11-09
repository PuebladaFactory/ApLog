import { Injectable, inject } from '@angular/core';
import { Auth, signOut } from '@angular/fire/auth';
import { MonoTypeOperatorFunction, tap } from 'rxjs';
import { UsuarioSesionService } from './usuario-sesion.service';
import {
  ESPERA_MAXIMA_CIERRE_MS,
  cargarLoginDeCero,
  codigoDeError,
  dejarMarcaAvisoSesion,
  esErrorDeSesion,
  esperarConLimite,
  hayAlgoQueCerrar,
} from './sesion-invalida.util';

/* Eje de sesión, bloque 2b: un solo lugar que reacciona a un error de sesión
 * en los listeners del arranque cerrando la sesión y mandando a /login con un
 * aviso. No es manejo de errores: el error sigue propagándose igual que antes.
 *
 * La salida es una carga completa de /login (bloque 2c, cuarta pieza): el aviso
 * cruza la recarga por sessionStorage y lo muestra LoginComponent.
 *
 * Inyecta sólo Auth y UsuarioSesionService. NO inyecta
 * AuthService (arrastraría LogRegistroService y su grafo hasta los servicios
 * por entidad) ni se inyecta en DbFirestoreService (la capa de datos no recibe
 * servicios). */
@Injectable({ providedIn: 'root' })
export class SesionInvalidaService {
  private auth = inject(Auth);
  private usuarioSesion = inject(UsuarioSesionService);

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

      // El aviso viaja a /login por sessionStorage (por pestaña).
      dejarMarcaAvisoSesion(sessionStorage);
      void this.salir();
    } catch (error) {
      // La red no puede alterar el error original que sigue propagándose.
      console.error('Sesión inválida: error al reportar', error);
    }
  }

  /** signOut con espera acotada → carga completa de /login. El signOut se
   *  espera porque, si la página se fuera con Auth todavía persistido, la
   *  reconciliación del arranque reconstruiría la sesión; acotado, para que
   *  una llamada que no resuelve no deje al usuario adentro. Si Auth ya está
   *  en null es inocuo. Una carga no necesita la zona de Angular. */
  private async salir(): Promise<void> {
    const cierre = signOut(this.auth).catch(error =>
      console.error('Sesión inválida: error en signOut', error));
    if (await esperarConLimite(cierre, ESPERA_MAXIMA_CIERRE_MS) === 'vencido') {
      console.warn('Sesión inválida: signOut no terminó a tiempo; se recarga igual.');
    }
    cargarLoginDeCero();
  }
}
