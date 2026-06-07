import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  getDocs,
  doc,
  setDoc,
} from '@angular/fire/firestore';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { MigrationBackupService } from './migration-backup.service';

@Injectable({ providedIn: 'root' })
export class ProveedorMigrationService {

  private readonly BACKUP_CHOFERES = '_backup_choferes_20260531';

  constructor(
    private firestore: Firestore,
    private backupService: MigrationBackupService,
  ) {}

  async migrarProveedores(): Promise<void> {
    console.log('--- Inicio migración proveedores ---');

    // 1. Backups
    await this.backupService.backupColeccion('proveedores');
    console.log('Backup de proveedores completado.');

    // 2. Leer colecciones
    const proveedoresRef = collection(this.firestore, '/Vantruck/datos/proveedores');
    const choferesRef = collection(this.firestore, '/Vantruck/datos/choferes');
    const vehiculosRef = collection(this.firestore, '/Vantruck/datos/vehiculos');
    const backupChoferesRef = collection(this.firestore, `/Vantruck/datos/${this.BACKUP_CHOFERES}`);

    const proveedoresSnap = await getDocs(proveedoresRef);
    const choferesSnap = await getDocs(choferesRef);
    const vehiculosSnap = await getDocs(vehiculosRef);
    const backupChoferesSnap = await getDocs(backupChoferesRef);

    if (proveedoresSnap.empty) {
      console.warn('La colección proveedores está vacía.');
      return;
    }

    // 3. Construir mapa CUIT → idProveedor numérico desde backup de choferes
    // El backup tiene choferes con el idProveedor numérico original
    const mapaCuitAIdProveedorViejo = new Map<number, number>();
    for (const doc_ of backupChoferesSnap.docs) {
      const datos = doc_.data() as any;
      if (datos.idProveedor && datos.idProveedor !== 0 && datos.cuit) {
        mapaCuitAIdProveedorViejo.set(Number(datos.cuit), Number(datos.idProveedor));
      }
    }
    console.log(`Mapa CUIT→idProveedorViejo: ${mapaCuitAIdProveedorViejo.size} entradas`);

    // 4. Construir mapa CUIT → idChofer string (choferes actuales)
    const mapaCuitAIdChoferNuevo = new Map<number, string>();
    for (const doc_ of choferesSnap.docs) {
      const datos = doc_.data() as any;
      const cuit = Number(datos.datosPersonales?.cuit ?? 0);
      if (cuit) mapaCuitAIdChoferNuevo.set(cuit, doc_.id);
    }

    // 5. Migrar proveedores y construir mapa idProveedorViejo → idProveedor string
    const mapaIdProveedorViejoANuevo = new Map<number, string>();
    let proveedoresMigrados = 0;

    for (const documento of proveedoresSnap.docs) {
      const datos = documento.data() as any;
      const docId = documento.id;

      // Guardar mapeo antes de sobreescribir
      if (datos.idProveedor !== undefined) {
        mapaIdProveedorViejoANuevo.set(Number(datos.idProveedor), docId);
      }

      const proveedorMigrado = {
        razonSocial: datos.razonSocial ?? '',
        cuit: Number(datos.cuit) ?? 0,
        condFiscal: datos.condFiscal ?? '',
        direccionFiscal: datos.direccionFiscal ?? { provincia: '', municipio: '', localidad: '', domicilio: '' },
        direccionOperativa: datos.direccionOperativa ?? { provincia: '', municipio: '', localidad: '', domicilio: '' },
        contactos: datos.contactos ?? [],
        tarifaTipo: datos.tarifaTipo ?? { general: true, especial: false, eventual: false, personalizada: false },
        tarifaAsignada: datos.tarifaAsignada ?? false,
        idTarifa: datos.idTarifa !== undefined ? String(datos.idTarifa) : '',
        activo: true,
        visible: datos.visible ?? true,
      };

      await setDoc(doc(proveedoresRef, docId), proveedorMigrado);
      proveedoresMigrados++;
    }

    console.log(`Proveedores migrados: ${proveedoresMigrados}`);
    console.log(`Mapa idProveedorViejo→Nuevo: ${mapaIdProveedorViejoANuevo.size} entradas`);

    // 6. Actualizar choferes de proveedor con idProveedor string
    let choferesActualizados = 0;
    let choferesSinMapeo = 0;

    for (const documento of choferesSnap.docs) {
      const datos = documento.data() as any;
      if (datos.contratacion?.tipo !== 'proveedor') continue;

      // Buscar en backup por CUIT para obtener idProveedor viejo
      const cuit = Number(datos.datosPersonales?.cuit ?? 0);
      const idProveedorViejo = mapaCuitAIdProveedorViejo.get(cuit);

      if (!idProveedorViejo) {
        console.warn(`Chofer ${documento.id} (CUIT ${cuit}): no se encontró idProveedor en backup.`);
        choferesSinMapeo++;
        continue;
      }

      const idProveedorNuevo = mapaIdProveedorViejoANuevo.get(idProveedorViejo);
      if (!idProveedorNuevo) {
        console.warn(`Chofer ${documento.id}: idProveedor viejo ${idProveedorViejo} no tiene mapeo nuevo.`);
        choferesSinMapeo++;
        continue;
      }

      await setDoc(doc(choferesRef, documento.id), {
        ...datos,
        contratacion: { tipo: 'proveedor', idProveedor: idProveedorNuevo },
      });
      choferesActualizados++;
    }

    console.log(`Choferes de proveedor actualizados: ${choferesActualizados}, sin mapeo: ${choferesSinMapeo}`);

    // 7. Reasignar vehículos de choferes de proveedor → proveedor
    let vehiculosReasignados = 0;

    for (const documento of vehiculosSnap.docs) {
      const datos = documento.data() as any;
      if (datos.asignadoA?.tipo !== 'chofer') continue;

      const idChofer = datos.asignadoA.idChofer;

      // Buscar el chofer en los datos actualizados para obtener su proveedor
      const choferDoc = choferesSnap.docs.find(d => d.id === idChofer);
      if (!choferDoc) continue;

      const choferDatos = choferDoc.data() as any;
      if (choferDatos.contratacion?.tipo !== 'proveedor') continue;

      // Obtener idProveedor nuevo via el mismo proceso
      const cuit = Number(choferDatos.datosPersonales?.cuit ?? 0);
      const idProveedorViejo = mapaCuitAIdProveedorViejo.get(cuit);
      if (!idProveedorViejo) continue;

      const idProveedorNuevo = mapaIdProveedorViejoANuevo.get(idProveedorViejo);
      if (!idProveedorNuevo) continue;

      await setDoc(doc(vehiculosRef, documento.id), {
        ...datos,
        asignadoA: { tipo: 'proveedor', idProveedor: idProveedorNuevo },
      });
      vehiculosReasignados++;
    }

    console.log(`Vehículos reasignados a proveedor: ${vehiculosReasignados}`);

    // 8. Verificación final
    await this.backupService.verificarMigracion('proveedores', proveedoresMigrados);
    console.log('--- Migración de proveedores completada ---');
  }

