import { AfterViewInit, Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { PdfService } from 'src/app/servicios/informes/pdf/pdf.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ModalDetalleComponent } from '../modal-detalle/modal-detalle.component';

@Component({
  selector: 'app-facturacion-cliente',
  templateUrl: './facturacion-cliente.component.html',
  styleUrls: ['./facturacion-cliente.component.scss']
})
export class FacturacionClienteComponent implements OnInit, AfterViewInit   {

  
  //searchText!:string;
  componente: string = "facturaCliente";
  //$facturasCliente: any;
  date:any = new Date();
  primerDiaAnio: any = new Date(this.date.getFullYear(), 0, 1).toISOString().split('T')[0];
  ultimoDiaAnio:any = new Date(this.date.getFullYear(), 11 + 1, 0).toISOString().split('T')[0]; 
  
  datosTablaCliente: any[] = [];
  facturasPorCliente = new Map<number, any[]>();
  mostrarTablaCliente: boolean[] = [];
  searchText: string = '';
  $facturasCliente: any;
  $facturaOpCliente: any;
  operacionFac: any[] = [];

  totalCant: number = 0;
  totalSumaAPagar: number = 0;
  totalSumaACobrar: number = 0;
  totalGanancia: number = 0;
  totalPorcentajeGanancia: number = 0;
  totalFaltaCobrar: number = 0;
  

    constructor(
      private storageService: StorageService,
      private modalService: NgbModal
    ) {}
  
    ngOnInit(): void {
      this.storageService.consultasFacCliente$.subscribe(data => {
        this.$facturasCliente = data;
        this.procesarDatosParaTabla();
        this.mostrarTablaCliente = new Array(this.datosTablaCliente.length).fill(false); // Mueve esta línea aquí
      });
    
      this.storageService.consultasFacOpLiqCliente$.subscribe(data => {
        this.$facturaOpCliente = data;
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
      const clientesMap = new Map<number, any>();
    
      if (this.$facturasCliente !== null) {
        // Inicializar los totales a cero
        this.totalCant = 0;
        this.totalSumaAPagar = 0;
        this.totalSumaACobrar = 0;
        this.totalGanancia = 0;
        this.totalPorcentajeGanancia = 0;
        this.totalFaltaCobrar = 0;
    
        // Procesar cada factura y actualizar los datos del cliente
        this.$facturasCliente.forEach((factura: any) => {
          if (!clientesMap.has(factura.idCliente)) {
            clientesMap.set(factura.idCliente, {
              idCliente: factura.idCliente,
              razonSocial: factura.razonSocial,
              sumaAPagar: 0,
              sumaACobrar: 0,
              faltaCobrar: 0,
              total: 0,
              cant: 0
            });
          }
          const cliente = clientesMap.get(factura.idCliente);
          const totalFactura = Number(factura.total);
          const montoFacturaChofer = Number(factura.montoFacturaChofer);
    
          if (factura.cobrado) {
            cliente.sumaACobrar += totalFactura;
          } else {
            cliente.sumaACobrar += totalFactura;
            cliente.faltaCobrar += totalFactura;
          }
          cliente.total += totalFactura;
          cliente.sumaAPagar += montoFacturaChofer;
          cliente.cant += Number(factura.operaciones.length);
        });
    
        // Convertir los datos del cliente a una lista y calcular los totales globales
        this.datosTablaCliente = Array.from(clientesMap.values());
    
        this.datosTablaCliente.forEach(cliente => {
          this.totalCant += cliente.cant;
          this.totalSumaAPagar += cliente.sumaAPagar;
          this.totalSumaACobrar += cliente.sumaACobrar;
          this.totalFaltaCobrar += cliente.faltaCobrar;
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
  
    mostrarMasDatos(index: number, cliente: any) {
      if (this.datosTablaCliente && this.datosTablaCliente[index]) {
        this.mostrarTablaCliente[index] = !this.mostrarTablaCliente[index];
        const clienteId = this.datosTablaCliente[index].idCliente;
        const facturasCliente = this.$facturasCliente.filter((factura: any) => factura.idCliente === clienteId);
        this.facturasPorCliente.set(clienteId, facturasCliente);        
        //console.log("1) facturasCliente: ", facturasCliente);
        //console.log("2) facturas por cliente: ", this.facturasPorCliente);
        this.openModal(facturasCliente, index)  
        
      } else {
        console.error('Elemento en datosTablaCliente no encontrado en el índice:', index);
      }
      
    }
  
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
          modo: "clientes",
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
