import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ConId, ConIdType } from 'src/app/interfaces/conId';


import { InformeLiq } from 'src/app/interfaces/informe-liq';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-facturacion-general',
    templateUrl: './facturacion-general.component.html',
    styleUrls: ['./facturacion-general.component.scss'],
    standalone: false
})
export class FacturacionGeneralComponent implements OnInit {

  modo : string = "facturacion"
  componenteConsulta: string = "Liquidacion"
  fechasConsulta: any = {
    fechaDesde: 0,
    fechaHasta: 0,
  };
  $facturasCliente!: ConId<InformeLiq>[];
  $facturasChofer!:  ConId<InformeLiq>[];
  $facturasProveedor!: ConId<InformeLiq>[];
  informesLiqCliente!: ConId<InformeLiq>[];
  informesLiqChofer!:  ConId<InformeLiq>[];
  informesLiqProveedor!: ConId<InformeLiq>[];
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
  isLoading:boolean = false;

  constructor(private storageService: StorageService, private dbFirebase: DbFirestoreService,){}

  ngOnInit(): void {    
    //this.storageService.getByDateValue("facturaCliente", "fecha", this.primerDiaAnio, this.ultimoDiaAnio, "consultasFacCliente");
    this.storageService.syncChangesDateValue<InformeLiq>("resumenLiq", "fecha", this.primerDiaAnio, this.ultimoDiaAnio, "desc");
    this.storageService.getObservable<ConId<InformeLiq>>("resumenLiq")
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      //console.log("data factura clientes: ", data);
      if(data){
        data = data.filter(inf=> inf.estado !== 'anulado');
        
        this.informesLiqCliente = data.filter(inf=> inf.tipo === 'cliente'); 
        console.log('COLECCION: resumenLiq: clientes: ', this.informesLiqCliente);
        this.informesLiqCliente = this.informesLiqCliente.sort((a, b) => a.entidad.razonSocial.localeCompare(b.entidad.razonSocial)); // Ordena por el nombre del chofer

        this.informesLiqChofer = data.filter(inf=> inf.tipo === 'chofer'); 
        console.log('COLECCION: resumenLiq: chofer: ', this.informesLiqChofer);
        this.informesLiqChofer = this.informesLiqChofer.sort((a, b) => a.entidad.razonSocial.localeCompare(b.entidad.razonSocial)); // Ordena por el nombre del chofer

        this.informesLiqProveedor = data.filter(inf=> inf.tipo === 'proveedor'); 
        console.log('COLECCION: resumenLiq: proveedor: ', this.informesLiqProveedor);        
        this.informesLiqProveedor = this.informesLiqProveedor.sort((a, b) => a.entidad.razonSocial.localeCompare(b.entidad.razonSocial)); // Ordena por el nombre del chofer
        
        this.calcularIngresos(); 
        this.calcularPagos();      
      } else {
        this.mensajesError("error: resumen de liquidaciones de los clientes")
      }
      
    });

