import { Directive, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appCuitFormat]'
})
export class CuitFormatDirective {
constructor(private ngControl: NgControl) {}

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;

    // Remover caracteres no numéricos
    let value = inputElement.value.replace(/[^0-9]/g, '');

    // Formatear el CUIT
    if (value.length > 2) {
      value = `${value.slice(0, 2)}-${value.slice(2)}`;
    }
    if (value.length > 11) {
      value = `${value.slice(0, 11)}-${value.slice(11)}`;
    }

    // Actualizar el valor del control
    this.ngControl.control?.setValue(value, { emitEvent: false });
  }
}
