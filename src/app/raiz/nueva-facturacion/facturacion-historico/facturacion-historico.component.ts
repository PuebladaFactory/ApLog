import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConId } from 'src/app/interfaces/conId';
import { InformeLiq } from 'src/app/interfaces/informe-liq';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { ModalDetalleComponent } from '../modal-detalle/modal-detalle.component';
import Swal from 'sweetalert2';
import { AccionInformeLiq, puedeEjecutarAccion } from 'src/app/reglas/informe-liq.rules';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { PdfService } from 'src/app/servicios/informes/pdf/pdf.service';
import { SupabaseStorageService } from 'src/app/servicios/supabase/supabase-storage.service';
import { InformeLiqDetalleComponent } from 'src/app/shared/modales/informe-liq-detalle/informe-liq-detalle.component';
import { InformeOp } from 'src/app/interfaces/informe-op';
import { Cliente } from 'src/app/interfaces/cliente';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { Chofer } from 'src/app/interfaces/chofer';
import { BajaObjetoComponent } from 'src/app/shared/modales/baja-objeto/baja-objeto.component';
import { ColumnaTabla } from 'src/app/interfaces/tablas';

@Component({
  selector: 'app-facturacion-historico',
  standalone: false, 
  templateUrl: './facturacion-historico.component.html',
  styleUrl: './facturacion-historico.component.scss'
})
export class FacturacionHistoricoComponent implements OnInit {
  
  // datos
  informesLiq: ConId<InformeLiq>[] = [];
  informesFiltrados: ConId<InformeLiq>[] = [];

  // filtros
  filtroTipo: 'cliente' | 'chofer' | 'proveedor' | 'todos' = 'todos';
  filtroEstado: 'facturado' | 'anulado' | 'cobrado' = 'facturado';

  fechaDesde!: string;
  fechaHasta!: string;

  // ui
  cargando = false;

  // ordenamiento
  ordenColumna: string = '';
  ordenAsc: boolean = true;
  filtroRazonSocial: string = '';
  
  //reimpresion
  informesOp: ConId<InformeOp>[] = [];
  clientes: ConId<Cliente>[] = [];
  choferes: ConId<Chofer>[] = [];
  proveedores: ConId<Proveedor>[] = [];
  coleccion:string = "resumenLiq";

  columnas: ColumnaTabla<InformeLiq>[] = [
      {
        key: 'fecha',
        label: 'Fecha',
        sortable: true,
        
      },
      {
        key: 'tipo',
        label: 'Tipo',
        sortable: true,
        
      },
      {
        key: 'numInterno',
        label: 'N° Informe',
        sortable: true,
        value: inf => inf.numeroInterno ?? 0
      },
      {
        key: 'id',
        label: 'Id',
        sortable: true,
        value: inf => inf.idInfLiq ?? 0
      },
      {
        key: 'mes',
        label: 'Mes',
        sortable: true,
        value: inf => inf.mes ?? ''
      },
      {
        key: 'periodo',
        label: 'Periodo Liq',
        sortable: true,
        value: inf => inf.periodo ?? ''
      },
      {
        key: 'razonSocial',
        label: 'Razón Social',
        sortable: true,
        value: inf => inf.entidad?.razonSocial ?? ''
      },      
      {
        key: 'total',
        label: 'Total',
        sortable: true,
        align: 'end',
        value: inf => this.formatearValor(inf.valores?.total) ?? this.formatearValor(0),
        cellClass: 'table-success'
      },
      {
        key: 'cantOp',
        label: 'Cant Op',
        sortable: true,
        align: 'center',
        value: inf => inf.operaciones?.length ?? 0
      },
      {
        key: 'estado',
        label: 'Estado',
        sortable: true,
        align: 'center',       
        value: inf => inf.estadoFinanciero === 'cobrado' ? inf.estadoFinanciero : inf.estado
      },
  
      // acciones ↓
      { key: 'detalle', label: 'Detalle', align: 'center', acciones: ['detalle'] },      
      { key: 'reimprimir', label: 'Reimprimir', align: 'center', acciones: ['reimprimir'] },
      { key: 'fElectrónica', label: 'F. Electrónica', align: 'center', acciones: ['factura'] },      
    ];

  informesEditables: ConId<InformeLiq>[] = [];
  
  constructor(
    private dbService: DbFirestoreService, 
    private storageService: StorageService, 
    private excelServ: ExcelService,     
    private pdfServ: PdfService,     
    private modalService: NgbModal,
    private supabaseStorageService : SupabaseStorageService   
  ){}
  
  
  ngOnInit(): void {
    const hoy = new Date();
    this.fechaDesde = `${hoy.getFullYear()}-01-01`;
    this.fechaHasta = `${hoy.getFullYear()}-12-31`;
    this.cargarInformes(this.fechaDesde, this.fechaHasta);
    this.clientes = this.storageService.loadInfo('clientes');
    this.choferes = this.storageService.loadInfo('choferes');
    this.proveedores = this.storageService.loadInfo('proveedores');
  }

  async cargarInformes(desde:string,hasta:string) {
    this.cargando = true;

    try {
      this.informesLiq = await this.dbService
        .getInformesLiqPorTipoYFechas(
          this.filtroTipo,          
          this.fechaDesde,
          this.fechaHasta,
          this.filtroEstado,

        );
      console.log("this.informesLiq: ", this.informesLiq);
        
      this.aplicarFiltros();
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudieron obtener los informes.', 'error');
    } finally {
      this.cargando = false;
    }
  }

