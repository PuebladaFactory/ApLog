import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root', // Servicio disponible globalmente
})
export class FormatoNumericoService {
  constructor() {}

  /**
   * Convierte un string formateado como "25.000,000" en un número entero esperado (ejemplo: 250000).
   * @param valorFormateado El valor en formato string (por ejemplo: "25.000,000").
   * @returns El valor numérico corregido (por ejemplo: 250000).
   */
  convertirAValorNumerico(valorFormateado: string): number {
    if (!valorFormateado) return 0;
    console.log("servicio. Valor formateado: ", valorFormateado) ;
    
    // Eliminar los puntos (separadores de miles)
    let valor = valorFormateado.replace(/\./g, '');

    // Reemplazar la coma por un punto para decimales
      
    valor = valor.replace(',', '.');
    console.log("servicio valor: ", valor);
    
    // Convertir el valor a número flotante
    const numero = parseFloat(valor);
    console.log("servicio numero: ", numero);
    
    // Multiplicar por 10 si tiene más de dos decimales (ejemplo: 25.000,000 -> 250000)
    return numero;
  }
}
