/** Serialización estable: las claves de los objetos se ordenan
 *  alfabéticamente en todos los niveles. El orden de los arrays SÍ importa
 *  (es dato). Necesario porque Firestore no preserva el orden de las claves
 *  de un map: {concepto, valor} puede volver como {valor, concepto}. */
export function stringifyEstable(valor: any): string {
  return JSON.stringify(ordenarClaves(valor));
}

/** Igualdad por contenido, independiente del orden de las claves. */
export function igualesPorContenido(a: any, b: any): boolean {
  return stringifyEstable(a) === stringifyEstable(b);
}

function ordenarClaves(valor: any): any {
  if (Array.isArray(valor)) return valor.map(ordenarClaves);
  if (valor !== null && typeof valor === 'object' && !(valor instanceof Date)) {
    return Object.keys(valor).sort().reduce((acc: any, k) => {
      acc[k] = ordenarClaves(valor[k]);
      return acc;
    }, {});
  }
  return valor;
}
