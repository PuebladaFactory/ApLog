import { Injectable } from '@angular/core';
import { FacturaChofer } from 'src/app/interfaces/factura-chofer';
import { FacturacionOp } from 'src/app/interfaces/facturacion-op';
import { Operacion } from 'src/app/interfaces/operacion';
import { LiquidacionChoferService } from '../liquidacion-chofer/liquidacion-chofer.service';

@Injectable({
  providedIn: 'root'
})
export class FacturacionOpService {

  facturaChofer?: FacturaChofer;

  constructor(private liquidacionChofer: LiquidacionChoferService) { }

  facturacionOp(op:Operacion){
    console.log("facturacionOp");    
    this.facturaChofer = this.liquidacionChofer.liquidacionOperacion(op)
   
    console.log("esta es la factura de la op: ", this.facturaChofer);
    
  }
}
