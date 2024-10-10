import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { ClienteData } from 'src/app/interfaces/cliente-data';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { SortType, SelectionType, ClickType, ColumnMode  } from '@swimlane/ngx-datatable';
import { style } from '@angular/animations';
import { ModalDetalleComponent } from '../modal-detalle/modal-detalle.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { FacturaOpChofer } from 'src/app/interfaces/factura-op-chofer';
import { take } from 'rxjs';
import { TarifaCliente } from 'src/app/interfaces/tarifa-cliente';
import { TarifaChofer } from 'src/app/interfaces/tarifa-chofer';
import { TarifaProveedor } from 'src/app/interfaces/tarifa-proveedor';
import { FacturaOpProveedor } from 'src/app/interfaces/factura-op-proveedor';

@Component({
  selector: 'app-historial-cliente',
  templateUrl: './historial-cliente.component.html',
  styleUrls: ['./historial-cliente.component.scss']
})
export class HistorialClienteComponent implements OnInit {
  @ViewChild('tablaClientes') table: any;
  $facturaOpCliente!: FacturaOpCliente [];
  rows: any[] = [];
  filteredRows: any[] = [];
  paginatedRows: any[] = [];
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
  date:any = new Date();
  primerDiaMesAnterior: any = new Date(this.date.getFullYear(), this.date.getMonth()-1).toISOString().split('T')[0];
  ultimoDiaMesAnterior:any = new Date(this.date.getFullYear(), this.date.getMonth() , 0).toISOString().split('T')[0];  
  facturaOp!:FacturaOpCliente[];
  tarifaClienteAplicada!: TarifaCliente;
  tarifaChoferAplicada!: TarifaChofer;
  tarifaProveedorAplicada!: TarifaProveedor;
  
  constructor(private storageService: StorageService, private modalService: NgbModal, private dbFirebase: DbFirestoreService){

  }
  
  ngOnInit(): void {
    this.storageService.getByDateValue("facOpLiqCliente", "fecha", this.primerDiaMesAnterior, this.ultimoDiaMesAnterior, "consultasFacOpLiqCliente");
    this.storageService.consultasFacOpLiqCliente$.subscribe(data =>{
      //console.log(data);
      this.$facturaOpCliente = data;     
      //console.log("consultasFacOpLiqCliente: ", this.$facturaOpCliente );
      this.armarTabla()  
    })
    
  }

  armarTabla() {
    ////console.log()("consultasFacOpLiqCliente: ", this.$facturaOpCliente );
    let indice = 0
    this.rows = this.$facturaOpCliente.map(cliente => ({
      indice: indice ++,
      idFacturaOpCliente: cliente.idFacturaOpCliente,
      idCliente: cliente.idCliente,
      razonSocial: cliente.operacion.cliente.razonSocial,
      idOperacion: cliente.operacion.idOperacion,
      fecha: cliente.operacion.fecha,
      chofer: `${cliente.operacion.chofer.apellido} ${cliente.operacion.chofer.nombre}`,
      categoria: cliente.operacion.chofer.vehiculo[0].categoria,
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
    ////console.log()("Rows: ", this.rows); // Verifica que `this.rows` tenga datos correctos
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

  abrirModal(row:any){
    this.facturaOp = this.$facturaOpCliente.filter((factura:FacturaOpCliente)=>{
      //////console.log()(factura.idFacturaOpCliente, row.idFacturaOpCliente);      
      return factura.idFacturaOpCliente === row.idFacturaOpCliente
    })   
    this.buscarTarifaCliente(row);    
  }

  buscarTarifaCliente(row:any){
    this.dbFirebase
    .obtenerTarifaIdTarifa("tarifasCliente",this.facturaOp[0].idTarifa, "idTarifa")
    .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
    .subscribe(data => {      
        this.tarifaClienteAplicada = data;              
        //console.log("4) TARIFA CHOFER APLICADA: ", this.tarifaClienteAplicada);
        
        this.buscarFacturaOpChofer(row);
    });
  }

  buscarFacturaOpChofer(row:any){
    let facOpChofer!: FacturaOpChofer;
    let facOpProveedor!: FacturaOpProveedor;
    //console.log("2)idoperacion: ", this.facturaOp[0].operacion.idOperacion);
    if(this.facturaOp[0].operacion.chofer.proveedor === "monotributista"){
      this.dbFirebase
      .obtenerTarifaIdTarifa("facOpLiqChofer",this.facturaOp[0].operacion.idOperacion, "operacion.idOperacion")
      .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
      .subscribe(data => {      
          facOpChofer = data;  
          //console.log("3)facOpChofer: ", facOpChofer);
                        
          this.buscarTarifaChofer(facOpChofer.idTarifa, row);
      });
    } else {
      this.dbFirebase
      .obtenerTarifaIdTarifa("facOpLiqProveedor",this.facturaOp[0].operacion.idOperacion, "operacion.idOperacion")
      .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
      .subscribe(data => {      
          facOpProveedor = data;  
          //console.log("3)facOpProveedor: ", facOpProveedor);
                        
          this.buscarTarifaProveedor(facOpProveedor.idTarifa, row);
      });
    }
    
  }

  buscarTarifaChofer(id:number, row:any){
    //console.log("3.5)idTarifa: ", id);
    
    this.dbFirebase
    .obtenerTarifaIdTarifa("tarifasChofer",id, "idTarifa")
    .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
    .subscribe(data => {      
        this.tarifaChoferAplicada = data;              
        //console.log("4) TARIFA CHOFER APLICADA: ", this.tarifaChoferAplicada);
        
        this.openModal(row)
    });
      
  }

  buscarTarifaProveedor(id:number, row:any){
    //console.log("3.5)idTarifa: ", id);
    
    this.dbFirebase
    .obtenerTarifaIdTarifa("tarifasProveedor",id, "idTarifa")
    .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
    .subscribe(data => {      
        this.tarifaProveedorAplicada = data;              
        //console.log("4) TARIFA PROVEEDOR APLICADA: ", this.tarifaProveedorAplicada);
        
        this.openModal(row)
    });
      
  }

  openModal(row:any): void {   
    let tarifaAplicadaChoferArray: TarifaChofer[] = [];
    let tarifaAplicadaProveedorArray: TarifaProveedor[] = [];
    let tarifaAplicadaClienteArray: TarifaCliente[] = [];
    tarifaAplicadaClienteArray.push(this.tarifaClienteAplicada);
    this.storageService.setInfo("tarifaClienteHistorial", tarifaAplicadaClienteArray);

    if(this.facturaOp[0].operacion.chofer.proveedor === "monotributista"){      
      tarifaAplicadaChoferArray.push(this.tarifaChoferAplicada);
      this.storageService.setInfo("tarifaChoferHistorial", tarifaAplicadaChoferArray);
    } else {
      tarifaAplicadaProveedorArray.push(this.tarifaProveedorAplicada);
      this.storageService.setInfo("tarifaProveedorHistorial", tarifaAplicadaProveedorArray);
    }

    

    
    
    
    ////console.log()("facturaOp: ",facturaOp);
     
    {
      const modalRef = this.modalService.open(ModalDetalleComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'md', 
        backdrop:"static" 
      });

     let info = {
        modo: "clientes",
        factura: this.facturaOp[0],
        tarifaChofer: this.tarifaChoferAplicada,
        tarifaCliente: this.tarifaClienteAplicada,
      }; 
      ////console.log()(info);
      
      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
          //////console.log()("ROOWW:" ,row);
          
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
