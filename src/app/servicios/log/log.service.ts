import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { LogEntry } from 'src/app/interfaces/log-entry';
import { StorageService } from '../storage/storage.service';


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
      await this.afs.collection('logs').doc(logId).set(logEntry);
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
}

