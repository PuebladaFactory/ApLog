import { Component, OnInit } from '@angular/core';
import { Cliente } from 'src/app/interfaces/cliente';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-facturacion-cliente',
  templateUrl: './facturacion-cliente.component.html',
  styleUrls: ['./facturacion-cliente.component.scss']
})
export class FacturacionClienteComponent implements OnInit  {

  btnConsulta:boolean = false;
  searchText!:string
  fechasConsulta: any = {
    fechaDesde: 0,
    fechaHasta: 0,
  };
  $facturasOpCliente: any;
  date:any = new Date();
  primerDia: any = new Date(this.date.getFullYear(), this.date.getMonth() , 1).toISOString().split('T')[0];
  ultimoDia:any = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).toISOString().split('T')[0];  
  datosTabla: any[] = [];
  
  constructor(private storageService: StorageService){}

  ngOnInit(): void {
    this.storageService.consultasFacOpCliente$.subscribe(data => {
      this.$facturasOpCliente = data;
    });
    this.consultaMes(); 
  }

  consultaMes(){
    if(!this.btnConsulta){   
      //console.log(this.primerDia, this.ultimoDia)         
      this.consultaOperaciones(this.primerDia, this.ultimoDia);
    }     
  }

  getMsg(msg: any) {
    this.btnConsulta = true;
    //console.log(msg);        
    //alert("llega el msj")
    this.consultaOperaciones(msg.fechaDesde, msg.fechaHasta);
  }

  consultaOperaciones(fechaDesde:any, fechaHasta:any){   
    //console.log("desde: ", fechaDesde, "hasta: ", fechaHasta);
    this.storageService.getByDateValue("facturaOpCliente", "fecha", fechaDesde, fechaHasta, "consultasFacOpCliente");    
    //console.log("consulta facturas op clientes: ", this.$facturasOpCliente);  
    //this.agruparClientes();      
    this.procesarDatosParaTabla();
  }

  procesarDatosParaTabla() {
    const clientesMap = new Map<number, any>();

    this.$facturasOpCliente.forEach((factura: FacturaOpCliente) => {
      if (!clientesMap.has(factura.idCliente)) {
        clientesMap.set(factura.idCliente, {
          idCliente: factura.idCliente,
          razonSocial: factura.operacion.cliente.razonSocial,
          cantOp: 0,
          opSinFacturar: 0,
          opFacturadas: 0,
          total: 0
        });
      }

      const cliente = clientesMap.get(factura.idCliente);
      cliente.cantOp++;
      if (factura.liquidacion) {
        cliente.opFacturadas += factura.total;
      } else {
        cliente.opSinFacturar += factura.total;
      }
      cliente.total += factura.total;
    });

    this.datosTabla = Array.from(clientesMap.values());
    console.log("Datos para la tabla: ", this.datosTabla);
    
  }


  
}
