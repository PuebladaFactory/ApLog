import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';
import { Usuario } from 'src/app/interfaces/usuario';

@Injectable({
  providedIn: 'root',
})
export class GestionUsuariosService {
  constructor(private firestore: Firestore) {}

  /**
   * Lectura puntual (no listener) de toda la colección `users`. Mismo
   * patrón que CuentaCorrienteService.obtenerRankingMorosos(): getDocs
   * directo sobre la colección, sin ConId (el doc ya trae su propio
   * campo `uid`, que coincide con el id de Firestore).
   */
  async obtenerUsuarios(): Promise<Usuario[]> {
    const usersRef = collection(this.firestore, 'users');
    const snap = await getDocs(usersRef);
    return snap.docs.map((doc) => doc.data() as Usuario);
  }
}
