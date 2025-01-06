import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ColumnMode, SelectionType, SortType } from '@swimlane/ngx-datatable';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { FacturaChofer } from 'src/app/interfaces/factura-chofer';
import { FacturaCliente } from 'src/app/interfaces/factura-cliente';
import { FacturaOp } from 'src/app/interfaces/factura-op';
import { FacturaProveedor } from 'src/app/interfaces/factura-proveedor';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { PdfService } from 'src/app/servicios/informes/pdf/pdf.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-modal-detalle',
  templateUrl: './modal-detalle.component.html',
  styleUrls: ['./modal-detalle.component.scss']
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
  sortType = SortType.multi; // Aquí usamos la enumeración SortType
  selectionType = SelectionType.checkbox; // Aquí usamos la enumeración SelectionType
  ColumnMode = ColumnMode;  
  encapsulation!: ViewEncapsulation.None;
  ajustes: boolean = false;
  firstFilter = '';
  secondFilter = '';
  $facturasOpCliente: FacturaOp[] = [];
  $facturasOpChofer: FacturaOp[] = [];
  $facturasOpProveedor: FacturaOp[] = [];
  titulo:string = ""
  idFactura!: number;
  $choferes!: Chofer[];
  $clientes!: Cliente[];
  $proveedores!: Proveedor[];

  constructor(public activeModal: NgbActiveModal, private storageService: StorageService, private excelServ: ExcelService, 
    private pdfServ: PdfService, private dbFirebase: DbFirestoreService){

  }
  
  ngOnInit(): void {
    this.storageService.choferes$.subscribe(data => {
      this.$choferes = data;
    });
    this.storageService.clientes$.subscribe(data => {
      this.$clientes = data;
    }); 
    this.storageService.proveedores$.subscribe(data => {
      this.$proveedores = data;            
    })       
    console.log("0) ", this.fromParent);
    this.data = this.fromParent.item;
    console.log("data: ", this.data); 
    switch (this.fromParent.modo){
      //////////////CLIENTES///////////////////////
      case "clientes":
          this.storageService.getByFieldValue("facOpLiqCliente", "idCliente", this.data[0].idCliente);
          this.storageService.facOpLiqCliente$.subscribe(data=>{
            this.$facturasOpCliente = data;
            console.log("1) ngOnInit facOpCliente:",this.$facturasOpCliente);      
          });
          //console.log("data: ", this.data);
          this.titulo = this.data[0].razonSocial
          //this.idFactura = this.data[0].idFacturaCliente;
          this.armarTabla()
          break;
      //////////////CHOFERES///////////////////////
      case "choferes":
          this.storageService.getByFieldValue("facOpLiqChofer", "idChofer", this.data[0].idChofer);
          this.storageService.facOpLiqChofer$.subscribe(data=>{
            this.$facturasOpChofer = data;
            console.log("1) ngOnInit facOpChofer:",this.$facturasOpChofer);      
          });
          //console.log("data: ", this.data);
          this.titulo = `${this.data[0].apellido} ${this.data[0].nombre}`
          //this.idFactura = this.data[0].idFacturaChofer;
          this.armarTabla()
          break;
      //////////////PROVEEDORES///////////////////////
      case "proveedores":
          this.storageService.getByFieldValue("facOpLiqProveedor", "idProveedor", this.data[0].idProveedor);
          this.storageService.facOpLiqProveedor$.subscribe(data=>{
            this.$facturasOpProveedor = data;
            console.log("1) ngOnInit facOpProveedor:",this.$facturasOpCliente);      
          });
          //console.log("data: ", this.data);
          this.titulo = this.data[0].razonSocial
          //this.idFactura = this.data[0].idFacturaProveedor;
          this.armarTabla()
          break;
      default:
        alert("error update")
      break;
    }       
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
      let factura = this.data.filter((factura:FacturaCliente) => {
        return factura.idFacturaCliente === row.idFactura
      })
      //console.log(factura);
      
      factura[0].cobrado = !factura[0].cobrado;
      this.updateItem(factura[0]);
    }
    //////////////CHOFERES///////////////////////
    if(this.fromParent.modo === "choferes"){
      //console.log(row);
      let factura = this.data.filter((factura:FacturaChofer) => {
        return factura.idFacturaChofer === row.idFactura
      })
      //console.log(factura);
      
      factura[0].cobrado = !factura[0].cobrado;
      this.updateItem(factura[0]);
    }
    //////////////PROVEEDORES///////////////////////
    if(this.fromParent.modo === "proveedores"){
      //console.log(row);
      let factura = this.data.filter((factura:FacturaProveedor) => {
        return factura.idFacturaProveedor === row.idFactura
      })
      //console.log(factura);
      
      factura[0].cobrado = !factura[0].cobrado;
      this.updateItem(factura[0]);
    }
  }

  updateItem(item: any) {
    switch (this.fromParent.modo){
      //////////////CLIENTES///////////////////////
      case "clientes":
          this.storageService.updateItem('facturaCliente', item);
          break;
      //////////////CHOFERES///////////////////////
      case "choferes":
          this.storageService.updateItem('facturaChofer', item);
          break;
      //////////////PROVEEDORES///////////////////////
      case "proveedores":
          this.storageService.updateItem('facturaProveedor', item);
      break;
      default:
        alert("error update")
      break;
    }    
  }

  reimprimirFac(row: any, formato: string) {    
    let factura:any;
    this.operacionFac = [];
    switch (this.fromParent.modo){
      //////////////CLIENTES///////////////////////
      case "clientes":
          console.log("1) row: ",row);    
          factura = this.data.filter((factura:FacturaCliente) => {
            return factura.idFacturaCliente === row.idFactura
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
          console.log("3) operacionFac: ", this.operacionFac);
          if (formato === 'excel') {
            console.log("3)factura y facturasOpCliente: ",factura[0], this.operacionFac );      
            this.excelServ.exportToExcelCliente(factura[0], this.operacionFac, this.$clientes, this.$choferes);
          } else if(formato === 'pdf') {
            console.log("3)factura y facturasOpCliente: ",factura[0], this.operacionFac );
            this.pdfServ.exportToPdfCliente(factura[0], this.operacionFac, this.$clientes, this.$choferes);
          }   
          break;
      //////////////CHOFERES///////////////////////
      case "choferes":
          console.log("1) row: ",row);    
          factura = this.data.filter((factura:FacturaChofer) => {
            return factura.idFacturaChofer === row.idFactura
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
          if (formato === 'excel') {
            console.log("3)factura y facturasOpChofer: ",factura[0], this.operacionFac );      
            this.excelServ.exportToExcelChofer(factura[0], this.operacionFac, this.$clientes, this.$choferes);
          } else if(formato === 'pdf') {
            console.log("3)factura y facturasOpChofer: ",factura[0], this.operacionFac );
            this.pdfServ.exportToPdfChofer(factura[0], this.operacionFac, this.$clientes, this.$choferes);
          } 
          break;
      //////////////PROVEEDORES///////////////////////
      case "proveedores":
              ////console.log("1) row: ",row);    
          factura = this.data.filter((factura:FacturaProveedor) => {
            return factura.idFacturaProveedor === row.idFactura
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
          if (formato === 'excel') {
            console.log("3)factura y facturasOpProveedor: ",factura[0], this.operacionFac );      
            this.excelServ.exportToExcelProveedor(factura[0], this.operacionFac, this.$clientes, this.$choferes);
          } else if(formato === 'pdf') {
            console.log("3)factura y facturasOpProveedor: ",factura[0], this.operacionFac );
            this.pdfServ.exportToPdfProveedor(factura[0], this.operacionFac, this.$clientes, this.$choferes);
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
          this.rows = this.data.map((factura: FacturaCliente) => ({
              indice: indice ++,
              fecha: factura.fecha,
              quincena: this.getQuincena(factura.fecha),
              idFactura: factura.idFacturaCliente,
              cant: factura.operaciones.length,
              sumaPagar: `$ ${this.formatearValor(factura.montoFacturaChofer)}`,
              sumaCobrar: `$ ${this.formatearValor(factura.valores.total)}`,
              neta: `$ ${this.formatearValor(factura.valores.total - factura.montoFacturaChofer)}`,
              porcentaje: `${this.formatearValor((factura.valores.total - factura.montoFacturaChofer)*100/factura.valores.total)} %`,
              cobrado: factura.cobrado,
          }));
          break;
      //////////////CHOFERES///////////////////////
     case "choferes":
          this.rows = this.data.map((factura: FacturaChofer) => ({
              indice: indice ++,
              fecha: factura.fecha,
              quincena: this.getQuincena(factura.fecha),
              idFactura: factura.idFacturaChofer,
              cant: factura.operaciones.length,
              sumaPagar: `$ ${this.formatearValor(factura.valores.total)}`,
              sumaCobrar: `$ ${this.formatearValor(factura.montoFacturaCliente)}`,
              neta: `$ ${this.formatearValor(factura.montoFacturaCliente - factura.valores.total)}`,
              porcentaje: `${this.formatearValor((factura.montoFacturaCliente - factura.valores.total)*100/factura.montoFacturaCliente)} %`,
              cobrado: factura.cobrado,              
          }));
          break;
      //////////////PROVEEDORES///////////////////////
       case "proveedores":
          this.rows = this.data.map((factura: FacturaProveedor) => ({
              indice: indice ++,
              fecha: factura.fecha,
              quincena: this.getQuincena(factura.fecha),
              idFactura: factura.idFacturaProveedor,
              cant: factura.operaciones.length,
              sumaPagar: `$ ${this.formatearValor(factura.valores.total)}`,
              sumaCobrar: `$ ${this.formatearValor(factura.montoFacturaCliente)}`,
              neta: `$ ${this.formatearValor(factura.montoFacturaCliente - factura.valores.total)}`,
              porcentaje: `$ ${this.formatearValor((factura.montoFacturaCliente - factura.valores.total)*100/factura.montoFacturaCliente)}`,
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

}
