import { Component, Input } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { FacturaCliente } from 'src/app/interfaces/factura-cliente';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-liq-cliente',
  templateUrl: './liq-cliente.component.html',
  styleUrls: ['./liq-cliente.component.scss']
})
export class LiqClienteComponent {

  @Input() fechasConsulta?: any = {
    fechaDesde: 0,
    fechaHasta: 0,
  };

  btnConsulta:boolean = false;
  searchText!:string;
  searchText2!:string;
  componente: string = "facturaCliente";
  $facturasOpCliente: any;
  date:any = new Date();
  primerDia: any = new Date(this.date.getFullYear(), this.date.getMonth() , 1).toISOString().split('T')[0];
  ultimoDia:any = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).toISOString().split('T')[0];  
  datosTabla: any[] = [];
  mostrarTabla: boolean[] = [];
  tablaDetalle: any[] = [];
  tituloFacOpCliente: string = "facturaOpCliente";
  facturasLiquidadas: any[] = []; // Nuevo array para almacenar las facturas liquidadas
  totalFacturasLiquidadas: number = 0; // Variable para almacenar el total de las facturas liquidadas
  razonSocFac!: string ;
  form!: any;
  facturaCliente!: FacturaCliente;  
  facturaEditada!: FacturaOpCliente;
  facturasPorCliente: Map<number, FacturaOpCliente[]> = new Map<number, FacturaOpCliente[]>();
  indiceSeleccionado!:number
  
  
  constructor(private storageService: StorageService, private fb: FormBuilder){
    // Inicializar el array para que todos los botones muestren la tabla cerrada al principio
    this.mostrarTabla = new Array(this.datosTabla.length).fill(false);
    this.form = this.fb.group({      
      detalle: [""],       
    })
  }

  ngOnInit(): void {
      
    this.storageService.getByDateValue(this.tituloFacOpCliente, "fecha", this.primerDia, this.ultimoDia, "consultasFacOpCliente");
    this.storageService.consultasFacOpCliente$.subscribe(data => {
      this.$facturasOpCliente = data;
      this.procesarDatosParaTabla()
    });
    
    //this.consultaMes(); 
  }

  procesarDatosParaTabla() {
    const clientesMap = new Map<number, any>();

    if(this.$facturasOpCliente !== null){
      this.$facturasOpCliente.forEach((factura: FacturaOpCliente) => {
        if (!clientesMap.has(factura.idCliente)) {
          clientesMap.set(factura.idCliente, {
            idCliente: factura.idCliente,
            razonSocial: factura.operacion.cliente.razonSocial,
            cantOp: 0,
            opSinFacturar: 0,
            opFacturadas: 0,
            total: 0
          });
        }
  
        const cliente = clientesMap.get(factura.idCliente);
        cliente.cantOp++;
        if (factura.liquidacion) {
          cliente.opFacturadas += factura.total;
        } else {
          cliente.opSinFacturar += factura.total;
        }
        cliente.total += factura.total;
      });
  
      this.datosTabla = Array.from(clientesMap.values());
      console.log("Datos para la tabla: ", this.datosTabla); 
    }

    
    
  }
 
  liquidarFac(factura: FacturaOpCliente){
    console.log("esta es la FACTURA: ", factura);
    factura.liquidacion = true;
    this.storageService.updateItem(this.tituloFacOpCliente, factura)
    this.procesarDatosParaTabla();     
  }

  cancelarliquidacion(factura: FacturaOpCliente) {
    factura.liquidacion = false;
    this.storageService.updateItem(this.tituloFacOpCliente, factura)
    this.procesarDatosParaTabla();     
  }

  mostrarMasDatos(index: number, cliente:any) {   
   // Cambiar el estado del botón en la posición indicada
   this.mostrarTabla[index] = !this.mostrarTabla[index];
   console.log("CLIENTE: ", cliente);

   // Obtener el id del cliente utilizando el índice proporcionado
   let clienteId = this.datosTabla[index].idCliente;

   // Filtrar las facturas según el id del cliente y almacenarlas en el mapa
   let facturasCliente = this.$facturasOpCliente.filter((factura: FacturaOpCliente) => {
       return factura.idCliente === clienteId;
   });
   this.facturasPorCliente.set(clienteId, facturasCliente);

   console.log("FACTURAS DEL CLIENTE: ", facturasCliente);  

  }

  cerrarTabla(index: number){
    this.mostrarTabla[index] = !this.mostrarTabla[index];
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

  liquidarFacCliente(idCliente: any, razonSocial: string, index: number){
    // Obtener las facturas del cliente
    let facturasIdCliente:any = this.facturasPorCliente.get(idCliente);
    this.razonSocFac = razonSocial;
    // Filtrar las facturas con liquidacion=true y guardarlas en un nuevo array
    this.facturasLiquidadas = facturasIdCliente.filter((factura: FacturaOpCliente) => {
        return factura.liquidacion === true;
    });

    // Calcular el total sumando los montos de las facturas liquidadas
    this.totalFacturasLiquidadas = 0;
    this.facturasLiquidadas.forEach((factura: FacturaOpCliente) => {
      this.totalFacturasLiquidadas += factura.total;
    });

    this.indiceSeleccionado = index;
    console.log("Facturas liquidadas del cliente", razonSocial + ":", this.facturasLiquidadas);
    console.log("Total de las facturas liquidadas:", this.totalFacturasLiquidadas);
    console.log("indice: ", this.indiceSeleccionado);
    
  }
  

  editarDetalle(factura:FacturaOpCliente){
    this.facturaEditada = factura;
    console.log(this.facturaEditada);
    this.form.patchValue({
      detalle: factura.operacion.observaciones,      
    });    
  }

  guardarDetalle(){    
    console.log(this.facturaEditada);
    this.facturaEditada.operacion.observaciones = this.form.value.detalle;
    console.log(this.facturaEditada.operacion.observaciones);
    this.storageService.updateItem("facturaOpCliente", this.facturaEditada);


  }

  onSubmit() {
    console.log(this.facturasLiquidadas);
    console.log(this.form.value);
    if(this.facturasLiquidadas.length > 0){
      this.facturaCliente = {
        id: null,
        fecha: new Date().toISOString().split('T')[0],
        idFacturaCliente: new Date().getTime(),
        idCliente: this.facturasLiquidadas[0].idCliente,
        operaciones: this.facturasLiquidadas,
        total: this.totalFacturasLiquidadas,
      }

      console.log("FACTURA CLIENTE: ", this.facturaCliente);
      
      this.addItem(this.facturaCliente);

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
    this.facturaCliente.operaciones.forEach((factura: FacturaOpCliente) => {
      this.removeItem(factura);
    });
    this.cerrarTabla(this.indiceSeleccionado);
    this.ngOnInit();
  }

  removeItem(item:any){
    this.storageService.deleteItem("facturaOpCliente", item);    
  }

}
