import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { ClienteData } from 'src/app/interfaces/cliente-data';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { SortType, SelectionType, ClickType, ColumnMode  } from '@swimlane/ngx-datatable';
import { style } from '@angular/animations';
import { ModalDetalleComponent } from '../modal-detalle/modal-detalle.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-historial-cliente',
  templateUrl: './historial-cliente.component.html',
  styleUrls: ['./historial-cliente.component.scss']
})
export class HistorialClienteComponent implements OnInit {
  @ViewChild('tablaClientes') table: any;
  $facturaOpCliente!: FacturaOpCliente [];
  rows: ClienteData[] = [];
  filteredRows: any[] = [];
 /*  columns = [
    //{ prop: 'idCliente', name: 'Id Cliente', width: 110 },
    { prop: '', name: ''},
    { prop: 'razonSocial', name: 'Razon Social'},
    { prop: 'idOperacion', name: 'Id Op'},
    { prop: 'fecha', name: 'Fecha'},
    { prop: 'chofer', name: 'Chofer'},
    //{ prop: 'categoria', name: 'Categoria', width: 85 },
    //{ prop: 'acompaniate', name: 'Acompompañante', width: 70 },
    //{ prop: 'proveedor', name: 'Proveedor', width: 105 },
    { prop: 'direccion', name: 'Direccion'},
    { prop: 'km', name: 'Km'},
    //{ prop: 'montoFacturaChofer', name: 'Total Chofer', width: 100 },
    { prop: 'valorJornada', name: 'Jornada'},
    { prop: 'adicionalCliente', name: 'Adi'},
    { prop: 'totalCliente', name: 'Total'},
    { prop: 'ganancia', name: 'Ganancia'}
  ]; */
  allColumns = [
//    { prop: '', name: '', selected: true, flexGrow:1  },
    { prop: 'razonSocial', name: 'Razon Social', selected: true, flexGrow:2 },
    { prop: 'idOperacion', name: 'Id Op', selected: true, flexGrow:2  },
    { prop: 'fecha', name: 'Fecha', selected: true, flexGrow:2  },
    { prop: 'chofer', name: 'Chofer', selected: true, flexGrow:2  },
    { prop: 'proveedor', name: 'Proveedor', selected: true, flexGrow:2  },
    { prop: 'direccion', name: 'Direccion', selected: true, flexGrow:2  },
    { prop: 'km', name: 'Km', selected: true, flexGrow:1  },
    { prop: 'valorJornada', name: 'Jor', selected: true, flexGrow:1  },
    { prop: 'adicionalCliente', name: 'Adi', selected: true, flexGrow:1  },
    { prop: 'totalCliente', name: 'Total', selected: true, flexGrow:1  },
    { prop: 'ganancia', name: 'Ganancia', selected: true, flexGrow:2  }
  ];
  visibleColumns = this.allColumns.filter(column => column.selected);
  selected = [];
  count = 10;
  limit = 100;
  offset = 100;
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
    
    this.storageService.consultasFacOpLiqCliente$.subscribe(data =>{
      //console.log(data);
      this.$facturaOpCliente = data;     
      //console.log("consultasFacOpLiqCliente: ", this.$facturaOpCliente );
      this.armarTabla()  
    })
    
  }

  armarTabla() {
    console.log("consultasFacOpLiqCliente: ", this.$facturaOpCliente );
    let indice = 0
    this.rows = this.$facturaOpCliente.map(cliente => ({
      indice: indice ++,
      idFacturaOpCliente: cliente.idFacturaOpCliente,
      idCliente: cliente.idCliente,
      razonSocial: cliente.operacion.cliente.razonSocial,
      idOperacion: cliente.operacion.idOperacion,
      fecha: cliente.operacion.fecha,
      chofer: `${cliente.operacion.chofer.apellido} ${cliente.operacion.chofer.nombre}`,
      categoria: cliente.operacion.chofer.vehiculo.categoria,
      acompaniate: cliente.operacion.acompaniante,
      proveedor: cliente.operacion.chofer.proveedor,
      direccion: cliente.operacion.cliente.direccion,
      km: cliente.operacion.km,
      montoFacturaChofer: cliente.montoFacturaChofer,
      valorJornada: cliente.valorJornada,
      adicionalCliente: cliente.total - cliente.valorJornada,
      totalCliente: cliente.total,
      ganancia: `${((cliente.total - cliente.montoFacturaChofer) * 100 / cliente.total).toFixed(2)}%`
    }));
    console.log("Rows: ", this.rows); // Verifica que `this.rows` tenga datos correctos
    this.filteredRows = [...this.rows]; // Inicialmente muestra todas las filas
  }

  setPage(pageInfo: any) {
    this.offset = pageInfo.offset;
    // Aquí deberías cargar los datos de la página actual desde tu backend si es necesario
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
    let facturaOp = this.$facturaOpCliente.filter((factura:FacturaOpCliente)=>{
      //console.log(factura.idFacturaOpCliente, row.idFacturaOpCliente);      
      return factura.idFacturaOpCliente === row.idFacturaOpCliente
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
        modo: "clientes",
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
