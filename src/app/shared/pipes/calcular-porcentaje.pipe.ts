import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'calcularPorcentaje'
})
export class CalcularPorcentajePipe implements PipeTransform {
  transform(
    valor: number, 
    valorTotal: number, 
    invertido: boolean = false,
    decimales: number = 2
  ): string {
    // Caso cuando alguno de los valores es 0
    if (valor === 0 || valorTotal === 0) {
      return '0%';
    }
    
    // Cálculo del porcentaje
    let porcentaje = (valor * 100) / valorTotal;
    
    // Opción para calcular el complemento (100 - porcentaje)
    if (invertido) {
      porcentaje = 100 - porcentaje;
    }
    
    // Formateo con los decimales especificados
    return porcentaje.toFixed(decimales) + '%';
  }
}
