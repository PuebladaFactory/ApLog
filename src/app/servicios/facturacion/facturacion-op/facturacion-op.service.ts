import { Injectable } from '@angular/core';
import { FacturacionOp } from 'src/app/interfaces/facturacion-op';
import { Operacion } from 'src/app/interfaces/operacion';
import { LiquidacionChoferService } from '../liquidacion-chofer/liquidacion-chofer.service';

@Injectable({
  providedIn: 'root'
})
export class FacturacionOpService {

  facturaOp!: FacturacionOp;

  constructor(private liquidacionChofer: LiquidacionChoferService) { }

  facturacionOp(op:Operacion){    
    this.facturaOp = {
      id: null,
      idFacturacionOp : new Date().getTime(),
      operacion : op,
      liquidacionChofer : this.liquidacionChofer.liquidacionOperacion(op),
      facturacionCliente : 0,
    }
   
    console.log(this.facturaOp);
    
  }
}
