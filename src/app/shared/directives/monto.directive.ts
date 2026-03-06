import {
  Directive,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  Input,
  forwardRef,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import AutoNumeric, { Options } from 'autonumeric';

@Directive({
  standalone: false,
  selector: '[appMonto]',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MontoDirective),
      multi: true,
    },
  ],
})
export class MontoDirective
  implements AfterViewInit, ControlValueAccessor, OnDestroy, OnChanges
{
  @Input() decimales = 2;
  @Input() permitirNegativos = false;
  @Input() minimo?: number;
  @Input() maximo?: number;

  // 🆕 Nuevas opciones
  @Input() modo: 'normal' | 'porcentaje' = 'normal';
  @Input() soloEntero = false;
  @Input() prefijo?: string;

  private autoNumeric!: AutoNumeric;
  private onChange = (value: any) => {};
  private onTouched = () => {};
  private initialized = false;

  constructor(private el: ElementRef<HTMLInputElement>) {}

  ngAfterViewInit(): void {
    this.initAutoNumeric();
    this.initialized = true;

    this.el.nativeElement.addEventListener(
      'autoNumeric:rawValueModified',
      () => {
        const rawValue = this.autoNumeric.getNumber();
        this.onChange(rawValue);
      }
    );

    this.el.nativeElement.addEventListener('blur', () => {
      this.onTouched();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.initialized) {
      this.autoNumeric.update(this.buildOptions());
    }
  }

  writeValue(value: any): void {
    if (!this.autoNumeric) return;

    if (value === null || value === undefined || value === '') {
      this.autoNumeric.clear();
      return;
    }

    this.autoNumeric.set(value);
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

  ngOnDestroy(): void {
    if (this.autoNumeric) {
      this.autoNumeric.remove();
    }
  }

  private initAutoNumeric(): void {
    this.autoNumeric = new AutoNumeric(
      this.el.nativeElement,
      this.buildOptions()
    );
  }

  private buildOptions(): Partial<Options> {
    const decimalPlaces = this.soloEntero ? 0 : this.decimales;

    let minimumValue =
      this.minimo !== undefined
        ? this.minimo.toString()
        : this.permitirNegativos
        ? '-9999999999'
        : '0';

    let maximumValue =
      this.maximo !== undefined
        ? this.maximo.toString()
        : '9999999999';

    const options: Partial<Options> = {
      digitGroupSeparator: '.',
      decimalCharacter: ',',
      decimalCharacterAlternative: '.',

      decimalPlaces,
      decimalPlacesShownOnBlur: decimalPlaces,
      decimalPlacesShownOnFocus: decimalPlaces,

      minimumValue,
      maximumValue,

      modifyValueOnWheel: false,
      outputFormat: 'number',
    };

    // 🆕 Modo porcentaje
    if (this.modo === 'porcentaje') {
      options.suffixText = ' %';
      options.maximumValue = this.maximo?.toString() ?? '100';
      options.minimumValue = this.minimo?.toString() ?? '0';
    }

    // 🆕 Prefijo moneda
    if (this.prefijo) {
      options.currencySymbol = this.prefijo;
      options.currencySymbolPlacement = 'p';
    }

    return options;
  }
}