import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { ClienteData } from 'src/app/interfaces/cliente-data';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { SortType, SelectionType, ClickType, ColumnMode  } from '@swimlane/ngx-datatable';
import { style } from '@angular/animations';
import { ModalDetalleComponent } from '../modal-detalle/modal-detalle.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FacturaOpChofer } from 'src/app/interfaces/factura-op-chofer';

@Component({
  selector: 'app-historial-chofer',
  templateUrl: './historial-chofer.component.html',
  styleUrls: ['./historial-chofer.component.scss']
})
export class HistorialChoferComponent implements OnInit {
  @ViewChild('tablaClientes') table: any;
  $facturaOpChoferes!: FacturaOpChofer [];
  rows: any[] = [];
  filteredRows: any[] = [];
  paginatedRows: any[] = [];
  allColumns = [
//    { prop: '', name: '', selected: true, flexGrow:1  },
    { prop: 'chofer', name: 'Chofer', selected: true, flexGrow:2  },    
    { prop: 'idOperacion', name: 'Id Op', selected: true, flexGrow:2  },
    { prop: 'fecha', name: 'Fecha', selected: true, flexGrow:2  },
    { prop: 'razonSocial', name: 'Razon Social', selected: true, flexGrow:2 },
    { prop: 'proveedor', name: 'Proveedor', selected: true, flexGrow:2  },
    { prop: 'direccion', name: 'Direccion', selected: true, flexGrow:2  },
    { prop: 'km', name: 'Km', selected: true, flexGrow:1  },
    { prop: 'valorJornada', name: 'Jor', selected: true, flexGrow:1  },
    { prop: 'adicionalChofer', name: 'Adi', selected: true, flexGrow:1  },
    { prop: 'totalChofer', name: 'Total', selected: true, flexGrow:1  },
    { prop: 'ganancia', name: 'Ganancia', selected: true, flexGrow:2  }
  ];
  visibleColumns = this.allColumns.filter(column => column.selected);
  selected = [];
  count = 0;
  limit = 10;
  offset = 0;
  sortType = SortType.multi; // Aquí usamos la enumeración SortType
  selectionType = SelectionType.checkbox; // Aquí usamos la enumeración SelectionType
  ColumnMode = ColumnMode;
  mostrarDetallesOp: boolean [] = [];
  encapsulation!: ViewEncapsulation.None;
  ajustes: boolean = false;
  firstFilter = '';
  secondFilter = '';

  constructor(private storageService: StorageService, private modalService: NgbModal){

  }
  ngOnInit(): void {
    this.storageService.consultasFacOpLiqChofer$.subscribe(data =>{
      //console.log(data);
      this.$facturaOpChoferes = data;     
      //console.log("consultasFacOpLiqCliente: ", this.$facturaOpCliente );
      this.armarTabla()  
    })
  }

  armarTabla() {
    console.log("consultasFacOpLiqCliente: ", this.$facturaOpChoferes );
    let indice = 0
    this.rows = this.$facturaOpChoferes.map(chofer => ({
      indice: indice ++,
      idFacturaOpCliente: chofer.idFacturaOpChofer,
      idCliente: chofer.idChofer,
      razonSocial: chofer.operacion.cliente.razonSocial,
      idOperacion: chofer.operacion.idOperacion,
      fecha: chofer.operacion.fecha,
      chofer: `${chofer.operacion.chofer.apellido} ${chofer.operacion.chofer.nombre}`,
      categoria: chofer.operacion.chofer.vehiculo.categoria,
      acompaniate: chofer.operacion.acompaniante,
      proveedor: chofer.operacion.chofer.proveedor,
      direccion: chofer.operacion.cliente.direccion,
      km: chofer.operacion.km,
      montoFacturaCliente: chofer.montoFacturaCliente,
      valorJornada: chofer.valorJornada,
      adicionalChofer: chofer.total - chofer.valorJornada,
      totalChofer: chofer.total,
      ganancia: `${((chofer.montoFacturaCliente - chofer.total) * 100 / chofer.montoFacturaCliente).toFixed(2)}%`
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

  mostrarMasDatos(row:any) {     
    this.mostrarDetallesOp[row.indice] = !this.mostrarDetallesOp[row.indice];      
    
  }

  openModal(row: any): void {   
    let facturaOp = this.$facturaOpChoferes.filter((factura:FacturaOpChofer)=>{
      //console.log(factura.idFacturaOpCliente, row.idFacturaOpCliente);      
      return factura.idFacturaOpChofer === row.idFacturaOpCliente
    })
    console.log("facturaOp: ",facturaOp);
     
    {
      const modalRef = this.modalService.open(ModalDetalleComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'md', 
        backdrop:"static" 
      });

     let info = {
        modo: "choferes",
        item: facturaOp[0],
      }; 
      console.log(info);
      
      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
          //console.log("ROOWW:" ,row);
          
//        this.selectCrudOp(result.op, result.item);
        this.mostrarMasDatos(row);
        },
        (reason) => {}
      );
    }
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
