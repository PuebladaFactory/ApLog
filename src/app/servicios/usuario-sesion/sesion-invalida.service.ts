import { Injectable, inject } from '@angular/core';
import { Auth, signOut } from '@angular/fire/auth';
import { MonoTypeOperatorFunction, tap } from 'rxjs';
import { UsuarioSesionService } from './usuario-sesion.service';
import { LogRegistroService } from '../log-registro/log-registro.service';
import {
  ESPERA_MAXIMA_CIERRE_MS,
  cargarLoginDeCero,
  cierreEscribeLogout,
  codigoDeError,
  dejarMarcaAvisoSesion,
  esErrorDeSesion,
  esperarConLimite,
  hayAlgoQueCerrar,
  MotivoCierreSesion,
} from './sesion-invalida.util';

/* Eje de sesión, bloque 2b: un solo lugar que reacciona a un error de sesión
 * en los listeners del arranque cerrando la sesión y mandando a /login con un
 * aviso. No es manejo de errores: el error sigue propagándose igual que antes.
 *
 * La salida es una carga completa de /login (bloque 2c, cuarta pieza): el aviso
 * cruza la recarga por sessionStorage y lo muestra LoginComponent.
 *
 * Inyecta Auth, UsuarioSesionService y LogRegistroService (bloque 4: el
 * cierre por inactividad escribe LOGOUT; los servicios por entidad que lo
 * consumen ya inyectan LogRegistroService, así que no suma grafo ni ciclo).
 * NO inyecta AuthService ni se inyecta en DbFirestoreService (la capa de
 * datos no recibe servicios). */
@Injectable({ providedIn: 'root' })
export class SesionInvalidaService {
  private auth = inject(Auth);
  private usuarioSesion = inject(UsuarioSesionService);
  private logRegistro = inject(LogRegistroService);

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

      // Sin LOGOUT: no es un gesto, y sin token válido las reglas lo rechazan.
      console.warn(`Sesión inválida (${codigo}): se cierra la sesión y se vuelve a /login.`);
      this.cerrarSesionForzada('vencida');
    } catch (error) {
      // La red no puede alterar el error original que sigue propagándose.
      console.error('Sesión inválida: error al reportar', error);
    }
  }

  /** La salida de una sesión que se cierra sin que el usuario lo pida: la
   *  usan la red de sesión inválida (2b, motivo 'vencida') y el vencimiento
   *  por inactividad (bloque 4, motivo 'inactividad'). Cierra Firebase Auth,
   *  no sólo la app: si no, un F5 reconstruiría la sesión desde Auth.
   *  Un solo camino; lo que cambia según el motivo (`cierreEscribeLogout`):
   *  - 'vencida': `limpiar()` PRIMERO y sincrónicamente, antes de cualquier
   *    await. Para el próximo listener que falle ya no hay nada que cerrar
   *    (un solo aviso y una sola navegación, sin flag), y el logout
   *    deliberado no avisa. Sin LOGOUT: no hay token con el que escribirlo.
   *  - 'inactividad': LOGOUT con espera acotada, ANTES de `limpiar()` (lo
   *    firma con la sesión, como `AuthService.cerrarSesion`) y antes del
   *    signOut (es una escritura en vuelo y después viene una carga de
   *    página). Actuar una sola vez lo garantiza quien llama.
   *  Después, igual para los dos: la marca con el motivo en sessionStorage
   *  (/login elige el texto), signOut acotado y carga completa de /login. */
  cerrarSesionForzada(motivo: MotivoCierreSesion): void {
    if (!cierreEscribeLogout(motivo)) this.usuarioSesion.limpiar();
    dejarMarcaAvisoSesion(sessionStorage, motivo);
    void this.salir(motivo);
  }

  /** signOut con espera acotada → carga completa de /login. El signOut se
   *  espera porque, si la página se fuera con Auth todavía persistido, la
   *  reconciliación del arranque reconstruiría la sesión; acotado, para que
   *  una llamada que no resuelve no deje al usuario adentro. Si Auth ya está
   *  en null es inocuo. Una carga no necesita la zona de Angular. */
  private async salir(motivo: MotivoCierreSesion): Promise<void> {
    if (cierreEscribeLogout(motivo)) {
      const usuario = this.usuarioSesion.getUsuarioActual();
      if (usuario) {
        const escritura = await esperarConLimite(
          this.logRegistro.registrarAccion(
            'LOGOUT', 'users', 0, `Usuario ${usuario.email} cerró sesión por inactividad.`,
          ),
          ESPERA_MAXIMA_CIERRE_MS,
        );
        if (escritura === 'vencido') {
          console.warn('Cierre por inactividad: el LOGOUT no se confirmó a tiempo; puede no quedar registrado.');
        }
      }
      this.usuarioSesion.limpiar();
    }
    const cierre = signOut(this.auth).catch(error =>
      console.error('Sesión inválida: error en signOut', error));
    if (await esperarConLimite(cierre, ESPERA_MAXIMA_CIERRE_MS) === 'vencido') {
      console.warn('Sesión inválida: signOut no terminó a tiempo; se recarga igual.');
    }
    cargarLoginDeCero();
  }
}
