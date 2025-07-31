import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { LogoutComponent } from 'src/app/appLogin/logout/logout.component';
import { ConId } from 'src/app/interfaces/conId';
import { InformeLiq } from 'src/app/interfaces/informe-liq';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { PdfService } from 'src/app/servicios/informes/pdf/pdf.service';
import { LogService } from 'src/app/servicios/log/log.service';
import { NumeradorService } from 'src/app/servicios/numerador/numerador.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';
import { ModalDetalleComponent } from '../modal-detalle/modal-detalle.component';
import { InformeLiqDetalleComponent } from 'src/app/shared/modales/informe-liq-detalle/informe-liq-detalle.component';
import { InformeOp } from 'src/app/interfaces/informe-op';
import { Cliente } from 'src/app/interfaces/cliente';
import { Chofer } from 'src/app/interfaces/chofer';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { BajaObjetoComponent } from 'src/app/shared/modales/baja-objeto/baja-objeto.component';
import { ModalVincularFacturaComponent } from '../modal-vincular-factura/modal-vincular-factura.component';

@Component({
  selector: 'app-facturacion-listado',
  standalone: false,
  templateUrl: './facturacion-listado.component.html',
  styleUrl: './facturacion-listado.component.scss'
})
export class FacturacionListadoComponent implements OnInit {
  
  informesLiq: ConId<InformeLiq>[] = [];
  informesFiltrados: ConId<InformeLiq>[] = [];
  informesOp: ConId<InformeOp>[] = []
  filtroTipo: string = 'todos';
  filtroRazonSocial: string = '';
  fechaDesde: string = '';
  fechaHasta: string = '';
  coleccion:string = "resumenLiq";
  date:any = new Date();
  primerDia: any = new Date(this.date.getFullYear(), this.date.getMonth() -3, ).toISOString().split('T')[0];
  ultimoDia:any = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).toISOString().split('T')[0];  
  primerDiaAnio: any = new Date(this.date.getFullYear(), 0 , 1).toISOString().split('T')[0];
  ultimoDiaAnio: any = new Date(this.date.getFullYear(), 11 , 31).toISOString().split('T')[0];

  cargando = false;
  ///////
  facturasDuplicadas: InformeLiq[] = [];
  clientes: ConId<Cliente>[] = [];
  choferes: ConId<Chofer>[] = [];
  proveedores: ConId<Proveedor>[] = [];


  constructor(
    private dbService: DbFirestoreService, 
    private storageService: StorageService, 
    private excelServ: ExcelService,     
    private pdfServ: PdfService, 
    private logService: LogService,    
    private modalService: NgbModal   
  ) {}

  ngOnInit(): void {
    this.fechaDesde = this.primerDiaAnio;
    this.fechaHasta = this.ultimoDiaAnio;
    this.cargarInformes(this.primerDiaAnio, this.ultimoDiaAnio);
    this.clientes = this.storageService.loadInfo('clientes');
    this.choferes = this.storageService.loadInfo('choferes');
    this.proveedores = this.storageService.loadInfo('proveedores');
  }

  async cargarInformes(desde:string,hasta:string) {
    this.cargando = true;
    
    console.log();
    

    try {
      this.informesLiq = await this.dbService.getInformesLiqPorTipoYFechas(      
        this.filtroTipo as any,
        desde,
        hasta
      );    
      this.aplicarFiltros();
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudieron obtener los informes.', 'error');
    } finally {
      this.cargando = false;
    }
  }


  aplicarFiltros() {
    this.informesFiltrados = this.informesLiq.filter(inf => {
      const coincideTipo = this.filtroTipo === 'todos' || inf.tipo === this.filtroTipo;
      const coincideRazon = inf.entidad.razonSocial.toLowerCase().includes(this.filtroRazonSocial.toLowerCase());
      return coincideTipo && coincideRazon;
    });
  }

  ////// MODAL PARA LA VISTA Y LA EDICION
  async openModalVista(informesLiq: ConId<InformeLiq>, accion:string){  
    await this.obtenerInformesOp(informesLiq)
    {
      const modalRef = this.modalService.open(InformeLiqDetalleComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        scrollable: true, 
        size: 'lg',        
      });       
      console.log("informesLiq",informesLiq);
      let info = {
        modo: "facturacion",
        item: informesLiq,
        tipo: informesLiq.tipo,
        facOp: this.informesOp,
        accion:accion,
      }  
      
      modalRef.componentInstance.fromParent = info;

      modalRef.result.then(
        (result) => {
      
        },
        (reason) => {}
      );
    }
  }

  async obtenerInformesOp(informesLiq:ConId<InformeLiq>){

    this.cargando = true;
    let coleccion: string = informesLiq.tipo === 'cliente' ? "infOpLiqClientes" : informesLiq.tipo === 'chofer' ? "infOpLiqChoferes" : "infOpLiqProveedores"
    try {
      const consulta = await this.dbService.obtenerDocsPorIdsOperacion(       
        coleccion,         // nombre de la colección
        informesLiq.operaciones       // array de idsOperacion
      );
      console.log("consulta", consulta);
      

      this.informesOp = consulta.encontrados;

      if (consulta.idsFaltantes.length) {
        Swal.fire({
          icon: 'warning',
          title: 'Atención',
          text: `Se encontraron ${consulta.encontrados.length} informes, pero faltan ${consulta.idsFaltantes.length}.`,
          footer: `IDs faltantes: ${consulta.idsFaltantes.join(', ')}`
        });
      } else {
        //Swal.fire('Éxito', 'Se encontraron todas las operaciones.', 'success');
      }

    } catch (error) {
      console.error("'Error al consultar por los informes", error);
      Swal.fire('Error', 'Falló la consulta de los informes.', 'error');
    } finally {
      this.cargando = false;
    }
  }

  async reimprimirLiq(inf:ConId<InformeLiq>, tipo:string){
    const respuesta = await Swal.fire({
      title: `¿Desea imprimir el detalle de la liquidación?`,
      //text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    })
    
    if (respuesta.isConfirmed) {
      await this.obtenerInformesOp(inf);       
      if(tipo === "excel"){
        this.excelServ.exportToExcelInforme(inf, this.informesOp, this.clientes, this.choferes, 'factura');
      }else if (tipo === "pdf"){
        this.pdfServ.exportToPdfInforme(inf, this.informesOp, this.clientes, this.choferes, 'factura');        
      }                        
    }

  }

  async anularInfLiq(infLiq:ConId<InformeLiq>){
     const respuesta = await Swal.fire({
      title: `¿Desea anular el informe de liquidación?`,
      text: "Esta acción no se podra revertir",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    })
    if(respuesta.isConfirmed){
      this.openModalBaja(infLiq)
    }
  }

  ////// MODAL PARA ANULAR UN INFORME DE LIQUIDACION
  async openModalBaja(informeLiq: ConId<InformeLiq>){  
    await this.obtenerInformesOp(informeLiq)
    {
      const modalRef = this.modalService.open(BajaObjetoComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        scrollable: true, 
        size: 'sm',     
      });       
      console.log("informesLiq",informeLiq);
      let info = {
          modo: "facturacion",
          item: informeLiq,
        }        
      
      modalRef.componentInstance.fromParent = info;
      try {
        let usuario = this.storageService.loadInfo('usuario')
        const motivo = await modalRef.result;
        console.log("motivo", motivo);
        
        if(!motivo) return
        this.cargando = true;
        informeLiq.anuladoMotivo = motivo;
        informeLiq.fechaAnulacion = new Date().toISOString().split('T')[0]
        informeLiq.anuladoPor = usuario[0].email;
        informeLiq.estado = 'anulado';
        console.log("informesLiq anulado", informeLiq);
        this.storageService.updateItem(this.coleccion,informeLiq, informeLiq.idInfLiq, "ANULACION", `Anulación de informe de liquidación N° ${informeLiq.numeroInterno}`, informeLiq.id)
        this.cargando = false;
        const respuesta = await
        Swal.fire({
          icon: 'success',
          title: 'El informe de liquidación fue anulado',
//          text: 'La operación fue dada de baja y se actualizó el tablero.'
        }); 
        if(respuesta.isConfirmed){
          this.ngOnInit()
        }
        
      } catch (e) {
        console.warn("El modal fue cancelado o falló:", e);
      }
    }
  }

  vincularFacElec(infLiq: ConId<InformeLiq>){
     {
      const modalRef = this.modalService.open(ModalVincularFacturaComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        scrollable: true, 
        size: 'md',        
      });       
      console.log("informesLiq",infLiq);
/*       let info = {
        modo: "facturacion",
        item: informesLiq,
        tipo: informesLiq.tipo,
        facOp: this.informesOp,
        accion:accion,
      }   */
      
      modalRef.componentInstance.fromParent = infLiq;

      modalRef.result.then(
        (result) => {
      
        },
        (reason) => {}
      );
    }
  }



  ////////////////////////// METODOS INTERNOS DE CONTROL Y CORRECCION ////////////////////////
  
