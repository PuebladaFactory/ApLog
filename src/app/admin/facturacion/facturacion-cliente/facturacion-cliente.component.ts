import { Component, OnInit } from '@angular/core';
import { Cliente } from 'src/app/interfaces/cliente';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
import { ConsultasService } from 'src/app/servicios/consultas/consultas.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-facturacion-cliente',
  templateUrl: './facturacion-cliente.component.html',
  styleUrls: ['./facturacion-cliente.component.scss']
})
export class FacturacionClienteComponent implements OnInit  {

  btnConsulta:boolean = false;
  searchText!:string;
  searchText2!:string;
  fechasConsulta: any = {
    fechaDesde: 0,
    fechaHasta: 0,
  };
  $facturasOpCliente: any;
  date:any = new Date();
  primerDia: any = new Date(this.date.getFullYear(), this.date.getMonth() , 1).toISOString().split('T')[0];
  ultimoDia:any = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).toISOString().split('T')[0];  
  datosTabla: any[] = [];
  mostrarTabla: boolean[] = [];
  tablaDetalle: any[] = [];
  
  constructor(private storageService: StorageService, private consultasService:ConsultasService){
    // Inicializar el array para que todos los botones muestren la tabla cerrada al principio
    this.mostrarTabla = new Array(this.datosTabla.length).fill(false);
  }

  ngOnInit(): void {
  
    this.consultasService.consultaOperaciones("facturaOpCliente", "fecha", this.primerDia, this.ultimoDia, "consultasFacOpCliente" );
    this.storageService.consultasFacOpCliente$.subscribe(data => {
      this.$facturasOpCliente = data;
      this.procesarDatosParaTabla()
    });
    
    //this.consultaMes(); 
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
 
  liquidarFac(factura: FacturaOpCliente){
    console.log("esta es la FACTURA: ", factura);
    factura.liquidacion = true;
    this.procesarDatosParaTabla();
     
  }

  mostrarMasDatos(index: number, cliente:any) {
    // Cambiar el estado del botón en la posición indicada
    this.mostrarTabla[index] = !this.mostrarTabla[index];
    console.log("CLIENTE: ", cliente);
    this.tablaDetalle = this.$facturasOpCliente.filter(function (factura: FacturaOpCliente) { 
      return factura.idCliente === cliente.idCliente
    });
    console.log("TABLA DETALLE: ", this.tablaDetalle);
    
    
  }

  
}
