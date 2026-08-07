import { Component, HostBinding, Input } from '@angular/core';
import { ModuloPermiso, AccionPermiso } from 'src/app/interfaces/permiso';
import { PermisosService } from 'src/app/servicios/permisos/permisos.service';

@Component({
    selector: 'app-accion-generica',
    template: `
@if (visible) {
  <button [class]="claseCompleta" [disabled]="disabled">
    <ng-content select="[icono]"></ng-content>
    {{label}}
  </button>
}
`,
    standalone: false
})
export class AccionGenericaComponent {

  @Input() label!: string;
  @Input() variante: string = 'primary';
  @Input() tamano?: 'sm' | 'lg';
  @Input() disabled = false;
  @Input() modulo?: ModuloPermiso;
  @Input() accion?: AccionPermiso;

  constructor(private permisosService: PermisosService) { }

  get visible(): boolean {
    return !this.modulo || this.permisosService.puede(this.modulo, this.accion);
  }

  // Ver nota equivalente en BtnAgregarComponent: el (click) vive en el
  // host, no en el <button> interno, así que [disabled] por sí solo no
  // basta para bloquear clics en el margen del botón.
  @HostBinding('style.pointer-events') get pointerEvents(): string | null {
    return this.disabled ? 'none' : null;
  }

  get claseCompleta(): string {
    const tamano = this.tamano ? ` btn-${this.tamano}` : '';
    return `btn btn-${this.variante}${tamano}`;
  }

}
