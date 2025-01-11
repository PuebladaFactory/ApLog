import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthService } from 'src/app/servicios/autentificacion/auth.service';


@Directive({
  selector: '[appRole]',
})
export class RoleDirective {
  private currentRoles: any;

  constructor(
    private authService: AuthService,
    private viewContainer: ViewContainerRef,
    private templateRef: TemplateRef<any>
  ) {
    this.currentRoles = this.authService.currentUserRoles();
  }

  @Input() set appRole(allowedRoles: string[]) {
    if (allowedRoles.some(role => this.currentRoles[role])) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
