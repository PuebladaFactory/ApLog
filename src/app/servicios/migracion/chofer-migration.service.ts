import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  getDocs,
  doc,
  setDoc,
} from '@angular/fire/firestore';
import { ContratacionChofer, Vehiculo, AsignacionVehiculo } from 'src/app/interfaces/chofer';
import { MigrationBackupService } from './migration-backup.service';

@Injectable({ providedIn: 'root' })
export class ChoferMigrationService {

  constructor(
    private firestore: Firestore,
    private backupService: MigrationBackupService
  ) {}

  async migrarChoferes(): Promise<void> {
    console.log('--- Inicio migración choferes ---');

    // 1. Backup de choferes y legajos
    await this.backupService.backupColeccion('choferes');
    await this.backupService.backupColeccion('legajos');
    console.log('Backups completados.');

    // 2. Leer documentos actuales
    const choferesRef = collection(this.firestore, '/Vantruck/datos/choferes');
    const legajosRef = collection(this.firestore, '/Vantruck/datos/legajos');
    const vehiculosRef = collection(this.firestore, '/Vantruck/datos/vehiculos');

    const choferesSnapshot = await getDocs(choferesRef);
    const legajosSnapshot = await getDocs(legajosRef);

    if (choferesSnapshot.empty) {
      console.warn('La colección choferes está vacía. No hay nada que migrar.');
      return;
    }

    // 3. Construir mapa idChofer viejo (number) → id nuevo (string)
    // El idChofer viejo vive en el campo idChofer del documento original
    const mapaIds = new Map<number, string>();

    let choferesActualizados = 0;
    let vehiculosCreados = 0;

    for (const documento of choferesSnapshot.docs) {
      const datos = documento.data() as any;
      const docId = documento.id;

      // Guardar mapeo antes de sobreescribir
      if (datos.idChofer !== undefined && datos.idChofer !== '') {
        mapaIds.set(Number(datos.idChofer), docId);
      }

      // 4. Construir contratacion
      const contratacion: ContratacionChofer = datos.idProveedor === 0
        ? { tipo: 'directo' }
        : { tipo: 'proveedor', idProveedor: '' };

      // 5. Construir datosPersonales
      const datosPersonales = {
        nombre: datos.nombre ?? '',
        apellido: datos.apellido ?? '',
        cuit: datos.cuit ?? 0,
        fechaNac: datos.fechaNac ?? null,
        email: datos.email ?? '',
        celularContacto: Number(datos.celularContacto) ?? 0,
        celularEmergencia: Number(datos.celularEmergencia) ?? 0,
        contactoEmergencia: datos.contactoEmergencia ?? '',
        direccion: {
          provincia: datos.direccion?.provincia ?? '',
          municipio: datos.direccion?.municipio ?? '',
          localidad: datos.direccion?.localidad ?? '',
          domicilio: datos.direccion?.domicilio ?? '',
        },
      };

      // 6. Construir objeto Chofer con nueva estructura
      const choferMigrado = {
        datosPersonales,
        condFiscal: datos.condFiscal ?? '',
        contratacion,
        tarifaTipo: datos.tarifaTipo ?? {
          general: true,
          especial: false,
          eventual: false,
          personalizada: false,
        },
        tarifaAsignada: datos.tarifaAsignada ?? false,
        idTarifa: datos.idTarifa !== undefined ? String(datos.idTarifa) : '',
        activo: datos.activo ?? true,
        visible: datos.visible ?? true,
      };

      // 7. Actualizar documento del chofer
      await setDoc(doc(choferesRef, docId), choferMigrado);
      choferesActualizados++;

      // 8. Migrar vehículos solo para choferes directos
      if (contratacion.tipo === 'directo' && Array.isArray(datos.vehiculo)) {
        for (const v of datos.vehiculo) {
          const vehiculoDocRef = doc(vehiculosRef);
          const vehiculoMigrado: Vehiculo = {
            idVehiculo: vehiculoDocRef.id,
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
            asignadoA: { tipo: 'chofer', idChofer: docId },
          };
          await setDoc(vehiculoDocRef, vehiculoMigrado);
          vehiculosCreados++;
        }
      }
    }

    console.log(`Mapa de IDs construido: ${mapaIds.size} entradas.`);
    console.log(`Choferes migrados: ${choferesActualizados}, Vehículos creados: ${vehiculosCreados}`);

    // 9. Migrar legajos usando el mapa de IDs
    let legajosMigrados = 0;
    let legajosSinMapeo = 0;

    for (const documento of legajosSnapshot.docs) {
      const datos = documento.data() as any;
      const idChoferViejo = Number(datos.idChofer);
      const idChoferNuevo = mapaIds.get(idChoferViejo);

      if (!idChoferNuevo) {
        console.warn(
          `Legajo ${documento.id}: no se encontró mapeo para idChofer ${idChoferViejo}. Se deja sin modificar.`
        );
        legajosSinMapeo++;
        continue;
      }

      const legajoMigrado = {
        ...datos,
        idChofer: idChoferNuevo,
        idLegajo: documento.id,
      };

      await setDoc(doc(legajosRef, documento.id), legajoMigrado);
      legajosMigrados++;
    }

    // 10. Verificaciones
    await this.backupService.verificarMigracion('choferes', choferesActualizados);
    console.log(`Legajos migrados: ${legajosMigrados}, sin mapeo: ${legajosSinMapeo}`);
    console.log('--- Migración completada ---');
  }

