import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs, doc, updateDoc } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class OperacionMigrationService {

  constructor(private firestore: Firestore) {}

  /** Normaliza el campo `documentacion` de operaciones viejas: antes de este frente
   *  (Cowork, adjuntos reales de Operaciones), ese campo era un input de texto libre —
   *  en la práctica siempre '' en los datos reales (confirmado por nico, ninguna op
   *  vieja tiene contenido ahí). El modelo nuevo espera DocumentoOperacion[].
   *  Transformación puramente mecánica (sin criterio humano, a diferencia de la
   *  migración de Tarifas): cualquier documento cuyo campo no sea ya un array recibe
   *  []. Idempotente — correrlo de nuevo sobre ops ya migradas no hace nada. */
  async normalizarDocumentacion(): Promise<void> {
    console.log('--- Inicio normalización documentacion: operaciones ---');
    const colRef = collection(this.firestore, '/Vantruck/datos/operaciones');
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
      console.warn('La colección operaciones está vacía.');
      return;
    }

    let actualizadas = 0;
    for (const documento of snapshot.docs) {
      const datos = documento.data() as any;
      if (!Array.isArray(datos['documentacion'])) {
        await updateDoc(doc(colRef, documento.id), { documentacion: [] });
        actualizadas++;
      }
    }

    console.log(`--- Normalización completada: ${actualizadas} operación(es) actualizadas, ${snapshot.size - actualizadas} ya estaban en formato correcto ---`);
  }
}
