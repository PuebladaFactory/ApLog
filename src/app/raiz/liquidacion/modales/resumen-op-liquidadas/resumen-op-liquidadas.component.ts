import { AfterViewInit, Component, Input, OnInit} from '@angular/core';

import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';

import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';
import { DescuentosComponent } from '../descuentos/descuentos.component';

import { Proveedor } from 'src/app/interfaces/proveedor';

import { Subject, takeUntil } from 'rxjs';
import { ConIdType } from 'src/app/interfaces/conId';
import { InformeOp } from 'src/app/interfaces/informe-op';
import { Descuento, InformeLiq, Valores } from 'src/app/interfaces/informe-liq';
import { NumeradorService } from 'src/app/servicios/numerador/numerador.service';
import { PeriodoModalComponent } from '../periodo-modal/periodo-modal.component';

@Component({
    selector: 'app-resumen-op-liquidadas',
    templateUrl: './resumen-op-liquidadas.component.html',
    styleUrls: ['./resumen-op-liquidadas.component.scss'],
    standalone: false
})
export class ResumenOpLiquidadasComponent implements OnInit, AfterViewInit  {

  @Input() fromParent: any;  
    
  facturaCliente!: InformeLiq;  
  facturaChofer!: InformeLiq;
  facturaProveedor!: InformeLiq;
  idOperaciones: number [] = [];        
  $clientes!: ConIdType<Cliente>[];
  $choferes!: ConIdType<Chofer>[];
  $proveedores!: ConIdType<Proveedor>[];
  clienteSel!: ConIdType<Cliente>;
  choferSel!: ConIdType<Chofer>;
  proveedorSel!: ConIdType<Proveedor>;
  modo: string = "vista";  
  mes: string = "";
  periodo: string = "";
  periodoBoolean: boolean = true;


  columnas = [
    { nombre: 'Fecha', propiedad: 'fecha', seleccionada: true },
    { nombre: 'Quincena', propiedad: 'quincena', seleccionada: true },
    { nombre: 'Chofer', propiedad: 'chofer', seleccionada: true },
    { nombre: 'Cliente', propiedad: 'cliente', seleccionada: true },
    { nombre: 'Patente', propiedad: 'patente', seleccionada: false },
    { nombre: 'Concepto', propiedad: 'conceptoCliente', seleccionada: true },
    { nombre: 'Observaciones', propiedad: 'obs', seleccionada: false },
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
  facLiquidadas: ConIdType<InformeOp>[] = [];
  total!: number;
  subtotal!: number;
  totalContraParte: number = 0;
  columnasVisibles: any[] = [];
  factura!: any;  
  private destroy$ = new Subject<void>();
  obsInterna:string = "";

  constructor(
    private storageService: StorageService,     
    public activeModal: NgbActiveModal, 
    private modalService: NgbModal, 
    private numeradorService :NumeradorService
  ){}
  
  ngOnInit(): void {
    console.log("0) ", this.fromParent);
    this.storageService.getObservable<ConIdType<Chofer>>("choferes")
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data => {
      this.$choferes = data;    
      this.$choferes = this.$choferes.sort((a, b) => a.apellido.localeCompare(b.apellido)); // Ordena por el nombre del chofer 
    }); 

    this.storageService.getObservable<ConIdType<Cliente>>("clientes")
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data => {
      this.$clientes = data;   
      this.$clientes = this.$clientes.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer   
    }); 

