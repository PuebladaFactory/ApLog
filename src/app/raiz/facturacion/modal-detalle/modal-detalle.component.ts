import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { error } from 'jquery';
import { Subject, take, takeUntil } from 'rxjs';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConId, ConIdType } from 'src/app/interfaces/conId';




import { InformeLiq } from 'src/app/interfaces/informe-liq';
import { InformeOp } from 'src/app/interfaces/informe-op';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { PdfService } from 'src/app/servicios/informes/pdf/pdf.service';
import { LogService } from 'src/app/servicios/log/log.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { SupabaseStorageService } from 'src/app/servicios/supabase/supabase-storage.service';
import { BajaObjetoComponent } from 'src/app/shared/modales/baja-objeto/baja-objeto.component';
import { InformeLiqDetalleComponent } from 'src/app/shared/modales/informe-liq-detalle/informe-liq-detalle.component';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-modal-detalle',
    templateUrl: './modal-detalle.component.html',
    styleUrls: ['./modal-detalle.component.scss'],
    standalone: false
})
////////////////////COMPONENTE QUE MUESTRA LOS RESUMENES DE LIQUIDACION DE UN OBJETO//////////////////////////////
export class ModalDetalleComponent implements OnInit {

  @Input() fromParent: any;
  data: ConIdType<InformeLiq>[] = [];
  operacionFac: any[] = [];
  rows: any[] = [];
  filteredRows: any[] = [];
  paginatedRows: any[] = [];
  allColumns = [
//    { prop: '', name: '', selected: true, flexGrow:1  },
  { prop: 'fecha', name: 'Fecha', selected: true, flexGrow:2  },  
  { prop: 'quincena', name: 'Quincena', selected: true, flexGrow:2  },          
  { prop: 'idFactura', name: 'Id Factura', selected: true, flexGrow:2  },
  { prop: 'cant', name: 'Cant Op', selected: true, flexGrow:2 },
  { prop: 'cobrado', name: 'Cobrado', selected: false, flexGrow:2 },
  { prop: 'sumaPagar', name: 'Suma a Pagar', selected: true, flexGrow:2  },    
  { prop: 'sumaCobrar', name: 'Suma a Cobrar', selected: true, flexGrow:2  },    
  { prop: 'neta', name: 'Ganancia Neta', selected: true, flexGrow:2  },    
  { prop: 'porcentaje', name: 'Porcentaje', selected: true, flexGrow:2  },  
  /* { prop: 'cobrado', name: 'Cobrado', selected: true, flexGrow:2  },  
  { prop: 'imprinmir', name: 'Imprimir', selected: true, flexGrow:2  },   */  
  ];
  visibleColumns = this.allColumns.filter(column => column.selected);
  selected = [];
  count = 0;
  limit = 20;
  offset = 0;
  
  
  
  encapsulation!: ViewEncapsulation.None;
  ajustes: boolean = false;
  firstFilter = '';
  secondFilter = '';
  informesOpCliente: ConId<InformeOp>[] = [];
  informesOpChofer: ConId<InformeOp>[] = [];
  informesOpProveedor: ConId<InformeOp>[] = [];
  informesOp: ConId<InformeOp>[] = [];
  titulo:string = ""
  idFactura!: number;
  $choferes!: ConIdType<Chofer>[];
  $clientes!: ConIdType<Cliente>[];
  $proveedores!: ConIdType<Proveedor>[];
  private destroy$ = new Subject<void>(); // Subject para manejar la destrucción
  searchText!:string;
  componente: string = "";
  factura: ConId<InformeLiq>[] = [];
  isLoading:boolean = false;

  constructor(public activeModal: NgbActiveModal, private storageService: StorageService, private excelServ: ExcelService, 
    private pdfServ: PdfService, private logService: LogService,
    private dbFirebase: DbFirestoreService, private modalService: NgbModal,
    private supabaseStorageService : SupabaseStorageService 
){

  }
  
