import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  Auth,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import Swal from 'sweetalert2';
import { LogRegistroService } from '../log-registro/log-registro.service';
import { UsuarioSesionService } from '../usuario-sesion/usuario-sesion.service';
import { Usuario } from '../../interfaces/usuario';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private firestore: Firestore = inject(Firestore);

  constructor(
    private router: Router,
    private logRegistro: LogRegistroService,
    private usuarioSesion: UsuarioSesionService
  ) {}

  async iniciarSesion(email: string, password: string): Promise<void> {
    try {
      const result = await signInWithEmailAndPassword(this.auth, email, password);
      const resultado = await this.obtenerDatosUsuario(result.user.uid);

      // Sin documento o sin rol: no hay sesión de ninguna de las dos clases.
      // signOut (Auth quedó autenticado con este usuario) + limpiar() (la
      // memoria podía tener la sesión de otro usuario, rehidratada).
      if (resultado === null || resultado === 'sin-rol') {
        await signOut(this.auth);
        this.usuarioSesion.limpiar();
        this.router.navigate(['/limbo']);
        return;
      }

      const usuario = resultado;
      this.usuarioSesion.setUsuario(usuario);

      await this.logRegistro.registrarAccion(
        'LOGIN', 'users', 0, `Usuario ${usuario.email} inició sesión.`
      );

      this.router.navigate(['/carga']);
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

  private async obtenerDatosUsuario(uid: string): Promise<Usuario | 'sin-rol' | null> {
    const docRef = doc(this.firestore, `users/${uid}`);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      console.error('No se encontró el documento de usuario.');
      return null;
    }
    const data = docSnap.data();
    if (!data['role']) {
      return 'sin-rol';
    }
    return data as Usuario;
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
    if (usuario) {
      await this.logRegistro.registrarAccion(
        'LOGOUT', 'users', 0, `Usuario ${usuario.email} cerró sesión.`
      );
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
      await this.logRegistro.registrarError(
        'LOGOUT', 'users', 0, `Error al cerrar sesión: ${error.message}`
      );
    }
    this.router.navigate(['/login']);
  }
}
