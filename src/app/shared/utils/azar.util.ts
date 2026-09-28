/** Generador de números pseudoaleatorios con semilla (mulberry32).
 *  La misma semilla produce siempre la misma secuencia: sirve para que un
 *  plan del generador de operaciones de prueba sea reproducible (misma
 *  semilla + mismos datos de demo = mismo plan). NO usar para nada de
 *  seguridad. Pura: no depende de Angular ni de Math.random. */
export class Azar {

  private estado: number;

  constructor(semilla: number) {
    // Normaliza a entero de 32 bits sin signo; semilla 0 también es válida.
    this.estado = (Math.floor(semilla) >>> 0) || 0x9e3779b9;
  }

  /** Número en [0, 1). */
  siguiente(): number {
    this.estado = (this.estado + 0x6d2b79f5) >>> 0;
    let t = this.estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Entero en [min, max] (ambos inclusive). */
  entero(min: number, max: number): number {
    return min + Math.floor(this.siguiente() * (max - min + 1));
  }

  /** true con probabilidad p (0..1). */
  chance(p: number): boolean {
    return this.siguiente() < p;
  }

  /** Un elemento al azar. Lanza si el array está vacío. */
  elegir<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Azar.elegir: lista vacía.');
    return items[Math.floor(this.siguiente() * items.length)];
  }

  /** Un elemento al azar con probabilidad proporcional a su peso (> 0). */
  elegirPonderado<T>(items: readonly T[], peso: (item: T) => number): T {
    if (items.length === 0) throw new Error('Azar.elegirPonderado: lista vacía.');
    const total = items.reduce((acc, it) => acc + Math.max(0, peso(it)), 0);
    if (total <= 0) return this.elegir(items);
    let r = this.siguiente() * total;
    for (const it of items) {
      r -= Math.max(0, peso(it));
      if (r < 0) return it;
    }
    return items[items.length - 1];
  }

  /** Copia mezclada (Fisher-Yates). No muta el original. */
  mezclar<T>(items: readonly T[]): T[] {
    const copia = [...items];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(this.siguiente() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  }

  /** `valor` ± `pct` (ej. 0.2 = ±20%), uniforme. */
  variar(valor: number, pct: number): number {
    return valor * (1 - pct + this.siguiente() * 2 * pct);
  }
}
