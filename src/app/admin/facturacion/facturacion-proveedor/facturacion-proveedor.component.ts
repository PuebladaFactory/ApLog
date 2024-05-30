import { Component, OnInit } from '@angular/core';
import { FacturaOpProveedor } from 'src/app/interfaces/factura-op-proveedor';
import { FacturaProveedor } from 'src/app/interfaces/factura-proveedor';
import { StorageService } from 'src/app/servicios/storage/storage.service';

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
  
  facturasPorProveedor: Map<number, FacturaProveedor[]> = new Map<number, FacturaProveedor[]>();
  
  
  
  constructor(private storageService: StorageService){
   // Inicializar el array para que todos los botones muestren la tabla cerrada al principio
   this.mostrarTablaProveedor = new Array(this.datosTablaProveedor.length).fill(false);  
  }

  ngOnInit(): void {
      
    this.storageService.getByDateValue(this.tituloFacProveedor, "fecha", this.primerDiaAnio, this.ultimoDiaAnio, "consultasFacProveedor");
    this.storageService.consultasFacProveedor$.subscribe(data => {
      this.$facturasProveedor = data;
      this.procesarDatosParaTabla()
    });
    
    //this.consultaMes(); 
  }

  procesarDatosParaTabla() {
    const proveedoresMap = new Map<number, any>();
    console.log(this.$facturasProveedor);
    
    if(this.$facturasProveedor !== null){
      this.$facturasProveedor.forEach((factura: FacturaProveedor) => {
        if (!proveedoresMap.has(factura.idProveedor)) {
          proveedoresMap.set(factura.idProveedor, {
            idProveedor: factura.idProveedor,
            proveedor: factura.razonSocial ,            
            sumaAPagar: 0,
            sumaACobrar: 0,
            faltaCobrar: 0,
            total: 0
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
      });
  
      this.datosTablaProveedor = Array.from(proveedoresMap.values());
      console.log("Datos para la tabla: ", this.datosTablaProveedor); 
    }

    
    
  }
 


  mostrarMasDatos(index: number, proveedor:any) {   
   // Cambiar el estado del botón en la posición indicada
   this.mostrarTablaProveedor[index] = !this.mostrarTablaProveedor[index];
   //console.log("CLIENTE: ", cliente);

   // Obtener el id del cliente utilizando el índice proporcionado
   let proveedorId = this.datosTablaProveedor[index].idProveedor;

   // Filtrar las facturas según el id del cliente y almacenarlas en el mapa
   let facturasProveedor = this.$facturasProveedor.filter((factura: FacturaOpProveedor) => {
       return factura.idProveedor === proveedorId;
   });
   this.facturasPorProveedor.set(proveedorId, facturasProveedor);

   console.log("FACTURAS DEL PROVEEDOR: ", facturasProveedor);  

  }

  cerrarTabla(index: number){
    this.mostrarTablaProveedor[index] = !this.mostrarTablaProveedor[index];
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



  facturaCobrada(factura:FacturaProveedor){
    //este va
    factura.cobrado = !factura.cobrado
    console.log(factura.cobrado);
    this.updateItem(factura)
    
  }

  updateItem(item:any){
    this.storageService.updateItem(this.componente, item);     
  }
}
