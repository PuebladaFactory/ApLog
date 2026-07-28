import { Injectable } from '@angular/core';
import { Route, UrlSegment, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { UsuarioSesionService } from '../servicios/usuario-sesion/usuario-sesion.service';
import { RolUsuario } from '../interfaces/usuario';

@Injectable({ providedIn: 'root' })
export class RoleGuard {
  constructor(
    private usuarioSesion: UsuarioSesionService,
    private router: Router
  ) {}

  canLoad(route: Route, segments: UrlSegment[]): boolean {
    return this.chequearAcceso(route);
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return this.chequearAcceso(route);
  }

  private chequearAcceso(route: any): boolean {
    const rolesEsperados: RolUsuario[] = route.data?.['roles'] || [];
    const usuario = this.usuarioSesion.getUsuarioActual();

    if (usuario && rolesEsperados.includes(usuario.role)) {
      return true;
    }

    if (usuario === null) {
      this.router.navigate(['/unauthorized']);
    } else {
      this.router.navigate(['/limbo']);
    }
    return false;
  }
}