    this.storageService.getObservable<ConIdType<Proveedor>>("proveedores")
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data => {
      this.$proveedores = data;      
      this.$proveedores = this.$proveedores.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
    }); 
    this.facLiquidadas = this.fromParent.facturas;
    this.facLiquidadas = this.facLiquidadas.sort((a, b) => {
      return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
    });
    console.log("1): ", this.facLiquidadas);    
    this.total = this.fromParent.total;
    this.subtotal = this.fromParent.total;
    this.mes = this.fromParent.mesPeriodo;
    console.log("mes: ", this.mes);
    ////console.log("2): ", this.total);
    this.facLiquidadas.forEach((f:InformeOp)=>{this.totalContraParte += f.contraParteMonto});
    ////console.log("3): ", this.totalContraParte);
    switch(this.fromParent.origen){
      case 'cliente':{        
        this.getCliente();
        this.titulo = this.clienteSel.razonSocial;        
        this.actualizarColumnasSeleccionadas(); // Inicializar la lista de columnas seleccionadas
        break
      };
      case 'chofer':{        
        this.getChofer();
        this.titulo = this.choferSel.apellido + " " + this.choferSel.nombre;
        this.actualizarColumnasSeleccionadas(); // Inicializar la lista de columnas seleccionadas
        break
      };
      case 'proveedor':{        
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

  ngAfterViewInit(): void {
    this.abrirModalPeriodo();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
   //////////console.log(nuevoValor);    
    //   `$${nuevoValor}`   
    return `$${nuevoValor}`
  }

  limpiarValorFormateado(valorFormateado: string): number {
  // Elimina el punto de miles y reemplaza la coma por punto para que sea un valor numérico válido
    return parseFloat(valorFormateado.replace(/\./g, '').replace(',', '.'));
  }
  onSubmit(titulo:string, accion:string) {
    
    ////console.log("columnas seleccionadas", this.columnasSeleccionadas);
    let colSel: string [] = [];
    this.columnasSeleccionadas.forEach(c => colSel.push(c.nombre))
    ////console.log("colSel", colSel);
    if(this.facLiquidadas.length > 0){
      //////console.log()(this.facturasLiquidadasCliente);
      
      Swal.fire({
        title: accion === 'factura' ? '¿Desea generar la liquidación de las operaciones seleccionadas?' : '¿Desea generar la proforma de las operaciones seleccionadas?',
        text: "Esta acción no se podrá revertir",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Guardar",
        cancelButtonText: "Cancelar"
      }).then((result) => {
        if (result.isConfirmed) {          
          //////////console.log("op: ", this.op);
          this.facLiquidadas.forEach((factura: InformeOp) => {                
            this.idOperaciones.push(factura.idOperacion)
          });
     
          //////console.log()("ID OPERACIONES: ", this.idOperaciones);
          //this.facturaChofer.operaciones = idOperaciones;
          let valores: Valores = {totalTarifaBase:0, totalAcompaniante:0, totalkmMonto:0, total:this.total, descuentoTotal: this.totalDescuento, totalContraParte: this.totalContraParte,};
          this.facLiquidadas.forEach((f:InformeOp)=>{
            valores.totalTarifaBase += f.valores.tarifaBase;
            valores.totalAcompaniante += f.valores.acompaniante;
            valores.totalkmMonto += f.valores.kmMonto;           
            
            //valores.total += f.valores.total          
          });          
          valores.total += this.totalDescuento
          this.modo = accion === 'factura' ? 'cerrar' : 'proforma';

          this.generarInformeLiquidacion(valores,colSel, accion);
/*           switch(this.fromParent.origen){
            case "cliente":{
              this.generarInformeLiquidacion(valores, colSel, accion);
              break;
            }
            case "chofer":{
              this.generarInformeLiquidacion(valores,colSel, accion);
              break;  
            }
            case "proveedor":{
              this.generarInformeLiquidacion(valores,colSel, accion);
              break;  
            }
            default:{
              //this.mensajesError("error en actualizar columnas");
              break;
            }
          }; */

          
          
          Swal.fire({
            title: "Confirmado",
            //text: "Los cambios se han guardado.",
            icon: "success"
          }).then((result) => {
            //console.log("FACTURA: ", this.factura);
            let respuesta = {
              factura: this.factura,
              titulo: titulo,
              modo: this.modo,
              columnas: colSel,
              accion: accion,
            }
            console.log("respuesta", respuesta);
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
      case "cliente":{
        this.columnasVisibles = this.columnas.filter(col => col.nombre !== "Cliente");
        break;
      }
      case "chofer":{
        this.columnasVisibles = this.columnas.filter(col => col.nombre !== "Chofer");
        break;  
      }
      case "proveedor":{
        this.columnasVisibles = this.columnas;
        break;  
      }
      default:{
        this.mensajesError("error en actualizar columnas");
        break;
      }
    };
    
    this.columnasSeleccionadas = this.columnasVisibles.filter(col => col.seleccionada);
    //console.log("col sel:", this.columnasSeleccionadas);
    
  }

  obtenerDatoColumna(facOp: InformeOp, col: any) {
    
    
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
        return this.getCategoria(facOp);
      };
      case 'Observaciones':{        
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
          //console.log("descuentos: ", result);
          if(result.descuentos.length > 0){            
            this.descuentosAplicados = result.descuentos;
            this.tieneDescuentos = true;
            this.totalDescuento = result.total;            
          }

        },
        (reason) => {}
      );
    }
  }

  getCategoria(fac: InformeOp){
    let veh: Vehiculo[];   
    let choferSel: Chofer[];    
    choferSel = this.$choferes.filter((c:Chofer)=> {return c.idChofer === fac.idChofer});
    veh = choferSel[0].vehiculo.filter((v:Vehiculo)=>{return v.dominio === fac.patente});    
    return veh[0].categoria.nombre;
  }


  async generarInformeLiquidacion(valores:Valores, colSel: any[], accion:string){
    const numero = accion === 'factura' ? await this.numeradorService.generarNumeroInterno(this.fromParent.origen) : "";
    let idInforme = this.fromParent.origen === 'cliente' ? this.clienteSel.idCliente : this.fromParent.origen === 'chofer' ? this.choferSel.idChofer :  this.proveedorSel.idProveedor;
    let razonSocial = this.fromParent.origen === 'cliente' ? this.clienteSel.razonSocial : this.fromParent.origen === 'chofer' ? this.choferSel.apellido + " " + this.choferSel.nombre : this.proveedorSel.razonSocial;
    let cuit = this.fromParent.origen === 'cliente' ? this.clienteSel.cuit : this.fromParent.origen === 'chofer' ? this.choferSel.cuit :  this.proveedorSel.cuit;
    this.periodo = this.periodoBoolean ? 'mes' : 'quincena'
    
    this.factura = {

      fecha: new Date().toISOString().split('T')[0],
      idInfLiq: new Date().getTime() + Math.floor(Math.random() * 1000),
      numeroInterno: numero,             // CONECTAR AL SERVICIO
      tipo: this.fromParent.origen,
      entidad:{
          id: idInforme,                       // ID del cliente/chofer/proveedor
          razonSocial: razonSocial,                  // Nombre o razón social          
          cuit: cuit                  // Opcional, dependiendo si es persona física o no
      },      
      operaciones: this.idOperaciones,
      valores: valores,
      valoresFinancieros: {
        total: valores.total,
        totalCobrado: 0,
        saldo: valores.total,
      },
      cobrado:false,
      estado: 'emitido',
      estadoFinanciero: 'pendiente',
      columnas: colSel,
      descuentos: this.descuentosAplicados,
      formaPago: "",               // Efectivo, transferencia, etc. (opcional)
      fechaCobro: "",       // Fecha en que se registró el cobro

      observaciones: this.obsInterna,           // Campo libre para anotar algo manualmente

      facturaVinculada: "",        // ID o número de la factura fiscal (a futuro)      
      mes: this.mes,
      periodo: this.periodo,
      quincena: this.periodo === 'mes' ? '-' : this.getQuincenaLiq(this.facLiquidadas[0].fecha)

    }
  }

  getQuincenaLiq(fecha: string | Date): string {
    const fechaObj = new Date(fecha);
    const dia = fechaObj.getDate();
    return dia <= 15 ? '1° quincena' : '2° quincena';
  }

  abrirModalPeriodo(): void {
    const modalRef = this.modalService.open(PeriodoModalComponent, {
      size: 'sm',
      backdrop: 'static', // no cerrar al clickear afuera
      keyboard: false,     // no cerrar con ESC
      centered: true,
    });

    modalRef.result.then(
      (resultado: boolean) => {
        // true = Mes | false = Quincena
        console.log('Periodo seleccionado:', resultado);

        // acá hacés lo que necesites:
        this.periodoBoolean = resultado;
      },
      () => {
        // No debería entrar nunca acá
      }
    );
  }


}
