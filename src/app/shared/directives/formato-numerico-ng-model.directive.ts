import { Directive, HostListener, ElementRef, Renderer2, AfterViewInit, OnInit } from '@angular/core';
import { NgModel } from '@angular/forms';
import { FormatoNumericoService } from 'src/app/servicios/formato-numerico/formato-numerico.service';


@Directive({
    selector: '[appFormatoNumericoNgModel]',
    standalone: false
})
export class FormatoNumericoNgModelDirective implements AfterViewInit{

  constructor(
    private el: ElementRef<HTMLInputElement>,
    private renderer: Renderer2,
    private ngModel: NgModel,
    private formatoNumericoService: FormatoNumericoService
  ) {}
  
  ngAfterViewInit(): void {
    setTimeout(() => {
      this.formatearDesdeModelo();
    });
  }

  // 🔹 Mientras escribe → solo formateo visual
  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    if (!value) {
      this.renderer.setProperty(this.el.nativeElement, 'value', '');
      return;
    }

    // separar decimales si existen
    if (value.includes(',')) {
      const [entera, decimal = ''] = value.split(',');

      const enteraFormateada = this.formatearMiles(
        entera.replace(/\./g, '')
      );

      value = `${enteraFormateada},${decimal.substring(0, 2)}`;
    } else {
      value = this.formatearMiles(
        value.replace(/\./g, '')
      );
    }

    this.renderer.setProperty(this.el.nativeElement, 'value', value);
  }

  // 🔹 Al salir → sincroniza MODELO (number) y vuelve a formatear
  @HostListener('blur')
  onBlur(): void {
    const valorVista = this.el.nativeElement.value;

    if (!valorVista) {
      this.ngModel.viewToModelUpdate(0);
      return;
    }

    const numero = this.parseValor(valorVista);

    // 👉 modelo = number puro
    this.ngModel.viewToModelUpdate(numero);

    // 👉 vista = string formateado
    const formateado =
      this.formatoNumericoService.convertirAValorFormateado(numero);

    this.renderer.setProperty(this.el.nativeElement, 'value', formateado);
  }

  // ======================
  // Helpers
  // ======================

  private parseValor(valor: string): number {
    return Number(
      valor
        .replace(/\./g, '')
        .replace(',', '.')
    ) || 0;
  }

  private formatearMiles(valor: string): string {
    return valor.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  private formatearDesdeModelo() {
    const valor = this.ngModel.model;

    if (valor === null || valor === undefined || valor === '') return;

    const numero = typeof valor === 'number'
      ? valor
      : this.parseValor(valor.toString());

    const formateado = this.formatoNumericoService.convertirAValorFormateado(numero);
    this.renderer.setProperty(this.el.nativeElement, 'value', formateado);
  }
}
