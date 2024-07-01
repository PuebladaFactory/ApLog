import { Component, OnInit } from '@angular/core';
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
export class FacturacionClienteComponent implements OnInit  {

  
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
  
    procesarDatosParaTabla() {
      const clientesMap = new Map<number, any>();
      if (this.$facturasCliente !== null) {
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
          if (factura.cobrado) {
            cliente.sumaACobrar += Number(factura.total);
          } else {
            cliente.sumaACobrar += Number(factura.total);
            cliente.faltaCobrar += Number(factura.total);
          }
          cliente.total += Number(factura.total);
          cliente.sumaAPagar += Number(factura.montoFacturaChofer);
          cliente.cant += Number(factura.operaciones.length)
        });
        this.datosTablaCliente = Array.from(clientesMap.values());
      }
    }
  
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
