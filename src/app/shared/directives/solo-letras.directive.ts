import { Directive, HostListener, ElementRef, Renderer2 } from '@angular/core';

@Directive({
    selector: '[appSoloLetras]',
    standalone: false
})
export class SoloLetrasDirective {
  private valorAnterior: string = ''; // Guardar el último valor válido

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let valor = input.value;

    // Permitir solo caracteres alfabéticos y especiales
    valor = valor.replace(/[^a-zA-ZÁÉÍÓÚáéíóúñÑ\s\-'"]/g, '');

    // Actualizar el input con el valor filtrado
    this.renderer.setProperty(input, 'value', valor);

    // Restaurar el placeholder si había un mensaje de error
    this.renderer.setProperty(input, 'placeholder', '');
    this.renderer.removeStyle(this.el.nativeElement, 'border');

    // Guardar el último valor válido
    this.valorAnterior = valor;
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const input = this.el.nativeElement as HTMLInputElement;

    // Permitir teclas especiales y navegación
    if (
      ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Space'].includes(
        event.key
      )
    ) {
      return;
    }

    // Bloquear cualquier entrada numérica
    if (/[0-9]/.test(event.key)) {
      this.mostrarError(input, 'Solo se permiten letras');
      event.preventDefault();
    }
  }

  private mostrarError(input: HTMLInputElement, mensaje: string): void {
    // Mostrar mensaje de error como placeholder
    this.renderer.setProperty(input, 'value', ''); // Borrar el contenido
    this.renderer.setProperty(input, 'placeholder', mensaje); // Mostrar mensaje

    // Resaltar el borde del input en rojo
    this.renderer.setStyle(input, 'border', '2px solid red');
  }
}
