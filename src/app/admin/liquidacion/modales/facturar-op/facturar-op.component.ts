import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { FacturaCliente, Valores } from 'src/app/interfaces/factura-cliente';
import { FacturaOp } from 'src/app/interfaces/factura-op';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { PdfService } from 'src/app/servicios/informes/pdf/pdf.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';
import { DescuentosComponent } from '../descuentos/descuentos.component';
import { Descuento, FacturaChofer } from 'src/app/interfaces/factura-chofer';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { FacturaProveedor } from 'src/app/interfaces/factura-proveedor';

@Component({
  selector: 'app-facturar-op',
  templateUrl: './facturar-op.component.html',
  styleUrls: ['./facturar-op.component.scss']
})
export class FacturarOpComponent implements OnInit {

  @Input() fromParent: any;  
    
  facturaCliente!: FacturaCliente;  
  facturaChofer!: FacturaChofer;
  facturaProveedor!: FacturaProveedor;
  idOperaciones: number [] = [];        
  $clientes!: Cliente[];
  $choferes!: Chofer[];
  $proveedores!: Proveedor[];
  clienteSel!: Cliente;
  choferSel!: Chofer;
  proveedorSel!: Proveedor;
  modo: string = "vista";  

  columnas = [
    { nombre: 'Fecha', propiedad: 'fecha', seleccionada: true },
    { nombre: 'Quincena', propiedad: 'quincena', seleccionada: true },
    { nombre: 'Chofer', propiedad: 'chofer', seleccionada: true },
    { nombre: 'Cliente', propiedad: 'cliente', seleccionada: true },
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
  tieneDescuentos: boolean = false;
  descuentosAplicados: Descuento[] = [];
  totalDescuento: number = 0;
  ////////////////////////////////////////////
  titulo!:string;
  facLiquidadas: FacturaOp[] = [];
  total!: number;
  totalContraParte: number = 0;
  columnasVisibles: any[] = [];
  factura!: any;  

  constructor(private storageService: StorageService, private fb: FormBuilder, private excelServ: ExcelService, private pdfServ: PdfService, public activeModal: NgbActiveModal, private modalService: NgbModal){}
  
  ngOnInit(): void {
    console.log("0) ", this.fromParent);
    this.storageService.choferes$.subscribe(data => {
      this.$choferes = data;      
    }); 

    this.storageService.clientes$.subscribe(data => {
      this.$clientes = data;      
    }); 

    this.storageService.proveedores$.subscribe(data => {
      this.$proveedores = data;      
    }); 
    this.facLiquidadas = this.fromParent.facturas;
    //console.log("1): ", this.facLiquidadas);    
    this.total = this.fromParent.total;
    //console.log("2): ", this.total);
    this.facLiquidadas.forEach((f:FacturaOp)=>{this.totalContraParte += f.contraParteMonto});
    //console.log("3): ", this.totalContraParte);
    switch(this.fromParent.origen){
      case 'clientes':{        
        this.getCliente();
        this.titulo = this.clienteSel.razonSocial;        
        this.actualizarColumnasSeleccionadas(); // Inicializar la lista de columnas seleccionadas
        break
      };
      case 'choferes':{        
        this.getChofer();
        this.titulo = this.choferSel.apellido + " " + this.choferSel.nombre;
        this.actualizarColumnasSeleccionadas(); // Inicializar la lista de columnas seleccionadas
        break
      };
      case 'proveedores':{        
        this.getProveedor();
        this.titulo = this.proveedorSel.razonSocial;
        this.actualizarColumnasSeleccionadas(); // Inicializar la lista de columnas seleccionadas
        break
      };
      default:{
        this.mensajesError("error en el modo");
        break
      }
    }
  }

  getCliente(){
    let clienteArray
    clienteArray = this.$clientes.filter((cliente:Cliente)=>{ return cliente.idCliente === this.facLiquidadas[0].idCliente});
    this.clienteSel = clienteArray[0];
  }

  getChofer(){
    let choferArray
    choferArray = this.$choferes.filter((c:Chofer)=>{ return c.idChofer === this.facLiquidadas[0].idChofer});
    this.choferSel = choferArray[0];
  }

  getProveedor(){
    let proveedorArray
    proveedorArray = this.$proveedores.filter((p:Proveedor)=>{ return p.idProveedor === this.facLiquidadas[0].idProveedor});
    this.proveedorSel = proveedorArray[0];
  }

  getClienteId(idCliente:number){
    let clienteArray
    clienteArray = this.$clientes.filter((c:Cliente)=>{ return c.idCliente === idCliente;});
    return clienteArray[0].razonSocial;
  }

  getChoferId(idChofer:number){
    let choferArray
    choferArray = this.$choferes.filter((c:Chofer)=>{ return c.idChofer === idChofer;});
    return choferArray[0].apellido + " " + choferArray[0].nombre;
  }

  getProveedorId(idProveedor:number){
    let proveedorArray
    proveedorArray = this.$proveedores.filter((p:Proveedor)=>{ return p.idProveedor === idProveedor;});
    return proveedorArray[0].razonSocial;
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
    
    //console.log("columnas seleccionadas", this.columnasSeleccionadas);
    let colSel: string [] = [];
    this.columnasSeleccionadas.forEach(c => colSel.push(c.nombre))
    //console.log("colSel", colSel);
    if(this.facLiquidadas.length > 0){
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
          this.facLiquidadas.forEach((factura: FacturaOp) => {                
            this.idOperaciones.push(factura.idOperacion)
          });
     
          ////console.log()("ID OPERACIONES: ", this.idOperaciones);
          //this.facturaChofer.operaciones = idOperaciones;
          let valores: Valores = {totalTarifaBase:0, totalAcompaniante:0, totalkmMonto:0, total:this.total, descuentoTotal: this.totalDescuento};
          this.facLiquidadas.forEach((f:FacturaOp)=>{
            valores.totalTarifaBase += f.valores.tarifaBase;
            valores.totalAcompaniante += f.valores.acompaniante;
            valores.totalkmMonto += f.valores.kmMonto;  
            //valores.total += f.valores.total          
          });

          valores.total -= this.totalDescuento

          switch(this.fromParent.origen){
            case "clientes":{
              this.generarFacCliente(valores, colSel);
              break;
            }
            case "choferes":{
              this.generarFacChofer(valores,colSel);
              break;  
            }
            case "proveedores":{
              this.generarFacProveedor(valores,colSel);
              break;  
            }
            default:{
              //this.mensajesError("error en actualizar columnas");
              break;
            }
          };

          
          
          Swal.fire({
            title: "Confirmado",
            //text: "Los cambios se han guardado.",
            icon: "success"
          }).then((result) => {
            console.log("FACTURA: ", this.factura);
            let respuesta = {
              factura: this.factura,
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
    switch(this.fromParent.origen){
      case "clientes":{
        this.columnasVisibles = this.columnas.filter(col => col.nombre !== "Cliente");
        break;
      }
      case "choferes":{
        this.columnasVisibles = this.columnas.filter(col => col.nombre !== "Chofer");
        break;  
      }
      case "proveedores":{
        this.columnasVisibles = this.columnas;
        break;  
      }
      default:{
        this.mensajesError("error en actualizar columnas");
        break;
      }
    };
    
    this.columnasSeleccionadas = this.columnasVisibles.filter(col => col.seleccionada);
    console.log("col sel:", this.columnasSeleccionadas);
    
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
        return this.getChoferId(facOp.idChofer);
      };
      case 'Cliente':{        
        return this.getClienteId(facOp.idCliente);
      };
      case 'Patente':{
        return facOp.patente;
      };
      case 'Concepto':{
        if (this.fromParent.origen === "clientes") {            
          return facOp.observaciones;
        } else if (this.fromParent.origen === "choferes" || this.fromParent.origen === "proveedores") {
          return this.getCategoria(facOp);
        } 
        return "";
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

  abrirModalDescuentos(){
    
    {
      const modalRef = this.modalService.open(DescuentosComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'md', 
        //backdrop:"static" 
      });
      

     let info = {
        descuentos : this.descuentosAplicados,
      }; 
      
      
      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
          console.log("descuentos: ", result);
          if(result.total > 0){            
            this.descuentosAplicados = result.descuentos;
            this.tieneDescuentos = true;
            this.totalDescuento = result.total;            
          }

        },
        (reason) => {}
      );
    }
  }

  getCategoria(fac: FacturaOp){
    let veh: Vehiculo[];   
    let choferSel: Chofer[];    
    choferSel = this.$choferes.filter((c:Chofer)=> {return c.idChofer === fac.idChofer});
    veh = choferSel[0].vehiculo.filter((v:Vehiculo)=>{return v.dominio === fac.patente});    
    return veh[0].categoria.nombre;
  }

  generarFacCliente(valores:Valores, colSel: any[]){
    this.facturaCliente = {
      id: null,
      fecha: new Date().toISOString().split('T')[0],
      idFacturaCliente: new Date().getTime(),
      idCliente: this.clienteSel.idCliente,        
      razonSocial: this.clienteSel.razonSocial,
      operaciones: this.idOperaciones,
      valores: valores,
      cobrado:false,
      montoFacturaChofer: this.totalContraParte,
      columnas: colSel,
      descuentos: this.descuentosAplicados,
    }

    this.factura = this.facturaCliente;
  }

  generarFacChofer(valores:Valores, colSel: any[]){
    this.facturaChofer = {
      id: null,
      fecha: new Date().toISOString().split('T')[0],
      idFacturaChofer: new Date().getTime(),
      idChofer: this.choferSel.idChofer,
      apellido: this.choferSel.apellido,
      nombre: this.choferSel.nombre,
      operaciones: this.idOperaciones,
      valores: valores,
      cobrado:false,
      montoFacturaCliente: this.totalContraParte,
      columnas: colSel,
      descuentos: this.descuentosAplicados,
    }

    this.factura = this.facturaChofer;
  }

  generarFacProveedor(valores:Valores, colSel: any[]){
    this.facturaProveedor = {
      id: null,
      fecha: new Date().toISOString().split('T')[0],
      idFacturaProveedor: new Date().getTime(),
      idProveedor: this.proveedorSel.idProveedor,
      razonSocial: this.proveedorSel.razonSocial,      
      operaciones: this.idOperaciones,
      valores: valores,
      cobrado:false,
      montoFacturaCliente: this.totalContraParte,
      columnas: colSel,
      descuentos: this.descuentosAplicados,
    }

    this.factura = this.facturaProveedor;
  }


}
