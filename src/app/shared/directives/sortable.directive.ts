import {
  Directive,
  Input,
  Output,
  EventEmitter,
  HostListener,
  HostBinding
} from '@angular/core';

export interface SortEvent {
  campo: string;
  direccion: 'asc' | 'desc';
}

@Directive({
  standalone: false,
  selector: '[appSortable]'
})
export class SortableDirective {

  @Input('appSortable') campo!: string;
  @Input() activo: string = '';
  @Input() direccion: 'asc' | 'desc' = 'asc';

  @Output() sortChange = new EventEmitter<SortEvent>();

  @HostBinding('class.sortable') sortable = true;
  @HostBinding('class.active') get isActive() {
    return this.activo === this.campo;
  }

  @HostListener('click')
  onClick() {

    let nuevaDireccion: 'asc' | 'desc' = 'asc';

    if (this.activo === this.campo) {
      nuevaDireccion = this.direccion === 'asc' ? 'desc' : 'asc';
    }

    this.sortChange.emit({
      campo: this.campo,
      direccion: nuevaDireccion
    });
  }
}