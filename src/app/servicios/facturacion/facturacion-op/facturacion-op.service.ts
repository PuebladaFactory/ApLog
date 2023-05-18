import { Injectable } from '@angular/core';
import { FacturaOpChofer } from 'src/app/interfaces/factura-op-chofer';
import { Operacion } from 'src/app/interfaces/operacion';
import { LiquidacionChoferService } from '../liquidacion-chofer/liquidacion-chofer.service';
import { FacturacionClienteService } from '../facturacion-cliente/facturacion-cliente.service';

@Injectable({
  providedIn: 'root'
})
export class FacturacionOpService {  

  constructor(private liquidacionChofer: LiquidacionChoferService, private facturacionCliente: FacturacionClienteService) { }

  facturacionOp(op:Operacion){
    //console.log("facturacionOp");    
    this.liquidacionChofer.liquidacionOperacion(op);
    this.facturacionCliente.liquidacionOperacion(op);
    
    
  }
}
