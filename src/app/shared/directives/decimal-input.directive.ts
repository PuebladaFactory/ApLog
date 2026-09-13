import {
  Directive,
  ElementRef,
  HostListener,
  Input,
  Renderer2,
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
  // true en campos donde vacío es un estado inválido (ej. multiplicadores,
  // donde vacío no puede confundirse con 0 — ver decisión de negocio en
  // ValoresTarifaService). Default false: no cambia el comportamiento de
  // consumidores existentes (ej. cantidad de acompañante, donde vacío→0 es
  // inofensivo y ya se maneja aparte).
  @Input() vacioInvalido = false;

  private onChange: any = () => {};
  private onTouched: any = () => {};
  private ultimoValorMostrado = "";

  constructor(private el: ElementRef<HTMLInputElement>, private renderer: Renderer2) {}

  // -----------------------------
  // Escuchar cambios del usuario
  // -----------------------------
  @HostListener("input", ["$event"])
  onInput(event: Event) {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;

    let value = input.value;

    if (!value) {
      this.ultimoValorMostrado = "";
      if (this.vacioInvalido) this.marcarError(); else this.limpiarError();
      this.onChange(null);
      return;
    }

    // Reemplazar coma por punto
    value = value.replace(",", ".");

    // Permitir solo números y un punto decimal
    value = value.replace(/[^0-9.]/g, "");

    if (!value) {
      // Se tipeó contenido no numérico puro (ej. una letra) — no hay nada
      // válido que mostrar. A diferencia de un borrado real (input.value ya
      // vacío, contemplado arriba), acá NO se toca el modelo ni se vacía la
      // pantalla: se restaura el último valor válido mostrado (mismo
      // resultado visual que appMonto/AutoNumeric, que directamente nunca
      // deja insertar el carácter inválido).
      this.el.nativeElement.value = this.ultimoValorMostrado;
      return;
    }

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
    let fueraDeRango = false;

    if (!isNaN(numericValue)) {
      // Aplicar límites — también al string mostrado, no solo al valor que
      // recibe el FormControl. Antes quedaban desincronizados: el modelo
      // clampeaba correctamente pero el input seguía mostrando el número
      // fuera de rango, sin ningún indicio de que no era el valor real que
      // se iba a guardar (bug reportado con los multiplicadores).
      if (numericValue < this.min) {
        numericValue = this.min;
        value = numericValue.toString();
        fueraDeRango = true;
      } else if (numericValue > this.max) {
        numericValue = this.max;
        value = numericValue.toString();
        fueraDeRango = true;
      }

      this.onChange(numericValue);
    }

    this.el.nativeElement.value = value;
    this.ultimoValorMostrado = value;
    fueraDeRango ? this.marcarError() : this.limpiarError();
  }

  private marcarError(): void {
    this.renderer.addClass(this.el.nativeElement, 'is-invalid');
  }

  private limpiarError(): void {
    this.renderer.removeClass(this.el.nativeElement, 'is-invalid');
  }

  // -----------------------------
  // ControlValueAccessor
  // -----------------------------
  writeValue(value: any): void {
    this.ultimoValorMostrado = value !== null && value !== undefined ? value.toString() : "";
    this.el.nativeElement.value = this.ultimoValorMostrado;
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
    // El valor ya quedó clampeado en el último onInput — al salir del campo
    // no tiene sentido seguir mostrando el error.
    this.limpiarError();
  }
}
