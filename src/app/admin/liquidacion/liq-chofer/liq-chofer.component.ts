import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { FacturaChofer } from 'src/app/interfaces/factura-chofer';
import { FacturaOpChofer } from 'src/app/interfaces/factura-op-chofer';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-liq-chofer',
  templateUrl: './liq-chofer.component.html',
  styleUrls: ['./liq-chofer.component.scss']
})
export class LiqChoferComponent implements OnInit {

  @Input() fechasConsulta?: any = {
    fechaDesde: 0,
    fechaHasta: 0,
  };

  //btnConsulta:boolean = false;
  searchText!:string;
  searchText2!:string;
  componente: string = "facturaChofer";
  $facturasOpChofer: any;
  date:any = new Date();
  primerDia: any = new Date(this.date.getFullYear(), this.date.getMonth() , 1).toISOString().split('T')[0];
  ultimoDia:any = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).toISOString().split('T')[0];  
  datosTablaChofer: any[] = [];
  mostrarTablaChofer: boolean[] = [];
  tablaDetalle: any[] = [];
  tituloFacOpChofer: string = "facturaOpChofer";
  facturasLiquidadasChofer: any[] = []; // Nuevo array para almacenar las facturas liquidadas
  totalFacturasLiquidadasChofer: number = 0; // Variable para almacenar el total de las facturas liquidadas
  apellido!: string ;
  form!: any;
  facturaChofer!: FacturaChofer;  
  facturaEditada!: FacturaOpChofer;
  facturasPorChofer: Map<number, FacturaOpChofer[]> = new Map<number, FacturaOpChofer[]>();
  indiceSeleccionado!:number
  
  
  constructor(private storageService: StorageService, private fb: FormBuilder){
    // Inicializar el array para que todos los botones muestren la tabla cerrada al principio
    this.mostrarTablaChofer = new Array(this.datosTablaChofer.length).fill(false);
    this.form = this.fb.group({      
      detalle: [""],       
    })
  }

  ngOnInit(): void {
      
    this.storageService.getByDateValue(this.tituloFacOpChofer, "fecha", this.primerDia, this.ultimoDia, "consultasFacOpChofer");
    this.storageService.consultasFacOpChofer$.subscribe(data => {
      this.$facturasOpChofer = data;
      this.procesarDatosParaTabla()
      
      
    });
    
    //this.consultaMes(); 
  }

  procesarDatosParaTabla() {
    const choferesMap = new Map<number, any>();

    if(this.$facturasOpChofer !== null){
      //console.log("Facturas OP Chofer: ", this.$facturasOpChofer);
      
      this.$facturasOpChofer.forEach((factura: FacturaOpChofer) => {
        if (!choferesMap.has(factura.idChofer)) {
          choferesMap.set(factura.idChofer, {
            idChofer: factura.idChofer,
            apellido: factura.operacion.chofer.apellido ,
            cantOp: 0,
            opSinFacturar: 0,
            opFacturadas: 0,
            total: 0
          });
        }
  
        const chofer = choferesMap.get(factura.idChofer);
        chofer.cantOp++;
        if (factura.liquidacion) {
          chofer.opFacturadas += factura.total;
        } else {
          chofer.opSinFacturar += factura.total;
        }
        chofer.total += factura.total;
      });
  
      this.datosTablaChofer = Array.from(choferesMap.values());
      //console.log("Datos para la tabla: ", this.datosTablaChofer); 
    }

    
    
  }
 
  liquidarFac(factura: FacturaOpChofer){
    //console.log("esta es la FACTURA: ", factura);
    factura.liquidacion = true;
    this.storageService.updateItem(this.tituloFacOpChofer, factura)
    this.procesarDatosParaTabla();     
  }

  cancelarliquidacion(factura: FacturaOpChofer) {
    factura.liquidacion = false;
    this.storageService.updateItem(this.tituloFacOpChofer, factura)
    this.procesarDatosParaTabla();     
  }

  mostrarMasDatos(index: number, chofer:any) {   
   // Cambiar el estado del botón en la posición indicada
   this.mostrarTablaChofer[index] = !this.mostrarTablaChofer[index];
   //console.log("Chofer: ", chofer);

   // Obtener el id del cliente utilizando el índice proporcionado
   let choferId = this.datosTablaChofer[index].idChofer;

   // Filtrar las facturas según el id del cliente y almacenarlas en el mapa
   let facturasChofer = this.$facturasOpChofer.filter((factura: FacturaOpChofer) => {
       return factura.idChofer === choferId;
   });
   this.facturasPorChofer.set(choferId, facturasChofer);

   //console.log("FACTURAS DEL CHOFER: ", facturasChofer);  

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

  liquidarFacChofer(idChofer: any, apellido: string, index: number){
    // Obtener las facturas del cliente
    //console.log("IDCHOFER: ", idChofer);
    
    let facturasIdChofer:any = this.facturasPorChofer.get(idChofer);    
    ////console.log("FACTURAS POR CHOFER: ", facturasIdChofer );
    

    this.apellido = apellido;
    //console.log("APELLIDO: ", this.apellido);
    
    // Filtrar las facturas con liquidacion=true y guardarlas en un nuevo array
    this.facturasLiquidadasChofer = facturasIdChofer.filter((factura: FacturaOpChofer) => {
        return factura.liquidacion === true;
    });

    // Calcular el total sumando los montos de las facturas liquidadas
    this.totalFacturasLiquidadasChofer = 0;
    this.facturasLiquidadasChofer.forEach((factura: FacturaOpChofer) => {
      this.totalFacturasLiquidadasChofer += factura.total;
    });

    this.indiceSeleccionado = index;
    //console.log("Facturas liquidadas del cliente", apellido + ":", this.facturasLiquidadasChofer);
    //console.log("Total de las facturas liquidadas:", this.totalFacturasLiquidadasChofer);
    //console.log("indice: ", this.indiceSeleccionado);
    
  }
  

  editarDetalle(factura:FacturaOpChofer){
    this.facturaEditada = factura;
    //console.log(this.facturaEditada);
    this.form.patchValue({
      detalle: factura.operacion.observaciones,      
    });    
  }

  guardarDetalle(){    
    //console.log(this.facturaEditada);
    this.facturaEditada.operacion.observaciones = this.form.value.detalle;
    //console.log(this.facturaEditada.operacion.observaciones);
    this.storageService.updateItem("facturaOpChofer", this.facturaEditada);


  }

  onSubmit() {
    //console.log(this.facturasLiquidadasChofer);
    //console.log(this.form.value);
    if(this.facturasLiquidadasChofer.length > 0){
      this.facturaChofer = {
        id: null,
        fecha: new Date().toISOString().split('T')[0],
        idFacturaChofer: new Date().getTime(),
        idChofer: this.facturasLiquidadasChofer[0].idChofer,
        operaciones: this.facturasLiquidadasChofer,
        total: this.totalFacturasLiquidadasChofer,
      }

      //console.log("FACTURA CHOFER: ", this.facturaChofer);
      
      this.addItem(this.facturaChofer);

    }else{
      alert("no hay facturas")
    }
    
    

  }

  addItem(item:any): void {   
    this.storageService.addItem(this.componente, item);     
    this.form.reset();
    //this.$tarifasChofer = null;
    //this.ngOnInit();
    this.eliminarFacturasOp();
  } 

  eliminarFacturasOp(){
    this.facturaChofer.operaciones.forEach((factura: FacturaOpChofer) => {
      this.removeItem(factura);
    });
    this.cerrarTabla(this.indiceSeleccionado);
    this.ngOnInit();
  }

  removeItem(item:any){
    this.storageService.deleteItem("facturaOpChofer", item);    
  }

}
