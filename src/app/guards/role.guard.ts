import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanLoad, Route, Router, RouterStateSnapshot, UrlSegment, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../servicios/autentificacion/auth.service';
import { StorageService } from '../servicios/storage/storage.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate, CanLoad {

  constructor(private authService: AuthService, private storageService: StorageService, private router: Router) {}

/* 
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return true;
  }
  canLoad(
    route: Route,
    segments: UrlSegment[]): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return true;
  } */

// Protege las rutas cargadas diferidamente
canLoad(route: Route, segments: UrlSegment[]): boolean {
  return this.checkRoleAccess(route);
}

// Protege rutas después de que el módulo ha sido cargado
canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
  return this.checkRoleAccess(route);
}

// Lógica compartida para verificar acceso según los roles
private checkRoleAccess(route: any): boolean {
  const expectedRoles = route.data?.['roles'] || [];
  const userRoles = this.authService.currentUserRoles(); // Método que retorna los roles del usuario actual
  console.log("userRoles", userRoles);
  
  const hasAccess = expectedRoles.some((role: string) => userRoles[role]);

  if (!hasAccess) {
    let usuario  = this.storageService.loadInfo("usuario");
    if(usuario.hasOwnProperty('roles')){
      this.router.navigate(['/limbo'])
    } else {
    this.router.navigate(['/unauthorized']); // Redirige si no tiene permisos        
    }
    return false;
  }
  return true;
}

}
