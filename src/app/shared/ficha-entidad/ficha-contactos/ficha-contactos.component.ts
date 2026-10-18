import { Component, Input } from '@angular/core';
import { Contacto } from 'src/app/interfaces/proveedor';

/** Pestaña "Contactos" de la ficha (proveedor; cliente en FI3). Solo presentación. */
@Component({
  selector: 'app-ficha-contactos',
  standalone: false,
  templateUrl: './ficha-contactos.component.html',
})
export class FichaContactosComponent {

  @Input() contactos: Contacto[] = [];

  texto(v: string | number | null | undefined): string {
    const t = String(v ?? '').trim();
    return t || '—';
  }

  nombre(c: Contacto): string {
    return [c.apellido, c.nombre].map(p => String(p ?? '').trim()).filter(p => p !== '').join(' ') || '—';
  }
}
