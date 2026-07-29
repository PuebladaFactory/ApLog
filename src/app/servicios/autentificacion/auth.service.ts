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
import { LogService } from '../log/log.service';
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
    private logService: LogService,
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

      if (usuario.role !== 'dev') {
        await this.logService.logEvent(
          'LOGIN',
          'users',
          `Usuario ${usuario.email} inició sesión.`,
          0,
          true
        );
      }

      this.router.navigate(['/carga']);
    } catch (error: any) {
      console.error(error.message);
      await this.logService.logEvent(
        'LOGIN',
        'users',
        `Error al iniciar sesión: ${error.message}`,
        0,
        false
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
      await signOut(this.auth);
      if (usuario && usuario.role !== 'dev') {
        await this.logService.logEvent(
          'LOGOUT',
          'users',
          `Usuario ${usuario.email} cerró sesión.`,
          0,
          true
        );
      }
      this.storage.clearAllLocalStorage();
      this.usuarioSesion.limpiar();
      this.router.navigate(['/login']);
    } catch (error: any) {
      console.error('Error al cerrar sesión:', error);
      await this.logService.logEvent(
        'LOGOUT',
        'users',
        `Error al cerrar sesión: ${error.message}`,
        0,
        false
      );
    }
  }
}
