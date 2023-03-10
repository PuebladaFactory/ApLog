import { Injectable } from '@angular/core';
import { FacturaOpChofer } from 'src/app/interfaces/factura-op-chofer';
import { Operacion } from 'src/app/interfaces/operacion';
import { LiquidacionChoferService } from '../liquidacion-chofer/liquidacion-chofer.service';

@Injectable({
  providedIn: 'root'
})
export class FacturacionOpService {  

  constructor(private liquidacionChofer: LiquidacionChoferService) { }

  facturacionOp(op:Operacion){
    //console.log("facturacionOp");    
    this.liquidacionChofer.liquidacionOperacion(op)
   
    
    
  }
}
