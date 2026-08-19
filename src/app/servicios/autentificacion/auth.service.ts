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
import { StorageService } from '../storage/storage.service';
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
    private storage: StorageService,
    private logRegistro: LogRegistroService,
    private usuarioSesion: UsuarioSesionService
  ) {}

  async iniciarSesion(email: string, password: string): Promise<void> {
    try {
      const result = await signInWithEmailAndPassword(this.auth, email, password);
      const resultado = await this.obtenerDatosUsuario(result.user.uid);

      if (resultado === null) {
        this.router.navigate(['/unauthorized']);
        return;
      }

      if (resultado === 'sin-rol') {
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
    try {
      // El log se escribe ANTES de signOut(): las reglas de Firestore exigen
      // autenticado() para escribir en registroLog, y una vez cerrada la sesión
      // el token ya no sirve para eso.
      if (usuario) {
        await this.logRegistro.registrarAccion(
          'LOGOUT', 'users', 0, `Usuario ${usuario.email} cerró sesión.`
        );
      }
      await signOut(this.auth);
      this.storage.clearAllLocalStorage();
      this.usuarioSesion.limpiar();
      this.router.navigate(['/login']);
    } catch (error: any) {
      console.error('Error al cerrar sesión:', error);
      await this.logRegistro.registrarError(
        'LOGOUT', 'users', 0, `Error al cerrar sesión: ${error.message}`
      );
    }
  }
}
