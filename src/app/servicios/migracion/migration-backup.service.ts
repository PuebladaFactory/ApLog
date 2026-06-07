import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  getDocs,
  doc,
  setDoc,
} from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class MigrationBackupService {

  constructor(private firestore: Firestore) {}

  async backupColeccion(nombre: string): Promise<void> {
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const origenRef = collection(this.firestore, `/Vantruck/datos/${nombre}`);
    const backupRef = collection(this.firestore, `/Vantruck/datos/_backup_${nombre}_${fecha}`);

    const snapshot = await getDocs(origenRef);

    if (snapshot.empty) {
      console.warn(`MigrationBackupService: la colección ${nombre} está vacía, no se generó backup.`);
      return;
    }

    const escrituras = snapshot.docs.map(documento =>
      setDoc(doc(backupRef, documento.id), documento.data())
    );

    await Promise.all(escrituras);
    console.log(`Backup completado: _backup_${nombre}_${fecha} (${snapshot.docs.length} documentos)`);
  }

  async contarDocumentos(nombre: string): Promise<number> {
    const colRef = collection(this.firestore, `/Vantruck/datos/${nombre}`);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.length;
  }

  async verificarMigracion(nombreColeccion: string, cantidadMigrada: number): Promise<boolean> {
    const total = await this.contarDocumentos(nombreColeccion);
    const ok = total === cantidadMigrada;
    if (ok) {
      console.log(`Verificación OK: ${nombreColeccion} tiene ${total} documentos, ${cantidadMigrada} migrados.`);
    } else {
      console.error(`Verificación FALLIDA: ${nombreColeccion} tiene ${total} documentos pero se migraron ${cantidadMigrada}.`);
    }
    return ok;
  }
}