  ngOnInit(): void {
    this.storageService.getObservable<ConIdType<Chofer>>("choferes")
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      this.$choferes = data;
      this.$choferes = this.$choferes.sort((a, b) => a.apellido.localeCompare(b.apellido)); // Ordena por el nombre del chofer
    });
    this.storageService.getObservable<ConIdType<Cliente>>("clientes")
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      this.$clientes = data;
      this.$clientes = this.$clientes.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
    }); 
    this.storageService.getObservable<ConIdType<Proveedor>>("proveedores")
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      this.$proveedores = data; 
      this.$proveedores = this.$proveedores.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer           
    })       
    console.log("0) ", this.fromParent);
    this.data = this.fromParent.item;  //resumenes de liquidacion
    console.log("data: ", this.data); 
    this.titulo = this.data[0].entidad.razonSocial
    this.componente = this.fromParent.modo === "cliente" ? "resumenLiqClientes" : this.fromParent.modo === "chofer" ? "resumenLiqChoferes" : "resumenLiqProveedores"
    this.armarTabla()
/*     switch (this.fromParent.modo){
      //////////////CLIENTES///////////////////////
      case "clientes":
        
          //console.log("data: ", this.data);
          this.titulo = this.data[0].entidad.razonSocial
          //this.idFactura = this.data[0].idFacturaCliente;
          this.componente = "facturaCliente";
          this.armarTabla()
          break;
      //////////////CHOFERES///////////////////////
      case "choferes":
          
          //console.log("data: ", this.data);
          this.titulo = `${this.data[0].apellido} ${this.data[0].nombre}`
          //this.idFactura = this.data[0].idFacturaChofer;
          this.componente = "facturaChofer";
          this.armarTabla()
          break;
      //////////////PROVEEDORES///////////////////////
      case "proveedores":
          
          //console.log("data: ", this.data);
          this.titulo = this.data[0].razonSocial
          //this.idFactura = this.data[0].idFacturaProveedor;
          this.componente = "facturaProveedor";
          this.armarTabla()
          break;
      default:
        alert("error update")
      break;
    }  */      
  }

  ngOnDestroy(): void {
    // Completa el Subject para cancelar todas las suscripciones
    this.destroy$.next();
    this.destroy$.complete();
  }

  getQuincena(fecha: string | Date): string {
    const fechaObj = new Date(fecha);
    const dia = fechaObj.getDate();
    return dia <= 15 ? '1° quincena' : '2° quincena';
  }

  facturaCobrada(row: any) {
    //console.log(row);
    let factura = this.data.filter((factura:InformeLiq) => {
      return factura.idInfLiq === row.idFactura
    })
    console.log("FACTURA CON ID CHTM", factura);
      
    factura[0].cobrado = !factura[0].cobrado;
    this.updateItem(factura[0]);
    /* //////////////CLIENTES///////////////////////
    if(this.fromParent.modo === "cliente"){
      //console.log(row);
      let factura = this.data.filter((factura:InformeLiq) => {
        return factura.idInfLiq === row.idFactura
      })
      //console.log(factura);
      
      factura[0].cobrado = !factura[0].cobrado;
      this.updateItem(factura[0]);
    }
    //////////////CHOFERES///////////////////////
    if(this.fromParent.modo === "chofer"){
      //console.log(row);
      let factura = this.data.filter((factura:InformeLiq) => {
        return factura.idInfLiq === row.idFactura
      })
      //console.log(factura);
      
      factura[0].cobrado = !factura[0].cobrado;
      this.updateItem(factura[0]);
    }
    //////////////PROVEEDORES///////////////////////
    if(this.fromParent.modo === "proveedor"){
      //console.log(row);
      let factura = this.data.filter((factura:InformeLiq) => {
        return factura.idInfLiq === row.idFactura
      })
      //console.log(factura);
      
      factura[0].cobrado = !factura[0].cobrado;
      this.updateItem(factura[0]);
    } */
  }

  updateItem(item: ConIdType<InformeLiq>) {
    console.log(item);
    let {id,type, ...fac} = item;    
    
    switch (this.fromParent.modo){
      //////////////CLIENTES///////////////////////
      case"cliente":          
          this.storageService.updateItem('resumenLiqClientes', fac, item.entidad.id, "EDITAR", item.cobrado ? `Resumen de op Liquidadas del Cliente ${item.entidad.razonSocial} cobrada` : `Resumen de op Liquidadas del  Cliente ${item.entidad.razonSocial} sin cobrar`, item.id );
          break;
      //////////////CHOFERES///////////////////////
      case "chofer":
          this.storageService.updateItem('resumenLiqChoferes', fac, item.entidad.id, "EDITAR", item.cobrado ? `Resumen de op Liquidadas del  Chofer ${item.entidad.razonSocial} cobrada` : `Resumen de op Liquidadas del  Chofer ${item.entidad.razonSocial} sin cobrar`, item.id );
          break;
      //////////////PROVEEDORES///////////////////////
      case "proveedor":
          this.storageService.updateItem('resumenLiqCProveedores', fac, item.entidad.id, "EDITAR", item.cobrado ? `Resumen de op Liquidadas del  Proveedor ${item.entidad.razonSocial} cobrada` : `Resumen de op Liquidadas del  Proveedor ${item.entidad.razonSocial} sin cobrar`, item.id);
      break;
      default:
        alert("error update")
      break;
    }    
  }

  reimprimirFac(formato: string) {        
    this.operacionFac = [];
    //this.obtenerFacturas(row)
    switch (this.fromParent.modo){
      //////////////CLIENTES///////////////////////
      case "cliente":          
          console.log("REIMPRESION: factura ", this.factura[0], "facturas: ",  this.informesOp );
          if (formato === 'excel') {
            //console.log("3)factura y facturasOpCliente: ",this.factura[0], this.informesOpCliente );      
            this.excelServ.exportToExcelInforme(this.factura[0], this.informesOp, this.$clientes, this.$choferes, 'factura');
            this.logService.logEvent("REIMPRESION", "facturaCliente", `Reimpresion de detalle en excel del Cliente ${this.factura[0].entidad.razonSocial}`, this.factura[0].entidad.id, true);
          } else if(formato === 'pdf') {
            //console.log("3)factura y facturasOpCliente: ",this.factura[0], this.informesOpCliente );
            this.pdfServ.exportToPdfInforme(this.factura[0], this.informesOp, this.$clientes, this.$choferes, 'factura');
            this.logService.logEvent("REIMPRESION", "facturaCliente", `Reimpresion de detalle en pdf del Cliente ${this.factura[0].entidad.razonSocial}`, this.factura[0].entidad.id, true);
          } else {
            //console.log("listado de op", this.informesOpCliente);
            console.error("error en la reimpresion")
          }  
          break;
      //////////////CHOFERES///////////////////////
      case "chofer":
          
          console.log("3) operacionFac: ", this.informesOpChofer);
          if (formato === 'excel') {
            //console.log("3)factura y facturasOpChofer: ",this.factura[0], this.informesOpCliente );      
            this.excelServ.exportToExcelInforme(this.factura[0], this.informesOp, this.$clientes, this.$choferes, 'factura');
            this.logService.logEvent("REIMPRESION", "facturaChofer", `Reimpresion de detalle en excel del Chofer ${this.factura[0].entidad.razonSocial}`, this.factura[0].entidad.id, true);
          } else if(formato === 'pdf') {
            //console.log("3)factura y facturasOpChofer: ",this.factura[0], this.informesOpCliente );
            this.pdfServ.exportToPdfInforme(this.factura[0], this.informesOp, this.$clientes, this.$choferes, 'factura');
            this.logService.logEvent("REIMPRESION", "facturaChofer", `Reimpresion de detalle en pdf del Chofer ${this.factura[0].entidad.razonSocial}`, this.factura[0].entidad.id, true);
          } else {
            //console.log("listado de op", this.informesOpChofer);
            console.error("error en la reimpresion")
          }  
          break;
      //////////////PROVEEDORES///////////////////////
      case "proveedor":
        
          if (formato === 'excel') {
            //console.log("3)factura y facturasOpProveedor: ",this.factura[0], this.informesOpProveedor );      
            this.excelServ.exportToExcelInforme(this.factura[0], this.informesOp, this.$clientes, this.$choferes, 'factura');
            this.logService.logEvent("REIMPRESION", "facturaProveedor", `Reimpresion de detalle en excel del Proveedor $${this.factura[0].entidad.razonSocial}`, this.factura[0].entidad.id, true);
          } else if(formato === 'pdf') {
            console.log("3)factura y facturasOpProveedor: ",this.factura[0], this.informesOp );
            this.pdfServ.exportToPdfInforme(this.factura[0], this.informesOp, this.$clientes, this.$choferes,'factura');
            this.logService.logEvent("REIMPRESION", "facturaProveedor", `Reimpresion de detalle en excel del Proveedor ${this.factura[0].entidad.razonSocial}`, this.factura[0].entidad.id, true);
          }   else {
            console.log("listado de op", this.informesOp);
            
          }  
      break;
      default:
        alert("error de reimpresion")
      break;
    }
    
  }

  armarTabla() {
    let indice = 0
    ////console.log("consultasOp: ", this.$consultasOp );
    switch (this.fromParent.modo){
      //////////////CLIENTES///////////////////////
      case "cliente":
          this.rows = this.data.map((factura: InformeLiq) => ({
              indice: indice ++,
              fecha: factura.fecha,
              quincena: this.getQuincena(factura.fecha),
              idFactura: factura.idInfLiq,
              numInt: factura.numeroInterno,
              cant: factura.operaciones.length,
              sumaPagar: `$ ${this.formatearValor(factura.valores.totalContraParte)}`,
              sumaCobrar: `$ ${this.formatearValor(factura.valores.total)}`,
              neta: `$ ${this.formatearValor(factura.valores.total - factura.valores.totalContraParte)}`,
              porcentaje: `${this.formatearValor((factura.valores.total - factura.valores.totalContraParte)*100/factura.valores.total)} %`,
              cobrado: factura.cobrado,
              url: factura.facturaUrl ?  factura.facturaUrl : "",
              estado: factura.estado,
          }));
          break;
      //////////////CHOFERES///////////////////////
     case "chofer":
          this.rows = this.data.map((factura: InformeLiq) => ({
              indice: indice ++,
              fecha: factura.fecha,
              quincena: this.getQuincena(factura.fecha),
              idFactura: factura.idInfLiq,
              numInt: factura.numeroInterno,
              cant: factura.operaciones.length,
              sumaPagar: `$ ${this.formatearValor(factura.valores.total)}`,
              sumaCobrar: `$ ${this.formatearValor(factura.valores.totalContraParte)}`,
              neta: `$ ${this.formatearValor(factura.valores.totalContraParte - factura.valores.total)}`,
              porcentaje: `${this.formatearValor((factura.valores.totalContraParte - factura.valores.total)*100/factura.valores.totalContraParte)} %`,
              cobrado: factura.cobrado,   
              url: factura.facturaUrl ?  factura.facturaUrl : "",     
              estado: factura.estado,      
          }));
          break;
      //////////////PROVEEDORES///////////////////////
       case "proveedor":
          this.rows = this.data.map((factura: InformeLiq) => ({
              indice: indice ++,
              fecha: factura.fecha,
              quincena: this.getQuincena(factura.fecha),
              idFactura: factura.idInfLiq,
              numInt: factura.numeroInterno,
              cant: factura.operaciones.length,
              sumaPagar: `$ ${this.formatearValor(factura.valores.total)}`,
              sumaCobrar: `$ ${this.formatearValor(factura.valores.totalContraParte)}`,
              neta: `$ ${this.formatearValor(factura.valores.totalContraParte - factura.valores.total)}`,
              porcentaje: `$ ${this.formatearValor((factura.valores.totalContraParte - factura.valores.total)*100/factura.valores.totalContraParte)}`,
              cobrado: factura.cobrado,
              url: factura.facturaUrl ?  factura.facturaUrl : "",
              estado: factura.estado,
          }));
          break;
      default:
        alert("error armardo de tabla")
      break;
    }    
    ////console.log("Rows: ", this.rows); // Verifica que `this.rows` tenga datos correctos
    this.applyFilters(); // Aplica filtros y actualiza filteredRows */
  }
  
  setPage(pageInfo: any) {
    this.offset = pageInfo.offset;
    this.updatePaginatedRows();
  }
  
  updatePaginatedRows() {
    const start = this.offset * this.limit;
    const end = start + this.limit;
    this.paginatedRows = this.filteredRows.slice(start, end);
  }
  
  onSort(event:any) {
    // Implementa la lógica de ordenamiento
  }
  
  onActivate(event: any) {
    // Implementa la lógica de activación de filas
  }
  
  onSelect(event: any) {
    // Implementa la lógica de selección de filas
  }
  
  updateFilter(event: any, filterType: string) {
    const val = event.target.value.toLowerCase();
    if (filterType === 'first') {
      this.firstFilter = val;
    } else if (filterType === 'second') {
      this.secondFilter = val;
    }
    this.applyFilters();
  }
  
  applyFilters() {
    this.filteredRows = this.rows.filter(row => {
      const firstCondition = Object.values(row).some(value => 
        String(value).toLowerCase().includes(this.firstFilter)
      );
      const secondCondition = Object.values(row).some(value => 
        String(value).toLowerCase().includes(this.secondFilter)
      );
  
      return firstCondition && secondCondition;
    });
  
    this.count = this.filteredRows.length; // Actualiza el conteo de filas
    this.setPage({ offset: this.offset }); // Actualiza los datos para la página actual
  }
  
  toggleColumn(column: any) {
    if (column.prop !== '') { // Siempre muestra la columna del botón
      column.selected = !column.selected;
    }
    this.visibleColumns = this.allColumns.filter(col => col.selected);
  }
  
  toogleAjustes(){
    this.ajustes = !this.ajustes;
  }

  formatearValor(valor: any) : any{     
    valor = Number(valor)
    let nuevoValor =  new Intl.NumberFormat('es-ES', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(valor);   
    ////console.log(nuevoValor);    
    return nuevoValor
   
  
 }

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

bajaOp(factura:any){
 /*  console.log("fila: ", factura);
  let facturaBaja:any;
  switch (this.fromParent.modo){
    //////////////CLIENTES///////////////////////
    case "clientes":
      facturaBaja = this.data.filter((f:any) => f.idFacturaCliente === factura.idFactura);
      console.log("facturaBaja", facturaBaja[0]);
      break;
    case "choferes":
      facturaBaja = this.data.filter((f:any) => f.idFacturaChofer === factura.idFactura);
      console.log("facturaBaja", facturaBaja[0]);
      break;
    case "proveedores":
      facturaBaja = this.data.filter((f:any) => f.idFacturaProveedor === factura.idFactura);
      console.log("facturaBaja", facturaBaja[0]);
      break;  
    default:
      break;
  }   */
  
  
  
  
    Swal.fire({
          title: "¿Desea anular la factura?",
          //text: "No se podrá revertir esta acción",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          confirmButtonText: "Confirmar",
          cancelButtonText: "Cancelar"
        }).then((result) => {
          if (result.isConfirmed) {
            this.openModalBaja(factura);
          }
        });
    
  }

  openModalBaja(factura:ConId<InformeLiq>){
    {
      const modalRef = this.modalService.open(BajaObjetoComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        scrollable: true, 
        size: 'sm',     
      });       
      console.log("factura",factura);
      let info = {
        modo: "facturacion",
        item: factura,
        tipo: this.fromParent.modo 
      }  

      let id : number = this.fromParent.modo === "cliente" ? factura.entidad.id : this.fromParent.modo === "chofer" ? factura.entidad.id : factura.entidad.id;
      
      
      modalRef.componentInstance.fromParent = info;
    
      modalRef.result.then(
        (result) => {
          if(result !== undefined){   
            console.log("result", result);
            ////////console.log("llamada al storage desde op-abiertas, deleteItem");
            this.storageService.deleteItemPapelera(
              this.componente, 
              factura, 
              id, 
              "BAJA", 
              `Baja de Factura del ${this.fromParent.modo === "cliente" ? "Cliente" : this.fromParent.modo === "chofer" ? "Chofer" : "Proveedor"} 
              ${factura.entidad.razonSocial}
              `, 
              result);
            ////////console.log("consultas Op: " , this.$consultasOp);
            Swal.fire({
              title: "Confirmado",
              text: "La factura ha sido anulada",
              icon: "success"
            });
            this.activeModal.close();
          }

          
        },
        (reason) => {}
      );
    }
  }

  mostrarDetalleOp(fila:any){
    //this.obtenerFacturas(fila, "detalle")
   /*  let factura:any;
    this.operacionFac = [];
    switch (this.fromParent.modo){
      //////////////CLIENTES///////////////////////
      case "clientes":
          console.log("1) fila: ",fila);    
          factura = this.data.filter((factura:InformeLiq) => {
            return factura.idFacturaCliente === fila.idFactura
          })
          console.log(factura);
          factura[0].operaciones.forEach((id: number) => {
            if (this.informesOpCliente !== null) {
              this.informesOpCliente.forEach((facturaOp: any) => {
                if (facturaOp.idOperacion === id) {
                  this.operacionFac.push(facturaOp);
                }
              });
            }
          });
           
          break;
      //////////////CHOFERES///////////////////////
      case "choferes":
          console.log("1) fila: ",fila);    
          factura = this.data.filter((factura:InformeLiq) => {
            return factura.idFacturaChofer === fila.idFactura
          })
          console.log(factura);
          factura[0].operaciones.forEach((id: number) => {
            if (this.informesOpChofer !== null) {
              this.informesOpChofer.forEach((facturaOp: any) => {
                if (facturaOp.idOperacion === id) {
                  this.operacionFac.push(facturaOp);
                }
              });
            }
          });
          console.log("3) operacionFac: ", this.operacionFac);
          
          break;
      //////////////PROVEEDORES///////////////////////
      case "proveedores":
              ////console.log("1) row: ",row);    
          factura = this.data.filter((factura:InformeLiq) => {
            return factura.idFacturaProveedor === fila.idFactura
          })
          ////console.log(factura);
          factura[0].operaciones.forEach((id: number) => {
            if (this.informesOpProveedor !== null) {
              this.informesOpProveedor.forEach((facturaOp: any) => {
                if (facturaOp.idOperacion === id) {
                  this.operacionFac.push(facturaOp);
                }
              });
            }
          });
          console.log("3) operacionFac: ", this.operacionFac);
          
      break;
      default:
        alert("error de reimpresion")
      break;
    } */
  }

  async obtenerFacturas(row:any, accion:string, formato:string){
    this.factura = this.data.filter((factura:InformeLiq) => {
      return factura.idInfLiq === row.idFactura
    });
    console.log("Factura: ", this.factura[0]);
    //respuesta = this.encontrarMaximoYMinimo(this.factura[0].operaciones)
    this.isLoading = true;
    await this.consultarOperacionesSeleccionadas(this.factura[0], this.fromParent.modo)

    if(accion === "detalle"){
      this.openModalDetalleFactura(this.factura[0], this.informesOp);
    } else if (accion === "baja"){
        this.bajaOp(this.factura[0]);
    } else if (accion === "reimpresion"){
      this.reimprimirFac(formato);
    }


   
  }

  encontrarMaximoYMinimo(operaciones: number[]): { max: number, min: number } {
    if (operaciones.length === 0) {
      throw new Error("El array de operaciones está vacío.");
    }
  
    let max = operaciones[0]; // Inicializamos con el primer valor del array
    let min = operaciones[0]; // Inicializamos con el primer valor del array
  
    for (let i = 1; i < operaciones.length; i++) {
      if (operaciones[i] > max) {
        max = operaciones[i]; // Actualizamos el máximo si encontramos un valor mayor
      }
      if (operaciones[i] < min) {
        min = operaciones[i]; // Actualizamos el mínimo si encontramos un valor menor
      }
    }
  
    return { max, min }; // Devolvemos un objeto con el máximo y el mínimo
  }

  async consultarOperacionesSeleccionadas(proforma:ConId<InformeLiq>, origen:string) {
/*     if (!this.operaciones || this.operaciones.length === 0) {
      Swal.fire('Error', 'No hay operaciones seleccionadas.', 'error');
      return;
    } */

    this.isLoading = true;
    let componente: string = origen === 'cliente' ? "infOpLiqClientes" : origen === 'chofer' ? "infOpLiqChoferes" : "infOpLiqProveedores"
    try {
      const consulta = await this.dbFirebase.obtenerDocsPorIdsOperacion(       
        componente,         // nombre de la colección
        proforma.operaciones       // array de idsOperacion
      );
      console.log("consulta", consulta);
      

      this.informesOp = consulta.encontrados;
      this.isLoading = false;
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
      this.isLoading = false;
      console.error("'Error al consultar por los informes", error);
      Swal.fire('Error', 'Falló la consulta de los informes.', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  openModalDetalleFactura(factura:any, facturasOp: InformeOp[]){
    {
      const modalRef = this.modalService.open(InformeLiqDetalleComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        scrollable: true, 
        size: 'lg',     
      });       
      console.log("factura",factura);
      let info = {
        modo: "facturacion",
        item: factura,
        tipo: this.fromParent.modo,
        facOp: facturasOp
      }  
      
      modalRef.componentInstance.fromParent = info;
    
      modalRef.result.then(
        (result) => {
      
        },
        (reason) => {}
      );
    }
  }

  mensajesError(msj:string){
      Swal.fire({
        icon: "error",
        //title: "Oops...",
        text: `${msj}`
        //footer: `${msj}`
      });
    }

  async verPdf(infLiq: string){
    console.log("InformeLiq", infLiq);
    
    if (infLiq === "") return;
    const signedUrl = await this.supabaseStorageService.verFactura(infLiq);
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    }
  } 

}
