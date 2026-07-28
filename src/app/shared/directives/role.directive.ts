import { Directive, Input, ViewContainerRef, TemplateRef } from '@angular/core';
import { UsuarioSesionService } from '../../servicios/usuario-sesion/usuario-sesion.service';
import { RolUsuario } from '../../interfaces/usuario';

@Directive({ selector: '[appRole]', standalone: false })
export class RoleDirective {
  constructor(
    private usuarioSesion: UsuarioSesionService,
    private viewContainer: ViewContainerRef,
    private templateRef: TemplateRef<any>
  ) {}

  @Input() set appRole(rolesPermitidos: RolUsuario[]) {
    if (this.usuarioSesion.esRol(...rolesPermitidos)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
