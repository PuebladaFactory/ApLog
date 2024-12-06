import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { FacturaCliente, Valores } from 'src/app/interfaces/factura-cliente';
import { FacturaOp } from 'src/app/interfaces/factura-op';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { PdfService } from 'src/app/servicios/informes/pdf/pdf.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-liquidacion-op',
  templateUrl: './liquidacion-op.component.html',
  styleUrls: ['./liquidacion-op.component.scss']
})
export class LiquidacionOpComponent implements OnInit{
  @Input() fromParent: any;
  @Output() generarPdf = new EventEmitter<any>(); // Emite la factura con las columnas seleccionadas

  form:any;
  facLiqCliente: FacturaOp[] = []; // Nuevo array para almacenar las facturas liquidadas
  totalFacLiqCliente: number = 0 ; // Variable para almacenar el total de las facturas liquidadas
  totalFacLiqChofer: number = 0 ; // Variable para almacenar el total de las facturas liquidadas
  facturaEditada!: FacturaOp;
  facturaCliente!: FacturaCliente;  
  idOperaciones: number [] = [];
  componente: string = "facturaCliente";
  mostrarTablaCliente: boolean[] = [];
  indiceSeleccionado!:number;
  edicion: boolean[] = [];
  $clientes!: Cliente[];
  $choferes!: Chofer[];
  clienteSeleccionado!: Cliente;
  modo: string = "vista";  

  columnas = [
    { nombre: 'Fecha', propiedad: 'fecha', seleccionada: true },
    { nombre: 'Quincena', propiedad: 'quincena', seleccionada: true },
    { nombre: 'Chofer', propiedad: 'chofer', seleccionada: true },
    { nombre: 'Patente', propiedad: 'patente', seleccionada: false },
    { nombre: 'Concepto', propiedad: 'conceptoCliente', seleccionada: true },
    { nombre: 'Hoja de Ruta', propiedad: 'hojaRuta', seleccionada: false },
    { nombre: 'Km', propiedad: 'km', seleccionada: true },
    { nombre: 'Jornada', propiedad: 'jornada', seleccionada: true },
    { nombre: 'Ad Km', propiedad: 'adicionalKm', seleccionada: true },
    { nombre: 'Acomp', propiedad: 'acompanante', seleccionada: true },
    { nombre: 'A Cobrar', propiedad: 'aCobrar', seleccionada: true }
  ];
  operaciones: any[] = []; // Recibe las operaciones desde el LiqClienteComponent
  columnasSeleccionadas: any[] = [];

  constructor(private storageService: StorageService, private fb: FormBuilder, private excelServ: ExcelService, private pdfServ: PdfService, public activeModal: NgbActiveModal){
    
    
    this.form = this.fb.group({      
      detalle: [""],       
    });
    
  }
  
  ngOnInit(): void {
    console.log("0) ", this.fromParent);
    
    this.facLiqCliente = this.fromParent.facturas;
    console.log("1): ", this.facLiqCliente);    
    this.totalFacLiqCliente = this.fromParent.totalCliente;
    console.log("2): ", this.totalFacLiqCliente);
    this.facLiqCliente.forEach((factura:FacturaOp)=>{
      this.totalFacLiqChofer += factura.contraParteMonto
    })
    this.storageService.choferes$.subscribe(data => {
      this.$choferes = data;      
    }); 

    this.storageService.clientes$.subscribe(data => {
      this.$clientes = data;
      this.getCliente()
    }); 

    this.actualizarColumnasSeleccionadas(); // Inicializar la lista de columnas seleccionadas
  }

  getCliente(){
    let clienteArray
    clienteArray = this.$clientes.filter((cliente:Cliente)=>{
      return cliente.idCliente === this.facLiqCliente[0].idCliente;
    });
    this.clienteSeleccionado = clienteArray[0];
  }

  getChofer(idChofer:number){
    let choferArray
    choferArray = this.$choferes.filter((c:Chofer)=>{
      return c.idChofer === idChofer;
    });
    return choferArray[0].apellido + " " + choferArray[0].nombre;
  }

   // Modifica la función getQuincena para que acepte una fecha como parámetro
   getQuincena(fecha: any | Date): string {
    // Convierte la fecha a objeto Date
    const [year, month, day] = fecha.split('-').map(Number);
  
    // Crear la fecha asegurando que tome la zona horaria local
    const date = new Date(year, month - 1, day); // mes - 1 porque los meses en JavaScript son 0-indexed
  
    // Determinar si está en la primera o segunda quincena
    if (day <= 15) {
      return '1<sup> ra</sup>';
    } else {
      return '2<sup> da</sup>';
    }
  }
  closeModal() {    
    let respuesta = {
      factura: "",
      titulo: "",
      modo: this.modo
    }
    this.activeModal.close(respuesta);    
  }

