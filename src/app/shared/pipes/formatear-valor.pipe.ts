import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'formatearValor',
    standalone: false
})
export class FormatearValorPipe implements PipeTransform {
  transform(valor: number | null | undefined, simbolo: string = '', posicion: 'prefijo' | 'sufijo' = 'prefijo'): string {
    if (valor === null || valor === undefined) return '';

    // Formatear el valor con Intl.NumberFormat
    const nuevoValor = new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true,
    }).format(valor);

    // Agregar el símbolo si se pasa como argumento (antes o después del valor)
    if (!simbolo) return nuevoValor;
    return posicion === 'sufijo' ? `${nuevoValor}${simbolo}` : `${simbolo} ${nuevoValor}`;
  }
}
