import { Component, OnInit } from '@angular/core';
import { FacturaChofer } from 'src/app/interfaces/factura-chofer';
import { FacturaOpChofer } from 'src/app/interfaces/factura-op-chofer';
import { StorageService } from 'src/app/servicios/storage/storage.service';

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
  
  facturasPorChofer: Map<number, FacturaChofer[]> = new Map<number, FacturaChofer[]>();
  
  
  
  constructor(private storageService: StorageService){
   // Inicializar el array para que todos los botones muestren la tabla cerrada al principio
   this.mostrarTablaChofer = new Array(this.datosTablaChofer.length).fill(false);  
  }

  ngOnInit(): void {
      
    this.storageService.getByDateValue(this.tituloFacChofer, "fecha", this.primerDiaAnio, this.ultimoDiaAnio, "consultasFacChofer");
    this.storageService.consultasFacChofer$.subscribe(data => {
      this.$facturasChofer = data;
      this.procesarDatosParaTabla()
    });
  
    
    //this.consultaMes(); 
  }

  procesarDatosParaTabla() {
    const choferesMap = new Map<number, any>();
    console.log(this.$facturasChofer);
    
    if(this.$facturasChofer !== null){
      this.$facturasChofer.forEach((factura: FacturaChofer) => {
        if (!choferesMap.has(factura.idChofer)) {
          choferesMap.set(factura.idChofer, {
            idChofer: factura.idChofer,            
            chofer: factura.apellido + " " + factura.nombre,            
            sumaAPagar: 0,
            sumaACobrar: 0,
            faltaPagar: 0,
            total: 0
          });
        }
  
        const chofer = choferesMap.get(factura.idChofer);
        //cliente.sumaACobrar++;
        if (factura.cobrado) {
          chofer.sumaAPagar += factura.total;
        } else {
          chofer.sumaAPagar += factura.total;
          chofer.faltaPagar +=factura.total
        }
        chofer.total += factura.total;  
        chofer.sumaACobrar += factura.montoFacturaCliente;      
      });
  
      this.datosTablaChofer = Array.from(choferesMap.values());
      console.log("Datos para la tabla: ", this.datosTablaChofer); 
    }

    
    
  }
 


  mostrarMasDatos(index: number, cliente:any) {   
   // Cambiar el estado del botón en la posición indicada
   this.mostrarTablaChofer[index] = !this.mostrarTablaChofer[index];
   //console.log("CLIENTE: ", cliente);

   // Obtener el id del cliente utilizando el índice proporcionado
   let choferId = this.datosTablaChofer[index].idChofer;

   // Filtrar las facturas según el id del cliente y almacenarlas en el mapa
   let facturasChofer = this.$facturasChofer.filter((factura: FacturaOpChofer) => {
       return factura.idChofer === choferId;
   });
   this.facturasPorChofer.set(choferId, facturasChofer);

   console.log("FACTURAS DEL CHOFER: ", facturasChofer);  

  }

  cerrarTabla(index: number){
    this.mostrarTablaChofer[index] = !this.mostrarTablaChofer[index];
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



  facturaCobrada(factura:FacturaChofer){
    //este va
    factura.cobrado = !factura.cobrado
    console.log(factura.cobrado);
    this.updateItem(factura)
    
  }

  updateItem(item:any){
    this.storageService.updateItem(this.componente, item);     
  }

}
