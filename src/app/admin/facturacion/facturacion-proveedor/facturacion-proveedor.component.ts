import { Component, OnInit } from '@angular/core';
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
export class FacturacionProveedorComponent implements OnInit {

  
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
  operacionFac: FacturaOpProveedor[] = []
  
  
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

  procesarDatosParaTabla() {
    const proveedoresMap = new Map<number, any>();
    //console.log()(this.$facturasProveedor);
    
    if(this.$facturasProveedor !== null){
      this.$facturasProveedor.forEach((factura: FacturaProveedor) => {
        if (!proveedoresMap.has(factura.idProveedor)) {
          proveedoresMap.set(factura.idProveedor, {
            idProveedor: factura.idProveedor,
            proveedor: factura.razonSocial ,            
            sumaAPagar: 0,
            sumaACobrar: 0,
            faltaCobrar: 0,
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
          proveedor.faltaCobrar += Number(factura.total);
        }
        proveedor.total += factura.total;  
        proveedor.sumaACobrar += Number(factura.montoFacturaCliente);      
        proveedor.cant += Number(factura.operaciones.length);      
      });
  
      this.datosTablaProveedor = Array.from(proveedoresMap.values());
      //console.log()("Datos para la tabla: ", this.datosTablaProveedor); 
    }

    
    
  }
 


  mostrarMasDatos(index: number, proveedor:any) {   
  /*  // Cambiar el estado del botón en la posición indicada
   this.mostrarTablaProveedor[index] = !this.mostrarTablaProveedor[index];
   ////console.log()("CLIENTE: ", cliente);

   // Obtener el id del cliente utilizando el índice proporcionado
   let proveedorId = this.datosTablaProveedor[index].idProveedor;

   // Filtrar las facturas según el id del cliente y almacenarlas en el mapa
   let facturasProveedor = this.$facturasProveedor.filter((factura: FacturaOpProveedor) => {
       return factura.idProveedor === proveedorId;
   });
   this.facturasPorProveedor.set(proveedorId, facturasProveedor);

   //console.log()("FACTURAS DEL PROVEEDOR: ", facturasProveedor);   */
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
