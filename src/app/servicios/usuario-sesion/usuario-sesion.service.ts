import { Injectable, inject } from '@angular/core';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { Usuario, RolUsuario } from '../../interfaces/usuario';
import {
  CoordinadorReconciliacion,
  LecturaUsuario,
  ResultadoReconciliacion,
  TIMEOUT_RECONCILIACION_MS,
  TrabajoReconciliacion,
  clasificarDocumento,
  decidirAuthDesconocido,
  decidirReconciliacion,
  esSesionRehidratable,
} from './reconciliacion-sesion.util';

const STORAGE_KEY = 'usuarioSesion';

/* Eje de sesión, bloque 2: la sesión de la app sigue a Firebase Auth.
 * - La rehidratación síncrona del constructor se conserva (getters síncronos
 *   intactos), con una validación mínima.
 * - onAuthStateChanged, vivo durante toda la app, dispara la reconciliación:
 *   relee /users/{uid} y establece o limpia la sesión según la tabla de
 *   reconciliacion-sesion.util.ts. Es el ÚNICO escritor de la sesión en el
 *   camino de Auth, y nunca llama a signOut.
 * - RoleGuard espera `sesionResuelta()`; AuthService.iniciarSesion espera
 *   `resultadoPara(uid, marca)`. */
@Injectable({
  providedIn: 'root'
})
export class UsuarioSesionService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  private usuarioActual: Usuario | null = null;
  private _sesionPerdida = false;
  private coordinador = new CoordinadorReconciliacion(
    () => this.reconciliarAhora(),
    () => this.reconciliarAuthDesconocido(),
  );

  constructor() {
    this.rehidratarDesdeStorage();
    onAuthStateChanged(this.auth, user => this.coordinador.alCambiarAuth(user?.uid ?? null));
  }

  private rehidratarDesdeStorage(): void {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const leido: unknown = JSON.parse(raw);
        this.usuarioActual = esSesionRehidratable(leido) ? leido : null;
      } catch {
        this.usuarioActual = null;
      }
    }
  }

  setUsuario(usuario: Usuario): void {
    this.usuarioActual = usuario;
    this._sesionPerdida = false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usuario));
  }

  getUsuarioActual(): Usuario | null {
    return this.usuarioActual;
  }

  getRol(): RolUsuario | null {
    return this.usuarioActual?.role ?? null;
  }

  esRol(...roles: RolUsuario[]): boolean {
    return this.usuarioActual !== null && roles.includes(this.usuarioActual.role);
  }

  /** Limpieza deliberada (un gesto: logout, login fallido). */
  limpiar(): void {
    this.usuarioActual = null;
    this._sesionPerdida = false;
    localStorage.removeItem(STORAGE_KEY);
  }

  /** true cuando la reconciliación limpió una sesión que estaba puesta sin que
   *  nadie llamara antes a limpiar(). Para la red de sesión inválida (bloque 2b). */
  get sesionPerdida(): boolean {
    return this._sesionPerdida;
  }

  /** Resuelve cuando la sesión quedó reconciliada con Firebase Auth. */
  sesionResuelta(): Promise<void> {
    return this.coordinador.resuelta();
  }

  /** Se toma antes de signInWithEmailAndPassword. */
  marcaReconciliacion(): number {
    return this.coordinador.marca();
  }

  /** Resultado de la reconciliación del uid recién autenticado. Siempre
   *  termina: el resguardo vencido devuelve 'fallo'. */
  resultadoPara(uid: string, marca: number): Promise<ResultadoReconciliacion> {
    return this.coordinador.resultadoPara(uid, marca);
  }

  /** Un trabajo de reconciliación sobre el estado de Auth de este momento. */
  private reconciliarAhora(): TrabajoReconciliacion {
    const uid = this.auth.currentUser?.uid ?? null;
    const resultado = (async (): Promise<ResultadoReconciliacion> => {
      const lectura = uid === null ? null : await this.leerUsuario(uid);
      return this.aplicar(decidirReconciliacion(uid, this.usuarioActual, lectura));
    })();
    return { uid, resultado };
  }

  /** El primer evento de Auth no llegó a tiempo: decide con Auth desconocido
   *  (conserva la sesión rehidratada válida, o 'fallo'). */
  private async reconciliarAuthDesconocido(): Promise<ResultadoReconciliacion> {
    return this.aplicar(decidirAuthDesconocido(this.usuarioActual));
  }

  /** Aplica una decisión: setUsuario o limpieza, nunca ninguna de las dos. */
  private aplicar(decision: { resultado: ResultadoReconciliacion; usuario: Usuario | null }): ResultadoReconciliacion {
    if (decision.usuario !== null) {
      this.setUsuario(decision.usuario);
    } else {
      this.perderSesion();
    }
    return decision.resultado;
  }

  /** Limpieza de la reconciliación: marca sesionPerdida si había sesión. */
  private perderSesion(): void {
    const habia = this.usuarioActual !== null;
    this.limpiar();
    this._sesionPerdida = habia;
  }

  /** Lectura de /users/{uid} (ex AuthService.obtenerDatosUsuario), con timeout. */
  private async leerUsuario(uid: string): Promise<LecturaUsuario> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const vencida = new Promise<LecturaUsuario>(resolve => {
      timer = setTimeout(() => resolve({ tipo: 'error', codigo: 'timeout' }), TIMEOUT_RECONCILIACION_MS);
    });
    const lectura = getDoc(doc(this.firestore, `users/${uid}`))
      .then(snap => {
        const resultado = clasificarDocumento(snap.exists(), snap.data());
        if (resultado.tipo === 'sin-documento') console.error('No se encontró el documento de usuario.');
        return resultado;
      })
      .catch((e: unknown): LecturaUsuario => {
        const codigo = (e as { code?: unknown })?.code;
        return { tipo: 'error', codigo: typeof codigo === 'string' ? codigo : 'desconocido' };
      });
    try {
      return await Promise.race([lectura, vencida]);
    } finally {
      clearTimeout(timer);
    }
  }
}
