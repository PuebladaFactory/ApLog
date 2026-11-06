import { Injectable } from '@angular/core';
import { Route, UrlSegment, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree, Data } from '@angular/router';
import { UsuarioSesionService } from '../servicios/usuario-sesion/usuario-sesion.service';
import { RolUsuario } from '../interfaces/usuario';

@Injectable({ providedIn: 'root' })
export class RoleGuard {
  constructor(
    private usuarioSesion: UsuarioSesionService,
    private router: Router
  ) {}

  // Frente lazy-fechas (LZ7): raiz-routing usa canMatch, que se evalúa
  // ANTES de elegir la ruta, así un rol sin acceso no descarga el chunk del
  // módulo. canActivate se mantiene para las rutas internas de los módulos
  // (el chunk ya está cargado). canLoad (deprecado) salió: nadie lo usaba.
  // Eje de sesión, bloque 2: los dos esperan a que la sesión esté
  // reconciliada con Firebase Auth antes de decidir (el router acepta
  // MaybeAsync<GuardResult>). Siguen sin devolver nunca false.
  async canMatch(route: Route, segments: UrlSegment[]): Promise<true | UrlTree> {
    await this.usuarioSesion.sesionResuelta();
    return this.chequearAcceso(route.data);
  }

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<true | UrlTree> {
    await this.usuarioSesion.sesionResuelta();
    return this.chequearAcceso(route.data);
  }

  // Devuelve un UrlTree en vez de navegar y devolver false: con canMatch, un
  // false hace que el router siga probando rutas (terminaría en '**'); el
  // UrlTree es una redirección explícita y corta ahí.
  private chequearAcceso(data: Data | undefined): true | UrlTree {
    const rolesEsperados: RolUsuario[] = data?.['roles'] || [];
    const usuario = this.usuarioSesion.getUsuarioActual();

    if (usuario && rolesEsperados.includes(usuario.role)) {
      return true;
    }

    // Sin sesión → /login (antes /unauthorized). Con sesión y sin acceso a
    // esta ruta → /limbo.
    return usuario === null
      ? this.router.createUrlTree(['/login'])
      : this.router.createUrlTree(['/limbo']);
  }
}
