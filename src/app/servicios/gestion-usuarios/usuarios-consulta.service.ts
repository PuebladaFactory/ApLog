import { Injectable } from '@angular/core';
import { Usuario } from 'src/app/interfaces/usuario';
import { PermisosService } from 'src/app/servicios/permisos/permisos.service';
import { GestionUsuariosService } from './gestion-usuarios.service';

/**
 * Resolución uid/email → nombre de usuario para las pantallas de auditoría
 * (Registro, Registro Log, Papelera). Estado en memoria, sin localStorage y
 * sin caché entre pantallas: cada pantalla llama a `cargar()` en su ngOnInit.
 *
 * Sólo `dev`/`admin` resuelven nombre (las reglas de `/users` no dejan leer la
 * colección a nadie más). Para el resto, y ante cualquier fallo de lectura,
 * `nombreDe` devuelve el email.
 *
 * La lectura es `GestionUsuariosService.obtenerUsuarios`, que NO filtra por
 * rol: así se resuelven también las entradas escritas por un `dev`.
 */
@Injectable({
  providedIn: 'root',
})
export class UsuariosConsultaService {
  private usuarios: Usuario[] = [];
  private enCurso: Promise<void> | null = null;

  constructor(
    private gestionUsuarios: GestionUsuariosService,
    private permisosService: PermisosService,
  ) {}

  /**
   * Relee `/users` y reemplaza el estado en memoria. Nunca lanza: si no
   * corresponde leer o la lectura falla, queda sin resolución (todo cae a
   * email). Llamadas superpuestas comparten la misma lectura.
   */
  cargar(): Promise<void> {
    if (!this.enCurso) {
      this.enCurso = this.leer().finally(() => {
        this.enCurso = null;
      });
    }
    return this.enCurso;
  }

  /**
   * Nombre a mostrar para una entrada de log/papelera. Busca por `userId`
   * (uid) primero y por `userEmail` después. Sin resolución, o con un usuario
   * sin nombre, devuelve el email de la entrada ('' si tampoco hay).
   */
  nombreDe(userId: string | undefined, userEmail: string | undefined): string {
    const usuario =
      (userId ? this.usuarios.find((u) => u.uid === userId) : undefined) ??
      (userEmail ? this.usuarios.find((u) => u.email === userEmail) : undefined);

    const nombre = (usuario?.name ?? '').trim();
    if (nombre !== '') return nombre;
    return userEmail || usuario?.email || '';
  }

  private async leer(): Promise<void> {
    this.usuarios = [];
    // La regla de lectura de /users (soloCliente.usuarios.leer), no la lista de
    // acceso a Ajustes: que hoy coincidan en dev/admin no las hace la misma.
    if (!this.permisosService.puede('usuarios', 'ver')) return;
    try {
      this.usuarios = await this.gestionUsuarios.obtenerUsuarios();
    } catch (e) {
      this.usuarios = [];
      console.error('UsuariosConsultaService: no se pudo leer /users; se muestran emails.', e);
    }
  }
}