/*   verificarFacturasDuplicados() {
    this.facturasDuplicadas=[]
    const seenIds = new Set<number>();

    this.informesLiq = this.informesLiq.filter((factura:InformeLiq) => {
        if (seenIds.has(factura.idInfLiq)) {
            this.facturasDuplicadas.push(factura);
            return false; // Eliminar del array original
        } else {
            seenIds.add(factura.idInfLiq);
            return true; // Mantener en el array original
        }
    });    
    console.log("datosOrigen", this.informesLiq);
    console.log("duplicadas", this.facturasDuplicadas);
    //this.verificarDuplicadosFacturadas()
  }

  eliminarObjeto(){
    this.cargando = true
    this.dbService.eliminarMultiple(this.facturasDuplicadas, 'resumenLiq').then((result)=>{
      this.cargando = false
      if(result.exito){
        alert("eliminado correctamente")
      } else {
        alert(`error eliminado. errr: ${result.mensaje}`)
      }
    })
  }

  editarObjetos(){
    this.informesLiq = this.editarCampo(this.informesLiq);
    this.aplicarFiltros();
    console.log("informesLiq: ", this.informesLiq);
    
  }

  editarCampo(informes: ConId<InformeLiq>[]): ConId<InformeLiq>[] {
    return informes.map(inf => {
        inf.numeroInterno = "";
        return inf
    });
  }

  actualizarObjetos(){
    this.cargando = true
    this.dbService.actualizarMultiple(this.informesLiq, 'resumenLiq').then((result)=>{
      this.cargando = false
      if(result.exito){
        alert("actualizado correctamente")
      } else {
        alert(`error actualizando. errr: ${result.mensaje}`)
      }
    })
  }

  async asignarNumerosInternosFaltantes(): Promise<void> {
    this.cargando = true;
    await this.dbService.asignarNumerosInternosFaltantes();
    this.cargando = false;    
  } */

  

}
