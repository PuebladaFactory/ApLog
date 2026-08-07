import { Directive, Input, ViewContainerRef, TemplateRef } from '@angular/core';
import { PermisosService } from '../../servicios/permisos/permisos.service';
import { ModuloPermiso, AccionPermiso } from '../../interfaces/permiso';

@Directive({ selector: '[appPermiso]', standalone: false })
export class PermisoDirective {
  constructor(
    private permisosService: PermisosService,
    private viewContainer: ViewContainerRef,
    private templateRef: TemplateRef<any>
  ) {}

  // Sintaxis 'modulo' o 'modulo.accion' (ej. 'operaciones' o 'operaciones.eliminar').
  @Input() set appPermiso(valor: string) {
    const [modulo, accion] = valor.split('.') as [ModuloPermiso, AccionPermiso?];
    if (this.permisosService.puede(modulo, accion)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