/*     //his.storageService.getByDateValue("facturaChofer", "fecha", this.primerDiaAnio, this.ultimoDiaAnio, "consultasFacChofer");
    this.storageService.syncChangesDateValue<InformeLiq>("resumenLiqChoferes", "fecha", this.primerDiaAnio, this.ultimoDiaAnio, "desc");
    this.storageService.getObservable<ConId<InformeLiq>>("resumenLiqChoferes")
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      //console.log("data factura choferes: ", data);
      if(data){
        this.informesLiqChofer = data; 
        this.informesLiqChofer = this.informesLiqChofer.sort((a, b) => a.entidad.razonSocial.localeCompare(b.entidad.razonSocial)); // Ordena por el nombre del chofer
        this.calcularPagos();     
      } else {
        this.mensajesError("error: resumen de liquidaciones de los choferes")
      }
      
    });

    //this.storageService.getByDateValue("facturaProveedor", "fecha", this.primerDiaAnio, this.ultimoDiaAnio, "consultasFacProveedor");
    this.storageService.syncChangesDateValue<InformeLiq>("resumenLiqProveedores", "fecha", this.primerDiaAnio, this.ultimoDiaAnio, "desc");
    this.storageService.getObservable<ConId<InformeLiq>>("resumenLiqProveedores")
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      //console.log("data factura proveedores: ", data);
      if(data){
        this.informesLiqProveedor = data; 
        ////console.log("facturacion gral: facturas proveedor",this.informesLiqProveedor );
        
        this.informesLiqProveedor = this.informesLiqProveedor.sort((a, b) => a.entidad.razonSocial.localeCompare(b.entidad.razonSocial)); // Ordena por el nombre del chofer
        this.calcularPagos();     
      } else {
        this.mensajesError("error: resumen de liquidaciones de los proveedores")
      }      
    });
 */
    
    this.storageService.fechasConsulta$
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      this.isLoading = true;
      this.fechasConsulta = data;
      ////console.log("FACTURACION GRAL: fechas consulta: ",this.fechasConsulta);      
      this.btnConsulta = true;
      this.consultasFacturas(this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta);
    });
   
  }

  ngOnDestroy(): void {
    // Completa el Subject para cancelar todas las suscripciones
    this.destroy$.next();
    this.destroy$.complete();
  }

  async consultasFacturas(fechaDesde:string, fechaHasta:string){
    await this.storageService.syncChangesDateValue<InformeLiq>("resumenLiq", "fecha", fechaDesde, fechaHasta, "desc");
    this.isLoading = false;
    /* this.storageService.syncChangesDateValue<InformeLiq>("resumenLiqChoferes", "fecha", fechaDesde, fechaHasta, "desc");
    this.storageService.syncChangesDateValue<InformeLiq>("resumenLiqProveedores", "fecha", fechaDesde, fechaHasta, "desc"); */
    //this.storageService.getByDateValue("facturaCliente", "fecha", this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta, "consultasFacCliente");
    //this.storageService.getByDateValue("facturaChofer", "fecha", this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta, "consultasFacChofer");
    //this.storageService.getByDateValue("facturaProveedor", "fecha", this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta, "consultasFacProveedor");
  }

  calcularIngresos(){
    this.totalIngresosOp = 0;
    this.totalFaltaCobrar = 0;     

    if(this.informesLiqCliente !== null && this.informesLiqCliente !== undefined){
      this.informesLiqCliente.forEach((factura: InformeLiq) => {
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

    if(this.informesLiqChofer !== null && this.informesLiqChofer !== undefined){
      this.informesLiqChofer.forEach((factura: InformeLiq) => {
        this.totalPagosOp += Number(factura.valores.total);
        if(!factura.cobrado){
          this.totalFaltaPagar += Number(factura.valores.total);        
        }        
      });      
    }
    if(this.informesLiqProveedor !== null && this.informesLiqProveedor !== undefined){
      this.informesLiqProveedor.forEach((factura: InformeLiq) => {
        this.totalPagosOp += Number(factura.valores.total);
        if(!factura.cobrado){
          this.totalFaltaPagar += Number(factura.valores.total);        
        }        
      });      
    }    
    ////console.log("this.totalPagosOp", this.totalPagosOp);
    
  }

  formatearValor(valor: number) : any{
    let nuevoValor =  new Intl.NumberFormat('es-ES', { 
     minimumFractionDigits: 2, 
     maximumFractionDigits: 2 
   }).format(valor);
   ////////////////console.log(nuevoValor);    
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
    ////console.log(msg);        
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
    ////////console.log()("desde: ", fechaDesde, "hasta: ", fechaHasta);
    //this.storageService.getByDateValue(this.tituloFacCliente, "fecha", fechaDesde, fechaHasta, "consultasFacCliente");    
    ////////console.log()("consulta facturas op clientes: ", this.$facturasOpCliente);  
    //this.agruparClientes();      
    //this.procesarDatosParaTabla();
    if(!this.btnConsulta){   
      //////console.log()(this.primerDia, this.ultimoDia)         
      //this.storageService.getByDateValue("facturaChofer", "fecha", this.primerDia, this.ultimoDia, this.titulo);    
      //this.storageService.getByDateValue("facturaCliente", "fecha", this.primerDia, this.ultimoDia, this.titulo);    
      //this.storageService.getByDateValue("facturaProveedor", "fecha", this.primerDia, this.ultimoDia, this.titulo);    
      this.storageService.syncChangesDateValue<InformeLiq>("resumenLiq", "fecha", this.primerDiaAnio, this.ultimoDiaAnio, "desc");
      /* this.storageService.syncChangesDateValue<InformeLiq>("resumenLiqChoferes", "fecha", this.primerDiaAnio, this.ultimoDiaAnio, "desc");
      this.storageService.syncChangesDateValue<InformeLiq>("resumenLiqProveedores", "fecha", this.primerDiaAnio, this.ultimoDiaAnio, "desc"); */
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

      filtrarInformes(){
        //console.log("total de informes: ", this.informesLiqProveedor);
        
        //this.informesLiqCliente = this.informesLiqProveedor.filter(obj => !obj.hasOwnProperty('idInfLiq'));
        ////console.log("facturas viejas: ", this.informesLiqCliente);
        
      }

/*   eliminarObjetos(){
    this.isLoading = true
    this.dbFirebase.guardarMultipleOtraColeccion(this.informesLiqCliente, "facturasCliente").then((result)=>{
      this.isLoading = false
      if(result.exito){
        alert("eliminado correctamente")
      } else {
        alert(`error actualizando. errr: ${result.mensaje}`)
      }
    })
  } */

  guardadoMultiple(){
    this.isLoading = true
    this.dbFirebase.guardarMultipleOtraColeccion(this.informesLiqProveedor, "resumenLiqProveedores").then((result)=>{
      this.isLoading = false
      if(result.exito){
        alert("agregado correctamente")
      } else {
        alert(`error actualizando. errr: ${result.mensaje}`)
      }
    })
  }


}
