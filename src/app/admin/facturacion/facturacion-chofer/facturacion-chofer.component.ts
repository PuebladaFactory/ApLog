import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { LoginComponent } from 'src/app/appLogin/login/login.component';
import { FacturaChofer } from 'src/app/interfaces/factura-chofer';
import { FacturaOpChofer } from 'src/app/interfaces/factura-op-chofer';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { PdfService } from 'src/app/servicios/informes/pdf/pdf.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ModalDetalleComponent } from '../modal-detalle/modal-detalle.component';

@Component({
  selector: 'app-facturacion-chofer',
  templateUrl: './facturacion-chofer.component.html',
  styleUrls: ['./facturacion-chofer.component.scss']
})
export class FacturacionChoferComponent implements OnInit {
  
  searchText!:string;
  componente: string = "facturaChofer";
  $facturasChofer: any;
  date:any = new Date();
  primerDiaAnio: any = new Date(this.date.getFullYear(), 0, 1).toISOString().split('T')[0];
  ultimoDiaAnio:any = new Date(this.date.getFullYear(), 11 + 1, 0).toISOString().split('T')[0];  
  datosTablaChofer: any[] = [];
  mostrarTablaChofer: boolean[] = [];  
  tituloFacChofer: string = "facturaChofer";
  facturaChofer!: FacturaChofer;  
  $facturaOpChofer: FacturaOpChofer[] = [];
  facturasPorChofer: Map<number, FacturaChofer[]> = new Map<number, FacturaChofer[]>();
  operacionFac: FacturaOpChofer[] = [];

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
      this.storageService.consultasFacChofer$.subscribe(data => {
        this.$facturasChofer = data;
        this.procesarDatosParaTabla();
        this.mostrarTablaChofer = new Array(this.datosTablaChofer.length).fill(false); // Mueve esta línea aquí
      });
    
      this.storageService.consultasFacOpLiqChofer$.subscribe(data => {
        this.$facturaOpChofer = data;
      });
    }

  procesarDatosParaTabla() {
    const choferesMap = new Map<number, any>();
    ////console.log()(this.$facturasChofer);
    
    if(this.$facturasChofer !== null){
       // Inicializar los totales a cero
       this.totalCant = 0;
       this.totalSumaAPagar = 0;
       this.totalSumaACobrar = 0;
       this.totalGanancia = 0;
       this.totalPorcentajeGanancia = 0;
       this.totalFaltaCobrar = 0;
   
       // Procesar cada factura y actualizar los datos del cliente
      this.$facturasChofer.forEach((factura: FacturaChofer) => {
        if (!choferesMap.has(factura.idChofer)) {
          choferesMap.set(factura.idChofer, {
            idChofer: factura.idChofer,            
            chofer: factura.apellido + " " + factura.nombre,            
            sumaAPagar: 0,
            sumaACobrar: 0,
            faltaPagar: 0,
            total: 0,
            cant: 0,
          });
        }
  
        const chofer = choferesMap.get(factura.idChofer);
        //cliente.sumaACobrar++;
        if (factura.cobrado) {
          chofer.sumaAPagar += Number(factura.total);
        } else {
          chofer.sumaAPagar += Number(factura.total);
          chofer.faltaPagar += Number(factura.total);
        }
        chofer.total += Number(factura.total);
        chofer.sumaACobrar += Number(factura.montoFacturaCliente);  
        chofer.cant += Number(factura.operaciones.length);      
      });
  
      this.datosTablaChofer = Array.from(choferesMap.values());
      ////console.log()("Datos para la tabla: ", this.datosTablaChofer); 
      
      this.datosTablaChofer.forEach(chofer => {
        this.totalCant += chofer.cant;
        this.totalSumaAPagar += chofer.sumaAPagar;
        this.totalSumaACobrar += chofer.sumaACobrar;
        this.totalFaltaCobrar += chofer.faltaPagar;
      });
  
      // Calcular totales de ganancia y porcentaje de ganancia
      this.totalGanancia = this.totalSumaACobrar - this.totalSumaAPagar;
      if (this.totalSumaACobrar > 0) {
        this.totalPorcentajeGanancia = (this.totalGanancia * 100) / this.totalSumaACobrar;
      } else {
        this.totalPorcentajeGanancia = 0;
      }
    }    
    
  }

  mostrarMasDatos(index: number, cliente:any) {   
 
   if (this.datosTablaChofer && this.datosTablaChofer[index]) {
    this.mostrarTablaChofer[index] = !this.mostrarTablaChofer[index];
    const choferId = this.datosTablaChofer[index].idChofer;
    const facturasChofer = this.$facturasChofer.filter((factura: any) => factura.idChofer === choferId);
    this.facturasPorChofer.set(choferId, facturasChofer);        
    //console.log("1) facturasCliente: ", facturasCliente);
    //console.log("2) facturas por cliente: ", this.facturasPorCliente);
    this.openModal(facturasChofer, index)  
    
  } else {
    console.error('Elemento en datosTablaCliente no encontrado en el índice:', index);
  }
  }

  cerrarTabla(index: number){
    this.mostrarTablaChofer[index] = !this.mostrarTablaChofer[index];
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
        modo: "choferes",
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
