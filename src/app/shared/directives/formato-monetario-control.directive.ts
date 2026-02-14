import {
  Directive,
  ElementRef,
  Renderer2,
  forwardRef,
  HostListener
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR
} from '@angular/forms';

@Directive({
  selector: '[appFormatoMonetarioControl]',
  standalone: false,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormatoMonetarioControlDirective),
      multi: true
    }
  ]
})
export class FormatoMonetarioControlDirective
  implements ControlValueAccessor {

  private valor: number | null = null;
  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(
    private el: ElementRef<HTMLInputElement>,
    private renderer: Renderer2
  ) {}

  // 🔹 Angular → vista
  writeValue(value: number | null): void {
    this.valor = value;
    this.actualizarVista();
  }

  // 🔹 Vista → Angular
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  // 🔹 Usuario escribe
  @HostListener('input', ['$event'])
  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const valor = input.value;

    const numerico = this.parsear(valor);
    this.valor = numerico;
    this.onChange(numerico);
  }

  // 🔹 Sale del foco
  @HostListener('blur')
  onBlur() {
    this.onTouched();
    this.actualizarVista();
  }

  // =========================

  private actualizarVista() {
    if (this.valor === null || this.valor === undefined) {
      this.renderer.setProperty(this.el.nativeElement, 'value', '');
      return;
    }

    const formateado = new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(this.valor);

    this.renderer.setProperty(
      this.el.nativeElement,
      'value',
      formateado
    );
  }

  private parsear(valor: string): number {
    return Number(
      valor
        .replace(/\./g, '')
        .replace(',', '.')
    ) || 0;
  }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.el.nativeElement.setAttribute('disabled', 'true');
    } else {
      this.el.nativeElement.removeAttribute('disabled');
    }
  }

}
