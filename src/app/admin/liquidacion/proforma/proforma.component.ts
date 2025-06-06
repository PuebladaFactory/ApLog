import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, take, takeUntil } from 'rxjs';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { FacturaChofer } from 'src/app/interfaces/factura-chofer';
import { FacturaCliente } from 'src/app/interfaces/factura-cliente';
import { FacturaProveedor } from 'src/app/interfaces/factura-proveedor';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { FacturaOp } from 'src/app/interfaces/factura-op';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { ModalFacturaComponent } from 'src/app/shared/modal-factura/modal-factura.component';
import Swal from 'sweetalert2';
import { Cliente } from 'src/app/interfaces/cliente';
import { Chofer } from 'src/app/interfaces/chofer';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { LogService } from 'src/app/servicios/log/log.service';
import { Operacion } from 'src/app/interfaces/operacion';
import { PdfService } from 'src/app/servicios/informes/pdf/pdf.service';

@Component({
    selector: 'app-proforma',
    templateUrl: './proforma.component.html',
    styleUrls: ['./proforma.component.scss'],
    standalone: false
})
export class ProformaComponent implements OnInit {
  
  proformasTodas!: any;
  proformasClientes!: ConIdType<FacturaCliente>[];
  proformasChoferes!: ConIdType<FacturaChofer>[];
  proformasProveedores!: ConIdType<FacturaProveedor>[];
  private destroy$ = new Subject<void>();
  filtroCliente:string = "";
  filtroChofer:string = "";
  filtroProveedor:string = "";
  isLoading: boolean = false;

  constructor(private storageService: StorageService, private modalService: NgbModal, private dbFirebase: DbFirestoreService, private excelServ: ExcelService, private logService: LogService, private pdfServ: PdfService ){}
  
