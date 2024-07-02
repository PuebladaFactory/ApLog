import { AfterViewInit, Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FacturaOpProveedor } from 'src/app/interfaces/factura-op-proveedor';
import { FacturaProveedor } from 'src/app/interfaces/factura-proveedor';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { PdfService } from 'src/app/servicios/informes/pdf/pdf.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ModalDetalleComponent } from '../modal-detalle/modal-detalle.component';

@Component({
  selector: 'app-facturacion-proveedor',
  templateUrl: './facturacion-proveedor.component.html',
  styleUrls: ['./facturacion-proveedor.component.scss']
})
export class FacturacionProveedorComponent implements OnInit, AfterViewInit {

  
  searchText!:string;
  componente: string = "facturaProveedor";
  $facturasProveedor: any;
  date:any = new Date();
  primerDiaAnio: any = new Date(this.date.getFullYear(), 0, 1).toISOString().split('T')[0];
  ultimoDiaAnio:any = new Date(this.date.getFullYear(), 11 + 1, 0).toISOString().split('T')[0];  
  datosTablaProveedor: any[] = [];
  mostrarTablaProveedor: boolean[] = [];  
  tituloFacProveedor: string = "facturaProveedor";
  facturaProveedor!: FacturaProveedor;  
  $facturaOpProveedor: FacturaOpProveedor[] = []; 
  facturasPorProveedor: Map<number, FacturaProveedor[]> = new Map<number, FacturaProveedor[]>();
  operacionFac: FacturaOpProveedor[] = [];

  totalCant: number = 0;
  totalSumaAPagar: number = 0;
  totalSumaACobrar: number = 0;
  totalGanancia: number = 0;
  totalPorcentajeGanancia: number = 0;
  totalFaltaPagar: number = 0;
  
  
  constructor(
    private storageService: StorageService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.storageService.consultasFacProveedor$.subscribe(data => {
      this.$facturasProveedor = data;
      this.procesarDatosParaTabla();
      this.mostrarTablaProveedor = new Array(this.datosTablaProveedor.length).fill(false); // Mueve esta línea aquí
    });
  
    this.storageService.consultasFacOpLiqProveedor$.subscribe(data => {
      this.$facturaOpProveedor = data;
    });
  }

  ngAfterViewInit() {
    this.syncColumnWidths();
    window.addEventListener('resize', this.syncColumnWidths);
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.syncColumnWidths);
  }

  procesarDatosParaTabla() {
    const proveedoresMap = new Map<number, any>();
    //console.log()(this.$facturasProveedor);
    
    if(this.$facturasProveedor !== null){
      this.$facturasProveedor.forEach((factura: FacturaProveedor) => {
          // Inicializar los totales a cero
        this.totalCant = 0;
        this.totalSumaAPagar = 0;
        this.totalSumaACobrar = 0;
        this.totalGanancia = 0;
        this.totalPorcentajeGanancia = 0;
        this.totalFaltaPagar = 0;
    
        // Procesar cada factura y actualizar los datos del cliente
        if (!proveedoresMap.has(factura.idProveedor)) {
          proveedoresMap.set(factura.idProveedor, {
            idProveedor: factura.idProveedor,
            proveedor: factura.razonSocial ,            
            sumaAPagar: 0,
            sumaACobrar: 0,
            faltaPagar: 0,
            total: 0,
            cant: 0,
          });
        }
  
        const proveedor = proveedoresMap.get(factura.idProveedor);
        //cliente.sumaACobrar++;
        if (factura.cobrado) {
          proveedor.sumaAPagar += Number(factura.total);
        } else {
          proveedor.sumaAPagar += Number(factura.total);
          proveedor.faltaPagar += Number(factura.total);
        }
        proveedor.total += factura.total;  
        proveedor.sumaACobrar += Number(factura.montoFacturaCliente);      
        proveedor.cant += Number(factura.operaciones.length);      
      });
  
      this.datosTablaProveedor = Array.from(proveedoresMap.values());
      //console.log()("Datos para la tabla: ", this.datosTablaProveedor); 
      this.datosTablaProveedor.forEach(proveedor => {
        this.totalCant += proveedor.cant;
        this.totalSumaAPagar += proveedor.sumaAPagar;
        this.totalSumaACobrar += proveedor.sumaACobrar;
        this.totalFaltaPagar += proveedor.faltaPagar;
      });
  
      // Calcular totales de ganancia y porcentaje de ganancia
      this.totalGanancia = this.totalSumaACobrar - this.totalSumaAPagar;
      if (this.totalSumaACobrar > 0) {
        this.totalPorcentajeGanancia = (this.totalGanancia * 100) / this.totalSumaACobrar;
      } else {
        this.totalPorcentajeGanancia = 0;
      }
    }
    setTimeout(() => {
      this.syncColumnWidths();
    });
  }

  syncColumnWidths = () => {
    const headerCells = document.querySelectorAll('.datatable-header-cell');
    const totalCells = [
      document.getElementById('total-razon-social'),
      document.getElementById('total-cant'),
      document.getElementById('total-suma-a-pagar'),
      document.getElementById('total-suma-a-cobrar'),
      document.getElementById('total-ganancia'),
      document.getElementById('total-porcentaje-ganancia'),
      document.getElementById('total-falta-cobrar'),
      document.getElementById('total-acciones')
    ];

    if (headerCells.length === totalCells.length) {
      headerCells.forEach((headerCell, index) => {
        const headerWidth = (headerCell as HTMLElement).offsetWidth;
        if (totalCells[index]) {
          (totalCells[index] as HTMLElement).style.width = `${headerWidth}px`;
        }
      });
    }
  };
  mostrarMasDatos(index: number, proveedor:any) {   

   if (this.datosTablaProveedor && this.datosTablaProveedor[index]) {
    this.mostrarTablaProveedor[index] = !this.mostrarTablaProveedor[index];
    const proveedorId = this.datosTablaProveedor[index].idProveedor;
    const facturasProveedor = this.$facturasProveedor.filter((factura: any) => factura.idProveedor === proveedorId);
    this.facturasPorProveedor.set(proveedorId, facturasProveedor);        
    //console.log("1) facturasCliente: ", facturasCliente);
    //console.log("2) facturas por cliente: ", this.facturasPorCliente);
    this.openModal(facturasProveedor, index)  
    
  } else {
    console.error('Elemento en datosTablaCliente no encontrado en el índice:', index);
  }
  }

  cerrarTabla(index: number){
    this.mostrarTablaProveedor[index] = !this.mostrarTablaProveedor[index];
  }

 // Modifica la función getQuincena para que acepte una fecha como parámetro
 getQuincena(fecha: string | Date): string {
  const fechaObj = new Date(fecha);
  const dia = fechaObj.getDate();
  return dia <= 15 ? '1° quincena' : '2° quincena';
}

openModal(factura: any, index: number): void {          
  {
    const modalRef = this.modalService.open(ModalDetalleComponent, {
      windowClass: 'myCustomModalClass',
      centered: true,
      size: 'xl', 
      backdrop:"static" 
    });

   let info = {
      modo: "proveedores",
      item: factura,
    }; 
    //console.log()(info);
    
    modalRef.componentInstance.fromParent = info;
    modalRef.result.then(
      (result) => {
        ////console.log()("ROOWW:" ,row);
        
//        this.selectCrudOp(result.op, result.item);
     
      },
      (reason) => {}
    );
  }
}

}
