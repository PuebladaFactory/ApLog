import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { LogEntry } from 'src/app/interfaces/log-entry';
import { StorageService } from '../storage/storage.service';
import { LogDoc } from 'src/app/interfaces/log-doc';


@Injectable({
  providedIn: 'root',
})
export class LogService {
  private usuario: any;

  constructor(private afs: AngularFirestore) {
        
  }

  /**
   * Registra un evento en la colección `logs`.
   */
  async logEvent(
    accion: string,
    coleccion: string,
    detalle: string,
    idObjeto: number,
    resultado: boolean
  ): Promise<void> {
    try {
      const logId = this.afs.createId(); // Genera un ID único para el log
      const logEntry = this.createLogEntry(accion, coleccion, detalle, idObjeto, resultado);
      await this.afs.collection('/Vantruck/datos/logs').doc(logId).set(logEntry);
      console.log('Log registrado exitosamente:', logEntry);
    } catch (error) {
      console.error('Error al registrar el log:', error);
    }
  }

  /**
   * Crea un objeto LogEntry con los datos proporcionados.
   */
  private createLogEntry(
    accion: string,
    coleccion: string,
    detalle: string,
    idObjeto: number,
    resultado: boolean
  ): LogEntry {
    const jsonData = localStorage.getItem('usuario') || '';
    let usuarioLogueado = JSON.parse(jsonData)    
    this.usuario = structuredClone(usuarioLogueado[0]);
    console.log("log: this.usuario", this.usuario);
    
    return {
      timestamp: Date.now(),
      userId: this.usuario?.uid || 'Desconocido',
      userEmail: this.usuario?.email || 'Desconocido',
      action: accion,
      coleccion:coleccion,
      details: detalle,
      idObjet: idObjeto,      
      status: resultado ? 'SUCCESS' : 'ERROR',
    };
  }

  async logEventDoc(
    accion: string,
    coleccion: string,
    detalle: string,
    idObjeto: number,
    objeto:any,
    resultado: boolean,
    motivo:string,
  ): Promise<void> {
    try {
      const logId = this.afs.createId(); // Genera un ID único para el log
      const logDocId = this.afs.createId(); // Genera un ID único para el logDoc
      const logEntry = this.createLogEntry(accion, coleccion, detalle, idObjeto, resultado);
      const logDoc : LogDoc = {idDoc: logEntry.timestamp, logEntry: logEntry, objeto: objeto, motivoBaja:motivo} 
      await this.afs.collection('/Vantruck/datos/logs').doc(logId).set(logEntry);
      console.log('Log registrado exitosamente:', logEntry);
      await this.afs.collection('/Vantruck/datos/papelera').doc(logDocId).set(logDoc);
      console.log('Log registrado exitosamente:', logDoc);
    } catch (error) {
      console.error('Error al registrar el log y el logDoc:', error);
    }
  }

  
}

