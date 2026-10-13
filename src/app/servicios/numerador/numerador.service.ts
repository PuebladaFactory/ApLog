// numerador.service.ts
import { inject, Injectable } from '@angular/core';

import { doc, DocumentReference, Firestore, runTransaction, Transaction } from '@angular/fire/firestore';
import type { EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';
import { PREFIJO_MOVIMIENTO_FIN, TipoMovimientoFin } from 'src/app/interfaces/movimiento-fin';

@Injectable({
  providedIn: 'root'
})
export class NumeradorService {
  private firestore = inject(Firestore); // 🧨 Usamos inject() para romper ciclos

  /** Lee el próximo número interno de liquidación DENTRO de una transacción
   *  y devuelve la escritura del contador para que el caller la sume a su
   *  EscrituraBatch[] (commitEnTransaccion). Serie LQCL/LQCH/LQPR-0000, sin
   *  transacción propia: el número solo se consume si commitea la transacción
   *  completa del caller, así que no quedan huecos por fallos posteriores. */
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

  /** Próximo número de liquidación de comisiones de venta (LVEN-0000)
   *  DENTRO de una transacción: devuelve el número y la escritura del
   *  contador para que el caller la sume a su EscrituraBatch[]
   *  (commitEnTransaccion). Mismo patrón que leerProximoNumeroInterno: el
   *  número solo se consume si commitea la transacción completa. */
  async leerProximoNumeroLiquidacionVenta(
    tx: Transaction,
  ): Promise<{ numero: string; escritura: EscrituraBatch }> {
    const prefijo = 'LVEN';
    const snap = await tx.get(doc(this.firestore, `Vantruck/datos/numeradores/${prefijo}`));
    const ultimo = snap.exists() ? ((snap.data() as { ultimoNumero?: number }).ultimoNumero ?? 0) : 0;
    const nuevo = ultimo + 1;
    return {
      numero: `${prefijo}-${nuevo.toString().padStart(4, '0')}`,
      escritura: {
        coleccion: 'numeradores',
        id: prefijo,
        data: { ultimoNumero: nuevo },
        modo: snap.exists() ? 'actualizar' : 'crear',
      },
    };
  }

  /** Próximo número de movimiento de Finanzas (camino nuevo, `movimientosFin`)
   *  DENTRO de una transacción: RC-000001 (cobro), OPG-000001 (pago),
   *  AJ-000001 (ajuste). Devuelve el número y la escritura del contador para
   *  que el caller la sume a su EscrituraBatch[] (commitEnTransaccion): el
   *  número solo se consume si commitea la transacción completa. Mismo patrón
   *  que leerProximoNumeroInterno / leerProximoNumeroLiquidacionVenta.
   *  El contador 'RC' es el mismo documento que usaba el módulo viejo de
   *  Finanzas. */
  async leerProximoNumeroMovimientoFin(
    tx: Transaction,
    tipo: TipoMovimientoFin,
  ): Promise<{ numero: string; escritura: EscrituraBatch }> {
    const prefijo = PREFIJO_MOVIMIENTO_FIN[tipo];
    const snap = await tx.get(doc(this.firestore, `Vantruck/datos/numeradores/${prefijo}`));
    const ultimo = snap.exists() ? ((snap.data() as { ultimoNumero?: number }).ultimoNumero ?? 0) : 0;
    const nuevo = ultimo + 1;
    return {
      numero: `${prefijo}-${nuevo.toString().padStart(6, '0')}`,
      escritura: {
        coleccion: 'numeradores',
        id: prefijo,
        data: { ultimoNumero: nuevo },
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

}
