import {
  Directive,
  HostListener,
  ElementRef,
  forwardRef
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR
} from '@angular/forms';

@Directive({
  standalone: false,
  selector: '[appSoloNumerosRequerido]',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SoloNumerosRequeridoDirective),
      multi: true
    }
  ]
})
export class SoloNumerosRequeridoDirective implements ControlValueAccessor {

  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private el: ElementRef<HTMLInputElement>) {}

  @HostListener('input', ['$event'])
  onInput(event: Event) {

    const input = event.target as HTMLInputElement;
    let value = input.value;

    // Elimina todo lo que no sea número
    const filtered = value.replace(/[^0-9]/g, '');

    input.value = filtered;

    if (filtered === '') {
      this.onChange(null);
      return;
    }

    // Convertimos a number real
    const numericValue = Number(filtered);

    this.onChange(numericValue);
  }

  @HostListener('blur')
  onBlur() {
    this.onTouched();
  }

  writeValue(value: number | null): void {
    this.el.nativeElement.value =
      value !== null && value !== undefined ? String(value) : '';
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.el.nativeElement.disabled = isDisabled;
  }
}