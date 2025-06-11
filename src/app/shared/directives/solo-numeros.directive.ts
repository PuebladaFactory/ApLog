import { Directive, HostListener, ElementRef, Renderer2, OnInit } from '@angular/core';

@Directive({
    selector: '[appSoloNumeros]',
    standalone: false
})
export class SoloNumerosDirective implements OnInit {
  private valorAnterior: string = '';

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit(): void {
    //console.log('appSoloNumeros - ngOnInit');
  }

  ngOnDestroy(): void {
    //console.log('appSoloNumeros - ngOnDestroy');
  }

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;

    // Guardar el valor original del input
    const valorOriginal = input.value;

    // Eliminar caracteres no numéricos
    const valorNumerico = valorOriginal.replace(/[^0-9]/g, '');

    if (valorOriginal !== valorNumerico) {
      // Guardar el valor anterior válido
      this.valorAnterior = valorNumerico;

      // Establecer un borde rojo para indicar el error
      this.renderer.setStyle(this.el.nativeElement, 'border', '2px solid red');

      // Mostrar el mensaje de error como placeholder temporal
      this.renderer.setProperty(this.el.nativeElement, 'value', '');
      this.renderer.setProperty(this.el.nativeElement, 'placeholder', 'Solo se permiten números');
    } else {
      // Restaurar el valor válido y quitar el borde rojo
      this.renderer.removeStyle(this.el.nativeElement, 'border');
      this.renderer.setProperty(this.el.nativeElement, 'placeholder', '');

      // Actualizar el valor del input
      this.valorAnterior = valorNumerico;
      this.renderer.setProperty(this.el.nativeElement, 'value', valorNumerico);
    }
  }

  @HostListener('blur')
  onBlur(): void {
    // Restaurar el valor anterior válido al perder el foco
    this.renderer.setProperty(this.el.nativeElement, 'value', this.valorAnterior);
    this.renderer.removeStyle(this.el.nativeElement, 'border');
    this.renderer.setProperty(this.el.nativeElement, 'placeholder', '');
  }
}
