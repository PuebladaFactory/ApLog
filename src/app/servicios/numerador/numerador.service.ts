// numerador.service.ts
import { inject, Injectable } from '@angular/core';
import { doc, DocumentReference, runTransaction, Transaction } from 'firebase/firestore';
import { Firestore } from '@angular/fire/firestore';

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
