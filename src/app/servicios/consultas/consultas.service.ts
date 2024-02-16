import { Injectable } from '@angular/core';
import { StorageService } from '../storage/storage.service';

@Injectable({
  providedIn: 'root'
})
export class ConsultasService {

  constructor(private storageService: StorageService) { }

  consultaOperaciones(componente: string, campo:string,  fechaDesde:any, fechaHasta:any, titulo:string){   
    //console.log("desde: ", fechaDesde, "hasta: ", fechaHasta);
    this.storageService.getByDateValue(componente, campo, fechaDesde, fechaHasta, titulo);    
    //console.log("consulta facturas op clientes: ", this.$facturasOpCliente);  
    //this.agruparClientes();      
    
  }
}