  async migrarVehiculosProveedores(): Promise<void> {
    console.log('--- Inicio migración de vehículos de proveedores ---');

    const backupChoferesRef = collection(this.firestore, '/Vantruck/datos/_backup_choferes_20260531');
    const backupProveedoresRef = collection(this.firestore, '/Vantruck/datos/_backup_proveedores_20260603');
    const proveedoresRef = collection(this.firestore, '/Vantruck/datos/proveedores');
    const vehiculosRef = collection(this.firestore, '/Vantruck/datos/vehiculos');

    const backupChoferesSnap = await getDocs(backupChoferesRef);
    const backupProveedoresSnap = await getDocs(backupProveedoresRef);
    const proveedoresSnap = await getDocs(proveedoresRef);

    if (backupChoferesSnap.empty) {
      console.warn('El backup de choferes está vacío.');
      return;
    }

    // 1. Construir mapa idProveedor viejo (number) → cuit proveedor (number)
    const mapaIdProveedorViejoCuit = new Map<number, number>();
    for (const documento of backupProveedoresSnap.docs) {
      const datos = documento.data() as any;
      if (datos.idProveedor !== undefined && datos.cuit !== undefined) {
        mapaIdProveedorViejoCuit.set(Number(datos.idProveedor), Number(datos.cuit));
      }
    }
    console.log(`Mapa idProveedorViejo→CUIT: ${mapaIdProveedorViejoCuit.size} entradas`);

    // 2. Construir mapa cuit (number) → id proveedor nuevo (string)
    const mapaCuitIdProveedorNuevo = new Map<number, string>();
    for (const documento of proveedoresSnap.docs) {
      const datos = documento.data() as any;
      if (datos.cuit !== undefined) {
        mapaCuitIdProveedorNuevo.set(Number(datos.cuit), documento.id);
      }
    }
    console.log(`Mapa CUIT→idProveedorNuevo: ${mapaCuitIdProveedorNuevo.size} entradas`);

    // 3. Recorrer choferes del backup y crear vehículos para los de proveedor
    let vehiculosCreados = 0;
    let choferesSinMapeo: string[] = [];

    for (const documento of backupChoferesSnap.docs) {
      const datos = documento.data() as any;

      // Solo choferes de proveedor
      if (!datos.idProveedor || datos.idProveedor === 0) continue;

      // Obtener CUIT del proveedor viejo
      const cuitProveedor = mapaIdProveedorViejoCuit.get(Number(datos.idProveedor));
      if (!cuitProveedor) {
        console.warn(`Chofer ${datos.apellido} ${datos.nombre}: no se encontró CUIT para idProveedor ${datos.idProveedor}`);
        choferesSinMapeo.push(`${datos.apellido} ${datos.nombre} (idProveedor: ${datos.idProveedor})`);
        continue;
      }

      // Obtener id del proveedor nuevo
      const idProveedorNuevo = mapaCuitIdProveedorNuevo.get(cuitProveedor);
      if (!idProveedorNuevo) {
        console.warn(`Chofer ${datos.apellido} ${datos.nombre}: no se encontró proveedor nuevo para CUIT ${cuitProveedor}`);
        choferesSinMapeo.push(`${datos.apellido} ${datos.nombre} (CUIT: ${cuitProveedor})`);
        continue;
      }

      // Crear vehículos del chofer asignados al proveedor
      const vehiculosChofer = Array.isArray(datos.vehiculo) ? datos.vehiculo : [];
      for (const v of vehiculosChofer) {
        const vehiculoDocRef = doc(vehiculosRef);
        const vehiculoMigrado = {
          dominio: v.dominio ?? '',
          marca: v.marca ?? '',
          modelo: v.modelo ?? '',
          tipoCombustible: v.tipoCombustible ?? [],
          categoria: v.categoria ?? { catOrden: 0, nombre: '' },
          segSat: v.segSat ?? false,
          satelital: v.satelital ?? '',
          tarjetaCombustible: v.tarjetaCombustible ?? false,
          refrigeracion: v.refrigeracion ?? null,
          publicidad: v.publicidad ?? false,
          asignadoA: { tipo: 'proveedor', idProveedor: idProveedorNuevo },
        };
        await setDoc(vehiculoDocRef, vehiculoMigrado);
        vehiculosCreados++;
      }
    }

    // 4. Reporte final
    console.log(`--- Migración completada: ${vehiculosCreados} vehículos creados ---`);
    if (choferesSinMapeo.length > 0) {
      console.warn(`Choferes sin mapeo (${choferesSinMapeo.length}):`);
      choferesSinMapeo.forEach(c => console.warn(' -', c));
    } else {
      console.log('✅ Todos los choferes de proveedor fueron procesados correctamente.');
    }
  }
}
