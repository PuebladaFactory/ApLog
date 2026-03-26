import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'calcularPorcentajeV2',
  standalone: false
})
export class CalcularPorcentajeV2Pipe implements PipeTransform {

 transform(
    valor: number,
    valorTotal: number,
    invertido: boolean = false,
    decimales: number = 2,
  ): string {
    // Caso cuando alguno de los valores es 0
    if (valor === 0 || valorTotal === 0) {
      return "0%";
    }

    let porcentaje;
    if (invertido) {
      porcentaje = (valorTotal * 100) / valor;
    } else {
      porcentaje = (valor * 100) / valorTotal;
    }

    porcentaje = 100 - porcentaje;

    return porcentaje.toFixed(decimales) + "%";
  }
}
