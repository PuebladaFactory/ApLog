import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { FacturaChofer } from 'src/app/interfaces/factura-chofer';
import { FacturaCliente } from 'src/app/interfaces/factura-cliente';
import { FacturaProveedor } from 'src/app/interfaces/factura-proveedor';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-facturacion-general',
  templateUrl: './facturacion-general.component.html',
  styleUrls: ['./facturacion-general.component.scss']
})
export class FacturacionGeneralComponent implements OnInit {

  modo : string = "facturacion"
  componenteConsulta: string = "Liquidacion"
  fechasConsulta: any = {
    fechaDesde: 0,
    fechaHasta: 0,
  };
  $facturasCliente!: ConId<FacturaCliente>[];
  $facturasChofer!:  ConId<FacturaChofer>[];
  $facturasProveedor!: ConId<FacturaProveedor>[];;
  titulo: string = "facturacion"
  btnConsulta:boolean = false;
  date:any = new Date();
  primerDia: any = new Date(this.date.getFullYear(), this.date.getMonth() -3, ).toISOString().split('T')[0];
  ultimoDia:any = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).toISOString().split('T')[0];  
  primerDiaAnio: any = new Date(this.date.getFullYear(), 0 , 1).toISOString().split('T')[0];
  ultimoDiaAnio: any = new Date(this.date.getFullYear(), 11 , 31).toISOString().split('T')[0];
  tituloFacCliente: string = "facturaCliente";
  totalIngresosOp!: number;
  totalFaltaCobrar!: number; 
  totalPagosOp!: number;
  totalFaltaPagar!: number;
  resumenVisible: boolean = false;
  estadoVisible: boolean = false;
  private destroy$ = new Subject<void>(); // Subject para manejar la destrucción

  constructor(private storageService: StorageService){}

  ngOnInit(): void {    
    //this.storageService.getByDateValue("facturaCliente", "fecha", this.primerDiaAnio, this.ultimoDiaAnio, "consultasFacCliente");
    this.storageService.syncChangesDateValue<FacturaCliente>("facturaCliente", "fecha", this.primerDiaAnio, this.ultimoDiaAnio, "desc");
    this.storageService.getObservable<ConId<FacturaCliente>>("facturaCliente")
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      if(data){
        this.$facturasCliente = data; 
        this.$facturasCliente = this.$facturasCliente.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
        this.calcularIngresos();     
      } else {
        this.mensajesError("error: facturaCliente")
      }
      
    });

    //his.storageService.getByDateValue("facturaChofer", "fecha", this.primerDiaAnio, this.ultimoDiaAnio, "consultasFacChofer");
    this.storageService.syncChangesDateValue<FacturaChofer>("facturaChofer", "fecha", this.primerDiaAnio, this.ultimoDiaAnio, "desc");
    this.storageService.getObservable<ConId<FacturaChofer>>("facturaChofer")
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      if(data){
        this.$facturasChofer = data; 
        this.$facturasChofer = this.$facturasChofer.sort((a, b) => a.apellido.localeCompare(b.apellido)); // Ordena por el nombre del chofer
        this.calcularIngresos();     
      } else {
        this.mensajesError("error: facturaChofer")
      }
      
    });

    //this.storageService.getByDateValue("facturaProveedor", "fecha", this.primerDiaAnio, this.ultimoDiaAnio, "consultasFacProveedor");
    this.storageService.syncChangesDateValue<FacturaProveedor>("facturaProveedor", "fecha", this.primerDiaAnio, this.ultimoDiaAnio, "desc");
    this.storageService.getObservable<ConId<FacturaProveedor>>("facturaProveedor")
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      if(data){
        this.$facturasProveedor = data; 
        this.$facturasProveedor = this.$facturasProveedor.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
        this.calcularIngresos();     
      } else {
        this.mensajesError("error: facturaChofer")
      }      
    });

    
    this.storageService.fechasConsulta$
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      this.fechasConsulta = data;
      console.log("FACTURACION GRAL: fechas consulta: ",this.fechasConsulta);      
      this.btnConsulta = true;
      this.consultasFacturas();
    });
   
  }

  ngOnDestroy(): void {
    // Completa el Subject para cancelar todas las suscripciones
    this.destroy$.next();
    this.destroy$.complete();
  }

  consultasFacturas(){
    this.storageService.syncChangesDateValue<FacturaCliente>("facturaCliente", "fecha", this.primerDiaAnio, this.ultimoDiaAnio, "desc");
    this.storageService.syncChangesDateValue<FacturaChofer>("facturaChofer", "fecha", this.primerDiaAnio, this.ultimoDiaAnio, "desc");
    this.storageService.syncChangesDateValue<FacturaProveedor>("facturaProveedor", "fecha", this.primerDiaAnio, this.ultimoDiaAnio, "desc");
    //this.storageService.getByDateValue("facturaCliente", "fecha", this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta, "consultasFacCliente");
    //this.storageService.getByDateValue("facturaChofer", "fecha", this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta, "consultasFacChofer");
    //this.storageService.getByDateValue("facturaProveedor", "fecha", this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta, "consultasFacProveedor");
  }

  calcularIngresos(){
    this.totalIngresosOp = 0;
    this.totalFaltaCobrar = 0;     

    if(this.$facturasCliente !== null){
      this.$facturasCliente.forEach((factura: FacturaCliente) => {
        this.totalIngresosOp += Number(factura.valores.total);
        if(!factura.cobrado){
          this.totalFaltaCobrar += Number(factura.valores.total);        
        }        
      })      
    }       
  }

  calcularPagos(){     
    this.totalPagosOp = 0;
    this.totalFaltaPagar = 0;

    if(this.$facturasChofer !== null){
      this.$facturasChofer.forEach((factura: FacturaChofer) => {
        this.totalPagosOp += Number(factura.valores.total);
        if(!factura.cobrado){
          this.totalFaltaPagar += Number(factura.valores.total);        
        }        
      });      
    }
    if(this.$facturasProveedor !== null){
      this.$facturasProveedor.forEach((factura: FacturaProveedor) => {
        this.totalPagosOp += Number(factura.valores.total);
        if(!factura.cobrado){
          this.totalFaltaPagar += Number(factura.valores.total);        
        }        
      });      
    }    

  }

  formatearValor(valor: number) : any{
    let nuevoValor =  new Intl.NumberFormat('es-ES', { 
     minimumFractionDigits: 2, 
     maximumFractionDigits: 2 
   }).format(valor);
   ////////////console.log(nuevoValor);    
   return nuevoValor
 }

   // Función que convierte un string formateado en un número correcto para cálculos
   limpiarValorFormateado(valorFormateado: any): number {
    if (typeof valorFormateado === 'string') {
      // Si es un string, eliminar puntos de miles y reemplazar coma por punto
      return parseFloat(valorFormateado.replace(/\./g, '').replace(',', '.'));
    } else if (typeof valorFormateado === 'number') {
      // Si ya es un número, simplemente devuélvelo
      return valorFormateado;
    } else {
      // Si es null o undefined, devolver 0 como fallback
      return 0;
    }
  }

  getMsg(msg: any) {
    //this.btnConsulta = true;
    console.log(msg);        
    //alert("llega el msj")
    //this.consultaOperaciones(msg.fechaDesde, msg.fechaHasta);
    //this.msgBack(msg);
    //this.ngOnInit()
    if(msg.titulo === "facturacion"){
      this.btnConsulta = true;
      this.fechasConsulta = {
        fechaDesde: msg.fecha.fechaDesde,
        fechaHasta: msg.fecha.fechaHasta,
      };
    }
    
  }

  consultaOperaciones(){   
    ////console.log()("desde: ", fechaDesde, "hasta: ", fechaHasta);
    //this.storageService.getByDateValue(this.tituloFacCliente, "fecha", fechaDesde, fechaHasta, "consultasFacCliente");    
    ////console.log()("consulta facturas op clientes: ", this.$facturasOpCliente);  
    //this.agruparClientes();      
    //this.procesarDatosParaTabla();
    if(!this.btnConsulta){   
      //console.log()(this.primerDia, this.ultimoDia)         
      //this.storageService.getByDateValue("facturaChofer", "fecha", this.primerDia, this.ultimoDia, this.titulo);    
      //this.storageService.getByDateValue("facturaCliente", "fecha", this.primerDia, this.ultimoDia, this.titulo);    
      //this.storageService.getByDateValue("facturaProveedor", "fecha", this.primerDia, this.ultimoDia, this.titulo);    
      this.storageService.syncChangesDateValue<FacturaCliente>("facturaCliente", "fecha", this.primerDiaAnio, this.ultimoDiaAnio, "desc");
      this.storageService.syncChangesDateValue<FacturaChofer>("facturaChofer", "fecha", this.primerDiaAnio, this.ultimoDiaAnio, "desc");
      this.storageService.syncChangesDateValue<FacturaProveedor>("facturaProveedor", "fecha", this.primerDiaAnio, this.ultimoDiaAnio, "desc");
    }     
  
  }

  toogleResumen(){
    this.resumenVisible = !this.resumenVisible;
  }

/*   toogleEstado(){
    this.estadoVisible = !this.estadoVisible;
  } */

    mensajesError(msj:string){
        Swal.fire({
          icon: "error",
          //title: "Oops...",
          text: `${msj}`
          //footer: `${msj}`
        });
      }


}
