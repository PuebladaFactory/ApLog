import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  getDocs,
  doc,
  setDoc,
} from '@angular/fire/firestore';
import { MigrationBackupService } from './migration-backup.service';

@Injectable({ providedIn: 'root' })
export class ClienteMigrationService {

  constructor(
    private firestore: Firestore,
    private backupService: MigrationBackupService,
  ) {}

  async migrarClientes(): Promise<void> {
    console.log('--- Inicio migración clientes ---');

    await this.backupService.backupColeccion('clientes');
    console.log('Backup de clientes completado.');

    const clientesRef = collection(this.firestore, '/Vantruck/datos/clientes');
    const snapshot = await getDocs(clientesRef);

    if (snapshot.empty) {
      console.warn('La colección clientes está vacía.');
      return;
    }

    let clientesMigrados = 0;

    for (const documento of snapshot.docs) {
      const datos = documento.data() as any;
      const docId = documento.id;

      const clienteMigrado = {
        razonSocial: datos.razonSocial ?? '',
        cuit: Number(datos.cuit) ?? 0,
        condFiscal: datos.condFiscal ?? '',
        direccionFiscal: datos.direccionFiscal ?? {
          provincia: '', municipio: '', localidad: '', domicilio: ''
        },
        direccionOperativa: datos.direccionOperativa ?? {
          provincia: '', municipio: '', localidad: '', domicilio: ''
        },
        contactos: datos.contactos ?? [],
        tarifaTipo: datos.tarifaTipo ?? {
          general: true, especial: false, eventual: false, personalizada: false
        },
        tarifaAsignada: datos.tarifaAsignada ?? false,
        idTarifa: datos.idTarifa !== undefined ? String(datos.idTarifa) : '',
        // TODO: migrar vendedor a string[] cuando se refactorice ese módulo
        vendedor: Array.isArray(datos.vendedor)
          ? datos.vendedor.map((v: any) => String(v))
          : [],
        activo: datos.activo ?? true,
        visible: datos.visible ?? true,
      };

      await setDoc(doc(clientesRef, docId), clienteMigrado);
      clientesMigrados++;
    }

    await this.backupService.verificarMigracion('clientes', clientesMigrados);
    console.log(`--- Migración completada: ${clientesMigrados} clientes ---`);
  }

  async corregirIdClientes(): Promise<void> {
    console.log('--- Inicio corrección idCliente en colección clientes ---');
    const colRef = collection(this.firestore, '/Vantruck/datos/clientes');
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
      console.warn('La colección clientes está vacía.');
      return;
    }

    let corregidos = 0;
    for (const documento of snapshot.docs) {
      const datos = documento.data() as any;
      if ('idCliente' in datos) {
        const { idCliente, ...resto } = datos;
        await setDoc(doc(colRef, documento.id), resto);
        corregidos++;
      }
    }

    console.log(`Corrección completada: ${corregidos} documentos actualizados en clientes.`);
  }
}