  formatearValor(valor: number) : any{
    let nuevoValor =  new Intl.NumberFormat('es-ES', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(valor);
   ////////console.log(nuevoValor);    
    //   `$${nuevoValor}`   
    return `$${nuevoValor}`
 }

 limpiarValorFormateado(valorFormateado: string): number {
  // Elimina el punto de miles y reemplaza la coma por punto para que sea un valor numérico válido
    return parseFloat(valorFormateado.replace(/\./g, '').replace(',', '.'));
  }
  onSubmit(titulo:string) {
    
    console.log("columnas seleccionadas", this.columnasSeleccionadas);
    let colSel: string [] = [];
    this.columnasSeleccionadas.forEach(c => colSel.push(c.nombre))
    console.log("colSel", colSel);
    if(this.facLiqCliente.length > 0){
      ////console.log()(this.facturasLiquidadasCliente);
      
      Swal.fire({
        title: "¿Desea generar la liquidación de las operaciones seleccionadas?",
        text: "Esta acción no se podrá revertir",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Guardar",
        cancelButtonText: "Cancelar"
      }).then((result) => {
        if (result.isConfirmed) {
          this.modo = "cerrar"
          ////////console.log("op: ", this.op);
          this.facLiqCliente.forEach((factura: FacturaOp) => {                
            this.idOperaciones.push(factura.idOperacion)
          });
     
          ////console.log()("ID OPERACIONES: ", this.idOperaciones);
          //this.facturaChofer.operaciones = idOperaciones;
          let valores: Valores = {totalTarifaBase:0, totalAcompaniante:0, totalkmMonto:0, total:0};
          this.facLiqCliente.forEach((f:FacturaOp)=>{
            valores.totalTarifaBase += f.valores.tarifaBase;
            valores.totalAcompaniante += f.valores.acompaniante;
            valores.totalkmMonto += f.valores.kmMonto;
            valores.total += f.valores.total;
          });


          this.facturaCliente = {
            id: null,
            fecha: new Date().toISOString().split('T')[0],
            idFacturaCliente: new Date().getTime(),
            idCliente: this.facLiqCliente[0].idCliente,        
            razonSocial: this.clienteSeleccionado.razonSocial,
            operaciones: this.idOperaciones,
            valores: valores,
            cobrado:false,
            montoFacturaChofer: this.totalFacLiqChofer,
            columnas: colSel,
          }
          
          Swal.fire({
            title: "Confirmado",
            //text: "Los cambios se han guardado.",
            icon: "success"
          }).then((result) => {
             //console.log()("FACTURA CLIENTE: ", this.facturaCliente);
            let respuesta = {
              factura: this.facturaCliente,
              titulo: titulo,
              modo: this.modo,
              columnas: colSel
            }

            this.activeModal.close(respuesta);
          });        
        }
      });   
    
    }else{
      this.mensajesError("No hay facturas seleccionadas")
    }
  }

  mensajesError(msj:string){
    Swal.fire({
      icon: "error",
      //title: "Oops...",
      text: `${msj}`
      //footer: `${msj}`
    });
  }

  actualizarColumnasSeleccionadas(): void {
    this.columnasSeleccionadas = this.columnas.filter(col => col.seleccionada);
    console.log("col sel:", this.columnasSeleccionadas);
    
  }

  confirmarYGenerarPdf(): void {
    const facturaCliente = this.facLiqCliente.map(operacion =>
      this.columnasSeleccionadas.reduce((acc, col) => {
        //acc[col.propiedad] = operacion[col.propiedad];
        return acc;
      }, {})
    );

    this.generarPdf.emit({
      facturaCliente,
      columnasSeleccionadas: this.columnasSeleccionadas.map(col => col.nombre)
    });
  }

  obtenerDatoColumna(facOp: FacturaOp, col: any) {
    
    
    switch (col.nombre) {
      case 'Fecha':{
        return facOp.fecha;
      };
      case 'Quincena':{
        return this.getQuincena(facOp.fecha);
      };      
      case 'Chofer':{
        return this.getChofer(facOp.idChofer);
      };
      case 'Patente':{
        return facOp.patente;
      };
      case 'Concepto':{
        return facOp.observaciones;
      };
      case 'Hoja de Ruta':{
        return facOp.hojaRuta;
      };
      case "Km":{
        return facOp.km;
      };
      case "Jornada":{
        return this.formatearValor(facOp.valores.tarifaBase);
      };
      case "Ad Km":{
        return this.formatearValor(facOp.valores.kmMonto);
      };
      case "Acomp":{
        return this.formatearValor(facOp.valores.acompaniante);
      };
      case "A Cobrar":{
        return this.formatearValor(facOp.valores.total);
      };
      default:{
        return ''
      }
    }
  }


}