  ngOnInit(): void {
    this.storageService.listenForChanges<any>("proforma");
    this.storageService.getObservable<ConIdType<any>>('proforma')
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
        .subscribe(data => {
          if(data){
            this.proformasTodas = data
            this.separarFacturas()
          }          
        });
          
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  separarFacturas() {
    
    this.proformasClientes = [];
    this.proformasChoferes = [];
    this.proformasProveedores = [];
  
    this.proformasTodas.forEach((factura:any) => {
      if ('idFacturaCliente' in factura) {
        this.proformasClientes.push(factura as ConIdType<FacturaCliente>);
      } else if ('idFacturaChofer' in factura) {
        this.proformasChoferes.push(factura as ConIdType<FacturaChofer>);
      } else if ('idFacturaProveedor' in factura) {
        this.proformasProveedores.push(factura as ConIdType<FacturaProveedor>);
      }
    });
    //console.log("this.proformasClientes", this.proformasClientes);
    //console.log("this.proformasChoferes", this.proformasChoferes);
    //console.log("this.proformasProveedores", this.proformasProveedores);
      
    this.proformasClientes = this.proformasClientes.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));
    this.proformasChoferes = this.proformasChoferes.sort((a, b) => a.apellido.localeCompare(b.apellido));
    this.proformasProveedores = this.proformasProveedores.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));
    
  }

  detalleProforma(proforma:any, origen: string, accion:string){
    //console.log("origen: ", origen);
    //console.log("proforma: ", proforma);
    
    let respuesta:any;
    respuesta = this.encontrarMaximoYMinimo(proforma.operaciones)
    //console.log("respuesta", respuesta);
    this.obtenerFacturasOp(proforma, origen, accion, '')
      
  }


  encontrarMaximoYMinimo(operaciones: number[]): { max: number, min: number } {
    if (operaciones.length === 0) {
      throw new Error("El array de operaciones está vacío.");
    }
  
    let max = operaciones[0]; // Inicializamos con el primer valor del array
    let min = operaciones[0]; // Inicializamos con el primer valor del array
  
    for (let i = 1; i < operaciones.length; i++) {
      if (operaciones[i] > max) {
        max = operaciones[i]; // Actualizamos el máximo si encontramos un valor mayor
      }
      if (operaciones[i] < min) {
        min = operaciones[i]; // Actualizamos el mínimo si encontramos un valor menor
      }
    }
  
    return { max, min }; // Devolvemos un objeto con el máximo y el mínimo
  }

  obtenerFacturasOp(proforma:any, origen: string, accion:string, tipo:string){
    let facturasOp: ConIdType<FacturaOp>[];
    let respuesta:any;
    
    respuesta = this.encontrarMaximoYMinimo(proforma.operaciones)
    //console.log("respuesta", respuesta);
    
    let clientes = this.storageService.loadInfo("clientes");
    let choferes = this.storageService.loadInfo("choferes");
    switch (origen){
    
      //////////////CLIENTES///////////////////////
      case "clientes":
          this.dbFirebase.getAllByDateValueField<ConIdType<FacturaOp>>("facturaOpCliente", "idOperacion",respuesta.min, respuesta.max, "idCliente", proforma.idCliente)
          .pipe(take(1)) // Toma los valores hasta que destroy$ emita
          .subscribe(data => {
            if(data){
              //console.log("data facturaOpCliente", data);              
              facturasOp = data.filter((fac) => {
                return proforma.operaciones.includes(fac.idOperacion);
              });
              //console.log("3) operacionFac!!!!: ", facturasOp);          
              if(accion === "vista"){
                  this.openModalDetalleFactura(proforma, facturasOp, origen);
              } else if (accion === "baja"){
                this.isLoading = true;
                this.dbFirebase.anularProforma(facturasOp, "clientes", "facturaOpCliente", proforma, "proforma").then((result)=>{
                  this.isLoading = false;
                    console.log("resultado: ", result);
                    if(result.exito){
                      this.storageService.logSimple(proforma.idFacturaCliente,"BAJA", "proforma", `Baja de proforma N° ${proforma.idFacturaCliente} del Cliente ${this.getCliente(proforma.idCliente)}`, result.exito )
                      Swal.fire({
                        icon: "success",
                        //title: "Oops...",
                        text: 'La proforma se anuló con éxito.',
                        confirmButtonColor: "#3085d6",
                        confirmButtonText: "Confirmar",
                        //footer: `${msj}`
                      })
                    }
                });
              } else if (accion === "reimpresion"){
                if(tipo === 'excel'){
                    this.excelServ.exportToExcelCliente(proforma, facturasOp, clientes, choferes, 'proforma');
                    this.logService.logEvent("REIMPRESION", "proforma", `Reimpresion de la proforma del Cliente ${proforma.razonSocial}`, proforma.idFacturaCliente, true);
                }else if (tipo === 'pdf'){
                    this.pdfServ.exportToPdfCliente(proforma, facturasOp, clientes, choferes, 'proforma');
                    this.logService.logEvent("REIMPRESION", "proforma", `Reimpresion de la proforma del Cliente ${proforma.razonSocial}`, proforma.idFacturaCliente, true);
                }
                
                

              } else if( accion === 'facturar'){
                this.facturarProforma(proforma, facturasOp, clientes, choferes, origen)
                
              }

            }
          })
          
          ////console.log("3) operacionFac: ", this.operacionFac);          
          break;
      //////////////CHOFERES///////////////////////
      case "choferes":
                  
          this.dbFirebase.getAllByDateValueField<ConIdType<FacturaOp>>("facturaOpChofer", "idOperacion",respuesta.min, respuesta.max, "idChofer", proforma.idChofer)
          .pipe(take(1)) // Toma los valores hasta que destroy$ emita
          .subscribe(data => {
            if(data){
              //console.log("data facturaOpChofer", data);              
              facturasOp = data.filter((fac) => {
                return proforma.operaciones.includes(fac.idOperacion);
              });
              //console.log("3) operacionFac!!!!: ", facturasOp);          
              if(accion === "vista"){
                  this.openModalDetalleFactura(proforma, facturasOp, origen);
              } else if (accion === "baja"){
                this.isLoading = true;   
                this.dbFirebase.anularProforma(facturasOp, "choferes", "facturaOpChofer", proforma, "proforma").then((result)=>{
                  this.isLoading = false;
                    console.log("resultado: ", result);
                    if(result.exito){
                      this.storageService.logSimple(proforma.idFacturaChofer,"BAJA", "proforma", `Baja de proforma N° ${proforma.idFacturaChofer} del Chofer ${this.getChofer(proforma.idChofer)}`, result.exito )
                      Swal.fire({
                        icon: "success",
                        //title: "Oops...",
                        text: 'La proforma se anuló con éxito.',
                        confirmButtonColor: "#3085d6",
                        confirmButtonText: "Confirmar",
                        //footer: `${msj}`
                      })
                    }
                });                             
              } else if (accion === "reimpresion"){
                if(tipo === 'excel'){
                  this.excelServ.exportToExcelChofer(proforma, facturasOp, clientes, choferes, 'proforma');
                  this.logService.logEvent("REIMPRESION", "proforma", `Reimpresion de la proforma del Chofer ${proforma.apellido} ${proforma.nombre}`, proforma.idFacturaChofer, true);
                }else if (tipo === 'pdf'){
                  this.pdfServ.exportToPdfChofer(proforma, facturasOp, clientes, choferes, 'proforma');
                  this.logService.logEvent("REIMPRESION", "proforma", `Reimpresion de la proforma del Chofer ${proforma.apellido} ${proforma.nombre}`, proforma.idFacturaChofer, true);                  
                }
                
                
              
              } else if( accion === 'facturar'){
                this.facturarProforma(proforma, facturasOp, clientes, choferes, origen)
                //this.storageService.addItem("facturaCliente", prof, prof.idFacturaCliente, "ALTA", `Alta de Factura de Cliente ${prof.razonSocial}`);        
                
                //this.storageService.deleteItem("proforma", proforma, proforma.idFacturaCliente, "BAJA", `Baja de proforma N° ${proforma.idFacturaCliente} del Cliente ${this.getCliente(proforma.idCliente)}`)
                
                
              }

            }
          })
       
          break;
      //////////////PROVEEDORES///////////////////////
      case "proveedores":       
        
        this.dbFirebase.getAllByDateValueField<ConIdType<FacturaOp>>("facturaOpProveedor", "idOperacion",respuesta.min, respuesta.max, "idProveedor", proforma.idProveedor)
        .pipe(take(1)) // Toma los valores hasta que destroy$ emita
        .subscribe(data => {
          if(data){
            //console.log("data facturaOpProveedor", data);              
            facturasOp = data.filter((fac) => {
              return proforma.operaciones.includes(fac.idOperacion);
            });
            //console.log("3) operacionFac!!!!: ", facturasOp);          
            if(accion === "vista"){
                this.openModalDetalleFactura(proforma, facturasOp, origen);
            } else if (accion === "baja"){  
              this.isLoading = true;   
                this.dbFirebase.anularProforma(facturasOp, "proveedores", "facturaOpProveedor", proforma, "proforma").then((result)=>{
                  this.isLoading = false;
                    console.log("resultado: ", result);
                    if(result.exito){
                      this.storageService.logSimple(proforma.idFacturaProveedor,"BAJA", "proforma", `Baja de proforma N° ${proforma.idFacturaProveedor} del Proveedor ${this.getProveedor(proforma.idProveedor)}`, result.exito )
                      Swal.fire({
                        icon: "success",
                        //title: "Oops...",
                        text: 'La proforma se anuló con éxito.',
                        confirmButtonColor: "#3085d6",
                        confirmButtonText: "Confirmar",
                        //footer: `${msj}`
                      })
                    }
                });      
            } else if (accion === "reimpresion"){
              if(tipo === 'excel'){
                this.excelServ.exportToExcelProveedor(proforma, facturasOp, clientes, choferes, 'proforma');              
                this.logService.logEvent("REIMPRESION", "proforma", `Reimpresion de la proforma del Proveedor ${proforma.razonSocial}`, proforma.idFacturaProveedor, true);
              }else if (tipo === 'pdf'){
                this.pdfServ.exportToPdfProveedor(proforma, facturasOp, clientes, choferes, 'proforma');
                this.logService.logEvent("REIMPRESION", "proforma", `Reimpresion de la proforma del Proveedor ${proforma.razonSocial}`, proforma.idFacturaProveedor, true);
              }
            
            } else if( accion === 'facturar'){
              this.facturarProforma(proforma, facturasOp, clientes, choferes, origen)
              //this.storageService.addItem("facturaCliente", prof, prof.idFacturaCliente, "ALTA", `Alta de Factura de Cliente ${prof.razonSocial}`);        
              
              //this.storageService.deleteItem("proforma", proforma, proforma.idFacturaCliente, "BAJA", `Baja de proforma N° ${proforma.idFacturaCliente} del Cliente ${this.getCliente(proforma.idCliente)}`)
              
              
            }
          }
        })        
          
      break;
      default:
        alert("error de reimpresion")
      break;
    }
  }

  openModalDetalleFactura(factura:any, facturasOp: FacturaOp[], origen:string){
    //console.log("lega??");
    
      {
        const modalRef = this.modalService.open(ModalFacturaComponent, {
          windowClass: 'myCustomModalClass',
          centered: true,
          scrollable: true, 
          size: 'lg',     
        });       
        //console.log("factura",factura);
        let info = {
          modo: "proforma",
          item: factura,
          tipo: origen,
          facOp: facturasOp
        }  
        
        modalRef.componentInstance.fromParent = info;
      
        modalRef.result.then(
          (result) => {
        
          },
          (reason) => {}
        );
      }
    }

    procesarProforma(proforma:any, origen:string, accion:string){
      let titulo:string = origen === 'clientes' ? 'Cliente' : origen === 'choferes' ? 'Chofer' : 'Proveedor';
      let objeto:string = origen === 'clientes' ? this.getCliente(proforma.idCliente) : origen === 'choferes' ? this.getChofer(proforma.idChofer) : this.getProveedor(proforma.idProveedor);
      let id: number = origen === 'clientes' ? proforma.idFacturaCliente : origen === 'choferes' ? proforma.idFacturaChofer : proforma.idFacturaProveedor;
      let proceso: string = accion === 'baja' ? 'anular' : 'facturar' 
      //console.log("proceso", proceso);
      
      Swal.fire({
        title: `¿Desea ${proceso} la proforma N° ${id} del ${titulo} ${objeto}?`,
        text: `${accion === 'baja' ? 'Esta acción revertirá las operaciones al modulo Liquidación' : ''}`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Confirmar",
        cancelButtonText: "Cancelar"
      }).then((result) => {
        if (result.isConfirmed) {
          this.obtenerFacturasOp(proforma, origen, accion, '')
        
        }
      });
    }

    
  getCliente(idCliente: number){
    let clientes: ConIdType<Cliente> [] = this.storageService.loadInfo('clientes')
    let cliente: ConIdType<Cliente> []
    cliente = clientes.filter((cliente:ConIdType<Cliente>)=>{
      return cliente.idCliente === idCliente
    })
    if(cliente[0]){
      return cliente[0].razonSocial;
    } else {
      return `Cliente dado de baja. idChofer ${idCliente}`;
    }


  } 

  getChofer(idChofer: number){
  let choferes: ConIdType<Chofer>[] = this.storageService.loadInfo('choferes')
  let chofer: ConIdType<Chofer>[]
    chofer = choferes.filter((chofer:Chofer)=>{
      return chofer.idChofer === idChofer;
    })
    if(chofer[0]){
      return chofer[0].apellido + " " + chofer[0].nombre; 
    } else {
      return `Chofer dado de baja. idChofer ${idChofer}`;
    }

  }

  getProveedor(idProveedor: number){
    let proveedores: ConIdType<Proveedor> [] = this.storageService.loadInfo('proveedores')
    let proveedor: Proveedor []
    proveedor = proveedores.filter((proveedor:Proveedor)=>{
      return proveedor.idProveedor === idProveedor;
    })
    if(proveedor[0]){
      return proveedor[0].razonSocial;
    } else {
      return `Proveedor dado de baja. idChofer ${idProveedor}`;
    }

  }

   editarOperacionesFac(factura:FacturaOp, componente:string){
     //console.log("editarOperacionesFac",factura);
     //factura.idOperacion
     let op:ConId<Operacion>;
     this.dbFirebase
     .obtenerTarifaIdTarifa("operaciones",factura.idOperacion, "idOperacion")
     .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
     .subscribe(data => {      
         op = data;
         //console.log("OP LIQUIDADA: ", op);
         op.estado = {
           abierta: false,
           cerrada: false,
           facCliente: componente === "facturaOpCliente" ? true : op.estado.facCliente,
           facChofer: componente === "facturaOpChofer" || componente === "facturaOpProveedor" ? true : op.estado.facChofer,
           facturada: componente === "facturaOpCliente" && op.estado.facChofer ? true : componente === "facturaOpChofer" && op.estado.facCliente ? true : componente === "facturaOpProveedor" && op.estado.facCliente ? true : false,
           proformaCl: op.estado.proformaCl,
           proformaCh: op.estado.proformaCh,
         }
         let {id, ...opp} = op
         this.storageService.updateItem("operaciones", opp, op.idOperacion, "LIQUIDAR", `Operación de Cliente ${op.cliente.razonSocial} Liquidada`, op.id);
         this.removeItem(factura, componente);
     });
 
   }
 
   removeItem(item:any, componente:string){
 
     //console.log("llamada al storage desde liq-cliente, deleteItem", item);
     this.storageService.deleteItem(componente, item, item.idFacturaOp, "INTERNA", "");    
 
   }

   facturarProforma(proforma:any, facturasOp: ConIdType<FacturaOp>[], clientes:any, choferes:any, origen:string){
    let {id,type, ...prof} = proforma;
    let facOpColeccion: string = origen === 'clientes' ? 'facturaOpCliente' : origen === 'choferes' ? 'facturaOpChofer' : origen === 'proveedores' ? 'facturaOpProveedor' : '';
    let facOpLiqColeccion: string = origen === 'clientes' ? 'facOpLiqCliente' : origen === 'choferes' ? 'facOpLiqChofer' : origen === 'proveedores' ? 'facOpLiqProveedor' : '';
    let facturaColeccion: string = origen === 'clientes' ? 'facturaCliente' : origen === 'choferes' ? 'facturaChofer' : origen === 'proveedores' ? 'facturaProveedor' : '';
    let msjAlta: string = origen === 'clientes' ? `Alta de Factura de Cliente ${prof.razonSocial}` : origen === 'choferes' ? `Alta de Factura de Chofer ${prof.apellido} ${prof.nombre}` : origen === 'proveedores' ? `Alta de Factura de Proveedor ${prof.razonSocial}` : '';
    let idFactura: number = origen === 'clientes' ? proforma.idFacturaCliente : origen === 'choferes' ? proforma.idFacturaChofer : origen === 'proveedores' ? proforma.idFacturaProveedor : 0;
    this.procesarFacturacion(facturasOp, origen,facOpLiqColeccion,facOpColeccion,proforma,facturaColeccion, clientes, choferes)
    /* Swal.fire({
      title: '¿Desea generar la liquidación de la proforma seleccionada?',
      text: "Esta acción no se podrá revertir",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        

        
      }
    });   */
   }

   descargarFactura(proforma:any, facturasOp: ConId<FacturaOp>[], origen:string, clientes: any, choferes: any){
      let titulo:string = origen === 'clientes' ? 'Cliente' : origen === 'choferes' ? 'Chofer' : 'Proveedor'
      Swal.fire({
            title: `¿Desea imprimir el detalle del ${titulo}?`,
            //text: "You won't be able to revert this!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Confirmar",
            cancelButtonText: "Cancelar"
          }).then((result) => {
            if (result.isConfirmed) {  
              switch(origen){
                case 'clientes':
                  this.excelServ.exportToExcelCliente(proforma, facturasOp, clientes, choferes, 'factura');
                  break;
                case 'choferes':
                  this.excelServ.exportToExcelChofer(proforma, facturasOp, clientes, choferes, 'factura');
                  break;
                case 'proveedores':
                  this.excelServ.exportToExcelProveedor(proforma, facturasOp, clientes, choferes, 'factura');
                  break;
                default:
                  break;
              }   
              
            }
          });   

                
   }

   procesarFacturacion(facturasOp: ConId<FacturaOp>[], modo:string, compAlta: string, compBaja:string, factura:any, compFactura:string, clientes: any, choferes: any) {
     this.isLoading = true;
     let detalleNombre: string = modo === "clientes" ? "Cliente" : modo === "choferes" ? "Chofer" : "Proveedor"
     let detalleValor: string = modo === "clientes" ? factura.razonSocial : modo === "choferes" ? factura.apellido + " " + factura.nombre : factura.razonSocial;
     let idFactura: number = modo === "clientes" ? factura.idFacturaCliente : modo === "choferes" ? factura.idFacturaChofer : factura.idFacturaProveedor;
     this.dbFirebase.procesarLiquidacion(facturasOp, modo, compAlta, compBaja, factura, compFactura)
       .then((result) => {
         this.isLoading = false;
         console.log("resultado: ", result);
         if(result.exito){
             this.storageService.logMultiplesOp(factura.operaciones, "LIQUIDAR", "operaciones", `Operación del ${detalleNombre} ${detalleValor} Liquidada`,result.exito)
             this.storageService.logSimple(idFactura,"ALTA", compFactura, `Alta de Factura del ${detalleNombre} ${detalleValor}`, result.exito )
             this.storageService.deleteItem("proforma", factura, idFactura, "INTERNA", ``)
             Swal.fire({
                   icon: "success",
                   //title: "Oops...",
                   text: 'La liquidación se procesó con éxito.',
                   confirmButtonColor: "#3085d6",
                   confirmButtonText: "Confirmar",
                   //footer: `${msj}`
                 }).then(() => {
                     this.descargarFactura(factura, facturasOp, modo, clientes, choferes )  
                 });
         } else {
            this.storageService.logMultiplesOp(factura.operaciones, "LIQUIDAR", "operaciones", `Operación del ${detalleNombre} ${detalleValor} Liquidada`,result.exito)
            this.storageService.logSimple(idFactura,"ALTA", compFactura, `Alta de Factura del ${detalleNombre} ${detalleValor}`, result.exito )
            this.storageService.deleteItem("proforma", factura, idFactura, "INTERNA", ``)
           this.mensajesError(`Ocurrió un error al procesar la facturación: ${result.mensaje}`, "error");
         }
         
        
       })
       .catch((error) => {
         this.isLoading = false;
         console.error(error);
         this.mensajesError('Ocurrió un error al procesar la facturación.', "error");
       });
   }

   mensajesError(msj:string, resultado:string){
       Swal.fire({
         icon: resultado === 'error' ? "error" : "success",
         //title: "Oops...",
         text: `${msj}`
         //footer: `${msj}`
       });
     }

}
