// numerador.service.ts
import { inject, Injectable } from '@angular/core';

import { doc, DocumentReference, Firestore, runTransaction, Transaction } from '@angular/fire/firestore';
import type { EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';

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

  /** Lee el próximo número interno de liquidación DENTRO de una transacción
   *  y devuelve la escritura del contador para que el caller la sume a su
   *  EscrituraBatch[] (commitEnTransaccion). Misma serie y formato que
   *  generarNumeroInterno (LQCL/LQCH/LQPR-0000), pero sin transacción propia:
   *  el número solo se consume si commitea la transacción completa del
   *  caller, así que no quedan huecos por fallos posteriores. Mismo patrón
   *  que leerProximoNumeroMovimiento. */
  async leerProximoNumeroInterno(
    tx: Transaction,
    tipo: 'cliente' | 'chofer' | 'proveedor',
  ): Promise<{ numeroInterno: string; escritura: EscrituraBatch }> {
    const prefijos: Record<'cliente' | 'chofer' | 'proveedor', string> = {
      cliente: 'LQCL',
      chofer: 'LQCH',
      proveedor: 'LQPR',
    };
    const prefijo = prefijos[tipo];

    const snap = await tx.get(doc(this.firestore, `Vantruck/datos/numeradores/${prefijo}`));
    const ultimo = snap.exists() ? ((snap.data() as { ultimoNumero?: number }).ultimoNumero ?? 0) : 0;
    const nuevo = ultimo + 1;

    return {
      numeroInterno: `${prefijo}-${nuevo.toString().padStart(4, '0')}`,
      escritura: {
        coleccion: 'numeradores',
        id: prefijo,
        data: { ultimoNumero: nuevo },
        // update si existe (no pisa otros campos del doc), set si no.
        modo: snap.exists() ? 'actualizar' : 'crear',
      },
    };
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