  async corregirIdChoferes(): Promise<void> {
    console.log('--- Inicio corrección idChofer en colección choferes ---');
    const colRef = collection(this.firestore, '/Vantruck/datos/choferes');
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
      console.warn('La colección choferes está vacía.');
      return;
    }

    let corregidos = 0;
    for (const documento of snapshot.docs) {
      const datos = documento.data() as any;
      if ('idChofer' in datos) {
        const { idChofer, ...resto } = datos;
        await setDoc(doc(colRef, documento.id), resto);
        corregidos++;
      }
    }

    console.log(`Corrección completada: ${corregidos} documentos actualizados en choferes.`);
  }

  async verificarCuitsUnicos(): Promise<{ ok: boolean; duplicados: { cuit: number; choferes: string[] }[] }> {
    console.log('--- Verificando unicidad de CUITs en backup de choferes ---');

    // Buscar la colección de backup más reciente
    // El nombre sigue el patrón _backup_choferes_YYYYMMDD
    // Leemos directamente con el nombre que el usuario indique via parámetro
    const backupRef = collection(this.firestore, '/Vantruck/datos/_backup_choferes');

    // Como no sabemos la fecha exacta, leemos desde los choferes actuales
    // que tienen el CUIT en datosPersonales
    const choferesRef = collection(this.firestore, '/Vantruck/datos/choferes');
    const snapshot = await getDocs(choferesRef);

    if (snapshot.empty) {
      console.warn('La colección choferes está vacía.');
      return { ok: false, duplicados: [] };
    }

    // Construir mapa cuit → [apellido nombre]
    const mapaCuits = new Map<number, string[]>();

    for (const documento of snapshot.docs) {
      const datos = documento.data() as any;
      // Los choferes ya migrados tienen datosPersonales
      const cuit: number = datos.datosPersonales?.cuit ?? datos.cuit ?? 0;
      const nombre: string = datos.datosPersonales
        ? `${datos.datosPersonales.apellido} ${datos.datosPersonales.nombre} (id: ${documento.id})`
        : `${datos.apellido} ${datos.nombre} (id: ${documento.id})`;

      if (!mapaCuits.has(cuit)) {
        mapaCuits.set(cuit, []);
      }
      mapaCuits.get(cuit)!.push(nombre);
    }

    // Detectar duplicados
    const duplicados: { cuit: number; choferes: string[] }[] = [];
    mapaCuits.forEach((choferes, cuit) => {
      if (choferes.length > 1) {
        duplicados.push({ cuit, choferes });
      }
    });

    if (duplicados.length === 0) {
      console.log(`✅ Todos los CUITs son únicos. Total choferes verificados: ${snapshot.docs.length}`);
      return { ok: true, duplicados: [] };
    } else {
      console.warn(`⚠️ Se encontraron ${duplicados.length} CUITs duplicados:`);
      duplicados.forEach(d => {
        console.warn(`  CUIT ${d.cuit}:`, d.choferes);
      });
      return { ok: false, duplicados };
    }
  }

  async corregirIdVehiculos(): Promise<void> {
    console.log('--- Inicio corrección idVehiculo en colección vehiculos ---');
    const colRef = collection(this.firestore, '/Vantruck/datos/vehiculos');
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
      console.warn('La colección vehiculos está vacía.');
      return;
    }

    let corregidos = 0;
    for (const documento of snapshot.docs) {
      const datos = documento.data() as any;
      if ('idVehiculo' in datos) {
        const { idVehiculo, ...resto } = datos;
        await setDoc(doc(colRef, documento.id), resto);
        corregidos++;
      }
    }

    console.log(`Corrección completada: ${corregidos} documentos actualizados en vehiculos.`);
  }
}
