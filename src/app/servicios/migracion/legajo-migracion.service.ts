import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  getDocs,
  doc,
  setDoc,
} from '@angular/fire/firestore';
import { Documentacion, EstadoDocumentacion, calcularEstadoDocumentacion } from 'src/app/interfaces/legajo';
import { MigrationBackupService } from './migration-backup.service';

const TITULOS_LEGACY = [
  'DNI',
  'Antecedentes Penales',
  'Licencia',
  'LINTI',
  'Libreta Sanitaria',
  'ART/ACC. Personales',
  'Cedula',
  'Título',
  'Seguro',
  'VTV/RTO',
  'RUTA',
  'Senasa',
  'Fotos Camioneta',
];

export interface ResultadoMigracionLegajos {
  totalLegajos: number;
  legajosMigrados: number;
  documentosSinMatchCategoria: Array<{ idLegajo: string; idChofer: string; tituloOriginal: string }>;
  documentosFechaRequiereRevision: Array<{ idLegajo: string; idChofer: string; titulo: string; fechaVtoOriginal: any }>;
}

/**
 * Parsea fechaVto legacy a ISO yyyy-MM-dd, sin depender del parseo ambiguo de
 * `new Date(string)`. Devuelve null si no hay fecha, o si el formato es
 * irreconocible (en ese caso, loguear el valor original para revisión manual).
 */
function parsearFechaVtoLegacy(valor: any): { fechaIso: string | null; requiereRevision: boolean } {
  if (!valor || valor === 0) {
    return { fechaIso: null, requiereRevision: false };
  }

  // Ya es ISO (yyyy-MM-dd, con o sin hora)
  const matchIso = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(valor));
  if (matchIso) {
    return { fechaIso: `${matchIso[1]}-${matchIso[2]}-${matchIso[3]}`, requiereRevision: false };
  }

  // Formato d/m/yyyy o dd/mm/yyyy (con o sin hora al final) — asumir SIEMPRE
  // día/mes/año (locale Argentina), nunca mes/día
  const matchDmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(valor));
  if (matchDmy) {
    const dia = matchDmy[1].padStart(2, '0');
    const mes = matchDmy[2].padStart(2, '0');
    const anio = matchDmy[3];
    // Si día > 12, confirma que el formato es d/m (no podría ser m/d) — más confianza.
    // Si ambos <= 12, queda la asunción d/m documentada acá, no hay forma de
    // desambiguar sin ver el dato original — se aplica igual pero SIN marcar
    // requiereRevision solo por eso (asunción consciente, no error).
    return { fechaIso: `${anio}-${mes}-${dia}`, requiereRevision: false };
  }

  // Timestamp numérico (epoch millis)
  const num = Number(valor);
  if (!isNaN(num) && num > 0) {
    const fecha = new Date(num);
    if (!isNaN(fecha.getTime())) {
      return { fechaIso: fecha.toISOString().split('T')[0], requiereRevision: false };
    }
  }

  // Formato irreconocible — no adivinar, marcar para revisión manual
  return { fechaIso: null, requiereRevision: true };
}

@Injectable({ providedIn: 'root' })
export class LegajoMigrationService {

  constructor(
    private firestore: Firestore,
    private backupService: MigrationBackupService,
  ) {}

  async backupLegajos(): Promise<void> {
    await this.backupService.backupColeccion('legajos');
  }

  /**
   * Paso 1: crea categoriasDocumentacion a partir de los 13 títulos legacy.
   * Idempotente — si ya existen categorías con esos nombres, no duplica.
   */
  async crearCatalogoCategorias(): Promise<Map<string, string>> {
    const catRef = collection(this.firestore, '/Vantruck/datos/categoriasDocumentacion');
    const snapshot = await getDocs(catRef);

    const mapa = new Map<string, string>();
    snapshot.docs.forEach(documento => {
      const datos = documento.data() as any;
      if (datos.nombre) {
        mapa.set(datos.nombre, documento.id);
      }
    });

    let creadas = 0;
    for (let i = 0; i < TITULOS_LEGACY.length; i++) {
      const nombre = TITULOS_LEGACY[i];
      if (mapa.has(nombre)) continue; // ya existe (ejecución repetida), no duplicar
      const docRef = doc(catRef);
      await setDoc(docRef, { nombre, orden: i, activa: true });
      mapa.set(nombre, docRef.id);
      creadas++;
    }

    console.log(`Catálogo de categorías: ${creadas} creadas, ${mapa.size} totales.`);
    return mapa;
  }

