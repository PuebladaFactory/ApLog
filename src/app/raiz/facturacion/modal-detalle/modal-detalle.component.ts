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
import { ModalBajaComponent } from 'src/app/shared/modal-baja/modal-baja.component';
import { ModalFacturaComponent } from 'src/app/shared/modal-factura/modal-factura.component';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-modal-detalle',
    templateUrl: './modal-detalle.component.html',
    styleUrls: ['./modal-detalle.component.scss'],
    standalone: false
})
export class ModalDetalleComponent implements OnInit {

  @Input() fromParent: any;
  data!: any;
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
  $facturasOpCliente: ConId<InformeOp>[] = [];
  $facturasOpChofer: ConId<InformeOp>[] = [];
  $facturasOpProveedor: ConId<InformeOp>[] = [];
  titulo:string = ""
  idFactura!: number;
  $choferes!: ConIdType<Chofer>[];
  $clientes!: ConIdType<Cliente>[];
  $proveedores!: ConIdType<Proveedor>[];
  private destroy$ = new Subject<void>(); // Subject para manejar la destrucción
  searchText!:string;
  componente: string = "";
  factura:any

  constructor(public activeModal: NgbActiveModal, private storageService: StorageService, private excelServ: ExcelService, 
    private pdfServ: PdfService, private logService: LogService,
    private dbFirebase: DbFirestoreService, private modalService: NgbModal){

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
    this.data = this.fromParent.item;
    console.log("data: ", this.data); 
    switch (this.fromParent.modo){
      //////////////CLIENTES///////////////////////
      case "clientes":
        
          //console.log("data: ", this.data);
          this.titulo = this.data[0].razonSocial
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
    }       
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
    //////////////CLIENTES///////////////////////
    if(this.fromParent.modo === "clientes"){
      //console.log(row);
      let factura = this.data.filter((factura:InformeLiq) => {
        return factura.idInfLiq === row.idFactura
      })
      //console.log(factura);
      
      factura[0].cobrado = !factura[0].cobrado;
      this.updateItem(factura[0], factura[0].idFacturaCliente);
    }
    //////////////CHOFERES///////////////////////
    if(this.fromParent.modo === "choferes"){
      //console.log(row);
      let factura = this.data.filter((factura:InformeLiq) => {
        return factura.idInfLiq === row.idFactura
      })
      //console.log(factura);
      
      factura[0].cobrado = !factura[0].cobrado;
      this.updateItem(factura[0], factura[0].idFacturaChofer);
    }
    //////////////PROVEEDORES///////////////////////
    if(this.fromParent.modo === "proveedores"){
      //console.log(row);
      let factura = this.data.filter((factura:InformeLiq) => {
        return factura.idInfLiq === row.idFactura
      })
      //console.log(factura);
      
      factura[0].cobrado = !factura[0].cobrado;
      this.updateItem(factura[0], factura[0].idFacturaProveedor);
    }
  }

