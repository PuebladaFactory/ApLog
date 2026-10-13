import { Injectable } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, Observable } from 'rxjs';
import { DbFirestoreService } from '../database/db-firestore.service';
import { LogService } from '../log/log.service';
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
    private logService: LogService,
    private usuarioSesion: UsuarioSesionService,
  ) { }


  // Observables //

  private _clientes$ = new BehaviorSubject<any>(this.loadInfo('clientes') || []);
  public clientes$ = this._clientes$.asObservable();

  private _choferes$ = new BehaviorSubject<any>(this.loadInfo('choferes') || []);
  public choferes$ = this._choferes$.asObservable()
  
  private _proveedores$ = new BehaviorSubject<any>(this.loadInfo('proveedores') || []);
  public proveedores$ = this._proveedores$.asObservable();

  private _users$ = new BehaviorSubject<any>(this.loadInfo('users') || [] || null);
  public users$ = this._users$.asObservable();

  // LR2a (frente lazy-fechas): solo quedan los observables que tienen
  // suscriptores. El resto de las claves solo se guarda en localStorage.
  updateObservable(componente: any, data: any) {
    switch (componente) {
      case "clientes": {
        this._clientes$.next(data);
        break;
      }
      case "choferes": {
        this._choferes$.next(data);
        break;
      }
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


  syncChangesLimit<T>(componente: string, field:string, limit: number): void {    
    this.dbFirebase.getMostRecentLimit<T>(componente, field, limit)
    .pipe(distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)))
    .subscribe(data => {
      //const currentData = this.loadInfo(componente);
      ////////console.log("currentData", currentData);
      ////////console.log("data", data);
      /* if (!currentData || JSON.stringify(currentData) !== JSON.stringify(data)) {
        //////console.log(`Datos sincronizados para ${componente}`, data);
        this.setInfo(componente, data); // Actualiza el caché
        this.updateObservable(componente, data); // Actualiza el observable
      } else {
        //////console.log(`Datos no modificados para ${componente}, no se actualiza.`);
      } */
      
    });
  }

    listenForChangesField<T>(componente: string, campo:string, valor:any): void {
      //console.log("admin: ", componente);    
      this.dbFirebase.getAllStateChangesByField<T>(componente, campo, valor)
        .subscribe(changes => {
          if (changes.length > 0) {
            //console.log(`${componente}: Cambios detectados`, changes);
            let currentData = this.loadInfo(componente) || [];          
            changes.forEach(change => {
              if (change.type === 'added') {
                ////console.log("change", change);
                const existe = currentData.some(obj => obj.id === change.id);

                if (!existe) {
                  ////console.log("El id no está en el array");
                  currentData.push(change);
                } else {
                  //console.log("sin cambios en el componente: ", componente);
                }
                
                
              } else if (change.type === 'modified') {
                //console.log("editar!!!!");
                currentData = currentData.map(item => item.id === change.id ? change : item);
              } else if (change.type === 'removed') {
                //console.log("DAAALEEE LOOOOCOOO!!!!");
                
                currentData = currentData.filter(item => item.id !== change.id);
              }
            });
    
            this.setInfo(componente, currentData); // Actualiza caché          
          }
        });
    }

  getObservable<T>(componente: string): Observable<T[]> {
    switch (componente) {
      case 'clientes':
        return this._clientes$.asObservable();
      case 'choferes':
        return this._choferes$.asObservable();
      case 'proveedores':
        return this._proveedores$.asObservable();
      case 'users':
        return this._users$.asObservable();
      default:
        throw new Error(`Componente no reconocido: ${componente}`);
    }
  }

      public addItem(componente: string, item: any, idItem:any, accion:string, msj: string): void {
        //let accion: string = "ALTA";
        let regLog:boolean = this.controlLog(componente, accion);
        this.dbFirebase.create(componente, item).then(() => {
          if (!this.usuarioSesion.esRol('dev') && regLog){
            this.logService.logEvent(accion, componente, msj, idItem, true);
          }

        }).catch((e) => {
          if (!this.usuarioSesion.esRol('dev') && regLog){
            this.logService.logEvent(accion, componente, msj, idItem, false);
          }
          console.log(e.message)});
      }

      public deleteItem(componente: string, item: any,  idItem:number, accion:string, msj:string): void {
        //console.log(" storage deleteItem ", componente)
        let regLog:boolean = this.controlLog(componente, accion);
        this.dbFirebase.delete(componente, item.id).then(() => {
          if (!this.usuarioSesion.esRol('dev') && regLog) {
            this.logService.logEvent(accion, componente, msj, idItem, true);
          }
        }).catch((e) => {
          if (!this.usuarioSesion.esRol('dev') && regLog){
            this.logService.logEvent(accion, componente, msj, idItem, false);
          }
          console.log(e.message)});
      }

      public updateItem(componente: string, item: any, idItem:any, accion:string, msj: string, uid:any): void {
        //////console.log("storage update item", componente, item);
        let regLog:boolean = this.controlLog(componente, accion);
        //console.log("regLog", regLog);

        this.dbFirebase.update(componente, item, uid).then(() => {
          if (!this.usuarioSesion.esRol('dev') && regLog) {
            this.logService.logEvent(accion, componente, msj, idItem, true);
          }
        }).catch((e) => {
          if (!this.usuarioSesion.esRol('dev') && regLog){
            this.logService.logEvent(accion, componente, msj, idItem, false);
          }
          console.log(e.message)});
      }

      private controlLog(componente: string, accion:string) {
        switch(componente){
          case "clientes":
          case "choferes":
          case "proveedores":
          case "legajos":          
          case "operaciones": 
          case "tarifasGralCliente":
          case "tarifasEspCliente":
          case "tarifasPersCliente":            
          case "tarifasGralChofer":            
          case "tarifasEspChofer":
          case "tarifasPersChofer":
          case "tarifasGralProveedor":
          case "tarifasEspProveedor":
          case "users":
          case "facturaCliente":
          case "facturaChofer":
          case "facturaProveedor":
          case "proforma":
          case "tableroDiario":
          case "vendedores":
          case "noOperativo":
            if(accion === "INTERNA"){
              return false;
            } else{
              return true;
            }                                 
          case "facturaOpCliente":
            if(accion === "EDITAR"){
              return true;
            } else {
              return false;
            }
            /* switch(accion){
              case "ALTA":
                return false;
              case "EDITAR":
                return true;
              case "BAJA":
                return false;              
              default:
                return false;
            } */
          case "facturaOpChofer":
            if(accion === "EDITAR"){
              return true;
            } else {
              return false;
            }
            /* switch(accion){
              case "ALTA":
                return false;
              case "EDITAR":
                return true;
              case "BAJA":
                return false;              
              default:
                return false;
            } */
          case "facturaOpProveedor":
            if(accion === "EDITAR"){
              return true;
            } else {
              return false;
            }
            /* switch(accion){
              case "ALTA":
                return false;
              case "EDITAR":
                return true;
              case "BAJA":
                return false;              
              default:
                return false;
            } */
          case "facOpLiqCliente":
            return false;
          case "facOpLiqChofer":
            return false;
          case "facOpLiqProveedor":
            return false;
          default:
            return false;
         
        }
        
      }
    
}