  /**
   * Paso 2: migra cada Legajo — reescribe su documentacion[] al modelo nuevo.
   * Requiere el Map generado por crearCatalogoCategorias().
   */
  async migrarLegajos(mapaCategoria: Map<string, string>): Promise<ResultadoMigracionLegajos> {
    const legajosRef = collection(this.firestore, '/Vantruck/datos/legajos');
    const snapshot = await getDocs(legajosRef);

    const totalLegajos = snapshot.docs.length;
    let legajosMigrados = 0;
    const documentosSinMatchCategoria: ResultadoMigracionLegajos['documentosSinMatchCategoria'] = [];
    const documentosFechaRequiereRevision: ResultadoMigracionLegajos['documentosFechaRequiereRevision'] = [];

    for (const documento of snapshot.docs) {
      const datos = documento.data() as any;
      const idChofer = datos.idChofer ?? '';
      const documentacionVieja: any[] = Array.isArray(datos.documentacion) ? datos.documentacion : [];

      const documentacionNueva: Documentacion[] = [];
      for (const docViejo of documentacionVieja) {
        const tituloOriginal = docViejo.titulo ?? '';
        const idCategoria = mapaCategoria.get(tituloOriginal);
        if (!idCategoria) {
          documentosSinMatchCategoria.push({ idLegajo: documento.id, idChofer, tituloOriginal });
          continue; // no inventar categoría nueva silenciosamente — queda fuera del array nuevo
        }

        const { fechaIso, requiereRevision } = parsearFechaVtoLegacy(docViejo.fechaVto);
        if (requiereRevision) {
          documentosFechaRequiereRevision.push({
            idLegajo: documento.id,
            idChofer,
            titulo: tituloOriginal,
            fechaVtoOriginal: docViejo.fechaVto,
          });
        }

        // Recalcular siempre, no confiar en doc.estado viejo (bugs de agregación ya
        // identificados en la auditoría). fechaIso null (por sinVto o irresoluble)
        // → 'sinVto' como valor seguro.
        const estado: EstadoDocumentacion = docViejo.sinVto === true
          ? 'sinVto'
          : (fechaIso ? calcularEstadoDocumentacion(fechaIso) : 'sinVto');

        documentacionNueva.push({
          idCategoria,
          titulo: tituloOriginal,
          fechaVto: fechaIso,
          estado,
          imagenes: Array.isArray(docViejo.imagenes) ? docViejo.imagenes : [],
        });
      }

      // idLegajo NO se incluye — igual que el resto de las entidades (idXxx se
      // reconstruye desde el id del documento, nunca se persiste como campo).
      const legajoMigrado = {
        idChofer,
        documentacion: documentacionNueva,
        visible: datos.visible ?? true,
      };

      await setDoc(doc(legajosRef, documento.id), legajoMigrado);
      legajosMigrados++;
    }

    console.log(`Legajos migrados: ${legajosMigrados}/${totalLegajos}`);
    if (documentosSinMatchCategoria.length > 0) {
      console.warn(`Documentos sin match de categoría: ${documentosSinMatchCategoria.length}`, documentosSinMatchCategoria);
    }
    if (documentosFechaRequiereRevision.length > 0) {
      console.warn(`Documentos con fecha a revisar manualmente: ${documentosFechaRequiereRevision.length}`, documentosFechaRequiereRevision);
    }

    return { totalLegajos, legajosMigrados, documentosSinMatchCategoria, documentosFechaRequiereRevision };
  }

  /**
   * Verificación final: cuenta de documentos legajos antes (según backup) y
   * después de la migración — deben coincidir en cantidad de documentos
   * (no en contenido, que cambió a propósito).
   *
   * @param fechaBackupYYYYMMDD fecha del backup a comparar (formato del sufijo que
   *   genera MigrationBackupService.backupColeccion, ej. '20260812'). Default: hoy —
   *   correcto si se corre en la misma sesión que backupLegajos().
   */
  async verificarCantidad(fechaBackupYYYYMMDD?: string): Promise<{ antes: number; despues: number; coinciden: boolean }> {
    const fecha = fechaBackupYYYYMMDD ?? new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const antes = await this.backupService.contarDocumentos(`_backup_legajos_${fecha}`);
    const despues = await this.backupService.contarDocumentos('legajos');
    const coinciden = antes === despues;

    if (coinciden) {
      console.log(`Verificación OK: legajos tiene ${despues} documentos, backup (_backup_legajos_${fecha}) tenía ${antes}.`);
    } else {
      console.error(`Verificación FALLIDA: legajos tiene ${despues} documentos pero el backup (_backup_legajos_${fecha}) tenía ${antes}.`);
    }

    return { antes, despues, coinciden };
  }
}
