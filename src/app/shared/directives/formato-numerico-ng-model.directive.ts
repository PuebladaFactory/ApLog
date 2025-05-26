import { Directive, HostListener, ElementRef, Renderer2, AfterViewInit, OnInit } from '@angular/core';
import { NgModel } from '@angular/forms';
import { FormatoNumericoService } from 'src/app/servicios/formato-numerico/formato-numerico.service';


@Directive({
  selector: '[appFormatoNumericoNgModel]',
})
export class FormatoNumericoNgModelDirective implements AfterViewInit, OnInit {

  private puntoIngresadoPorUsuario = false; // Indicador para el punto del usuario
  private mensajeError: string | null = null; // Mensaje de error actual

  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
    private ngModel: NgModel,
    private formatoNumericoService: FormatoNumericoService
  ) {}
  
   ngOnInit(): void {
    console.log('FormatoNumericoNgModelDirective - ngOnInit');
  }

  ngOnDestroy(): void {
    console.log('FormatoNumericoNgModelDirective - ngOnDestroy');
  }


  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const input = this.el.nativeElement as HTMLInputElement;
    ////console.log("input: ", input.value);
    
    // Permitir teclas especiales: navegación, borrar, tab
    if (
      [
        'ArrowLeft',
        'ArrowRight',
        'Backspace',
        'Delete',
        'Tab',
        'Enter',
        'Alt',
        'Shift'
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
   * Formatea el valor inicial del modelo después de que la vista se haya inicializado.
   */
  ngAfterViewInit(): void {
     console.log('FormatoNumericoNgModelDirective - ngAfterViewInit');
    setTimeout(() => {
      const valorInicial = this.ngModel.model;
      ////console.log("1)valorInicial: ", valorInicial);

      if (valorInicial !== undefined && valorInicial !== null) {
        const formateado = this.formatoNumericoService.convertirAValorFormateado(valorInicial);
        ////console.log("2)formateado: ", formateado);

        // Actualizar el input y el modelo con el valor formateado
        this.renderer.setProperty(this.el.nativeElement, 'value', formateado);
        this.ngModel.viewToModelUpdate(formateado);
      }
    });
  }

  /**
   * Maneja los cambios en el modelo y aplica el formato.
   */
  @HostListener('ngModelChange', ['$event'])
  onModelChange(value: any): void {
    
    /* if (value) {
      //console.log("value: ", value);
      
      const formateado = this.formatoNumericoService.convertirAValorFormateado(value);
      this.renderer.setProperty(this.el.nativeElement, 'value', formateado);
    } */
      //const input = event.target as HTMLInputElement;
      let valor = value;
      ////console.log('1) valor inicial: ', valor);
      ////console.log('2) puntoIngresadoPorUsuario: ', this.puntoIngresadoPorUsuario);
  
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
      //this.renderer.setProperty(input, 'value', valor);
      this.renderer.setProperty(this.el.nativeElement, 'value', valor);
      // Restaurar el estilo y placeholder si no hay error
      this.eliminarError(this.el.nativeElement);
    }
  

  /**
   * Maneja el evento blur para asegurar el formato al salir del campo.
   */
  @HostListener('blur')
  onBlur(): void {
    const valor = this.el.nativeElement.value;       
    const formateado = this.formatoNumericoService.convertirAValorFormateado(valor);         
    // Actualizar el input y el modelo con el valor formateado
    this.ngModel.viewToModelUpdate(formateado);
    this.renderer.setProperty(this.el.nativeElement, 'value', formateado);
  }

 

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

  private formatearMiles(valor: string): string {
    return valor.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  
}
