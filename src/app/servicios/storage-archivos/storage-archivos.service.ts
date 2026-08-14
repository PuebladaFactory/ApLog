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
    // Nombre único para evitar colisiones: timestamp + nombre original
    const nombreUnico = `${Date.now()}_${file.name}`;
    const path = `${carpeta}/${nombreUnico}`;
    const storageRef = ref(this.storage, path);

    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    return { nombre: file.name, url };
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
   * Elimina un archivo de Storage a partir de su URL de descarga.
   * No usado por Legajos en este frente (las versiones viejas se conservan
   * para el historial), pero se deja disponible para otros consumidores futuros.
   */
  async eliminarPorUrl(url: string): Promise<void> {
    const storageRef = ref(this.storage, url);
    await deleteObject(storageRef);
  }
}
