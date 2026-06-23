// numerador.service.ts
import { inject, Injectable } from '@angular/core';

import { doc, DocumentReference, Firestore, runTransaction, Transaction } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class NumeradorService {
  private firestore = inject(Firestore); // 🧨 Usamos inject() para romper ciclos

  async generarNumeroInterno(tipo: 'cliente' | 'chofer' | 'proveedor'): Promise<string> {
    const prefixMap: Record<string, string> = {
      cliente: 'LQCL',
      chofer: 'LQCH',
      proveedor: 'LQPR'
    };

    const prefijo = prefixMap[tipo];
    const docRef: DocumentReference = doc(this.firestore, `Vantruck/datos/numeradores/${prefijo}`);

    try {
      const numeroInterno = await runTransaction(this.firestore, async (transaction) => {
        const docSnap = await transaction.get(docRef);
        let nuevoNumero = 1;

        if (docSnap.exists()) {
          const data = docSnap.data() as { ultimoNumero: number };
          nuevoNumero = data.ultimoNumero + 1;
          transaction.update(docRef, { ultimoNumero: nuevoNumero });
        } else {
          transaction.set(docRef, { ultimoNumero: nuevoNumero });
        }

        const numeroFormateado = `${prefijo}-${nuevoNumero.toString().padStart(4, '0')}`;
        return numeroFormateado;
      });

      return numeroInterno;
    } catch (error) {
      console.error("Error en transacción para generar número interno:", error);
      throw new Error("No se pudo generar el número interno");
    }
  }

  /** Reserva N números de operación consecutivos en una transacción atómica.
   *  El contador solo AVANZA: si el alta posterior falla, los números quedan como
   *  hueco (aceptable — numeroOperacion es correlativo visible, no id técnico).
   *  @param n cantidad de números a reservar (= cantidad de operaciones del alta)
   *  @returns array de n números consecutivos [inicio, ..., inicio+n-1]
   */
  async reservarRangoOperaciones(n: number): Promise<number[]> {
    if (n <= 0) return [];

    const docRef: DocumentReference = doc(this.firestore, `Vantruck/datos/numeradores/OPER`);

    try {
      return await runTransaction(this.firestore, async (transaction) => {
        const docSnap = await transaction.get(docRef);
        const actual = docSnap.exists()
          ? (docSnap.data() as { ultimoNumero: number }).ultimoNumero
          : 0;
        const fin = actual + n;

        if (docSnap.exists()) {
          transaction.update(docRef, { ultimoNumero: fin });
        } else {
          transaction.set(docRef, { ultimoNumero: fin });
        }

        const numeros: number[] = [];
        for (let num = actual + 1; num <= fin; num++) numeros.push(num);
        return numeros;
      });
    } catch (error) {
      console.error('Error en transacción para reservar rango de operaciones:', error);
      throw new Error('No se pudo reservar el rango de números de operación');
    }
  }

  async leerProximoNumeroMovimiento(
    tx: Transaction,
    tipo: 'cobro' | 'pago'
  ): Promise<{ prefijo: string; numero: number }> {

    const prefijo = tipo === 'cobro' ? 'RC' : 'OP';

    const docRef = doc(
      this.firestore,
      `Vantruck/datos/numeradores/${prefijo}`
    );

    const snap = await tx.get(docRef);

    let numero = 1;

    if (snap.exists()) {
      numero = (snap.data()['ultimoNumero'] ?? 0) + 1;
    }

    return { prefijo, numero };
  }


}
