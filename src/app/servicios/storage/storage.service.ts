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

  private _playa$ = new BehaviorSubject<any>(null)   //aca va interface my data
  public playa$ = this._playa$.asObservable()

  private _tarifas$ = new BehaviorSubject<any>(null)   //aca va interface my data
  public tarifas$ = this._tarifas$.asObservable()

  private _usuario$ = new BehaviorSubject<any>(null)   //aca va interface my data
  public usuario$ = this._usuario$.asObservable()

  private _clientes$ = new BehaviorSubject<any>(null)   //aca va interface my data
  public clientes$ = this._clientes$.asObservable()

  private _cajaLog$ = new BehaviorSubject<any>(null)   //aca va interface my data
  public cajaLog$ = this._cajaLog$.asObservable()

  private _facturacion$ = new BehaviorSubject<any>(null)   //aca va interface my data
  public facturacion$ = this._facturacion$.asObservable()

  private _logger$ = new BehaviorSubject<any>(null)   //aca va interface my data
  public logger$ = this._logger$.asObservable()



  updateObservable(componente: any, data: any) {
    switch (componente) {
      case "playa": {
        this._playa$.next(data)
        break;
      }
      case "tarifas": {
        this._tarifas$.next(data)
        break;
      }
      case "usuario": {
        this._usuario$.next(data)
        break;
      }

      case "clientes": {
        this._clientes$.next(data)
        break;
      }


      case "cajaLog": {
        this._cajaLog$.next(data)
        break;
      }


      case "facturacion": {
        this._facturacion$.next(data)
        break;
      }

      case "logger": {
        this._logger$.next(data)
        break;
      }

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
  }

  clearInfo(componente: any) {
    localStorage.removeItem('myData')
    this.updateObservable(componente, null)
  }

  clearAllLocalStorage() {
    localStorage.clear()
    this._playa$.next(null)
  }


  ////   INITIALIZER     ////////

  // Al inicio de la aplicacion se carga el storage con los datos de la base
  // al estar suscripto, cualquier cambio en la base se refleja en el storage.

  initializer() {

    this.getAllSorted("playa", 'fechas.fechaDate', 'asc')
    this.getAllSorted("tarifas", 'categoria', 'asc')
    this.getAllSorted("clientes", 'apellido', 'asc')
    this.getAllSorted("cajaLog", 'apertura', 'asc')
    this.getAllSorted("facturacion", 'fechaOp', 'asc')
    this.getAllSorted("logger", 'Fecha', 'asc')


  }





  // METODOS CRUD

  getAllSorted(componente: any, campo: any, orden: any) {

    // pasar campo y orden (asc o desc)
    this.dbFirebase
      .getAllSorted(componente, campo, orden)
      .subscribe(data => {

        this.setInfo(componente, data)
        // this.updateObservable(componente, data)
        console.log("storage initializer ", componente, data)


      });

  }



  addItem(componente: string, item: any): void {

    item.fechaOp = new Date()
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