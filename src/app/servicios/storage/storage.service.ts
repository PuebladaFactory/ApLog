import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DbFirestoreService } from '../database/db-firestore.service';



@Injectable({
  providedIn: 'root'
})
export class StorageService {


  // los componentes trabajan solo con el storage
  // el storage hace las operaciones crud solo cuando hagan falta 
  // los observables mantienen la info sincronizada entre comp y storage.


  constructor(private dbFirebase: DbFirestoreService,





  ) { }

  // Observables //

  private _clientes$ = new BehaviorSubject<any>(null)   //aca va interface my data
  public clientes$ = this._clientes$.asObservable()

  private _choferes$ = new BehaviorSubject<any>(null)   //aca va interface my data
  public choferes$ = this._choferes$.asObservable()

  private _usuario$ = new BehaviorSubject<any>(null)   //aca va interface my data
  public usuario$ = this._usuario$.asObservable()

  private _operaciones$ = new BehaviorSubject<any>(null)   //aca va interface my data
  public operaciones$ = this._operaciones$.asObservable()

  private _opActivas$ = new BehaviorSubject<any>(null)   //aca va interface my data
  public opActivas$ = this._opActivas$.asObservable()

  private _opCerradas$ = new BehaviorSubject<any>(null)   //aca va interface my data
  public opCerradas$ = this._opCerradas$.asObservable()

  private _jornadas$ = new BehaviorSubject<any>(null)   //aca va interface my data
  public jornadas$ = this._jornadas$.asObservable()

  private _consultasOpActivas$ = new BehaviorSubject<any>(null)   //aca va interface my data
  public consultasOpActivas$ = this._consultasOpActivas$.asObservable()

  private _consultasOpCerradas$ = new BehaviorSubject<any>(null)   //aca va interface my data
  public consultasOpCerradas$ = this._consultasOpCerradas$.asObservable()

  /*private _logger$ = new BehaviorSubject<any>(null)   //aca va interface my data
  public logger$ = this._logger$.asObservable() */



  updateObservable(componente: any, data: any) {
    switch (componente) {
      case "clientes": {
        this._clientes$.next(data)
        break;
      }
      case "choferes": {
        this._choferes$.next(data)
        break;
      }
      case "usuario": {
        this._usuario$.next(data)
        break;
      }

      case "operaciones": {
        this._operaciones$.next(data)
        break;
      }

      case "operacionesActivas": {
        this._opActivas$.next(data)
        break;
      }


      case "operacionesCerradas": {
        this._opCerradas$.next(data)
        break;
      }

      case "jornadas": {
        this._jornadas$.next(data)
        break;
      }

      case "consultasOpActivas": {
        this._consultasOpActivas$.next(data)
        break;
      }

      case "consultasOpCerradas": {
        this._consultasOpCerradas$.next(data)
        break;
      }

      /*case "logger": {
        this._logger$.next(data)
        break;
      } */

      default: {
        //statements; 
        break;
      }
    }

  }





  // metodos del storage

  setInfo(componente: any, data: any) {    // interface mydata en vez de any
    const jsonData = JSON.stringify(data)
    localStorage.setItem(`${componente}`, JSON.stringify(data)) //local storage trabaja solo con strings
    this.updateObservable(componente, data)

  }

  loadInfo(componente: any) {
    const data = JSON.parse(localStorage.getItem(componente) || "")
    this.updateObservable(componente, data)
    return data;
  }

  clearInfo(componente: any) {
    localStorage.removeItem('myData')
    this.updateObservable(componente, null)
  }

  clearAllLocalStorage() {
    localStorage.clear()
    //this._playa$.next(null)
  }


  ////   INITIALIZER     ////////

  // Al inicio de la aplicacion se carga el storage con los datos de la base
  // al estar suscripto, cualquier cambio en la base se refleja en el storage.


  // metodo initializer si el rol es admin
  initializerAdmin() {

    this.getAllSorted("clientes", 'idCliente', 'asc')
    this.getAllSorted("choferes", 'idChofer', 'asc')
    this.getAllSorted("operacionesActivas", 'fecha', 'asc')
    this.getAllSorted("operacionesCerradas", 'fecha', 'asc')
    this.getAllSorted("operacionesCerradas", 'idOperacion', 'asc')
    this.getAllSorted("jornadas", 'idChofer', 'asc')
   

  }

  // metodo initializer si el rol es user
  initializerUser(idChofer:any) {
    this.getByFieldValue("choferes", "idChofer", idChofer)
    this.getByFieldValue("operacionesActivas", "chofer.idChofer", idChofer)
    this.getByFieldValue("operacionesCerradas", "chofer.idChofer", idChofer)
    

  }





  // METODOS CRUD

  getAllSorted(componente: any, campo: any, orden: any) {

    // pasar campo y orden (asc o desc)
    this.dbFirebase
      .getAllSorted(componente, campo, orden)
      .subscribe(data => {

        this.setInfo(componente, data)
        // this.updateObservable(componente, data)
        console.log("storage initializer ", componente, data);
      });

  }

  getByFieldValue(componente: any, campo:any, value:any){
    this.dbFirebase
      .getByFieldValue(componente, campo, value)
      .subscribe(data => {
        this.setInfo(componente, data)
      })
  }

  getByDateValue(componente:string, campo:string, value1:any, value2:any, titulo:string){
    this.dbFirebase
    .getByDateValue(componente, campo, value1, value2)
    .subscribe(data => {
      this.setInfo(titulo , data)
    })
    }



  addItem(componente: string, item: any): void {

    //item.fechaOp = new Date()
    console.log(" storage add item ", componente, item,)


    this.dbFirebase.create(componente, item)
      // .then((data) => console.log(data))
      // .then(() => this.ngOnInit())
      .catch((e) => console.log(e.message));
  }



  deleteItem(componente: string, item: any): void {

    console.log(" storage delete item ", componente, item,)

    this.dbFirebase.delete(componente, item.id)
      // .then((data) => console.log(data))
      // .then(() => this.ngOnInit())
      // .then(() => console.log("pasa por delete metodo?"))
      .catch((e) => console.log(e.message));

  }

  updateItem(componente: string, item: any): void {
    console.log(" storage update item ", componente, item,)

    this.dbFirebase.update(componente, item)
      // .then((data) => console.log(data))
      // .then(() => this.ngOnInit())
      .catch((e) => console.log(e.message));

  }


}