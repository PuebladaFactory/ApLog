import { inject, Injectable } from '@angular/core';
import { Firestore, collection, doc, setDoc } from '@angular/fire/firestore';
import { LogEntry } from 'src/app/interfaces/log-entry';
import { LogDoc } from 'src/app/interfaces/log-doc';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';

@Injectable({
  providedIn: 'root',
})
export class LogService {
  private firestore = inject(Firestore);
  private usuarioSesion = inject(UsuarioSesionService);

  /**
   * Registra un evento en la colección `logs`.
   */
  async logEvent(
    accion: string,
    coleccion: string,
    detalle: string,
    idObjeto: string | number,
    resultado: boolean
  ): Promise<void> {
    try {
      const logId = doc(collection(this.firestore, '/Vantruck/datos/logs')).id; // Genera un ID único
      const logEntry = this.createLogEntry(accion, coleccion, detalle, idObjeto, resultado, 0);
      console.log("LogService: logEntry: ", logEntry);
      
      await setDoc(doc(this.firestore, '/Vantruck/datos/logs', logId), logEntry);
    } catch (error) {
      console.error('Error al registrar el log:', error);
    }
  }

  /**
   * Crea un objeto LogEntry con los datos proporcionados.
   */
  createLogEntry(
    accion: string,
    coleccion: string,
    detalle: string,
    idObjeto: string | number,
    resultado: boolean,
    incremento: number
  ): LogEntry {
    const usuario = this.usuarioSesion.getUsuarioActual();

    return {
      timestamp: Date.now() + incremento,
      userId: usuario?.uid || 'Desconocido',
      userEmail: usuario?.email || 'Desconocido',
      action: accion,
      coleccion: coleccion,
      details: detalle,
      idObjet: idObjeto,
      status: resultado ? 'SUCCESS' : 'ERROR',
    };
  }

  /**
   * Registra un evento y un objeto completo (como "papelera") en Firestore.
   */
  async logEventDoc(
    accion: string,
    coleccion: string,
    detalle: string,
    idObjeto: string | number,
    objeto: any,
    resultado: boolean,
    motivo: string
  ): Promise<void> {
    try {
      const logId = doc(collection(this.firestore, '/Vantruck/datos/logs')).id;
      const logDocId = doc(collection(this.firestore, '/Vantruck/datos/papelera')).id;
      const logEntry = this.createLogEntry(accion, coleccion, detalle, idObjeto, resultado, 0);

      const logDoc: LogDoc = {
        idDoc: logEntry.timestamp,
        logEntry: logEntry,
        objeto: objeto,
        motivoBaja: motivo,
      };

      await setDoc(doc(this.firestore, '/Vantruck/datos/logs', logId), logEntry);
      await setDoc(doc(this.firestore, '/Vantruck/datos/papelera', logDocId), logDoc);
    } catch (error) {
      console.error('Error al registrar el log y el logDoc:', error);
    }
  }
}
