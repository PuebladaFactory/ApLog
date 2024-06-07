import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Cliente } from 'src/app/interfaces/cliente';
import { FacturaCliente } from 'src/app/interfaces/factura-cliente';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { PdfService } from 'src/app/servicios/informes/pdf/pdf.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-facturacion-cliente',
  templateUrl: './facturacion-cliente.component.html',
  styleUrls: ['./facturacion-cliente.component.scss']
})
export class FacturacionClienteComponent implements OnInit  {

  
  searchText!:string;
  componente: string = "facturaCliente";
  $facturasCliente: any;
  date:any = new Date();
  primerDiaAnio: any = new Date(this.date.getFullYear(), 0, 1).toISOString().split('T')[0];
  ultimoDiaAnio:any = new Date(this.date.getFullYear(), 11 + 1, 0).toISOString().split('T')[0];   
  datosTablaCliente: any[] = [];
  mostrarTablaCliente: boolean[] = [];  
  tituloFacCliente: string = "facturaCliente";
  facturaCliente!: FacturaCliente;  
  facturaEditada!: FacturaOpCliente;
  facturasPorCliente: Map<number, FacturaCliente[]> = new Map<number, FacturaCliente[]>();
  $facturaOpCliente: FacturaOpCliente[] = [];  
  operacionFac: FacturaOpCliente[] = []
  
  
  
  constructor(private storageService: StorageService, private fb: FormBuilder, private excelServ: ExcelService, private pdfServ: PdfService){
   // Inicializar el array para que todos los botones muestren la tabla cerrada al principio
   this.mostrarTablaCliente = new Array(this.datosTablaCliente.length).fill(false);  
  }

  ngOnInit(): void {
      
    this.storageService.getByDateValue(this.tituloFacCliente, "fecha", this.primerDiaAnio, this.ultimoDiaAnio, "consultasFacCliente");
    this.storageService.consultasFacCliente$.subscribe(data => {
      this.$facturasCliente = data;
      this.procesarDatosParaTabla()
    });

    this.storageService.consultasFacOpLiqCliente$.subscribe(data =>{
      //console.log(data);
      this.$facturaOpCliente = data;     
      console.log("consultasFacOpLiqCliente: ", this.$facturaOpCliente );
      
    })

    
    //this.consultaMes(); 
  }

  procesarDatosParaTabla() {
    const clientesMap = new Map<number, any>();
    //console.log(this.$facturasCliente);
    
    if(this.$facturasCliente !== null){
      this.$facturasCliente.forEach((factura: FacturaCliente) => {
        if (!clientesMap.has(factura.idCliente)) {
          clientesMap.set(factura.idCliente, {
            idCliente: factura.idCliente,
            razonSocial: factura.razonSocial ,
            sumaAPagar: 0,
            sumaACobrar: 0,
            faltaCobrar: 0,
            total: 0
          });
        }
  
        const cliente = clientesMap.get(factura.idCliente);
        //cliente.sumaACobrar++;
        if (factura.cobrado) {
          cliente.sumaACobrar += Number(factura.total);
        } else {
          cliente.sumaACobrar += Number(factura.total);
          cliente.faltaCobrar += Number(factura.total);
        }
        cliente.total += Number(factura.total);  
        cliente.sumaAPagar += Number(factura.montoFacturaChofer);      
      });
  
      this.datosTablaCliente = Array.from(clientesMap.values());
      //console.log("Datos para la tabla: ", this.datosTablaCliente); 
    }

    
    
  }
 


  mostrarMasDatos(index: number, cliente:any) {   
   // Cambiar el estado del botón en la posición indicada
   this.mostrarTablaCliente[index] = !this.mostrarTablaCliente[index];
   ////console.log("CLIENTE: ", cliente);

   // Obtener el id del cliente utilizando el índice proporcionado
   let clienteId = this.datosTablaCliente[index].idCliente;

   // Filtrar las facturas según el id del cliente y almacenarlas en el mapa
   let facturasCliente = this.$facturasCliente.filter((factura: FacturaOpCliente) => {
       return factura.idCliente === clienteId;
   });
   this.facturasPorCliente.set(clienteId, facturasCliente);

   console.log("FACTURAS DEL CLIENTE: ", facturasCliente);  

  }

  cerrarTabla(index: number){
    this.mostrarTablaCliente[index] = !this.mostrarTablaCliente[index];
  }

 // Modifica la función getQuincena para que acepte una fecha como parámetro
  getQuincena(fecha: string | Date): string {
    // Convierte la fecha a objeto Date
    const fechaObj = new Date(fecha);
    // Obtiene el día del mes
    const dia = fechaObj.getDate();
    // Determina si la fecha está en la primera o segunda quincena
    if (dia <= 15) {
      return '1° quincena';
    } else {
      return '2° quincena';
    }
  }



  facturaCobrada(factura:FacturaCliente){
    //este va
    factura.cobrado = !factura.cobrado
    //console.log(factura.cobrado);
    this.updateItem(factura)
    
  }

  updateItem(item:any){
    this.storageService.updateItem(this.componente, item);     
  }

  consultarFacCliente(factura:FacturaCliente){
    this.storageService.getByFieldValueTitle("facOpLiqCliente", "idCliente",factura.idCliente,"consultasFacOpLiqCliente")

  }

  reimprimirFac(factura:FacturaCliente, formato: string){    
    console.log(factura);    
    //console.log(texto);
    this.operacionFac = []
    
    factura.operaciones.forEach((id:number) => {
      if(this.$facturaOpCliente !== null){
        this.$facturaOpCliente.forEach((facturaOp: FacturaOpCliente) => {
        
          if(facturaOp.operacion.idOperacion === id){
            this.operacionFac.push(facturaOp)
          }
                 
        }) 
      }      
    })
    console.log("facturasOp: ", this.operacionFac);
    if(formato === "excel"){
      this.excelServ.exportToExcelCliente(factura, this.operacionFac); 
    } else{
      this.pdfServ.exportToPdfCliente(factura, this.operacionFac);
    }
    this.storageService.clearInfo("facOpLiqCliente")
    //console.log("ARRAY: ", this.$facturaOpChofer);
    
    
     
    
  }

  
}