  updateItem(item: any, idItem: number) {
    let {id,type, ...fac} = item
    switch (this.fromParent.modo){
      //////////////CLIENTES///////////////////////
      case"clientes":          
          this.storageService.updateItem('facturaCliente', fac, idItem, "EDITAR", item.cobrado ? `Factura Cliente ${item.razonSocial} cobrada` : `Factura Cliente ${item.razonSocial} sin cobrar`, item.id );
          break;
      //////////////CHOFERES///////////////////////
      case "choferes":
          this.storageService.updateItem('facturaChofer', fac, idItem, "EDITAR", item.cobrado ? `Factura Chofer ${item.apellido} ${item.nombre}  cobrada` : `Factura Chofer ${item.apellido} ${item.nombre} sin cobrar`, item.id );
          break;
      //////////////PROVEEDORES///////////////////////
      case "proveedores":
          this.storageService.updateItem('facturaProveedor', fac, idItem, "EDITAR", item.cobrado ? `Factura Proveedor ${item.razonSocial} cobrada` : `Factura Proveedor ${item.razonSocial} sin cobrar`, item.id);
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
      case "clientes":          
          console.log("REIMPRESION: factura ", this.factura[0], "facturas: ",  this.$facturasOpCliente );
          if (formato === 'excel') {
            //console.log("3)factura y facturasOpCliente: ",this.factura[0], this.$facturasOpCliente );      
            this.excelServ.exportToExcelInforme(this.factura[0], this.$facturasOpCliente, this.$clientes, this.$choferes, 'factura');
            this.logService.logEvent("REIMPRESION", "facturaCliente", `Reimpresion de detalle en excel del Cliente ${this.factura[0].razonSocial}`, this.factura[0].idFacturaCliente, true);
          } else if(formato === 'pdf') {
            //console.log("3)factura y facturasOpCliente: ",this.factura[0], this.$facturasOpCliente );
            this.pdfServ.exportToPdfInforme(this.factura[0], this.$facturasOpCliente, this.$clientes, this.$choferes, 'factura');
            this.logService.logEvent("REIMPRESION", "facturaCliente", `Reimpresion de detalle en pdf del Cliente ${this.factura[0].razonSocial}`, this.factura[0].idFacturaCliente, true);
          } else {
            //console.log("listado de op", this.$facturasOpCliente);
            console.error("error en la reimpresion")
          }  
          break;
      //////////////CHOFERES///////////////////////
      case "choferes":
          
          console.log("3) operacionFac: ", this.$facturasOpChofer);
          if (formato === 'excel') {
            //console.log("3)factura y facturasOpChofer: ",this.factura[0], this.$facturasOpCliente );      
            this.excelServ.exportToExcelInforme(this.factura[0], this.$facturasOpChofer, this.$clientes, this.$choferes, 'factura');
            this.logService.logEvent("REIMPRESION", "facturaChofer", `Reimpresion de detalle en excel del Chofer ${this.factura[0].apellido} ${this.factura[0].nombre}`, this.factura[0].idFacturaChofer, true);
          } else if(formato === 'pdf') {
            //console.log("3)factura y facturasOpChofer: ",this.factura[0], this.$facturasOpCliente );
            this.pdfServ.exportToPdfInforme(this.factura[0], this.$facturasOpChofer, this.$clientes, this.$choferes, 'factura');
            this.logService.logEvent("REIMPRESION", "facturaChofer", `Reimpresion de detalle en pdf del Chofer ${this.factura[0].apellido} ${this.factura[0].nombre}`, this.factura[0].idFacturaChofer, true);
          } else {
            //console.log("listado de op", this.$facturasOpChofer);
            console.error("error en la reimpresion")
          }  
          break;
      //////////////PROVEEDORES///////////////////////
      case "proveedores":
        
          if (formato === 'excel') {
            //console.log("3)factura y facturasOpProveedor: ",this.factura[0], this.$facturasOpProveedor );      
            this.excelServ.exportToExcelInforme(this.factura[0], this.$facturasOpProveedor, this.$clientes, this.$choferes, 'factura');
            this.logService.logEvent("REIMPRESION", "facturaProveedor", `Reimpresion de detalle en excel del Proveedor ${this.factura[0].razonSocial}`, this.factura[0].idFacturaProveedor, true);
          } else if(formato === 'pdf') {
            console.log("3)factura y facturasOpProveedor: ",this.factura[0], this.$facturasOpProveedor );
            this.pdfServ.exportToPdfInforme(this.factura[0], this.$facturasOpProveedor, this.$clientes, this.$choferes,'factura');
            this.logService.logEvent("REIMPRESION", "facturaProveedor", `Reimpresion de detalle en excel del Proveedor ${this.factura[0].razonSocial}`, this.factura[0].idFacturaProveedor, true);
          }   else {
            console.log("listado de op", this.$facturasOpProveedor);
            
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
      case "clientes":
          this.rows = this.data.map((factura: InformeLiq) => ({
              indice: indice ++,
              fecha: factura.fecha,
              quincena: this.getQuincena(factura.fecha),
              idFactura: factura.idInfLiq,
              cant: factura.operaciones.length,
              sumaPagar: `$ ${this.formatearValor(factura.valores.totalContraParte)}`,
              sumaCobrar: `$ ${this.formatearValor(factura.valores.total)}`,
              neta: `$ ${this.formatearValor(factura.valores.total - factura.valores.totalContraParte)}`,
              porcentaje: `${this.formatearValor((factura.valores.total - factura.valores.totalContraParte)*100/factura.valores.total)} %`,
              cobrado: factura.cobrado,
          }));
          break;
      //////////////CHOFERES///////////////////////
     case "choferes":
          this.rows = this.data.map((factura: InformeLiq) => ({
              indice: indice ++,
              fecha: factura.fecha,
              quincena: this.getQuincena(factura.fecha),
              idFactura: factura.idInfLiq,
              cant: factura.operaciones.length,
              sumaPagar: `$ ${this.formatearValor(factura.valores.total)}`,
              sumaCobrar: `$ ${this.formatearValor(factura.valores.totalContraParte)}`,
              neta: `$ ${this.formatearValor(factura.valores.totalContraParte - factura.valores.total)}`,
              porcentaje: `${this.formatearValor((factura.valores.totalContraParte - factura.valores.total)*100/factura.valores.totalContraParte)} %`,
              cobrado: factura.cobrado,              
          }));
          break;
      //////////////PROVEEDORES///////////////////////
       case "proveedores":
          this.rows = this.data.map((factura: InformeLiq) => ({
              indice: indice ++,
              fecha: factura.fecha,
              quincena: this.getQuincena(factura.fecha),
              idFactura: factura.idInfLiq,
              cant: factura.operaciones.length,
              sumaPagar: `$ ${this.formatearValor(factura.valores.total)}`,
              sumaCobrar: `$ ${this.formatearValor(factura.valores.totalContraParte)}`,
              neta: `$ ${this.formatearValor(factura.valores.totalContraParte - factura.valores.total)}`,
              porcentaje: `$ ${this.formatearValor((factura.valores.totalContraParte - factura.valores.total)*100/factura.valores.totalContraParte)}`,
              cobrado: factura.cobrado,
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

  openModalBaja(factura:any){
    {
      const modalRef = this.modalService.open(ModalBajaComponent, {
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

      let id : number = this.fromParent.modo === "clientes" ? factura.idFacturaCliente : this.fromParent.modo === "choferes" ? factura.idFacturaChofer : factura.idFacturaProveedor;
      
      
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
              `Baja de Factura del ${this.fromParent.modo === "clientes" ? "Cliente" : this.fromParent.modo === "choferes" ? "Chofer" : "Proveedor"} 
              ${this.fromParent.modo === "clientes" ? factura.razonSocial : this.fromParent.modo === "choferes" ? factura.apellido + " " + factura.nombre : factura.razonSocial}
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
            if (this.$facturasOpCliente !== null) {
              this.$facturasOpCliente.forEach((facturaOp: any) => {
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
            if (this.$facturasOpChofer !== null) {
              this.$facturasOpChofer.forEach((facturaOp: any) => {
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
            if (this.$facturasOpProveedor !== null) {
              this.$facturasOpProveedor.forEach((facturaOp: any) => {
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

  obtenerFacturas(row:any, accion:string, formato:string){
    let respuesta
    switch (this.fromParent.modo){
      //////////////CLIENTES///////////////////////
      case "clientes":
          console.log("1) row: ",row);    
          this.factura = this.data.filter((factura:InformeLiq) => {
            return factura.idInfLiq === row.idFactura
          });
          console.log(this.factura[0]);
          respuesta = this.encontrarMaximoYMinimo(this.factura[0].operaciones)
          console.log("respuesta", respuesta);
          
          this.dbFirebase.getAllByDateValueField<InformeOp>("facOpLiqCliente", "idOperacion",respuesta.min, respuesta.max, "idCliente", this.factura[0].idCliente)
          .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
          .subscribe(data => {
            if(data){
              console.log("data facOpLiqCliente", data);
              
              this.$facturasOpCliente = data.filter((fac) => {
                return this.factura[0].operaciones.includes(fac.idOperacion);
              });
              console.log("3) operacionFac!!!!: ", this.$facturasOpCliente);          
              if(accion === "detalle"){
                  this.openModalDetalleFactura(this.factura[0], this.$facturasOpCliente);
              } else if (accion === "baja"){
                  this.bajaOp(this.factura[0]);
              } else if (accion === "reimpresion"){
                  this.reimprimirFac(formato);
              }
            }
          })
          
          //console.log("3) operacionFac: ", this.operacionFac);          
          break;
      //////////////CHOFERES///////////////////////
      case "choferes":
          console.log("1) row: ",row);    
          this.factura = this.data.filter((factura:InformeLiq) => {
            return factura.idInfLiq === row.idFactura
          })
          console.log(this.factura[0]);
          respuesta = this.encontrarMaximoYMinimo(this.factura[0].operaciones)
          console.log("respuesta", respuesta);
          this.dbFirebase.getAllByDateValueField<InformeOp>("facOpLiqChofer", "idOperacion",respuesta.min, respuesta.max, "idChofer", this.factura[0].idChofer)
          .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
          .subscribe(data => {
            if(data){
              console.log("data facOpLiqChofer", data);
              
              this.$facturasOpChofer = data.filter((fac) => {
                return this.factura[0].operaciones.includes(fac.idOperacion);
              });
              console.log("3) operacionFac!!!!: ", this.$facturasOpChofer);          
              if(accion === "detalle"){
                this.openModalDetalleFactura(this.factura[0], this.$facturasOpChofer);
              } else if (accion === "baja"){
                  this.bajaOp(this.factura[0]);
              } else if (accion === "reimpresion"){
                this.reimprimirFac(formato);
              }
            }
          })
          break;
      //////////////PROVEEDORES///////////////////////
      case "proveedores":
          console.log("1) row: ",row);    
          this.factura = this.data.filter((factura:InformeLiq) => {
            return factura.idInfLiq === row.idFactura
          })
          console.log(this.factura[0]);
          respuesta = this.encontrarMaximoYMinimo(this.factura[0].operaciones)
          console.log("respuesta", respuesta);
          this.dbFirebase.getAllByDateValueField<InformeOp>("facOpLiqProveedor", "idOperacion",respuesta.min, respuesta.max, "idProveedor", this.factura[0].idProveedor)
          .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
          .subscribe(data => {
            if(data){
              console.log("data facOpLiqProveedor", data);              
              this.$facturasOpProveedor = data.filter((fac) => {
                return this.factura[0].operaciones.includes(fac.idOperacion);
              });
              console.log("3) operacionFac!!!!: ", this.$facturasOpProveedor);          
              if(accion === "detalle"){
                this.openModalDetalleFactura(this.factura[0], this.$facturasOpProveedor);
              } else if (accion === "baja"){
                  this.bajaOp(this.factura[0]);
              } else if (accion === "reimpresion"){
                this.reimprimirFac(formato);
              }
            }
          })
          
      break;
      default:
        alert("error de reimpresion")
      break;
    }

    switch(accion){
      case "detalle":
        this.mostrarDetalleOp(row);
        break;
      case "baja":
        this.bajaOp(row);
        break;
      case "reimpresion":
        //this.reimprimirFac(row);
        break;
      default:
        break;
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

  openModalDetalleFactura(factura:any, facturasOp: InformeOp[]){
    {
      const modalRef = this.modalService.open(ModalFacturaComponent, {
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

}
