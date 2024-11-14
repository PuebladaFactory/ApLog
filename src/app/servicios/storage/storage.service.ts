import { Injectable } from '@angular/core';
import { BehaviorSubject, take } from 'rxjs';
import { DbFirestoreService } from '../database/db-firestore.service';



@Injectable({
  providedIn: 'root'
})
export class StorageService {

  date:any = new Date();
  primerDia: any = new Date(this.date.getFullYear(), this.date.getMonth() , 1).toISOString().split('T')[0];
  ultimoDia:any = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).toISOString().split('T')[0];  

  // los componentes trabajan solo con el storage
  // el storage hace las operaciones crud solo cuando hagan falta 
  // los observables mantienen la info sincronizada entre comp y storage.


  constructor(private dbFirebase: DbFirestoreService,





  ) { }

  // Observables //

  private _clientes$ = new BehaviorSubject<any[]>(this.loadInfo('clientes') || []);
  public clientes$ = this._clientes$.asObservable();

  private _choferes$ = new BehaviorSubject<any>(this.loadInfo('choferes') || []);
  public choferes$ = this._choferes$.asObservable()
  
  private _proveedores$ = new BehaviorSubject<any>(this.loadInfo('proveedores') || []);
  public proveedores$ = this._proveedores$.asObservable();

  private _usuario$ = new BehaviorSubject<any>(this.loadInfo('usuario') || []);
  public usuario$ = this._usuario$.asObservable()

  private _operaciones$ = new BehaviorSubject<any>(this.loadInfo('operaciones') || []);
  public operaciones$ = this._operaciones$.asObservable()

  private _opActivas$ = new BehaviorSubject<any>(this.loadInfo('operacionesActivas') || []);
  public opActivas$ = this._opActivas$.asObservable()

  private _opCerradas$ = new BehaviorSubject<any>(null)   //aca va interface my data
  public opCerradas$ = this._opCerradas$.asObservable()

  private _jornadas$ = new BehaviorSubject<any>(null)   //aca va interface my data
  public jornadas$ = this._jornadas$.asObservable()

  private _consultasOp$ = new BehaviorSubject<any>(this.loadInfo('consultasOp') || []);
  public consultasOp$ = this._consultasOp$.asObservable()

  private _consultasOpActivas$ = new BehaviorSubject<any>(this.loadInfo('consultasOpActivas') || []);
  public consultasOpActivas$ = this._consultasOpActivas$.asObservable()

  private _consultasOpCerradas$ = new BehaviorSubject<any>(null)   //aca va interface my data
  public consultasOpCerradas$ = this._consultasOpCerradas$.asObservable()

  private _historialTarifas$ = new BehaviorSubject<any>(this.loadInfo('tarifasChofer') || []);
  public historialTarifas$ = this._historialTarifas$.asObservable()

  private _historialTarifasClientes$ = new BehaviorSubject<any>(this.loadInfo('tarifasCliente') || []);
  public historialTarifasClientes$ = this._historialTarifasClientes$.asObservable()

  private _historialTarifasProveedores$ = new BehaviorSubject<any>(this.loadInfo('tarifasProveedor') || []);
  public historialTarifasProveedores$ = this._historialTarifasProveedores$.asObservable();

  private _legajos$ = new BehaviorSubject(this.loadInfo('legajos') || []);
  public legajos$ = this._legajos$.asObservable()

  private _perfilChofer$ = new BehaviorSubject<any>(this.loadInfo('perfilChofer') || []);
  public perfilChofer$ = this._perfilChofer$.asObservable();

  private _consultasFacOpCliente$ = new BehaviorSubject<any>(this.loadInfo('consultasFacOpCliente') || []);
  public consultasFacOpCliente$ = this._consultasFacOpCliente$.asObservable();

  private _consultasFacOpChofer$ = new BehaviorSubject<any>(this.loadInfo('consultasFacOpChofer') || []);
  public consultasFacOpChofer$ = this._consultasFacOpChofer$.asObservable();

  private _consultasFacOpProveedor$ = new BehaviorSubject<any>(this.loadInfo('consultasFacOpProveedor') || []);
  public consultasFacOpProveedor$ = this._consultasFacOpProveedor$.asObservable();

  private _consultasFacCliente$ = new BehaviorSubject<any>(this.loadInfo('consultasFacCliente') || []);
  public consultasFacCliente$ = this._consultasFacCliente$.asObservable();

  private _consultasFacChofer$ = new BehaviorSubject<any>(this.loadInfo('consultasFacChofer') || []);
  public consultasFacChofer$ = this._consultasFacChofer$.asObservable();

  private _consultasFacProveedor$ = new BehaviorSubject<any>(this.loadInfo('consultasFacProveedor') || []);
  public consultasFacProveedor$ = this._consultasFacProveedor$.asObservable();
  
  private _consultasFacOpLiqChofer$ = new BehaviorSubject<any>(this.loadInfo('consultasFacOpLiqChofer') || []);
  public consultasFacOpLiqChofer$ = this._consultasFacOpLiqChofer$.asObservable();
  
  private _consultasFacOpLiqCliente$ = new BehaviorSubject<any>(this.loadInfo('consultasFacOpLiqCliente') || []);
  public consultasFacOpLiqCliente$ = this._consultasFacOpLiqCliente$.asObservable();

  private _consultasFacOpLiqProveedor$ = new BehaviorSubject<any>(this.loadInfo('consultasFacOpLiqProveedor') || []);
  public consultasFacOpLiqProveedor$ = this._consultasFacOpLiqProveedor$.asObservable();

  private _erroresTarifas$ = new BehaviorSubject<any>(this.loadInfo('erroresTarifas') || []);
  public erroresTarifas$ = this._erroresTarifas$.asObservable();

  private _facOpLiqChofer$ = new BehaviorSubject<any>(this.loadInfo('facOpLiqChofer') || []);
  public facOpLiqChofer$ = this._facOpLiqChofer$.asObservable();

  private _facOpLiqCliente$ = new BehaviorSubject<any>(this.loadInfo('facOpLiqCliente') || []);
  public facOpLiqCliente$ = this._facOpLiqCliente$.asObservable();

  private _facOpLiqProveedor$ = new BehaviorSubject<any>(this.loadInfo('facOpLiqProveedor') || []);
  public facOpLiqProveedor$ = this._facOpLiqProveedor$.asObservable();

  private _tarifaChoferHistorial$ = new BehaviorSubject<any>(this.loadInfo('tarifaChoferHistorial') || []);
  public tarifaChoferHistorial$ = this._tarifaChoferHistorial$.asObservable();

  private _tarifaClienteHistorial$ = new BehaviorSubject<any>(this.loadInfo('tarifaClienteHistorial') || []);
  public tarifaClienteHistorial$ = this._tarifaClienteHistorial$.asObservable();

  private _tarifaProveedorHistorial$ = new BehaviorSubject<any>(this.loadInfo('tarifaProveedorHistorial') || []);
  public tarifaProveedorHistorial$ = this._tarifaProveedorHistorial$.asObservable();
  
  private _ultTarifaGralCliente$ = new BehaviorSubject<any>(this.loadInfo('ultTarifaGralCliente') || []);
  public ultTarifaGralCliente$ = this._ultTarifaGralCliente$.asObservable();

  private _ultTarifaEspCliente$ = new BehaviorSubject<any>(this.loadInfo('ultTarifaEspCliente') || []);
  public ultTarifaEspCliente$ = this._ultTarifaEspCliente$.asObservable();

  private _ultTarifaPersCliente$ = new BehaviorSubject<any>(this.loadInfo('ultTarifaPersCliente') || []);
  public ultTarifaPersCliente$ = this._ultTarifaPersCliente$.asObservable();

  private _ultTarifaGralChofer$ = new BehaviorSubject<any>(this.loadInfo('ultTarifaGralChofer') || []);
  public ultTarifaGralChofer$ = this._ultTarifaGralChofer$.asObservable();

  private _ultTarifaEspChofer$ = new BehaviorSubject<any>(this.loadInfo('ultTarifaEspChofer') || []);
  public ultTarifaEspChofer$ = this._ultTarifaEspChofer$.asObservable();

  private _ultTarifaPersChofer$ = new BehaviorSubject<any>(this.loadInfo('ultTarifaPersChofer') || []);
  public ultTarifaPersChofer$ = this._ultTarifaPersChofer$.asObservable();

  private _ultTarifaGralProveedor$ = new BehaviorSubject<any>(this.loadInfo('ultTarifaGralProveedor') || []);
  public ultTarifaGralProveedor$ = this._ultTarifaGralProveedor$.asObservable();

  private _ultTarifaEspProveedor$ = new BehaviorSubject<any>(this.loadInfo('ultTarifaEspProveedor') || []);
  public ultTarifaEspProveedor$ = this._ultTarifaEspProveedor$.asObservable();

  private _clienteSeleccionado$ = new BehaviorSubject<any>(this.loadInfo('clienteSeleccionado') || []);
  public clienteSeleccionado$ = this._clienteSeleccionado$.asObservable();

  private _choferSeleccionado$ = new BehaviorSubject<any>(this.loadInfo('choferSeleccionado') || []);
  public choferSeleccionado$ = this._choferSeleccionado$.asObservable();

  private _proveedorSeleccionado$ = new BehaviorSubject<any>(this.loadInfo('proveedorSeleccionado') || []);
  public proveedorSeleccionado$ = this._proveedorSeleccionado$.asObservable();
  
  private _tEspecialCliente$ = new BehaviorSubject<any>(this.loadInfo('tEspecialCliente') || []);
  public tEspecialCliente$ = this._tEspecialCliente$.asObservable();

  private _consolaTarifa$ = new BehaviorSubject<any>(this.loadInfo('consolaTarifa') || []);
  public consolaTarifa$ = this._consolaTarifa$.asObservable();

  private _modoTarifa$ = new BehaviorSubject<any>(this.loadInfo('modoTarifa') || []);
  public modoTarifa$ = this._modoTarifa$.asObservable();

  private _opTarEve$ = new BehaviorSubject<any>(this.loadInfo('opTarifaEventual') || []);
  public opTarEve$ = this._opTarEve$.asObservable();

  private _opTarPers$ = new BehaviorSubject<any>(this.loadInfo('opTarifaPersonalizada') || []);
  public opTarPers$ = this._opTarPers$.asObservable();
  
  private _vehiculosChofer$ = new BehaviorSubject<any>(this.loadInfo('vehiculosChofer') || []);
  public vehiculosChofer$ = this._vehiculosChofer$.asObservable();
  
  private _fechasConsulta$ = new BehaviorSubject<any>(this.loadInfo('fechasConsulta') || []);
  public fechasConsulta$ = this._fechasConsulta$.asObservable();

  private _facturaOpCliente$ = new BehaviorSubject<any>(this.loadInfo('facturaOpCliente') || []);
  public facturaOpCliente$ = this._facturaOpCliente$.asObservable();

  private _facturaOpChofer$ = new BehaviorSubject<any>(this.loadInfo('facturaOpChofer') || []);
  public facturaOpChofer$ = this._facturaOpChofer$.asObservable();

  private _facturaOpProveedor$ = new BehaviorSubject<any>(this.loadInfo('facturaOpProveedor') || []);
  public facturaOpProveedor$ = this._facturaOpProveedor$.asObservable();

  private _historialTarifaGralCliente$ = new BehaviorSubject<any>(this.loadInfo('historialTarifaGralCliente') || []);
  public historialTarifaGralCliente$ = this._historialTarifaGralCliente$.asObservable();

  private _historialTarifaGralChofer$ = new BehaviorSubject<any>(this.loadInfo('historialTarifaGralChofer') || []);
  public historialTarifaGralChofer$ = this._historialTarifaGralChofer$.asObservable();

  private _historialTarifaGralProveedor$ = new BehaviorSubject<any>(this.loadInfo('historialTarifaGralProveedor') || []);
  public historialTarifaGralProveedor$ = this._historialTarifaGralProveedor$.asObservable();

  private _historialTarifaPersCliente$ = new BehaviorSubject<any>(this.loadInfo('historialTarifaPersCliente') || []);
  public historialTarifaPersCliente$ = this._historialTarifaPersCliente$.asObservable();

  private _tarifasEventuales$ = new BehaviorSubject<any>(this.loadInfo('tarifasEventuales') || []);
  public tarifasEventuales$ = this._tarifasEventuales$.asObservable();

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

      case "consultasOp": {
        this._consultasOp$.next(data)
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

      case "tarifasChofer": {
        this._historialTarifas$.next(data)
        break;
      }

      case "tarifasCliente": {
        this._historialTarifasClientes$.next(data)
        break;
      }

      case "tarifasProveedor": {
        this._historialTarifasProveedores$.next(data)
        break;
      }

      case "legajos": {
        this._legajos$.next(data);
        break;
      }

      case "perfilChofer":{
        this._perfilChofer$.next(data);
        break
      }

      case "proveedores":{
        this._proveedores$.next(data);
        break
      }

      case "facturaOpCliente":{
        this._facturaOpCliente$.next(data);
        break
      }

      case "facturaOpChofer":{
        this._facturaOpChofer$.next(data);
        break
      }

      case "facturaOpProveedor":{
        this._facturaOpProveedor$.next(data);
        break
      }

      case "consultasFacOpCliente": {
        this._consultasFacOpCliente$.next(data)
        break;
      }

      case "consultasFacOpChofer": {
        this._consultasFacOpChofer$.next(data)
        break;
      }

      case "consultasFacOpProveedor": {
        this._consultasFacOpProveedor$.next(data)
        break;
      }

      case "consultasFacCliente": {
        this._consultasFacCliente$.next(data)
        break;
      }

      case "consultasFacChofer": {
        this._consultasFacChofer$.next(data)
        break;
      }

      case "consultasFacProveedor": {
        this._consultasFacProveedor$.next(data)
        break;
      }

      case "consultasFacOpLiqChofer": {
        this._consultasFacOpLiqChofer$.next(data)
        break;
      }
      
      case "consultasFacOpLiqCliente": {
        this._consultasFacOpLiqCliente$.next(data)
        break;
      }

      case "consultasFacOpLiqProveedor": {
        this._consultasFacOpLiqProveedor$.next(data)
        break;
      }

      case "erroresTarifas": {
        this._erroresTarifas$.next(data)
        break;
      }

      case "facOpLiqChofer":{
        this._facOpLiqChofer$.next(data)
        break;
      }

      case "facOpLiqCliente":{
        this._facOpLiqCliente$.next(data)
        break;
      }

      case "facOpLiqProveedor":{
        this._facOpLiqProveedor$.next(data)
        break;
      }

      case "tarifaChoferHistorial":{
        this._tarifaChoferHistorial$.next(data)
        break;
      }

      case "tarifaClienteHistorial":{
        this._tarifaClienteHistorial$.next(data)
        break;
      }

      case "tarifaProveedorHistorial":{
        this._tarifaProveedorHistorial$.next(data)
        break;
      }

      case "ultTarifaGralCliente":{
        this._ultTarifaGralCliente$.next(data)
        break;
      }

      case "ultTarifaEspCliente":{
        this._ultTarifaEspCliente$.next(data)
        break;
      }

      case "ultTarifaGralChofer":{
        this._ultTarifaGralChofer$.next(data)
        break;
      }

      case "ultTarifaEspChofer":{
        this._ultTarifaEspChofer$.next(data)
        break;
      }

      case "ultTarifaPersCliente":{
        this._ultTarifaPersCliente$.next(data)
        break;
      }

      case "ultTarifaPersChofer":{
        this._ultTarifaPersChofer$.next(data)
        break;
      }

      case "ultTarifaGralProveedor":{
        this._ultTarifaGralProveedor$.next(data)
        break;
      }

      case "ultTarifaEspProveedor":{
        this._ultTarifaEspProveedor$.next(data)
        break;
      }
      
      case "clienteSeleccionado":{
        this._clienteSeleccionado$.next(data)
        break;
      }

      case "choferSeleccionado":{
        this._choferSeleccionado$.next(data)
        break;
      }

      case "proveedorSeleccionado":{
        this._proveedorSeleccionado$.next(data)
        break;
      }

      case "tEspecialCliente": {
        this._tEspecialCliente$.next(data)
        break;
      }

      case "consolaTarifa": {
        this._consolaTarifa$.next(data)
        break;
      }

      case "modoTarifa": {
        this._modoTarifa$.next(data)
        break;
      }

      case "opTarifaEventual": {
        this._opTarEve$.next(data);
        break
      }

      case "opTarifaPersonalizada": {
        this._opTarPers$.next(data);
        break
      }

      case "vehiculosChofer":{
        this._vehiculosChofer$.next(data);
        break
      }

      case "fechasConsulta":{
        this._fechasConsulta$.next(data);
        break
      }

      case "historialTarifaGralCliente":{
        this._historialTarifaGralCliente$.next(data);
        break
      }

      case "historialTarifaGralChofer":{
        this._historialTarifaGralChofer$.next(data);
        break
      }

      case "historialTarifaGralProveedor":{
        this._historialTarifaGralProveedor$.next(data);
        break
      }
      
      case "historialTarifaPersCliente":{
        this._historialTarifaPersCliente$.next(data);
        break
      }

      case "tarifasEventuales":{
        this._tarifasEventuales$.next(data);
        break
      }

      default: {
        //statements; 
        break;
      }
    }

  }





  // metodos del storage

  public setInfo(componente: string, data: any[]) {
    const jsonData = JSON.stringify(data);
    localStorage.setItem(componente, jsonData);
    this.updateObservable(componente, data);
  }

  public setInfoOne(componente: string, data: any) {
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

  public clearInfo(componente: string) {
    localStorage.removeItem(componente);
    this.updateObservable(componente, []);
  }

  public clearAllLocalStorage() {
    localStorage.clear();
    this.updateObservable('choferes', []);
    this.updateObservable('clientes', []);
    this.updateObservable('proveedores', []);
  }


  ////   INITIALIZER     ////////

  // Al inicio de la aplicacion se carga el storage con los datos de la base
  // al estar suscripto, cualquier cambio en la base se refleja en el storage.


  // metodo initializer si el rol es admin
  initializerAdmin() {

    this.getAllSorted("clientes", 'idCliente', 'asc')
    this.getAllSorted("choferes", 'idChofer', 'asc')
    //this.getAllSorted("operaciones", 'fecha', 'desc')
    //this.getAllSorted("facturaOpCliente", 'fecha', 'desc')
//    this.getAllSorted("operacionesCerradas", 'fecha', 'desc')
    //this.getAllSorted("operacionesCerradas", 'idOperacion', 'asc')
    //this.getAllSorted("jornadas", 'idChofer', 'asc')
    this.getAllSorted("proveedores", 'idProveedor', 'asc')
    //this.getAllSorted("tarifasChofer", 'fecha', 'asc')
   // this.getAllSorted("tarifasCliente", 'fecha', 'asc')
   // this.getAllSorted("tarifasProveedor", 'fecha', 'asc')
    //this.getAllSorted("facturaOpChofer", 'fecha', 'desc')
    //this.getAllSorted("facturaOpProveedor", 'fecha', 'desc')
    //this.getByDateValue("facturaOpChofer","fecha", this.primerDia, this.ultimoDia, "consultasFacOpChofer")
    //this.getByDateValue("facturaOpCliente","fecha", this.primerDia, this.ultimoDia, "consultasFacOpCliente")
    //this.getByDateValue("facturaOpProveedor","fecha", this.primerDia, this.ultimoDia, "consultasFacOpProveedor")
    this.getUltElemColeccion("tarifasGralCliente", "idTarifa", "desc", 1,"ultTarifaGralCliente")
    this.getUltElemColeccion("tarifasGralChofer", "idTarifa", "desc", 1,"ultTarifaGralChofer")
    this.getUltElemColeccion("tarifasGralProveedor", "idTarifa", "desc", 1,"ultTarifaGralProveedor")
  }

  // metodo initializer si el rol es user
/*   initializerUser(idChofer:any) {
    this.getByFieldValue("choferes", "idChofer", idChofer)
    this.getByFieldValue("operacionesActivas", "chofer.idChofer", idChofer)
    this.getByFieldValue("operacionesCerradas", "chofer.idChofer", idChofer)
    

  } */





  // METODOS CRUD

  getAllSorted(componente: any, campo: any, orden: any) {
    console.log(` storage getAllSorted ${componente}`, componente, campo, orden)
    // pasar campo y orden (asc o desc)
    this.dbFirebase
      .getAllSorted(componente, campo, orden)
      .subscribe(data => {

        this.setInfo(componente, data)
        this.updateObservable(componente, data)
        //console.log("storage initializer ", componente, data);
      });

  }

  getAllSortedLimit(componente: any, campo: any, orden: any, limite: number, titulo: string) {
    console.log(` storage getAllSortedLimit ${componente}`, componente, campo, orden, limite)
    // pasar campo y orden (asc o desc)
    this.dbFirebase
      .getAllSortedLimit(componente, campo, orden, limite)
      .subscribe(data => {

        this.setInfo(titulo, data)
        this.updateObservable(componente, data)
        //console.log("storage initializer ", componente, data);
      });
      
  }

  getAllSortedIdLimit(componente: any, campo: any, id:number, campo2: any, orden: any, limite: number, titulo: string) {
    console.log(` storage getAllSortedLimit ${componente}`, componente, campo, orden, limite)
    // pasar campo y orden (asc o desc)
    this.dbFirebase
      .getAllSortedIdLimit(componente, campo, id, campo2, orden, limite)
      .subscribe(data => {

        this.setInfo(titulo, data)
        this.updateObservable(componente, data)
        //console.log("storage initializer ", componente, data);
      });
      
  }
  
  getByFieldValue(componente: any, campo:any, value:any){
    console.log(" storage getByFieldValue ", componente, campo, value)
    this.dbFirebase
      .getByFieldValue(componente, campo, value)
      .subscribe(data => {
        this.setInfo(componente, data)
      })
  }

  getByFieldValueLimit(componente: any, campo:any, value:any, limit:number){
    console.log(" storage getByFieldValue ", componente, campo, value)
    this.dbFirebase
      .getByFieldValueLimit(componente, campo, value, limit)
      .subscribe(data => {
        this.setInfo(componente, data)
      })
  }

  getByFieldValueLimitBuscarTarifa(componente: any, campo:any, value:any, limit:number){
    console.log(" storage getByFieldValueLimitBuscarTarifa ", componente, campo, value)
    this.dbFirebase
      .getByFieldValueLimitBuscarTarifa(componente, campo, value, limit)
      .subscribe(data => {
        this.setInfo(componente, data)
      })
  }

  getByDateValue(componente:string, campo:string, value1:any, value2:any, titulo:string){
    console.log(" storage getByDateValue ", componente, titulo)
    this.dbFirebase
    .getByDateValue(componente, campo, value1, value2)
    .subscribe(data => {
      this.setInfo(titulo , data)
    })
    }

    getByDateValueAndFieldValue(componente:string, campo:string, value1:any, value2:any, titulo:string, campo2:string, value3:any){
      console.log(" storage getByDateValueAndFieldValue ", componente, titulo)
      this.dbFirebase
    .getByDateValueAndFieldValue(componente, campo, value1, value2, campo2, value3)
    .subscribe(data => {
      this.setInfo(titulo , data)
      //console.log("esta es la consulta por fechas y por id: ", data);
      
    })
    }
    
    getByFieldValueTitle(componente:string, campo:string, value:any, titulo:string, ){
      console.log(" storage getByFieldValueTitle ", componente, value, titulo)
      this.dbFirebase
      .getByFieldValue(componente, campo, value)
      .subscribe(data => {
        this.setInfo(titulo , data)
      })
      }

      ///buscar el ultimo elemento de la coleccion q corresponda a un id
      getElemntByIdLimit(componente:string, campo:string, orden:string, id:number, titulo:string){
        console.log(" storage getElemntByIdLimit ", componente, campo, orden, id, titulo)
        this.dbFirebase
        .obtenerTarifaMasReciente(componente,id,campo, orden)
        .subscribe(data => {
          console.log("!!!! ESTA ES LA RESPUESTA DE LA BASE DE DATOS DE LA ULT TARIFA: ", data);
          
          this.setInfo(titulo , data)
        })
      }

      getUltElemColeccion(componente:string, campo:string, orden:string, id:number, titulo:string){
        console.log(" storage getUltElemColeccion ", componente, campo, orden, id)
        this.dbFirebase
        .obtenerElementoMasReciente(componente,campo, id )
        .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
        .subscribe(data => {      
            console.log(data);            
            this.setInfo(titulo , data)
        });            
      }


      public addItem(componente: string, item: any): void {
        console.log("storage add item", componente, item);
        this.dbFirebase.create(componente, item).then(() => {
          this.refreshData(componente, item);
        }).catch((e) => console.log(e.message));
      }
    
      public deleteItem(componente: string, item: any): void {
        console.log("storage delete item", componente, item);
        this.dbFirebase.delete(componente, item.id).then(() => {
          this.refreshData(componente,item);
        }).catch((e) => console.log(e.message));
      }
    
      public updateItem(componente: string, item: any): void {
        console.log("storage update item", componente, item);
        this.dbFirebase.update(componente, item).then(() => {
          this.refreshData(componente, item);
        }).catch((e) => console.log(e.message));
      }
    
      private refreshData(componente: string, item:any) {
        switch(componente){
          case "clientes":
            this.getAllSorted("clientes", 'idCliente', 'asc');
            break;
          case "choferes":
            this.getAllSorted("choferes", 'idChofer', 'asc');
            break;
          case "proveedores":
            this.getAllSorted("proveedores", 'idProveedor', 'asc');
            break;
          case "operaciones":
            this.getAllSorted("operaciones", 'fecha', 'desc');
            break;
          case "tarifasGralCliente":
            this.setInfo("ultTarifaGralCliente", item);                        
            break;
          case "tarifasEspCliente":
            this.setInfo("ultTarifaEspCliente", item);            
            break;
          case "tarifasPersCliente":
            this.setInfo("ultTarifaPersCliente", item);            
            break;
          case "tarifasGralChofer":
            this.setInfo("ultTarifaGralChofer", item);                        
            break;
          case "tarifasEspChofer":
            this.setInfo("ultTarifaEspChofer", item);            
            break;
          case "tarifasPersChofer":
            this.setInfo("ultTarifaPersChofer", item);            
            break;
          case "tarifasGralProveedor":
            this.setInfo("ultTarifaGralProveedor", item);            
            break;
          /* case "tarifasChofer":
            this.getByFieldValue("tarifasChofer", 'fecha', 'asc');
            break;
          case "tarifasCliente":
            this.getByFieldValue("tarifasCliente", 'fecha', 'asc');
            break
          case "tarifasProveedor":
            this.getByFieldValue("tarifasProveedor", 'fecha', 'asc');
            break */
        }
        
      }
      
      
      
      //this.getAllSorted("facturaOpCliente", 'fecha', 'desc')
  //    this.getAllSorted("operacionesCerradas", 'fecha', 'desc')
      //this.getAllSorted("operacionesCerradas", 'idOperacion', 'asc')
      //this.getAllSorted("jornadas", 'idChofer', 'asc')
      
      
      
     
    }