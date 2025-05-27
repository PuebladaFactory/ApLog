import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'formatearValor',
    standalone: false
})
export class FormatearValorPipe implements PipeTransform {
  transform(valor: number, simbolo: string = ''): string {
    if (valor === null || valor === undefined) return '';

    // Formatear el valor con Intl.NumberFormat
    const nuevoValor = new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor);

    // Agregar el símbolo si se pasa como argumento
    return simbolo ? `${simbolo} ${nuevoValor}` : nuevoValor;
  }
}
