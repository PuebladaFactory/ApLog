import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ColumnMode, SelectionType, SortType } from '@swimlane/ngx-datatable';
import { FacturaCliente } from 'src/app/interfaces/factura-cliente';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
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
  { prop: 'neta', name: 'N° Ganancia Neta', selected: true, flexGrow:2  },    
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
$facturasOpCliente: FacturaOpCliente[] = [];
  
  constructor(public activeModal: NgbActiveModal, private storageService: StorageService, private excelServ: ExcelService, 
    private pdfServ: PdfService, private dbFirebase: DbFirestoreService){

  }
  
  ngOnInit(): void {
    this.data = this.fromParent.item    
    this.storageService.getByFieldValue("facOpLiqCliente", "idCliente", this.data[0].idCliente);
    this.storageService.facOpLiqCliente$.subscribe(data=>{
      this.$facturasOpCliente = data;
      console.log("1) ngOnInit facOpCliente:",this.$facturasOpCliente);
      
    });
    
    console.log("data: ", this.data);
    this.armarTabla()
    
  }

  getQuincena(fecha: string | Date): string {
    const fechaObj = new Date(fecha);
    const dia = fechaObj.getDate();
    return dia <= 15 ? '1° quincena' : '2° quincena';
  }

  facturaCobrada(row: any) {
    console.log(row);
    let factura = this.data.filter((factura:FacturaCliente) => {
      return factura.idFacturaCliente === row.idFactura
    })
    console.log(factura);
    
    factura[0].cobrado = !factura[0].cobrado;
    this.updateItem(factura[0]);
  }

  updateItem(item: any) {
    console.log(item);
    
    this.storageService.updateItem('facturaCliente', item);
  }

  reimprimirFac(row: any, formato: string) {    
    //console.log("1) row: ",row);
    let facOp: any
    let factura = this.data.filter((factura:FacturaCliente) => {
      return factura.idFacturaCliente === row.idFactura
    })
    console.log(factura);
    
    this.operacionFac = [];
    factura[0].operaciones.forEach((id: number) => {
      if (this.$facturasOpCliente !== null) {
        this.$facturasOpCliente.forEach((facturaOp: any) => {
          if (facturaOp.operacion.idOperacion === id) {
            this.operacionFac.push(facturaOp);
          }
        });
      }
    });
    console.log("3) operacionFac: ", this.operacionFac);
    
    /* this.operacionFac = [];
    factura.operaciones.forEach((id: number) => {
      if (this.$facturaOpCliente !== null) {
        this.$facturaOpCliente.forEach((facturaOp: any) => {
          if (facturaOp.operacion.idOperacion === id) {
            this.operacionFac.push(facturaOp);
          }
        });
      }
    });*/
    if (formato === 'excel') {
      console.log("3)factura y facturasOpCliente: ",factura[0], this.operacionFac );
      
      this.excelServ.exportToExcelCliente(factura[0], this.operacionFac);
    } else {
      console.log("3)factura y facturasOpCliente: ",factura[0], this.operacionFac );
      this.pdfServ.exportToPdfCliente(factura[0], this.operacionFac);
    }   
  }

  armarTabla() {
    //console.log("consultasOp: ", this.$consultasOp );
    let indice = 0
    this.rows = this.data.map((factura: FacturaCliente) => ({
        indice: indice ++,
        fecha: factura.fecha,
        quincena: this.getQuincena(factura.fecha),
        idFactura: factura.idFacturaCliente,
        cant: factura.operaciones.length,
        sumaPagar: factura.montoFacturaChofer,
        sumaCobrar: factura.total,
        neta: factura.total - factura.montoFacturaChofer,
        porcentaje: ((factura.total - factura.montoFacturaChofer)*100/factura.total).toFixed(2),
        cobrado: factura.cobrado,
      }));
    
    //console.log("Rows: ", this.rows); // Verifica que `this.rows` tenga datos correctos
    this.applyFilters(); // Aplica filtros y actualiza filteredRows
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

}
