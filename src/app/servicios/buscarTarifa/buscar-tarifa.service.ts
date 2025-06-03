import { Injectable } from '@angular/core';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { StorageService } from '../storage/storage.service';


import { Proveedor } from 'src/app/interfaces/proveedor';

import { Operacion } from 'src/app/interfaces/operacion';

import { DbFirestoreService } from '../database/db-firestore.service';
import { CategoriaTarifa, TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';



@Injectable({
  providedIn: 'root'
})
export class BuscarTarifaService {
//Este es el que va
  

  

  ngOnInit(): void {
  }

  constructor() { }




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
}
