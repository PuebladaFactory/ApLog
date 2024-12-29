import { Directive, HostListener, ElementRef, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appFormatoNumerico]',
})
export class FormatoNumericoDirective {
  private puntoIngresadoPorUsuario = false; // Indicador para el punto del usuario
  private mensajeError: string | null = null; // Mensaje de error actual

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  /**
   * Detectar si el usuario ingresó un punto (`.`) y transformarlo en una coma.
   */
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const input = this.el.nativeElement as HTMLInputElement;

    // Permitir teclas especiales: navegación, borrar, tab
    if (
      [
        'ArrowLeft',
        'ArrowRight',
        'Backspace',
        'Delete',
        'Tab',
        'Enter'
      ].includes(event.key)
    ) {
      return; // No bloquear estas teclas
    }

    if (event.key === '.') {
      if (this.puntoIngresadoPorUsuario) {
        event.preventDefault(); // Prevenir más de un punto/coma
      } else {
        this.puntoIngresadoPorUsuario = true; // Marcar que el punto fue ingresado por el usuario
        const valor = input.value;

        // Reemplazar el último carácter (punto) por una coma
        this.renderer.setProperty(input, 'value', valor + ',');
        event.preventDefault(); // Prevenir la entrada del punto real
      }
    } else if (!/[\d,]/.test(event.key)) {
      // Bloquear caracteres no permitidos
      this.mostrarError(input, 'Solo se permiten números, punto y coma');
      event.preventDefault();
    }
  }

  /**
   * Manejo del evento `input`: Formatear el valor con separación de miles y manejar decimales.
   */
  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let valor = input.value;
    console.log('1) valor inicial: ', valor);
    console.log('2) puntoIngresadoPorUsuario: ', this.puntoIngresadoPorUsuario);

    // Verificar si el valor contiene una coma (separador decimal)
    if (valor.includes(',')) {
      const partes = valor.split(',');

      // Dividir en parte entera y decimal
      let parteEntera = partes[0];

      const parteDecimal = partes[1]?.substring(0, 2) || ''; // Limitar a 2 decimales

      // Formatear la parte entera con separación de miles
      parteEntera = this.formatearMiles(parteEntera);

      // Reconstruir el valor con coma como separador decimal
      valor = `${parteEntera},${parteDecimal}`;
    } else {
      this.puntoIngresadoPorUsuario = false;
      // No hay coma, formatear como miles
      valor = valor.replace(/\./g, ''); // Eliminar puntos anteriores
      valor = this.formatearMiles(valor);
    }

    // Actualizar el input con el valor formateado
    this.renderer.setProperty(input, 'value', valor);

    // Restaurar el estilo y placeholder si no hay error
    this.eliminarError(input);
  }

  /**
   * Manejo del evento `blur`: Completar con `,00` si no hay decimales.
   */
  @HostListener('blur', ['$event'])
  onBlur(event: Event): void {
    const input = event.target as HTMLInputElement;
    let valor = input.value;

    // Completar con `,00` si no hay decimales
    if (!valor.includes(',')) {
      valor += ',00';
    } else {
      const partes = valor.split(',');
      if (partes[1]?.length === 0) {
        valor += '00';
      } else if (partes[1]?.length === 1) {
        valor += '0';
      }
    }

    console.log('Final valor al perder foco: ', valor);

    // Actualizar el input con el valor formateado
    this.renderer.setProperty(input, 'value', valor);
  }

  /**
   * Formatea un número con separación de miles usando puntos (`.`).
   * @param valor El valor a formatear.
   * @returns El valor formateado.
   */
  private formatearMiles(valor: string): string {
    return valor.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  /**
   * Mostrar un mensaje de error dentro del input y resaltar con borde rojo.
   * @param input El elemento input.
   * @param mensaje El mensaje de error a mostrar.
   */
  private mostrarError(input: HTMLInputElement, mensaje: string): void {
    // Guardar el mensaje actual
    this.mensajeError = mensaje;

    // Borrar el contenido temporalmente y mostrar el mensaje como placeholder
    this.renderer.setProperty(input, 'value', '');
    this.renderer.setProperty(input, 'placeholder', mensaje);

    // Resaltar el borde del input en rojo
    this.renderer.setStyle(input, 'border', '2px solid red');
  }

  /**
   * Eliminar el mensaje de error y restaurar el estilo original del input.
   * @param input El elemento input.
   */
  private eliminarError(input: HTMLInputElement): void {
    if (this.mensajeError) {
      // Restaurar el placeholder y el borde del input
      this.renderer.removeStyle(input, 'border');
      this.renderer.setProperty(input, 'placeholder', '');
      this.mensajeError = null;
    }
  }
}
