import { Injectable } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL, deleteObject } from '@angular/fire/storage';

export interface ArchivoSubido {
  nombre: string;
  url: string;
}

@Injectable({ providedIn: 'root' })
export class StorageArchivosService {

  constructor(private storage: Storage) {}

  /**
   * Sube un archivo a Firebase Storage bajo la carpeta indicada y devuelve
   * su nombre original + URL de descarga pública.
   *
   * @param file archivo a subir (File del input)
   * @param carpeta ruta de carpeta destino, ej. 'legajos/{idChofer}' — el caller decide
   *   la organización; este servicio no impone estructura de dominio.
   */
  async subir(file: File, carpeta: string): Promise<ArchivoSubido> {
    const path = this.pathUnico(file, carpeta);
    const storageRef = ref(this.storage, path);

    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    return { nombre: file.name, url };
  }

  /**
   * Sube un archivo y devuelve SOLO su path en el bucket (ej.
   * 'facturas/{id}/1712345678901_f.pdf'), sin pedir la URL de descarga.
   * Para callers que persisten el path en vez de la URL con token (la URL
   * se resuelve al abrir con urlDescarga). A diferencia de subir(), no
   * cambia la forma de datos de ningún consumidor existente.
   */
  async subirYObtenerPath(file: File, carpeta: string): Promise<string> {
    const path = this.pathUnico(file, carpeta);
    await uploadBytes(ref(this.storage, path), file);
    return path;
  }

  /**
   * Sube varios archivos en paralelo a la misma carpeta.
   * Si CUALQUIERA falla, Promise.all rechaza — el caller decide qué hacer
   * (ver LegajoService.guardarDocumentacion: no debe escribir en Firestore
   * si la subida a Storage no se completó por entero).
   */
  async subirVarios(files: File[], carpeta: string): Promise<ArchivoSubido[]> {
    return Promise.all(files.map(file => this.subir(file, carpeta)));
  }

  /**
   * URL de descarga de un objeto a partir de su path (o de su URL). Se
   * resuelve al momento de abrir, con la sesión y las reglas vigentes —
   * para callers que persisten el path en vez de la URL con token.
   */
  async urlDescarga(pathOUrl: string): Promise<string> {
    return getDownloadURL(ref(this.storage, pathOUrl));
  }

  /**
   * Elimina un archivo de Storage a partir de su URL de descarga (o de su
   * path: `ref()` acepta ambos).
   * No usado por Legajos en este frente (las versiones viejas se conservan
   * para el historial), pero se deja disponible para otros consumidores futuros.
   */
  async eliminarPorUrl(url: string): Promise<void> {
    const storageRef = ref(this.storage, url);
    await deleteObject(storageRef);
  }

  /** Nombre único para evitar colisiones: timestamp + nombre original. */
  private pathUnico(file: File, carpeta: string): string {
    return `${carpeta}/${Date.now()}_${file.name}`;
  }
}
