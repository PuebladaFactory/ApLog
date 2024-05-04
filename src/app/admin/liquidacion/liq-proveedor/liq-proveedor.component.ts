import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { FacturaOpProveedor } from 'src/app/interfaces/factura-op-proveedor';
import { FacturaProveedor } from 'src/app/interfaces/factura-proveedor';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-liq-proveedor',
  templateUrl: './liq-proveedor.component.html',
  styleUrls: ['./liq-proveedor.component.scss']
})
export class LiqProveedorComponent implements OnInit {

  @Input() fechasConsulta?: any = {
    fechaDesde: 0,
    fechaHasta: 0,
  };

  //btnConsulta:boolean = false;
  searchText!:string;
  searchText2!:string;
  componente: string = "facturaProveedor";
  $facturasOpProveedor: any;
  date:any = new Date();
  primerDia: any = new Date(this.date.getFullYear(), this.date.getMonth() , 1).toISOString().split('T')[0];
  ultimoDia:any = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).toISOString().split('T')[0];  
  datosTablaProveedor: any[] = [];
  mostrarTablaProveedor: boolean[] = [];
  tablaDetalle: any[] = [];
  tituloFacOpProveedor: string = "facturaOpProveedor";
  facturasLiquidadasProveedor: any[] = []; // Nuevo array para almacenar las facturas liquidadas
  totalFacturasLiquidadasProveedor: number = 0; // Variable para almacenar el total de las facturas liquidadas
  totalFacturasLiquidadasCliente: number = 0; // Variable para almacenar el total de las facturas liquidadas
  razonSocial!: string ;
  form!: any;
  facturaProveedor!: FacturaProveedor;  
  facturaEditada!: FacturaOpProveedor;
  facturasPorProveedor: Map<number, FacturaOpProveedor[]> = new Map<number, FacturaOpProveedor[]>();
  indiceSeleccionado!:number;
  idOperaciones: number [] = [];
  
  
  constructor(private storageService: StorageService, private fb: FormBuilder){
    // Inicializar el array para que todos los botones muestren la tabla cerrada al principio
    this.mostrarTablaProveedor = new Array(this.datosTablaProveedor.length).fill(false);
    this.form = this.fb.group({      
      detalle: [""],       
    })
  }

  ngOnInit(): void {
      
    this.storageService.getByDateValue(this.tituloFacOpProveedor, "fecha", this.primerDia, this.ultimoDia, "consultasFacOpProveedor");
    this.storageService.consultasFacOpProveedor$.subscribe(data => {
      this.$facturasOpProveedor = data;
      this.procesarDatosParaTabla()
      
      
    });
    
    //this.consultaMes(); 
  }

  procesarDatosParaTabla() {
    const proveedoresMap = new Map<number, any>();

    if(this.$facturasOpProveedor !== null){
      //console.log("Facturas OP Proveedor: ", this.$facturasOpProveedor);
      
      this.$facturasOpProveedor.forEach((factura: FacturaOpProveedor) => {
        if (!proveedoresMap.has(factura.idChofer)) {
          proveedoresMap.set(factura.idChofer, {
            idProveedor: factura.idProveedor,
            razonSocial: factura.operacion.chofer.proveedor ,
            cantOp: 0,
            opSinFacturar: 0,
            opFacturadas: 0,
            total: 0
          });
        }
  
        const chofer = proveedoresMap.get(factura.idChofer);
        chofer.cantOp++;
        if (factura.liquidacion) {
          chofer.opFacturadas += factura.total;
        } else {
          chofer.opSinFacturar += factura.total;
        }
        chofer.total += factura.total;
      });
  
      this.datosTablaProveedor = Array.from(proveedoresMap.values());
      //console.log("Datos para la tabla: ", this.datosTablaProveedor); 
    }

    
    
  }
 
  liquidarFac(factura: FacturaOpProveedor){
    //console.log("esta es la FACTURA: ", factura);
    factura.liquidacion = true;
    this.storageService.updateItem(this.tituloFacOpProveedor, factura)
    this.procesarDatosParaTabla();     
  }

  cancelarliquidacion(factura: FacturaOpProveedor) {
    factura.liquidacion = false;
    this.storageService.updateItem(this.tituloFacOpProveedor, factura)
    this.procesarDatosParaTabla();     
  }

  mostrarMasDatos(index: number, proveedor:any) {   
   // Cambiar el estado del botón en la posición indicada
   this.mostrarTablaProveedor[index] = !this.mostrarTablaProveedor[index];
   //console.log("Proveedor: ", proveedor);

   // Obtener el id del cliente utilizando el índice proporcionado
   let proveedorId = this.datosTablaProveedor[index].idProveedor;


   // Filtrar las facturas según el id del cliente y almacenarlas en el mapa
   let facturasProveedor = this.$facturasOpProveedor.filter((factura: FacturaOpProveedor) => {
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

  liquidarFacProveedor(idChofer: any, razonSocial: string, index: number){
    // Obtener las facturas del cliente
    //console.log("IDCHOFER: ", idChofer);
    
    let facturasIdChofer:any = this.facturasPorProveedor.get(idChofer);    
    ////console.log("FACTURAS POR CHOFER: ", facturasIdChofer );
    

    this.razonSocial = razonSocial;
    //console.log("razonSocial: ", this.razonSocial);
    
    // Filtrar las facturas con liquidacion=true y guardarlas en un nuevo array
    this.facturasLiquidadasProveedor = facturasIdChofer.filter((factura: FacturaOpProveedor) => {
        return factura.liquidacion === true;
    });

    // Calcular el total sumando los montos de las facturas liquidadas
    this.totalFacturasLiquidadasProveedor = 0;
    this.facturasLiquidadasProveedor.forEach((factura: FacturaOpProveedor) => {
      this.totalFacturasLiquidadasProveedor += factura.total;
    });

    this.totalFacturasLiquidadasCliente = 0;
    this.facturasLiquidadasProveedor.forEach((factura: FacturaOpProveedor) => {
      this.totalFacturasLiquidadasCliente += factura.montoFacturaCliente;
    });

    this.indiceSeleccionado = index;
    //console.log("Facturas liquidadas del cliente", razonSocial + ":", this.facturasLiquidadasProveedor);
    //console.log("Total de las facturas liquidadas:", this.totalFacturasLiquidadasProveedor);
    //console.log("indice: ", this.indiceSeleccionado);
    
  }
  

  editarDetalle(factura:FacturaOpProveedor){
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
    this.storageService.updateItem("FacturaOpProveedor", this.facturaEditada);


  }

  onSubmit() {
    //console.log(this.facturasLiquidadasProveedor);
    //console.log(this.form.value);
    if(this.facturasLiquidadasProveedor.length > 0){

      console.log(this.facturasLiquidadasProveedor);
      
      this.facturasLiquidadasProveedor.forEach((factura: FacturaOpProveedor) => {
        /* idOperaciones.push(factura.operacion.idOperacion) */
        
        this.idOperaciones.push(factura.operacion.idOperacion)
      });
 
      console.log("ID OPERACIONES: ", this.idOperaciones);
      //this.facturaChofer.operaciones = idOperaciones;

      this.facturaProveedor = {
        id: null,
        fecha: new Date().toISOString().split('T')[0],
        idFacturaProveedor: new Date().getTime(),
        idProveedor: this.facturasLiquidadasProveedor[0].idProveedor,
        razonSocial: this.facturasLiquidadasProveedor[0].operacion.chofer.proveedor,
        operaciones: this.idOperaciones,
        total: this.totalFacturasLiquidadasProveedor,
        cobrado:false,
        montoFacturaCliente: this.totalFacturasLiquidadasCliente,
      }

      //console.log("FACTURA PROVEEDOR: ", this.facturaProveedor);
      
      this.addItem(this.facturaProveedor, this.componente);
      this.form.reset();
      //this.$tarifasChofer = null;
      //this.ngOnInit();
      this.eliminarFacturasOp();
    }else{
      alert("no hay facturas")
    }
    
    

  }

  addItem(item:any, componente:string): void {   
    this.storageService.addItem(componente, item);     
    
  } 

  eliminarFacturasOp(){
    this.idOperaciones = [];
    this.facturasLiquidadasProveedor.forEach((factura: FacturaOpProveedor) => {
      this.addItem(factura, "facOpLiqProveedor");
      this.removeItem(factura);
    }); 
    /* this.facturaProveedor.operaciones.forEach((factura: FacturaOpProveedor) => {
      this.removeItem(factura);
    }); */
    this.cerrarTabla(this.indiceSeleccionado);
    this.ngOnInit();
  }

  removeItem(item:any){
    this.storageService.deleteItem("facturaOpProveedor", item);    
  }

}
