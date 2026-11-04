import { Injectable } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, Observable } from 'rxjs';
import { DbFirestoreService } from '../database/db-firestore.service';
import { UsuarioSesionService } from '../usuario-sesion/usuario-sesion.service';



@Injectable({
  providedIn: 'root'
})
export class StorageService {

  // los componentes trabajan solo con el storage
  // el storage hace las operaciones crud solo cuando hagan falta 
  // los observables mantienen la info sincronizada entre comp y storage.


  constructor(
    private dbFirebase: DbFirestoreService,
    private usuarioSesion: UsuarioSesionService,
  ) { }


  // Observables //

  private _proveedores$ = new BehaviorSubject<any>(this.loadInfo('proveedores') || []);
  public proveedores$ = this._proveedores$.asObservable();

  // Sin observable público: solo lo usan internamente getAllColection /
  // getObservable (initializerAdmin). Los lectores de 'users' usan loadInfo.
  private _users$ = new BehaviorSubject<any>(this.loadInfo('users') || [] || null);

  // LR2a (frente lazy-fechas): solo quedan los observables que tienen
  // suscriptores. El resto de las claves solo se guarda en localStorage.
  updateObservable(componente: any, data: any) {
    switch (componente) {
      case "proveedores": {
        this._proveedores$.next(data);
        break;
      }
      case "users": {
        this._users$.next(data);
        break;
      }
      default: {
        break;
      }
    }
  }

  // metodos del storage

  public setInfo(componente: string, data: any[]) {
    ////console.log(`Guardando datos en ${componente}:`, data);
    const jsonData = JSON.stringify(data);
    localStorage.setItem(componente, jsonData);
    this.updateObservable(componente, data);
  }

  public loadInfo(componente: string): any[] {
    const jsonData = localStorage.getItem(componente);
    if (jsonData) {
      try {
        return JSON.parse(jsonData);
      } catch (e) {
        console.error("Error parsing JSON from localStorage for componente", componente, e);
        return [];
      }
    }
    return [];
  }

  public clearAllLocalStorage() {
    try {
      localStorage.clear();
      ////console.log('Local storage eliminado correctamente.');
    } catch (error) {
      console.error('Error al limpiar el local storage:', error);
    }
  }


  ////   INITIALIZER     ////////

  // Al inicio de la aplicacion se carga el storage con los datos de la base
  // al estar suscripto, cualquier cambio en la base se refleja en el storage.


  // metodo initializer si el rol es admin
  initializerAdmin() {
    if (this.usuarioSesion.esRol('dev', 'admin')) {
      this.getAllColection<any>("users");
    }
  }



  // METODOS CRUD

  getAllColection<T>(componente: string){
    ////console.log("getAllUser componente: ", componente);
    const cachedData = this.loadInfo(componente); // Carga desde local storage
    //////console.log("getAll cachedData: ", cachedData);
    
    if (cachedData.length > 0) {
      //////console.log(`Datos cargados desde el caché para ${componente}`, cachedData);
      this.updateObservable(componente, cachedData);
    } else {
      //////console.log(`Caché vacío, consultando Firestore para ${componente}`);
      this.dbFirebase.getAllColectionUsers<T>(componente)
      .pipe(distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)))
      .subscribe(data => {
        this.setInfo(componente, data); // Guarda en el caché
        this.updateObservable(componente, data); // Actualiza el observable
      });
    }
    return this.getObservable(componente); // Devuelve el observable
  }


  getObservable<T>(componente: string): Observable<T[]> {
    switch (componente) {
      case 'proveedores':
        return this._proveedores$.asObservable();
      case 'users':
        return this._users$.asObservable();
      default:
        throw new Error(`Componente no reconocido: ${componente}`);
    }
  }


}