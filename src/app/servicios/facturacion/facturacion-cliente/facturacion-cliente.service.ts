import { Injectable } from '@angular/core';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
import { StorageService } from '../../storage/storage.service';
import { DbFirestoreService } from '../../database/db-firestore.service';
import { Operacion } from 'src/app/interfaces/operacion';
import { TarifaCliente } from 'src/app/interfaces/tarifa-cliente';
import { Cliente } from 'src/app/interfaces/cliente';
import { Proveedor } from 'src/app/interfaces/proveedor';

@Injectable({
  providedIn: 'root'
})
export class FacturacionClienteService {

  $clientes!: Cliente[];
  facturaCliente!: FacturaOpCliente;
  clienteOp!: Cliente;
  $tarifas!: TarifaCliente[];
  ultimaTarifa!: TarifaCliente;

  constructor(private storageService: StorageService ) { }

  clientes(){
    this.storageService.clientes$.subscribe(data => {
      this.$clientes = data;
    });
  }

  facturarOperacion(op: Operacion)  :FacturaOpCliente{        
    this.clientes();    
    this.facturarOpCliente(op);
    return this.facturaCliente
  }

  facturarOpCliente(op:Operacion){
    this.buscarCliente(op);    
  }

  buscarCliente(op: Operacion){
    let opCliente: any;
    opCliente = this.$clientes.filter(function (cliente:any){
      return cliente.idCliente === op.cliente.idCliente;
    })
    //console.log("choferSeleccionado: ", choferSeleccionado);
    this.clienteOp = opCliente[0];
    console.log("clienteOp: ", this.clienteOp);
    this.buscarTarifa(op)
  }

  buscarTarifa(op: Operacion){    
    this.storageService.historialTarifasClientes$.subscribe(data => {
      this.$tarifas = data.filter((tarifa: { idCliente: number; }) => tarifa.idCliente === this.clienteOp.idCliente);

      console.log("data Todas: ",this.$tarifas);

      // Encontrar la tarifa con el idTarifa más elevado
      /* this.ultimaTarifa = this.$tarifas.reduce((tarifaMaxima: { idTarifaCliente: number; }, tarifaActual: { idTarifaCliente: number; }) => {
        return tarifaActual.idTarifaCliente > tarifaMaxima.idTarifaCliente ? tarifaActual : tarifaMaxima;
      }); */

      // Ahora, tarifaMasElevada contiene la tarifa con el idTarifa más elevado
      console.log("ultima: ", this.ultimaTarifa);
      //this.calcularLiquidacion(op);
    });  
  }
}
