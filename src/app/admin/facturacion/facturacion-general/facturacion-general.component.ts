import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FacturaChofer } from 'src/app/interfaces/factura-chofer';
import { FacturaCliente } from 'src/app/interfaces/factura-cliente';
import { FacturaProveedor } from 'src/app/interfaces/factura-proveedor';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-facturacion-general',
  templateUrl: './facturacion-general.component.html',
  styleUrls: ['./facturacion-general.component.scss']
})
export class FacturacionGeneralComponent implements OnInit {

  @Output() newItemEvent = new EventEmitter<any>();
  $facturasCliente: any;
  $facturasChofer: any;
  $facturasProveedor: any;

  constructor(private storageService: StorageService){}

  componenteConsulta: string = "facturacion";
  fechasConsulta: any = {
    fechaDesde: 0,
    fechaHasta: 0,
  };
  date:any = new Date();
  primerDia: any = new Date(this.date.getFullYear(), this.date.getMonth() , 1).toISOString().split('T')[0];
  ultimoDia:any = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).toISOString().split('T')[0];  
  tituloFacCliente: string = "facturaCliente";
  totalIngresosOp!: number;
  totalFaltaCobrar!: number; 
  totalPagosOp!: number;
  totalFaltaPagar!: number;

  ngOnInit(): void {
    this.storageService.getByDateValue("facturaCliente", "fecha", this.primerDia, this.ultimoDia, "consultasFacCliente");
    this.storageService.consultasFacCliente$.subscribe(data => {
      this.$facturasCliente = data; 
      this.calcularIngresos();     
    });

    this.storageService.getByDateValue("facturaChofer", "fecha", this.primerDia, this.ultimoDia, "consultasFacChofer");
    this.storageService.consultasFacChofer$.subscribe(data => {
      this.$facturasChofer = data;
      this.calcularPagos();
    });

    this.storageService.getByDateValue("facturaProveedor", "fecha", this.primerDia, this.ultimoDia, "consultasFacProveedor");
    this.storageService.consultasFacProveedor$.subscribe(data => {
      this.$facturasProveedor = data;
    });

   
  }

  calcularIngresos(){
    this.totalIngresosOp = 0;
    this.totalFaltaCobrar = 0;     

    if(this.$facturasCliente !== null){
      this.$facturasCliente.forEach((factura: FacturaCliente) => {
        this.totalIngresosOp += factura.total;
        if(!factura.cobrado){
          this.totalFaltaCobrar += factura.total;        
        }        
      })      
    }       
  }

  calcularPagos(){     
    this.totalPagosOp = 0;
    this.totalFaltaPagar = 0;

    if(this.$facturasChofer !== null){
      this.$facturasChofer.forEach((factura: FacturaChofer) => {
        this.totalPagosOp += factura.total;
        if(!factura.cobrado){
          this.totalFaltaPagar += factura.total;        
        }        
      });      
    }
    if(this.$facturasProveedor !== null){
      this.$facturasProveedor.forEach((factura: FacturaProveedor) => {
        this.totalPagosOp += factura.total;
        if(!factura.cobrado){
          this.totalFaltaPagar += factura.total;        
        }        
      });      
    }    

  }

  getMsg(msg: any) {
    //this.btnConsulta = true;
    //console.log(msg);        
    //alert("llega el msj")
    this.consultaOperaciones(msg.fechaDesde, msg.fechaHasta);
    //this.msgBack(msg);
    //this.ngOnInit()
  }

  consultaOperaciones(fechaDesde:any, fechaHasta:any){   
    //console.log("desde: ", fechaDesde, "hasta: ", fechaHasta);
    this.storageService.getByDateValue(this.tituloFacCliente, "fecha", fechaDesde, fechaHasta, "consultasFacCliente");    
    //console.log("consulta facturas op clientes: ", this.$facturasOpCliente);  
    //this.agruparClientes();      
    //this.procesarDatosParaTabla();
  }

}
