import { Injectable } from '@angular/core';
import { Usuario, RolUsuario } from '../../interfaces/usuario';

const STORAGE_KEY = 'usuarioSesion';

@Injectable({
  providedIn: 'root'
})
export class UsuarioSesionService {
  private usuarioActual: Usuario | null = null;

  constructor() {
    this.rehidratarDesdeStorage();
  }

  private rehidratarDesdeStorage(): void {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        this.usuarioActual = JSON.parse(raw) as Usuario;
      } catch {
        this.usuarioActual = null;
      }
    }
  }

  setUsuario(usuario: Usuario): void {
    this.usuarioActual = usuario;
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

  limpiar(): void {
    this.usuarioActual = null;
    localStorage.removeItem(STORAGE_KEY);
  }
}
