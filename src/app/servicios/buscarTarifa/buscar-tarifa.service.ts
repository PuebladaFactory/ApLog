import { Injectable } from '@angular/core';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { StorageService } from '../storage/storage.service';


import { Proveedor } from 'src/app/interfaces/proveedor';

import { Operacion } from 'src/app/interfaces/operacion';

import { DbFirestoreService } from '../database/db-firestore.service';
import { CategoriaTarifa, TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { InformeOp } from 'src/app/interfaces/informe-op';
import { TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
import { firstValueFrom } from 'rxjs';



@Injectable({
  providedIn: 'root'
})
export class BuscarTarifaService {
//Este es el que va
  

  

  ngOnInit(): void {
  }

  constructor(
    private storageService: StorageService,
    private dbFirebase: DbFirestoreService
  ) { }




//// METODOS PARA OBTENER ELPRIMER VALOR A COBRAR Y A PAGAR CUANDO SE DA DE ALTA LA OP ////

  $getACobrar(tarifa: TarifaGralCliente, chofer: Chofer, patente: string){
    let vehiculo
    vehiculo  = chofer.vehiculo.filter((vehiculo:Vehiculo)=>{
        return vehiculo.dominio === patente;
    });
    let categoria = vehiculo[0].categoria.catOrden
    let catCG = tarifa?.cargasGenerales?.filter((cat: CategoriaTarifa)=>{
      return cat.orden === categoria
    });
    return catCG[0].valor      
  } 

  $getAPagar(tarifa:TarifaGralCliente, chofer: Chofer, patente:string){
    let vehiculo
    vehiculo  = chofer.vehiculo.filter((vehiculo:Vehiculo)=>{
        return vehiculo.dominio === patente;
    });
    let categoria = vehiculo[0].categoria.catOrden
    let catCG = tarifa.cargasGenerales.filter((cat: CategoriaTarifa)=>{
      return cat.orden === categoria
    });
    return catCG[0].valor;      
  }   

  ////////////METODOS PARA OBTENER LAS TARIFAS PARA EDITAR EN EL NUEVO MODULO DE LIQUIDACION/////////////////

  async buscarTarifa(informeOp: ConId<InformeOp>, modo: string): Promise<any> {
    switch (modo) {
      case "cliente":
        return await this.getTarifaCliente(informeOp);
      case "chofer":
        return await this.getTarifaChofer(informeOp);
      case "proveedor":
        return await this.getTarifaProveedor(informeOp);
      default:
        return {};
    }
  }

  async getTarifaCliente(informeOp: ConId<InformeOp>): Promise<any> {
    const coleccionHistorialTarfGral = 'historialTarifasGralCliente';
    const coleccionHistorialTarfEsp = 'historialTarifasEspCliente';
    const coleccionHistorialTarfPers = 'historialTarifasPersCliente';
    let coleccionGral: string = 'tarifasGralCliente';
    let coleccionEsp: string = 'tarifasEspCliente';

    if (informeOp.tarifaTipo.general) {
      const tarifaGral = this.getTarifaLocal(coleccionGral, informeOp.idTarifa);
      return tarifaGral ?? await this.buscarTarifaDb(coleccionHistorialTarfGral, informeOp);
    }

    if (informeOp.tarifaTipo.especial) {
      const tarifaEsp = this.getTarifaLocal(coleccionEsp, informeOp.idTarifa);
      return tarifaEsp ?? await this.buscarTarifaDb(coleccionHistorialTarfEsp, informeOp);
    }

    if (informeOp.tarifaTipo.personalizada) {
      const tarifaPers = this.getTarifaPers(informeOp.idTarifa);
      return tarifaPers ?? await this.buscarTarifaDb(coleccionHistorialTarfPers, informeOp);
    }

    if (informeOp.tarifaTipo.eventual) {
      return {};
    }

    return {};
  }

  getTarifaLocal(coleccion: string, idTarifa: number): ConIdType<TarifaGralCliente> | undefined {
    const tarifas: ConIdType<TarifaGralCliente>[] = this.storageService.loadInfo(coleccion);
    return tarifas.find((tarf: ConIdType<TarifaGralCliente>) => tarf.idTarifa === idTarifa);
  }
  
  getTarifaPers(idTarifa: number):ConIdType<TarifaPersonalizadaCliente> | undefined{
    //console.log("getTarifaPers) idTarifa", idTarifa);        
    let tarifasPersonalizada: ConIdType<TarifaPersonalizadaCliente>[];
    let tarifa: ConIdType<TarifaPersonalizadaCliente> | undefined;
    

    tarifasPersonalizada = this.storageService.loadInfo('tarifasPersCliente');
    //console.log("getTarifaPers) tarifasPersonalizada", tarifasPersonalizada);        
    tarifa = tarifasPersonalizada.find((tarf:ConIdType<TarifaPersonalizadaCliente>)=> {return tarf.idTarifa === idTarifa});
    //console.log("getTarifaPers) tarifa", tarifa);    
    return tarifa;                
  }

  async buscarTarifaDb(coleccion: string, informe: ConId<InformeOp>): Promise<any> {
    const obs$ = this.dbFirebase.obtenerTarifaIdTarifa(coleccion, informe.idTarifa, "idTarifa");
    const tarifa = await firstValueFrom(obs$);
    return tarifa;
  }  

  async getTarifaChofer(informeOp: ConId<InformeOp>):Promise<any>{

    const coleccionHistorialTarfGral = 'historialTarifasGralChofer';
    const coleccionHistorialTarfEsp = 'historialTarifasEspChofer';
    const coleccionHistorialTarfPers = 'historialTarifasPersCliente';
    let coleccionGral: string = 'tarifasGralChofer';
    let coleccionEsp: string = 'tarifasEspChofer';

    if (informeOp.tarifaTipo.general) {
      const tarifaGral = this.getTarifaLocal(coleccionGral, informeOp.idTarifa);
      return tarifaGral ?? await this.buscarTarifaDb(coleccionHistorialTarfGral, informeOp);
    }

    if (informeOp.tarifaTipo.especial) {
      const tarifaEsp = this.getTarifaLocal(coleccionEsp, informeOp.idTarifa);
      return tarifaEsp ?? await this.buscarTarifaDb(coleccionHistorialTarfEsp, informeOp);
    }

    if (informeOp.tarifaTipo.personalizada) {
      const tarifaPers = this.getTarifaPers(informeOp.idTarifa);
      return tarifaPers ?? await this.buscarTarifaDb(coleccionHistorialTarfPers, informeOp);
    }

    if (informeOp.tarifaTipo.eventual) {
      return {};
    }

    return {};

  }

  async getTarifaProveedor(informeOp: ConId<InformeOp>):Promise<any>{
    
    const coleccionHistorialTarfGral = 'historialTarifasGralProveedor';
    const coleccionHistorialTarfEsp = 'historialTarifasEspProveedor';
    const coleccionHistorialTarfPers = 'historialTarifasPersCliente';
    let coleccionGral: string = 'tarifasGralProveedor';
    let coleccionEsp: string = 'tarifasEspProveedor';

    if (informeOp.tarifaTipo.general) {
      const tarifaGral = this.getTarifaLocal(coleccionGral, informeOp.idTarifa);
      return tarifaGral ?? await this.buscarTarifaDb(coleccionHistorialTarfGral, informeOp);
    }

    if (informeOp.tarifaTipo.especial) {
      const tarifaEsp = this.getTarifaLocal(coleccionEsp, informeOp.idTarifa);
      return tarifaEsp ?? await this.buscarTarifaDb(coleccionHistorialTarfEsp, informeOp);
    }

    if (informeOp.tarifaTipo.personalizada) {
      const tarifaPers = this.getTarifaPers(informeOp.idTarifa);
      return tarifaPers ?? await this.buscarTarifaDb(coleccionHistorialTarfPers, informeOp);
    }

    if (informeOp.tarifaTipo.eventual) {
      return {};
    }

    return {};
  }

}
