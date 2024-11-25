import { Injectable } from '@angular/core';
import { StorageService } from './storage/storage.service';
import { Legajo } from '../interfaces/legajo';

@Injectable({
  providedIn: 'root'
})
export class LegajosService {

  legajo!: Legajo

  constructor(private storageService: StorageService) { }

  crearLegajo(idChofer:number){
    this.legajo ={
      id: null,
      idLegajo:new Date().getTime(),
      idChofer: idChofer,      
      estadoGral:{
        enFecha: false,
        porVencer: false,
        vencido: false,        
        vacio: true,
      },
      documentacion:[],  
    };
    this.storageService.addItem("legajos", this.legajo)

  }

}
