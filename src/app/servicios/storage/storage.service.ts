import { Injectable } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, Observable, Subject, take, takeUntil } from 'rxjs';
import { DbFirestoreService } from '../database/db-firestore.service';
import { Cliente } from 'src/app/interfaces/cliente';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { Chofer } from 'src/app/interfaces/chofer';
import { TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { LogService } from '../log/log.service';
import { TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
import * as _ from 'lodash';
import { Operacion } from 'src/app/interfaces/operacion';
import { LogEntry } from 'src/app/interfaces/log-entry';



@Injectable({
  providedIn: 'root'
})
export class StorageService {

  date:any = new Date();
  primerDia: any = new Date(this.date.getFullYear(), this.date.getMonth() , 1).toISOString().split('T')[0];
  ultimoDia:any = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).toISOString().split('T')[0];  
  logControl!: boolean;
  // los componentes trabajan solo con el storage
  // el storage hace las operaciones crud solo cuando hagan falta 
  // los observables mantienen la info sincronizada entre comp y storage.


  constructor(
    private dbFirebase: DbFirestoreService, 
    private logService: LogService
  ) { }

  private destroy$ = new Subject<void>();

  // Observables //

  private _clientes$ = new BehaviorSubject<any>(this.loadInfo('clientes') || []);
  public clientes$ = this._clientes$.asObservable();

  private _choferes$ = new BehaviorSubject<any>(this.loadInfo('choferes') || []);
  public choferes$ = this._choferes$.asObservable()
  
  private _proveedores$ = new BehaviorSubject<any>(this.loadInfo('proveedores') || []);
  public proveedores$ = this._proveedores$.asObservable();

  private _usuario$ = new BehaviorSubject<any>(this.loadInfo('usuario') || [] || null);
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

  private _respuestaOp$ = new BehaviorSubject<any>(this.loadInfo('respuestaOp') || []);
  public respuestaOp$ = this._respuestaOp$.asObservable();

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
  
  private _tarifasGralCliente$ = new BehaviorSubject<any>(this.loadInfo('tarifasGralCliente') || []);
  public tarifasGralCliente$ = this._tarifasGralCliente$.asObservable();

  private _tarifasEspCliente$ = new BehaviorSubject<any>(this.loadInfo('tarifasEspCliente') || []);
  public tarifasEspCliente$ = this._tarifasEspCliente$.asObservable();

  private _tarifasPersCliente$ = new BehaviorSubject<any>(this.loadInfo('tarifasPersCliente') || []);
  public tarifasPersCliente$ = this._tarifasPersCliente$.asObservable();
  
  private _tarifasGralChofer$ = new BehaviorSubject<any>(this.loadInfo('tarifasGralChofer') || []);
  public tarifasGralChofer$ = this._tarifasGralChofer$.asObservable();
  
  private _tarifasEspChofer$ = new BehaviorSubject<any>(this.loadInfo('tarifasEspChofer') || []);
  public tarifasEspChofer$ = this._tarifasEspChofer$.asObservable();

  private _tarifasGralProveedor$ = new BehaviorSubject<any>(this.loadInfo('tarifasGralProveedor') || []);
  public tarifasGralProveedor$ = this._tarifasGralProveedor$.asObservable();
  
  private _tarifasEspProveedor$ = new BehaviorSubject<any>(this.loadInfo('tarifasEspProveedor') || []);
  public tarifasEspProveedor$ = this._tarifasEspProveedor$.asObservable();

  private _users$ = new BehaviorSubject<any>(this.loadInfo('users') || [] || null);
  public users$ = this._users$.asObservable();

  private _todasTarifasEspCliente$ = new BehaviorSubject<any>(this.loadInfo('todasTarifasEspCliente') || []);
  public todasTarifasEspCliente$ = this._todasTarifasEspCliente$.asObservable()

  private _ruta$ = new BehaviorSubject<any>(this.loadInfo('ruta') || []);
  public ruta$ = this._ruta$.asObservable();

  private _facturaCliente$ = new BehaviorSubject<any>(this.loadInfo('facturaCliente') || []);
  public facturaCliente$ = this._facturaCliente$.asObservable();

  private _facturaChofer$ = new BehaviorSubject<any>(this.loadInfo('facturaChofer') || []);
  public facturaChofer$ = this._facturaChofer$.asObservable();

  private _facturaProveedor$ = new BehaviorSubject<any>(this.loadInfo('facturaProveedor') || []);
  public facturaProveedor$ = this._facturaProveedor$.asObservable();

  private _proforma$ = new BehaviorSubject<any>(this.loadInfo('proforma') || []);
  public proforma$ = this._proforma$.asObservable();


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

      case "respuestaOp":{
        this._respuestaOp$.next(data);
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

      case "tarifasGralCliente":{
        this._tarifasGralCliente$.next(data);
        break
      }

      case "tarifasEspCliente":{
        this._tarifasEspCliente$.next(data);
        break
      }

      case "tarifasPersCliente":{
        this._tarifasPersCliente$.next(data);
        break
      }

      case "tarifasGralChofer":{
        this._tarifasGralChofer$.next(data);
        break
      }      
      
      case "tarifasEspChofer":{
        this._tarifasEspChofer$.next(data);
        break
      }  

      case "tarifasGralProveedor":{
        this._tarifasGralProveedor$.next(data);
        break
      }      
      
      case "tarifasEspProveedor":{
        this._tarifasEspProveedor$.next(data);
        break
      } 

      case "users":{
        this._users$.next(data);
        break
      } 

      case "todasTarifasEspCliente":{
        this._todasTarifasEspCliente$.next(data);
        break
      }

      case "facturaCliente":{
        this._facturaCliente$.next(data);
        break
      }

      case "facturaChofer":{
        this._facturaChofer$.next(data);
        break
      }

      case "facturasProveedor":{
        this._facturaProveedor$.next(data);
        break
      }

      case "ruta":{
        this._ruta$.next(data);
        break
      }

      case "proforma":{
        this._proforma$.next(data);
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
    //console.log(`Guardando datos en ${componente}:`, data);
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
    try {
      localStorage.clear();
      //console.log('Local storage eliminado correctamente.');
    } catch (error) {
      console.error('Error al limpiar el local storage:', error);
    }
  }


  ////   INITIALIZER     ////////

  // Al inicio de la aplicacion se carga el storage con los datos de la base
  // al estar suscripto, cualquier cambio en la base se refleja en el storage.


  // metodo initializer si el rol es admin
  initializerAdmin() {
    //console.log("me llamaron???");
    
    //this.getAll<Cliente>("clientes");
    //this.getAll<Chofer>("choferes");
    //this.getAll<Proveedor>("proveedores");
    //this.getAll<Proveedor>("tarifasGralCliente");
    //this.getMostRecentItem<TarifaGralCliente>("tarifasGralCliente", "idTarifa");
    //this.getMostRecentItem<TarifaGralCliente>("tarifasGralChofer", "idTarifa");
    //this.getMostRecentItem<TarifaGralCliente>("tarifasGralProveedor", "idTarifa");
    this.getAllColection("users");    
    //this.getAllSorted("legajos", 'idLegajo', 'asc');    
  }

  getTarifasEsp(){
    this.getTarifasEspClientes();    
    this.getTarifasPersClientes();
    this.getTarifasEspChoferes();    
    this.getTarifasEspsProveedores();    
  }
 
  getTarifasEspClientes(){
    
    let clientes: Cliente [] = this.loadInfo("clientes");
    let tarfEspclientes: TarifaGralCliente [] = this.loadInfo("todasTarifasEspCliente");    
    if(clientes.length > 0){
      clientes.forEach((c:Cliente)=>{
        if(c.tarifaTipo.especial){
          this.dbFirebase.getMostRecentId<TarifaGralCliente>("tarifasEspCliente", "idTarifa", "idCliente", c.idCliente)
          .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
          .subscribe(data => {
            if(data.length > 0){
              console.log("todasTarifasEspCliente???", data);
              
              tarfEspclientes.push(data[0])
              //console.log("tarfEspclientes", tarfEspclientes);
              this.setInfo("todasTarifasEspCliente", tarfEspclientes);
              this.updateObservable("todasTarifasEspCliente", tarfEspclientes);
            }
          })      
          
        }
      })
    }
    
  }

  getTarifasPersClientes(){
       
    let clientes: Cliente [] = this.loadInfo("clientes");
    let tarfPersClientes: TarifaPersonalizadaCliente [] = this.loadInfo("tarifasPersCliente");    
    if(clientes.length > 0){
      clientes.forEach((c:Cliente)=>{
        if(c.tarifaTipo.personalizada){
          this.dbFirebase.getMostRecentId<TarifaPersonalizadaCliente>("tarifasPersCliente", "idTarifa", "idCliente", c.idCliente)
          .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
          .subscribe(data => {
            if(data){
              console.log("data TARIFA PERSONALIZADA DE LOS CLIENTES?", data);
              if(data.length > 0){
                tarfPersClientes.push(data[0])
                //console.log("tarifasPersCliente", tarfPersClientes);
                this.setInfo("tarifasPersCliente", tarfPersClientes)
              };
              
            }
          })      
          
        }
      })
  }
    
  }

  getTarifasEspChoferes(){
    let choferes: Chofer [] = this.loadInfo("choferes");
    let tarfEspChoferes: TarifaGralCliente [] = this.loadInfo("tarifasEspChofer");    
    if(choferes.length > 0){
      choferes.forEach((c:Chofer)=>{
        if(c.tarifaTipo.especial){
          this.dbFirebase.getMostRecentId<TarifaGralCliente>("tarifasEspChofer", "idTarifa", "idChofer", c.idChofer)
          .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
          .subscribe(data => {
            if(data){
              //console.log("data tarifasEspChofer?", data);
              
              tarfEspChoferes.push(data[0])
              //console.log("tarifasEspChofer", tarfEspChoferes);
              this.setInfo("tarifasEspChofer", tarfEspChoferes)
            }
          })      
          
        }
      })
    }
    
  }

  getTarifasEspsProveedores(){
    let proveedores: Proveedor [] = this.loadInfo("proveedores");
    let tarfEspProveedores: TarifaGralCliente [] = this.loadInfo("tarifasEspProveedor");    
    if(proveedores.length > 0){
      proveedores.forEach((p:Proveedor)=>{
        if(p.tarifaTipo.especial){
          this.dbFirebase.getMostRecentId<TarifaGralCliente>("tarifasEspProveedor", "idTarifa", "idProveedor", p.idProveedor)
          .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
          .subscribe(data => {
            if(data){
              //console.log("data tarifasEspProveedor?", data);
              
              tarfEspProveedores.push(data[0])
              //console.log("tarfEspProveedores", tarfEspProveedores);
              this.setInfo("tarifasEspProveedor", tarfEspProveedores)
            }
          })      
          
        }
      })
    }
    
  }

  // METODOS CRUD

  getAllColection(componente: string){
    //console.log("getAllUser componente: ", componente);
    const cachedData = this.loadInfo(componente); // Carga desde local storage
    ////console.log("getAll cachedData: ", cachedData);
    
    if (cachedData.length > 0) {
      ////console.log(`Datos cargados desde el caché para ${componente}`, cachedData);
      this.updateObservable(componente, cachedData);
    } else {
      ////console.log(`Caché vacío, consultando Firestore para ${componente}`);
      this.dbFirebase.getAllColection(componente)
      .pipe(distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)))
      .subscribe(data => {
        this.setInfo(componente, data); // Guarda en el caché
        this.updateObservable(componente, data); // Actualiza el observable
      });
    }
    return this.getObservable(componente); // Devuelve el observable
  }


  getAll<T>(componente: string): Observable<T[]> {
    console.log("getAll componente: ", componente);
    const cachedData = this.loadInfo(componente); // Carga desde local storage
    ////console.log("getAll cachedData: ", cachedData);
    
    if (cachedData.length > 0) {
      ////console.log(`Datos cargados desde el caché para ${componente}`, cachedData);
      this.updateObservable(componente, cachedData);
    } else {
      ////console.log(`Caché vacío, consultando Firestore para ${componente}`);
      this.dbFirebase.getAll<T>(componente)
      .pipe(distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)))
      .subscribe(data => {
        this.setInfo(componente, data); // Guarda en el caché
        this.updateObservable(componente, data); // Actualiza el observable
      });
    }
    return this.getObservable(componente); // Devuelve el observable
  }

  getMostRecentItem<T>(componente: string, id: string): void {
    //console.log("getMostRecentItem componente: ", componente);
    const cachedData = this.loadInfo(componente); // Carga desde local storage
    if (cachedData.length > 0) {
      ////console.log(`Datos cargados desde el caché para ${componente}`, cachedData);
      this.updateObservable(componente, cachedData[0]); // Usa directamente el objeto
    } else {
      this.dbFirebase.getMostRecent<T>(componente, id)
      .pipe(distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)))
      .subscribe(item => {
        ////console.log(`Elemento más reciente de ${componente}:`, item[0]);
        this.setInfo(componente, [item[0]]); // Guarda como un array por compatibilidad
        this.updateObservable(componente, item[0]); // Actualiza el observable con el objeto
      });
    }
  }

  getMostRecentItemId<T>(componente: string, id:string, campo:string, value:number): void {
    this.dbFirebase.getMostRecentId<T>(componente, id, campo, value)
    .pipe(distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)))
    .subscribe(item => {
      //const cachedData = this.loadInfo(componente);
      //////console.log(`Datos cargados desde el caché para ${componente}`, cachedData);
      ////console.log(`Elemento más reciente de ${componente} cuyo ${campo} es igual a ${value} es:`, item[0]);
      if (item) {
        //////console.log(`Elemento más reciente de ${componente} cuyo ${campo} es igual a ${value} es:`, item);
        this.setInfo(componente, [item[0]]); // Actualiza el caché
        this.updateObservable(componente, item[0]); // Actualiza el observable con el objeto más reciente
      }
    });
  }

  getAllByDateValue<T>(componente:string, campo:string, value1:any, value2:any, orden:string){
    console.log(" storage getAllByDateValue ", componente)
    this.dbFirebase
    .getAllByDateValue<T>(componente, campo, value1, value2, orden)
    .subscribe(data => {
      this.setInfo(componente , data)
    })
    }

  syncChanges<T>(componente: string): void {    
    this.dbFirebase.getAll<T>(componente)
    .pipe(distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)))
    .subscribe(data => {
      const currentData = this.loadInfo(componente);
      //////console.log("currentData", currentData);
      //////console.log("data", data);
      if (!currentData || JSON.stringify(currentData) !== JSON.stringify(data)) {
        ////console.log(`Datos sincronizados para ${componente}`, data);
        this.setInfo(componente, data); // Actualiza el caché
        this.updateObservable(componente, data); // Actualiza el observable
      } else {
        ////console.log(`Datos no modificados para ${componente}, no se actualiza.`);
      }
      
    });
  }

  syncChangesTarifasGral<T>(componente:string): void {
    this.dbFirebase.getAll<T>(componente)
    .pipe(
      distinctUntilChanged((prev, curr) => _.isEqual(prev, curr)) // Comparación profunda
    )
    .subscribe(data => {
      console.log(`${componente}: data: `, data);
      let currentData = this.loadInfo(componente);
      console.log(`${componente}: local storage: `, currentData);

      // Comparación profunda con lodash
      if (_.isEqual(currentData, data)) {
        console.error(`1) EL MISMO OBJETO)${componente}`);
      } else {
        console.error(`2) NO ES EL MISMO OBJETO)${componente}`);
        this.setInfo(componente, data); // Actualiza el caché
        this.updateObservable(componente, data)
      }
    });
  }

  syncChangesTarifasPersCliente<T>(componente:string): void {
    this.dbFirebase.getAll<T>(componente)
    .pipe(
      distinctUntilChanged((prev, curr) => _.isEqual(prev, curr)) // Comparación profunda
    )
    .subscribe(data => {
      console.log(`${componente}: data`, data);
      let currentData = this.loadInfo(`${componente}`);
      console.log(`local storage: ${componente}`, currentData);
      this.updateObservable(componente,currentData)
           
    });
  }

  syncChangesByOneElem<T>(componente: string, id: string): void {
    this.dbFirebase.getMostRecent<T>(componente, id)
    .pipe(distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)))
    .subscribe((data: any) => {
      const currentData = this.loadInfo(componente);
      
      if (!currentData || JSON.stringify(currentData[0]) !== JSON.stringify(data[0])) {
        ////console.log(`Datos sincronizados para ${componente}`, data[0]);
        this.setInfo(componente, [data[0]]); // Guarda en el caché
        this.updateObservable(componente, data[0]); // Actualiza el observable con el objeto
      } else {
        ////console.log(`Datos no modificados para ${componente}, no se actualiza.`);
      }
    });
  }

  syncChangesByOneElemId<T>(componente: string, id:string, campo:string, value:number): void {
    this.dbFirebase.getMostRecentId<T>(componente, id, campo, value)
    .pipe(distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)))
    .subscribe((data:any) => {
      const currentData = this.loadInfo(componente);
      if (!currentData || JSON.stringify(currentData[0]) !== JSON.stringify(data[0])) {
        ////console.log(`Elemento más reciente de ${componente} cuyo ${campo} es igual a ${value} es:`, data);
        this.setInfo(componente, [data[0]]); // Actualiza el caché
        this.updateObservable(componente, data[0]); // Actualiza el observable
      } else {
        ////console.log(`Datos no modificados para ${componente}, no se actualiza.`);
      }      
    });
  }

  syncChangesDateValue<T>(componente:string, campo:string, value1:any, value2:any, orden:string){
    console.log(" storage syncChangesDateValue ", componente)
    this.dbFirebase.getAllByDateValue<T>(componente, campo, value1, value2, orden).subscribe(data => {
      const currentData = this.loadInfo(componente);
      if (!currentData || JSON.stringify(currentData) !== JSON.stringify(data)) {
        console.log(`Datos sincronizados para ${componente}`, data);
        this.setInfo(componente, data); // Actualiza el caché
        this.updateObservable(componente, data); // Actualiza el observable
      } else {
        console.log(`Datos no modificados para ${componente}, no se actualiza.`);
      }      
    })
    }

  syncChangesUsers<T>(componente: string): void {    
    this.dbFirebase.getAllColection(componente)
    .pipe(distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)))
    .subscribe(data => {
      const currentData = this.loadInfo(componente);
      //////console.log("currentData", currentData);
      //////console.log("data", data);
      if (!currentData || JSON.stringify(currentData) !== JSON.stringify(data)) {
        ////console.log(`Datos sincronizados para ${componente}`, data);
        this.setInfo(componente, data); // Actualiza el caché
        this.updateObservable(componente, data); // Actualiza el observable
      } else {
        ////console.log(`Datos no modificados para ${componente}, no se actualiza.`);
      }
      
    });
  }

  syncChangesLimit<T>(componente: string, field:string, limit: number): void {    
    this.dbFirebase.getMostRecentLimit<T>(componente, field, limit)
    .pipe(distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)))
    .subscribe(data => {
      //const currentData = this.loadInfo(componente);
      //////console.log("currentData", currentData);
      //////console.log("data", data);
      /* if (!currentData || JSON.stringify(currentData) !== JSON.stringify(data)) {
        ////console.log(`Datos sincronizados para ${componente}`, data);
        this.setInfo(componente, data); // Actualiza el caché
        this.updateObservable(componente, data); // Actualiza el observable
      } else {
        ////console.log(`Datos no modificados para ${componente}, no se actualiza.`);
      } */
      
    });
  }

  listenForChanges<T>(componente: string): void {
    console.log("admin: ", componente);    
    this.dbFirebase.getAllStateChanges<T>(componente)
      .subscribe(changes => {
        if (changes.length > 0) {
          console.log(`${componente}: Cambios detectados`, changes);
          let currentData = this.loadInfo(componente) || [];          
          changes.forEach(change => {
            if (change.type === 'added') {
              //console.log("change", change);
              const existe = currentData.some(obj => obj.id === change.id);

              if (!existe) {
                //console.log("El id no está en el array");
                currentData.push(change);
              } else {
                console.log("sin cambios en el componente: ", componente);
              }
              
              
            } else if (change.type === 'modified') {
              console.log("editar!!!!");
              currentData = currentData.map(item => item.id === change.id ? change : item);
            } else if (change.type === 'removed') {
              console.log("DAAALEEE LOOOOCOOO!!!!");
              
              currentData = currentData.filter(item => item.id !== change.id);
            }
          });
  
          this.setInfo(componente, currentData); // Actualiza caché          
        }
      });
  }

  listenForChangesLimit<T>(componente: string, campo:string, id:number, orden:string, limite:number): void {
    console.log("admin: ", componente);    
    this.dbFirebase.getAllStateChangesLimit<T>(componente, campo, id, orden, limite)
      .subscribe(changes => {
        if (changes.length > 0) {
          console.log(`${componente}: Cambios detectados`, changes);
          let currentData = this.loadInfo(componente) || [];          
          changes.forEach(change => {
            if (change.type === 'added') {
              //console.log("change", change);
              const existe = currentData.some(obj => obj.id === change.id);

              if (!existe) {
                //console.log("El id no está en el array");
                currentData.push(change);
              } else {
                console.log("sin cambios en el componente: ", componente);
              }
              
              
            } else if (change.type === 'modified') {
              console.log("editar!!!!");
              currentData = currentData.map(item => item.id === change.id ? change : item);
            } else if (change.type === 'removed') {
              console.log("DAAALEEE LOOOOCOOO!!!!");
              
              currentData = currentData.filter(item => item.id !== change.id);
            }
          });
  
          this.setInfo(componente, currentData); // Actualiza caché          
        }
      });
  }

  listenForChangesDate<T>(componente: string, campo:string, value1:any, value2:any, orden:string): void {
    console.log("admin: ", componente);    
    this.dbFirebase.getAllStateChangesByDate<T>(componente, campo, orden, value1, value2)
      .subscribe(changes => {
        if (changes.length > 0) {
          console.log(`${componente}: Cambios detectados`, changes);
          let currentData = this.loadInfo(componente) || [];          
          changes.forEach(change => {
            if (change.type === 'added') {
              //console.log("change", change);
              const existe = currentData.some(obj => obj.id === change.id);

              if (!existe) {
                //console.log("El id no está en el array");
                currentData.push(change);
              } else {
                console.log("sin cambios en el componente: ", componente);
              }
              
              
            } else if (change.type === 'modified') {
              console.log("editar!!!!");
              currentData = currentData.map(item => item.id === change.id ? change : item);
            } else if (change.type === 'removed') {
              console.log("DAAALEEE LOOOOCOOO!!!!");
              
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
      case 'tarifasGralCliente':
        return this._tarifasGralCliente$.asObservable();      
      case 'tarifasEspCliente':
        return this._tarifasEspCliente$.asObservable();      
      case 'tarifasPersCliente':
        return this._tarifasPersCliente$.asObservable();  
      case 'tarifasGralChofer':
        return this._tarifasGralChofer$.asObservable();
      case 'tarifasEspChofer':
        return this._tarifasEspChofer$.asObservable();  
      case 'tarifasGralProveedor':
        return this._tarifasGralProveedor$.asObservable();
      case 'tarifasEspProveedor':
        return this._tarifasEspProveedor$.asObservable();            
      case 'users':
        return this._users$.asObservable(); 
      case 'usuario':
        return this._usuario$.asObservable(); 
      case 'operaciones':
        return this._operaciones$.asObservable(); 
      case 'todasTarifasEspCliente':
        return this._todasTarifasEspCliente$.asObservable(); 
      case 'ruta':
        return this._ruta$.asObservable(); 
      case "tarifasEventuales":
        return this._tarifasEventuales$.asObservable();      
      case "facturaOpCliente":
        return this._facturaOpCliente$.asObservable();
      case "facturaOpChofer":
        return this._facturaOpChofer$.asObservable();
      case "facturaOpProveedor":
        return this._facturaOpProveedor$.asObservable();
      case "facturaCliente":
        return this._facturaCliente$.asObservable();
      case "facturaChofer":
        return this._facturaChofer$.asObservable();
      case "facturaProveedor":
        return this._facturaProveedor$.asObservable();
      case "legajos":
        return this._legajos$.asObservable();
      case "proforma":
        return this._proforma$.asObservable();
      default:
        throw new Error(`Componente no reconocido: ${componente}`);
    }
  }


  getAllSorted(componente: any, campo: any, orden: any) {
    //console.log("getAllSorted componente: ", componente);
    ////console.log(` storage getAllSorted ${componente}`, componente, campo, orden)
    // pasar campo y orden (asc o desc)
    this.dbFirebase
      .getAllSorted(componente, campo, orden)
      .pipe(distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)))
      .subscribe(data => {

        this.setInfo(componente, data)
        this.updateObservable(componente, data)
        //////console.log("storage initializer ", componente, data);
      });

  }

  getAllSortedLimit(componente: any, campo: any, orden: any, limite: number, titulo: string) {
    ////console.log(` storage getAllSortedLimit ${componente}`, componente, campo, orden, limite)
    // pasar campo y orden (asc o desc)
    this.dbFirebase
      .getAllSortedLimit(componente, campo, orden, limite)
      .subscribe(data => {

        this.setInfo(titulo, data)
        this.updateObservable(componente, data)
        //////console.log("storage initializer ", componente, data);
      });
      
  }

  getAllSortedIdLimit(componente: any, campo: any, id:number, campo2: any, orden: any, limite: number, titulo: string) {
    ////console.log(` storage getAllSortedLimit ${componente}`, componente, campo, orden, limite)
    // pasar campo y orden (asc o desc)
    this.dbFirebase
      .getAllSortedIdLimit(componente, campo, id, campo2, orden, limite)
      .subscribe(data => {

        this.setInfo(titulo, data)
        this.updateObservable(componente, data)
        //////console.log("storage initializer ", componente, data);
      });
      
  }
  
  getByFieldValue(componente: any, campo:any, value:any){
    ////console.log(" storage getByFieldValue ", componente, campo, value)
    this.dbFirebase
      .getByFieldValue(componente, campo, value)
      .subscribe(data => {
        this.setInfo(componente, data)
      })
  }

  getByFieldValueLimit(componente: any, campo:any, value:any, limit:number){
    ////console.log(" storage getByFieldValue ", componente, campo, value)
    this.dbFirebase
      .getByFieldValueLimit(componente, campo, value, limit)
      .subscribe(data => {
        this.setInfo(componente, data)
      })
  }

  getByFieldValueLimitBuscarTarifa(componente: any, campo:any, value:any, limit:number){
    ////console.log(" storage getByFieldValueLimitBuscarTarifa ", componente, campo, value)
    this.dbFirebase
      .getByFieldValueLimitBuscarTarifa(componente, campo, value, limit)
      .subscribe(data => {
        this.setInfo(componente, data)
      })
  }

  getByDateValue(componente:string, campo:string, value1:any, value2:any, titulo:string){
    //console.log(" storage getByDateValue ", componente, titulo)
    this.dbFirebase
    .getByDateValue(componente, campo, value1, value2)
    .pipe(distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)))
    .subscribe(data => {
      this.setInfo(titulo , data)
    })
    }

    getByDateValueAndFieldValue(componente:string, campo:string, value1:any, value2:any, titulo:string, campo2:string, value3:any){
      ////console.log(" storage getByDateValueAndFieldValue ", componente, titulo)
      this.dbFirebase
    .getByDateValueAndFieldValue(componente, campo, value1, value2, campo2, value3)
    .subscribe(data => {
      this.setInfo(titulo , data)
      //////console.log("esta es la consulta por fechas y por id: ", data);
      
    })
    }
    
    getByFieldValueTitle(componente:string, campo:string, value:any, titulo:string, ){
      ////console.log(" storage getByFieldValueTitle ", componente, value, titulo)
      this.dbFirebase
      .getByFieldValue(componente, campo, value)
      .subscribe(data => {
        this.setInfo(titulo , data)
      })
      }

      ///buscar el ultimo elemento de la coleccion q corresponda a un id
      getElemntByIdLimit(componente:string, campo:string, orden:string, id:number, titulo:string){
        ////console.log(" storage getElemntByIdLimit ", componente, campo, orden, id, titulo)
        this.dbFirebase
        .obtenerTarifaMasReciente(componente,id,campo, orden)
        .subscribe(data => {
          ////console.log("!!!! ESTA ES LA RESPUESTA DE LA BASE DE DATOS DE LA ULT TARIFA: ", data);
          
          this.setInfo(titulo , data)
        })
      }

      getUltElemColeccion(componente:string, campo:string, orden:string, id:number, titulo:string){
        ////console.log(" storage getUltElemColeccion ", componente, campo, orden, id)
        this.dbFirebase
        .obtenerElementoMasReciente(componente,campo, id )
        .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
        .subscribe(data => {      
            ////console.log(data);            
            this.setInfo(titulo , data)
        });            
      }


     
      public addItem(componente: string, item: any, idItem:number, accion:string, msj: string): void {
        let user = this.loadInfo('usuario');
        //let accion: string = "ALTA";
        let regLog:boolean = this.controlLog(componente, accion);
        this.dbFirebase.create(componente, item).then(() => {        
          if (!user[0].roles.god && regLog){            
            this.logService.logEvent(accion, componente, msj, idItem, true);           
          }          
          
        }).catch((e) => {          
          if (!user[0].roles.god && regLog){
            this.logService.logEvent(accion, componente, msj, idItem, false);
          }
          console.log(e.message)});
      }
    
      public deleteItem(componente: string, item: any,  idItem:number, accion:string, msj:string): void {
        console.log(" storage deleteItem ", componente)
        let user = this.loadInfo('usuario');
        //let accion: string = "BAJA";
        let regLog:boolean = this.controlLog(componente, accion);
        this.dbFirebase.delete(componente, item.id).then(() => {
          if (!user[0].roles.god && regLog) {             
            this.logService.logEvent(accion, componente, msj, idItem, true);
          }                 
        }).catch((e) => {
          if (!user[0].roles.god && regLog){
            this.logService.logEvent(accion, componente, msj, idItem, false);
          }
          console.log(e.message)});
      }

      public deleteItemPapelera(componente: string, item: any,  idItem:number, accion:string, msj:string, motivo:string): void {
        let user = this.loadInfo('usuario');
        //let accion: string = "BAJA";
        let regLog:boolean = this.controlLog(componente, accion);
        this.dbFirebase.delete(componente, item.id).then(() => {
          if (!user[0].roles.god && regLog) {             
            this.logService.logEventDoc(accion, componente, msj, idItem, item, true, motivo);
          }                 
        }).catch((e) => {
          if (!user[0].roles.god && regLog){
            this.logService.logEvent(accion, componente, msj, idItem, false);
          }
          console.log(e.message)});
      }
    
      public updateItem(componente: string, item: any, idItem:number, accion:string, msj: string, uid:any): void {
        ////console.log("storage update item", componente, item);
        let user = this.loadInfo('usuario');
        //let accion: string = "BAJA";
        let regLog:boolean = this.controlLog(componente, accion);
        console.log("regLog", regLog);
        
        this.dbFirebase.update(componente, item, uid).then(() => {
          if (!user[0].roles.god && regLog) { 
            this.logService.logEvent(accion, componente, msj, idItem, true);
          }      
        }).catch((e) => {
          if (!user[0].roles.god && regLog){
            this.logService.logEvent(accion, componente, msj, idItem, false);
          }
          console.log(e.message)});
      }

      public updateUser(componente: string, item: any, accion:string): void {
        ////console.log("storage update item", componente, item);
        let user = this.loadInfo('usuario');
        //let accion: string = "BAJA";
        let regLog:boolean = this.controlLog(componente, accion);
        this.dbFirebase.updateUser(item).then(() => {
          if (!user[0].roles.god && regLog) { 
            this.logService.logEvent(accion, componente, `Edición de Usuario ${item.email}`, item.uid, true);
          }   
        }).catch((e) => {
          if (!user[0].roles.god && regLog) { 
            this.logService.logEvent(accion, componente, `Edición de Usuario ${item.email}`, item.uid, false);
          }  
          console.log(e.message)
        });
      }

      public deleteUser(componente: string, item: any, accion: string): void {
        ////console.log("storage delete item", componente, item);
        let user = this.loadInfo('usuario');
        //let accion: string = "BAJA";
        let regLog:boolean = this.controlLog(componente, accion);
        this.dbFirebase.deleteUser(item.id).then(() => {
          if (!user[0].roles.god && regLog) { 
            this.logService.logEvent(accion, componente, `Baja de Usuario ${item.email}`, item.uid, true);
          }  
        }).catch((e) => {
          if (!user[0].roles.god && regLog) { 
            this.logService.logEvent(accion, componente, `Baja de Usuario ${item.email}`, item.uid, false);
          }  
          console.log(e.message)
        });
      }

      guardadoMultiple(
        objetos: any[], 
        componenteAlta: string, 
        idObjetoNombre: string, 
        tipo: string,
      ){       ///metodo para guardar multiples objetos en una misma coleccón
        this.dbFirebase.guardarMultiple(objetos, componenteAlta, idObjetoNombre, tipo)
      }

      logMultiplesOp(
        idOperaciones: number[],
        accion: string,
        coleccion: string,
        detalle: string,        
        resultado: boolean
      ){        ///metodo para crear multiples LogEntry
        let arryLog: LogEntry[] = [];
        let user = this.loadInfo('usuario');
        //let accion: string = "BAJA";
        if (!user[0].roles.god) { 
          let incremento = 0

          idOperaciones.forEach((idOp: number)=>{
          let logEntry: LogEntry = this.logService.createLogEntry(accion, coleccion, detalle, idOp, resultado, incremento);
          incremento++
          arryLog.push(logEntry)
        })
        console.log("Storage Service: arraLog: ", arryLog);        
        this.guardadoMultiple(arryLog, "logs", "timestamp", "logs")
        }
        
        
        
      }

      logSimple(
        idObjeto: number,
        accion: string,
        coleccion: string,
        detalle: string,        
        resultado: boolean
      ){ ///metodo para guardar multiples LogEntry
        let arryLog: LogEntry[] = [];
        let user = this.loadInfo('usuario');
        //let accion: string = "BAJA";
        if (!user[0].roles.god) { 
          let logEntry: LogEntry = this.logService.createLogEntry(accion, coleccion, detalle, idObjeto, resultado,0);
          arryLog.push(logEntry)
        console.log("Storage Service: arraLog: ", arryLog);        
        this.guardadoMultiple(arryLog, "logs", "timestamp", "logs")
      }
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

      signOut(): void {
        this._usuario$.next(null); // Limpia el estado del usuario
        this._users$.next(null); // Limpia el estado del usuario
        this._clientes$.next(null); // Limpia el estado del usuario
      }
      
      
      
      //this.getAllSorted("facturaOpCliente", 'fecha', 'desc')
  //    this.getAllSorted("operacionesCerradas", 'fecha', 'desc')
      //this.getAllSorted("operacionesCerradas", 'idOperacion', 'asc')
      //this.getAllSorted("jornadas", 'idChofer', 'asc')
      
      
      
     
    }