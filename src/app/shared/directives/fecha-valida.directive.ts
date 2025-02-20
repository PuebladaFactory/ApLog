import { Directive } from '@angular/core';
import { NG_VALIDATORS, Validator, AbstractControl, ValidationErrors } from '@angular/forms';

@Directive({
  selector: '[appFechaValida]',
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: FechaValidaDirective,
      multi: true,
    },
  ],
})
export class FechaValidaDirective implements Validator {
  validate(control: AbstractControl): ValidationErrors | null {
    const fecha = control.value;
    if (!fecha) {
      return null;
    }

    // Verificar que la fecha tenga el formato correcto (YYYY-MM-DD)
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(fecha)) {
      return { formatoInvalido: true };
    }

    // Verificar que el año tenga exactamente 4 dígitos
    const year = fecha.split('-')[0];
    if (year.length !== 4) {
      return { yearInvalido: true };
    }

    return null;
  }
}