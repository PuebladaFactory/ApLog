import { Injectable } from '@angular/core';
import { KeyResumen } from './reportes-op.service';
import { ResumenOpBase } from 'src/app/interfaces/resumen-op-base';

@Injectable({
  providedIn: 'root'
})
export class ResumenBuilderService {

    // =========================
    // 🔹 CREAR BASE
    // =========================
    public crearResumenBase(k: KeyResumen): ResumenOpBase {
  
      return {
        anio: k.anio,
        mes: k.mes,
        periodo : k.anio * 100 + k.mes,
        tipo: k.tipo,
        cantidadOps: 0,
        kmRecorridos: 0,
  
        acompanianteOps: 0,
        acompanianteCantidadTotal: 0,
  
        tarifaTipo: {
          general: 0,
          especial: 0,
          personalizada: 0,
          eventual: 0
        },
  
        cliente: {
          acompValor: 0,
          kmAdicional: 0,
          tarifaBase: 0,          
          adExtraValor: 0,
          total: 0
        },
  
        chofer: {
          acompValor: 0,
          kmAdicional: 0,
          tarifaBase: 0,          
          adExtraValor: 0,
          total: 0
        },
  
        ganancia: 0
      };
    }
  
}
