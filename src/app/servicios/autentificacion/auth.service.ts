import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  Auth,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from '@angular/fire/auth';
import Swal from 'sweetalert2';
import { LogRegistroService } from '../log-registro/log-registro.service';
import { UsuarioSesionService } from '../usuario-sesion/usuario-sesion.service';
import { ESPERA_MAXIMA_CIERRE_MS, cargarLoginDeCero, esperarConLimite } from '../usuario-sesion/sesion-invalida.util';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);

  constructor(
    private router: Router,
    private logRegistro: LogRegistroService,
    private usuarioSesion: UsuarioSesionService
  ) {}

  async iniciarSesion(email: string, password: string): Promise<void> {
    try {
      // Eje de sesión, bloque 2: la reconciliación (UsuarioSesionService) es
      // el único escritor de la sesión. Acá se autentica, se espera su
      // resultado para este uid y se decide el gesto: navegación y log LOGIN.
      // La marca va ANTES del signIn: el evento de Auth puede llegar antes de
      // que signIn resuelva, después, o no llegar (mismo uid, C3).
      const marca = this.usuarioSesion.marcaReconciliacion();
      const result = await signInWithEmailAndPassword(this.auth, email, password);
      const resultado = await this.usuarioSesion.resultadoPara(result.user.uid, marca);

      if (resultado === 'establecida') {
        const usuario = this.usuarioSesion.getUsuarioActual();
        await this.logRegistro.registrarAccion(
          'LOGIN', 'users', 0, `Usuario ${usuario?.email} inició sesión.`
        );
        this.router.navigate(['/carga']);
        return;
      }

      // Sin documento o sin rol: no hay sesión de ninguna de las dos clases.
      if (resultado === 'sin-documento' || resultado === 'sin-rol') {
        await signOut(this.auth);
        this.usuarioSesion.limpiar();
        this.router.navigate(['/limbo']);
        return;
      }

      // 'conservada' es una falla en el login: el gesto exige un rol
      // verificado, no uno rehidratado. 'fallo' incluye el timeout.
      if (resultado === 'conservada' || resultado === 'fallo') {
        await signOut(this.auth);
        this.usuarioSesion.limpiar();
        Swal.fire('Error', 'No se pudo verificar su usuario. Vuelva a intentar.', 'error');
        return;
      }

      // 'sin-auth': Auth ya no es el uid que se autenticó (otra pestaña cerró
      // la sesión o entró con otra cuenta en el medio).
      this.usuarioSesion.limpiar();
      Swal.fire('Error', 'La sesión cambió mientras se iniciaba. Vuelva a intentar.', 'error');
    } catch (error: any) {
      console.error(error.message);
      // limpiar() ANTES del registrarError: la entrada queda firmada como
      // 'Desconocido'. Un intento fallido no se puede atribuir a la sesión
      // que hubiera en memoria (pueden ser otras credenciales).
      this.usuarioSesion.limpiar();
      await this.logRegistro.registrarError(
        'LOGIN', 'users', 0, `Error al iniciar sesión: ${error.message}`
      );
      Swal.fire('Error', error.message, 'error');
    }
  }

  resetearPassword(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email)
      .then(() => { Swal.fire('Listo', 'Revisá tu casilla de correo.', 'success'); })
      .catch((error) => { Swal.fire('Error', error.message, 'error'); });
  }

  async cerrarSesion(): Promise<void> {
    const usuario = this.usuarioSesion.getUsuarioActual();
    // El log se escribe ANTES de signOut(): las reglas de Firestore exigen
    // autenticado() para escribir en registroLog, y una vez cerrada la sesión
    // el token ya no sirve para eso. registrarAccion es best-effort: no lanza.
    // Su setDoc resuelve cuando el servidor confirma: la escritura tiene que
    // estar hecha antes de la recarga del final, o el LOGOUT se pierde. La
    // espera es acotada: sin conexión setDoc no resuelve nunca y el logout
    // quedaba colgado.
    if (usuario) {
      const escritura = await esperarConLimite(
        this.logRegistro.registrarAccion('LOGOUT', 'users', 0, `Usuario ${usuario.email} cerró sesión.`),
        ESPERA_MAXIMA_CIERRE_MS,
      );
      if (escritura === 'vencido') console.warn('Cierre de sesión: el LOGOUT no se confirmó a tiempo; puede no quedar registrado.');
    }
    // limpiar() ANTES de signOut(), no en un finally: así, cuando Auth avise
    // null, la app ya no tiene sesión que perder y un logout deliberado se
    // distingue de una sesión perdida (eje de sesión, bloque 2b).
    this.usuarioSesion.limpiar();
    try {
      await signOut(this.auth);
    } catch (error: any) {
      // Queda Auth autenticado y la app sin sesión: la dirección segura.
      // La entrada sale firmada como 'Desconocido' (la sesión ya está limpia).
      console.error('Error al cerrar sesión:', error);
      await esperarConLimite(
        this.logRegistro.registrarError('LOGOUT', 'users', 0, `Error al cerrar sesión: ${error.message}`),
        ESPERA_MAXIMA_CIERRE_MS,
      );
    }
    // Eje de sesión, bloque 2c (cuarta pieza): carga completa de /login, al
    // final y siempre, también si signOut lanzó. Deja en cero todo lo que hay
    // en memoria —servicios, caché del SDK de Firestore— para que el próximo
    // usuario de esta pestaña no vea nada del anterior. Después no corre nada.
    cargarLoginDeCero();
  }
}
