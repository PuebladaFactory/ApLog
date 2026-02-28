import {
  Directive,
  ElementRef,
  HostListener,
  Input,
  forwardRef,
} from "@angular/core";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";

@Directive({
  standalone: false,
  selector: "[appDecimalInput]",
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DecimalInputDirective),
      multi: true,
    },
  ],
})
export class DecimalInputDirective implements ControlValueAccessor {
  @Input() min: number = 0;
  @Input() max: number = Infinity;
  @Input() decimals: number = 2;

  private onChange: any = () => {};
  private onTouched: any = () => {};

  constructor(private el: ElementRef<HTMLInputElement>) {}

  // -----------------------------
  // Escuchar cambios del usuario
  // -----------------------------
  @HostListener("input", ["$event"])
  onInput(event: Event) {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;

    let value = input.value;

    if (!value) {
      this.onChange(null);
      return;
    }

    // Reemplazar coma por punto
    value = value.replace(",", ".");

    // Permitir solo números y un punto decimal
    value = value.replace(/[^0-9.]/g, "");

    const parts = value.split(".");

    if (parts.length > 2) {
      value = parts[0] + "." + parts[1];
    }

    // Limitar cantidad de decimales
    if (parts[1]) {
      parts[1] = parts[1].slice(0, this.decimals);
      value = parts[0] + "." + parts[1];
    }

    let numericValue = parseFloat(value);

    if (!isNaN(numericValue)) {
      // Aplicar límites
      if (numericValue < this.min) numericValue = this.min;
      if (numericValue > this.max) numericValue = this.max;

      this.onChange(numericValue);
    }

    this.el.nativeElement.value = value;
  }

  // -----------------------------
  // ControlValueAccessor
  // -----------------------------
  writeValue(value: any): void {
    this.el.nativeElement.value =
      value !== null && value !== undefined ? value : "";
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.el.nativeElement.disabled = isDisabled;
  }

  @HostListener("blur")
  onBlur() {
    this.onTouched();
  }
}