  aplicarFiltros() {
    const textoBusqueda = this.filtroRazonSocial.toLowerCase().trim();

    this.informesFiltrados = this.informesLiq.filter(inf => {
      const coincideTipo =
        this.filtroTipo === 'todos' || inf.tipo === this.filtroTipo;

      const coincideRazon =
        inf.entidad?.razonSocial
          ?.toLowerCase()
          .includes(textoBusqueda);

      const coincideNumero =
        inf.numeroInterno
          ?.toLowerCase()
          .includes(textoBusqueda);

      const estado =
        inf.estado
          ?.toLowerCase()
          .includes(textoBusqueda);

      const estadoFinanciero =
        inf.estadoFinanciero
          ?.toLowerCase()
          .includes(textoBusqueda);

      const periodo =
        inf.periodo
          ?.toLowerCase()
          .includes(textoBusqueda);

      return coincideTipo && (coincideRazon || coincideNumero || estado || estadoFinanciero || periodo );
    });
  }

  onOrdenar(event: { key: string; asc: boolean }) {
    const { key, asc } = event;

    this.informesFiltrados = [...this.informesFiltrados].sort((a, b) => {
      const valA = this.obtenerValorOrden(a, key);
      const valB = this.obtenerValorOrden(b, key);

      if (valA == null || valB == null) return 0;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return asc ? valA - valB : valB - valA;
      }

      return asc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }


  private obtenerValorOrden(obj: any, columna: string) {
    switch (columna) {
      case 'fecha':
        return new Date(obj.fecha).getTime();
      case 'total':
        return obj.valores.total;
      case 'razonSocial':
        return obj.entidad.razonSocial.toLowerCase();
      case 'cantOp':
        return obj.operaciones.length;
      case 'cantOp':
        return obj.operaciones.length;
      case 'numInterno':
        return obj.numeroInterno;
      case 'id':
        return obj.idInfLiq;
      default:
        return obj[columna];
    }
  }



  descargarFactura(inf: InformeLiq) {
    if (!inf.facturaUrl) {
      Swal.fire('Sin factura', 'El informe no tiene factura electrónica.', 'info');
      return;
    }

    // tu servicio de supabase signed url
    window.open(inf.facturaUrl, '_blank');
  }

  puede(inf: InformeLiq, accion: AccionInformeLiq): boolean {
    return puedeEjecutarAccion(inf.estado, accion);
  }

  ////// MODAL PARA LA VISTA Y LA EDICION
  async verDetalle(informesLiq: ConId<InformeLiq>, accion:string){  
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
    let coleccion: string = ""
    if(informesLiq.estado === 'anulado'){
      coleccion = informesLiq.tipo === 'cliente' ? "informesOpClientes" : informesLiq.tipo === 'chofer' ? "informesOpChoferes" : "informesOpProveedores"  
    } else {
      coleccion = informesLiq.tipo === 'cliente' ? "infOpLiqClientes" : informesLiq.tipo === 'chofer' ? "infOpLiqChoferes" : "infOpLiqProveedores"
    }
    
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




  async verPdf(infLiq: ConId<InformeLiq>){
    if (!infLiq.facturaUrl) return;
    const signedUrl = await this.supabaseStorageService.verFactura(infLiq.facturaUrl);
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    }
  } 

  onAccion(e: { accion: string; item: ConId<InformeLiq> }) {
    switch (e.accion) {
      case 'detalle':
        this.verDetalle(e.item, 'vista');
        break;      
      case 'excel':
      case 'pdf':
        this.reimprimirLiq(e.item, e.accion);
        break;
      case 'factura':
        this.verPdf(e.item);
        break;      
    }
  }

  formatearValor(valor: number) : any{
    let nuevoValor =  new Intl.NumberFormat('es-ES', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(valor);
   //////////console.log(nuevoValor);    
    //   `$${nuevoValor}`   
    return `$ ${nuevoValor}`
  }

  editarInformesFinanzas(){
    
    console.log("1)informesLiq: ", this.informesLiq);
    this.informesEditables = this.migrarInformesAFinanzas(this.informesLiq)
    console.log("2)informesEditables: ", this.informesEditables);
  }



  migrarInformesAFinanzas(
    informes: ConId<InformeLiq>[]
  ): ConId<InformeLiq>[] {
    return informes.map(inf => {
      // si ya está migrado, no tocarlo
      if (inf.estadoFinanciero && inf.valoresFinancieros) {
        return inf;
      }

      const total = inf.valores?.total ?? 0;

      return {
        ...inf,
        estadoFinanciero: inf.estadoFinanciero ?? 'pendiente',
        valoresFinancieros: inf.valoresFinancieros ?? {
          total,
          totalCobrado: 0,
          saldo: total
        }
      };
    });
  }

  actualizarObjeto(){
    this.cargando = true
    this.dbService.actualizarOperacionesBatch(this.informesEditables, "resumenLiq").then((result)=>{
      this.cargando = false
      if(result.exito){
        alert("actualizado correctamente")
      } else {
        alert(`error actualizando. errr: ${result.mensaje}`)
      }
    })
  }



}
