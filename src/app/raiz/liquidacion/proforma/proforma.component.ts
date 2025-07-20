import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, take, takeUntil } from 'rxjs';
import { ConId, ConIdType } from 'src/app/interfaces/conId';



import { StorageService } from 'src/app/servicios/storage/storage.service';

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
import { InformeOp } from 'src/app/interfaces/informe-op';
import { InformeLiq } from 'src/app/interfaces/informe-liq';
import { NumeradorService } from 'src/app/servicios/numerador/numerador.service';

@Component({
    selector: 'app-proforma',
    templateUrl: './proforma.component.html',
    styleUrls: ['./proforma.component.scss'],
    standalone: false
})
export class ProformaComponent implements OnInit {
  
  proformasTodas!: any;
  proformasClientes!: ConIdType<InformeLiq>[];
  proformasChoferes!: ConIdType<InformeLiq>[];
  proformasProveedores!: ConIdType<InformeLiq>[];
  private destroy$ = new Subject<void>();
  filtroCliente:string = "";
  filtroChofer:string = "";
  filtroProveedor:string = "";
  isLoading: boolean = false;
  informesOp: ConIdType<InformeOp>[] = [];

  constructor(
    private storageService: StorageService, 
    private modalService: NgbModal, 
    private dbFirebase: DbFirestoreService, 
    private excelServ: ExcelService, 
    private logService: LogService, 
    private pdfServ: PdfService,
    private numeradorService :NumeradorService
  ){}
  
  ngOnInit(): void {
    this.storageService.listenForChanges<any>("proforma");
    this.storageService.getObservable<ConIdType<any>>('proforma')
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
        .subscribe(data => {
          if(data){
            this.proformasTodas = data
            console.log("proformasTodas", this.proformasTodas);
            
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
  
    this.proformasTodas.forEach((factura:ConIdType<InformeLiq>) => {
      if (factura.tipo === 'cliente') {
        this.proformasClientes.push(factura as ConIdType<InformeLiq>);
      } else if (factura.tipo === 'chofer') {
        this.proformasChoferes.push(factura as ConIdType<InformeLiq>);
      } else if (factura.tipo === 'proveedor') {
        this.proformasProveedores.push(factura as ConIdType<InformeLiq>);
      }
    });
    console.log("this.proformasClientes", this.proformasClientes);
    console.log("this.proformasChoferes", this.proformasChoferes);
    console.log("this.proformasProveedores", this.proformasProveedores);
      
    this.proformasClientes = this.proformasClientes.sort((a, b) => a.entidad.razonSocial.localeCompare(b.entidad.razonSocial));
    this.proformasChoferes = this.proformasChoferes.sort((a, b) => a.entidad.razonSocial.localeCompare(b.entidad.razonSocial));
    this.proformasProveedores = this.proformasProveedores.sort((a, b) => a.entidad.razonSocial.localeCompare(b.entidad.razonSocial));
    
  }

  detalleProforma(proforma:any, origen: string, accion:string){
    ////console.log("origen: ", origen);
    ////console.log("proforma: ", proforma);
    
    //let respuesta:any;
    //respuesta = this.encontrarMaximoYMinimo(proforma.operaciones)
    ////console.log("respuesta", respuesta);
    this.obtenerFacturasOp(proforma, origen, accion, '')
      
  }


/*   encontrarMaximoYMinimo(operaciones: number[]): { max: number, min: number } {
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
  } */

  async obtenerFacturasOp(proforma:ConIdType<InformeLiq>, origen: string, accion:string, tipo:string){
    let facturasOp: ConIdType<InformeOp>[];
    let respuesta:any;
    await this.consultarOperacionesSeleccionadas(proforma, origen)
    console.log("this.informesOp", this.informesOp);
    
    //respuesta = this.encontrarMaximoYMinimo(proforma.operaciones)
    //console.log("respuesta", respuesta);
    
    let clientes = this.storageService.loadInfo("clientes");
    let choferes = this.storageService.loadInfo("choferes");
    switch (origen){
    
      //////////////CLIENTES///////////////////////
      case "cliente":
        if(accion === "vista"){
                  this.openModalDetalleFactura(proforma, this.informesOp, origen);
              } else if (accion === "baja"){
                this.isLoading = true;
                this.dbFirebase.anularProforma(this.informesOp, "cliente", "informesOpClientes", proforma, "proforma").then((result)=>{
                  this.isLoading = false;
                    //console.log("resultado: ", result);
                    if(result.exito){
                      this.storageService.logSimple(proforma.idInfLiq,"BAJA", "proforma", `Baja de proforma N° ${proforma.idInfLiq} del Cliente ${this.getCliente(proforma.entidad.id)}`, result.exito )
                      Swal.fire({
                        icon: "success",
                        //title: "Oops...",
                        text: 'La proforma se anuló con éxito.',
                        confirmButtonColor: "#3085d6",
                        confirmButtonText: "Confirmar",
                        //footer: `${msj}`
                      })
                    } else {
                      this.mensajesError(`error en anular proforma: ${result.mensaje}`, "error")
                    }
                });
              } else if (accion === "reimpresion"){
                if(tipo === 'excel'){
                    this.excelServ.exportToExcelInforme(proforma, this.informesOp, clientes, choferes, 'proforma');
                    this.logService.logEvent("REIMPRESION", "proforma", `Reimpresion de la proforma del Cliente ${proforma.entidad.razonSocial}`, proforma.idInfLiq, true);
                }else if (tipo === 'pdf'){
                    this.pdfServ.exportToPdfInforme(proforma, this.informesOp, clientes, choferes, 'proforma');
                    this.logService.logEvent("REIMPRESION", "proforma", `Reimpresion de la proforma del Cliente ${proforma.entidad.razonSocial}`, proforma.idInfLiq, true);
                }
                
                

              } else if( accion === 'facturar'){
                this.facturarProforma(proforma, this.informesOp, clientes, choferes, origen, tipo)                
              }

/*           this.dbFirebase.getAllByDateValueField<ConIdType<InformeOp>>("informesOpClientes", "idOperacion",respuesta.min, respuesta.max, "idCliente", proforma.entidad.id)
          .pipe(take(1)) // Toma los valores hasta que destroy$ emita
          .subscribe(data => {
            if(data){
              ////console.log("data facturaOpCliente", data);              
              facturasOp = data.filter((fac) => {
                return proforma.operaciones.includes(fac.idOperacion);
              });
              ////console.log("3) operacionFac!!!!: ", facturasOp);          
              if(accion === "vista"){
                  this.openModalDetalleFactura(proforma, facturasOp, origen);
              } else if (accion === "baja"){
                this.isLoading = true;
                this.dbFirebase.anularProforma(facturasOp, "cliente", "informesOpClientes", proforma, "proforma").then((result)=>{
                  this.isLoading = false;
                    //console.log("resultado: ", result);
                    if(result.exito){
                      this.storageService.logSimple(proforma.idInfLiq,"BAJA", "proforma", `Baja de proforma N° ${proforma.idInfLiq} del Cliente ${this.getCliente(proforma.entidad.id)}`, result.exito )
                      Swal.fire({
                        icon: "success",
                        //title: "Oops...",
                        text: 'La proforma se anuló con éxito.',
                        confirmButtonColor: "#3085d6",
                        confirmButtonText: "Confirmar",
                        //footer: `${msj}`
                      })
                    } else {
                      this.mensajesError(`error en anular proforma: ${result.mensaje}`, "error")
                    }
                });
              } else if (accion === "reimpresion"){
                if(tipo === 'excel'){
                    this.excelServ.exportToExcelInforme(proforma, facturasOp, clientes, choferes, 'proforma');
                    this.logService.logEvent("REIMPRESION", "proforma", `Reimpresion de la proforma del Cliente ${proforma.entidad.razonSocial}`, proforma.idInfLiq, true);
                }else if (tipo === 'pdf'){
                    this.pdfServ.exportToPdfInforme(proforma, facturasOp, clientes, choferes, 'proforma');
                    this.logService.logEvent("REIMPRESION", "proforma", `Reimpresion de la proforma del Cliente ${proforma.entidad.razonSocial}`, proforma.idInfLiq, true);
                }
                
                

              } else if( accion === 'facturar'){
                this.facturarProforma(proforma, facturasOp, clientes, choferes, origen, tipo)                
              }
            }
          })  */         
          //////console.log("3) operacionFac: ", this.operacionFac);          
          break;
      //////////////CHOFERES///////////////////////
      case "chofer":

                    if(accion === "vista"){
                  this.openModalDetalleFactura(proforma, this.informesOp, origen);
              } else if (accion === "baja"){
                this.isLoading = true;   
                this.dbFirebase.anularProforma(this.informesOp, "chofer", "informesOpChoferes", proforma, "proforma").then((result)=>{
                  this.isLoading = false;
                    //console.log("resultado: ", result);
                    if(result.exito){
                      this.storageService.logSimple(proforma.idInfLiq,"BAJA", "proforma", `Baja de proforma N° ${proforma.idInfLiq} del Chofer ${this.getChofer(proforma.entidad.id)}`, result.exito )
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
                  this.excelServ.exportToExcelInforme(proforma, this.informesOp, clientes, choferes, 'proforma');
                  this.logService.logEvent("REIMPRESION", "proforma", `Reimpresion de la proforma del Chofer ${proforma.entidad.razonSocial}`, proforma.idInfLiq, true);
                }else if (tipo === 'pdf'){
                  this.pdfServ.exportToPdfInforme(proforma, this.informesOp, clientes, choferes, 'proforma');
                  this.logService.logEvent("REIMPRESION", "proforma", `Reimpresion de la proforma del Chofer ${proforma.entidad.razonSocial}`, proforma.idInfLiq, true);                  
                }
                
                
              
              } else if( accion === 'facturar'){
                this.facturarProforma(proforma, this.informesOp, clientes, choferes, origen, tipo)
                //this.storageService.addItem("facturaCliente", prof, prof.idFacturaCliente, "ALTA", `Alta de Factura de Cliente ${prof.razonSocial}`);        
                
                //this.storageService.deleteItem("proforma", proforma, proforma.idFacturaCliente, "BAJA", `Baja de proforma N° ${proforma.idFacturaCliente} del Cliente ${this.getCliente(proforma.idCliente)}`)
                
                
              }
                  
          /* this.dbFirebase.getAllByDateValueField<ConIdType<InformeOp>>("informesOpChoferes", "idOperacion",respuesta.min, respuesta.max, "idChofer", proforma.entidad.id)
          .pipe(take(1)) // Toma los valores hasta que destroy$ emita
          .subscribe(data => {
            if(data){
              ////console.log("data facturaOpChofer", data);              
              facturasOp = data.filter((fac) => {
                return proforma.operaciones.includes(fac.idOperacion);
              });
              ////console.log("3) operacionFac!!!!: ", facturasOp);          
              if(accion === "vista"){
                  this.openModalDetalleFactura(proforma, facturasOp, origen);
              } else if (accion === "baja"){
                this.isLoading = true;   
                this.dbFirebase.anularProforma(facturasOp, "chofer", "informesOpChoferes", proforma, "proforma").then((result)=>{
                  this.isLoading = false;
                    //console.log("resultado: ", result);
                    if(result.exito){
                      this.storageService.logSimple(proforma.idInfLiq,"BAJA", "proforma", `Baja de proforma N° ${proforma.idInfLiq} del Chofer ${this.getChofer(proforma.entidad.id)}`, result.exito )
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
                  this.excelServ.exportToExcelInforme(proforma, facturasOp, clientes, choferes, 'proforma');
                  this.logService.logEvent("REIMPRESION", "proforma", `Reimpresion de la proforma del Chofer ${proforma.entidad.razonSocial}`, proforma.idInfLiq, true);
                }else if (tipo === 'pdf'){
                  this.pdfServ.exportToPdfInforme(proforma, facturasOp, clientes, choferes, 'proforma');
                  this.logService.logEvent("REIMPRESION", "proforma", `Reimpresion de la proforma del Chofer ${proforma.entidad.razonSocial}`, proforma.idInfLiq, true);                  
                }
                
                
              
              } else if( accion === 'facturar'){
                this.facturarProforma(proforma, facturasOp, clientes, choferes, origen, tipo)
                //this.storageService.addItem("facturaCliente", prof, prof.idFacturaCliente, "ALTA", `Alta de Factura de Cliente ${prof.razonSocial}`);        
                
                //this.storageService.deleteItem("proforma", proforma, proforma.idFacturaCliente, "BAJA", `Baja de proforma N° ${proforma.idFacturaCliente} del Cliente ${this.getCliente(proforma.idCliente)}`)
                
                
              }

            }
          }) */
       
          break;
      //////////////PROVEEDORES///////////////////////
      case "proveedor":    
      
                  if(accion === "vista"){
                this.openModalDetalleFactura(proforma, this.informesOp, origen);
            } else if (accion === "baja"){  
              this.isLoading = true;   
                this.dbFirebase.anularProforma(this.informesOp, "proveedor", "informesOpProveedores", proforma, "proforma").then((result)=>{
                  this.isLoading = false;
                    //console.log("resultado: ", result);
                    if(result.exito){
                      this.storageService.logSimple(proforma.idInfLiq,"BAJA", "proforma", `Baja de proforma N° ${proforma.idInfLiq} del Proveedor ${this.getProveedor(proforma.entidad.id)}`, result.exito )
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
                this.excelServ.exportToExcelInforme(proforma, this.informesOp, clientes, choferes, 'proforma');              
                this.logService.logEvent("REIMPRESION", "proforma", `Reimpresion de la proforma del Proveedor ${proforma.entidad.razonSocial}`, proforma.idInfLiq, true);
              }else if (tipo === 'pdf'){
                this.pdfServ.exportToPdfInforme(proforma, this.informesOp, clientes, choferes, 'proforma');
                this.logService.logEvent("REIMPRESION", "proforma", `Reimpresion de la proforma del Proveedor ${proforma.entidad.razonSocial}`, proforma.idInfLiq, true);
              }
            
            } else if( accion === 'facturar'){
              this.facturarProforma(proforma, this.informesOp, clientes, choferes, origen, tipo)
              //this.storageService.addItem("facturaCliente", prof, prof.idFacturaCliente, "ALTA", `Alta de Factura de Cliente ${prof.razonSocial}`);        
              
              //this.storageService.deleteItem("proforma", proforma, proforma.idFacturaCliente, "BAJA", `Baja de proforma N° ${proforma.idFacturaCliente} del Cliente ${this.getCliente(proforma.idCliente)}`)
              
              
            }
        
       /*  this.dbFirebase.getAllByDateValueField<ConIdType<InformeOp>>("informesOpProveedores", "idOperacion",respuesta.min, respuesta.max, "idProveedor", proforma.entidad.id)
        .pipe(take(1)) // Toma los valores hasta que destroy$ emita
        .subscribe(data => {
          if(data){
            ////console.log("data facturaOpProveedor", data);              
            facturasOp = data.filter((fac) => {
              return proforma.operaciones.includes(fac.idOperacion);
            });
            ////console.log("3) operacionFac!!!!: ", facturasOp);          
            if(accion === "vista"){
                this.openModalDetalleFactura(proforma, facturasOp, origen);
            } else if (accion === "baja"){  
              this.isLoading = true;   
                this.dbFirebase.anularProforma(facturasOp, "proveedor", "informesOpProveedores", proforma, "proforma").then((result)=>{
                  this.isLoading = false;
                    //console.log("resultado: ", result);
                    if(result.exito){
                      this.storageService.logSimple(proforma.idInfLiq,"BAJA", "proforma", `Baja de proforma N° ${proforma.idInfLiq} del Proveedor ${this.getProveedor(proforma.entidad.id)}`, result.exito )
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
                this.excelServ.exportToExcelInforme(proforma, facturasOp, clientes, choferes, 'proforma');              
                this.logService.logEvent("REIMPRESION", "proforma", `Reimpresion de la proforma del Proveedor ${proforma.entidad.razonSocial}`, proforma.idInfLiq, true);
              }else if (tipo === 'pdf'){
                this.pdfServ.exportToPdfInforme(proforma, facturasOp, clientes, choferes, 'proforma');
                this.logService.logEvent("REIMPRESION", "proforma", `Reimpresion de la proforma del Proveedor ${proforma.entidad.razonSocial}`, proforma.idInfLiq, true);
              }
            
            } else if( accion === 'facturar'){
              this.facturarProforma(proforma, facturasOp, clientes, choferes, origen, tipo)
              //this.storageService.addItem("facturaCliente", prof, prof.idFacturaCliente, "ALTA", `Alta de Factura de Cliente ${prof.razonSocial}`);        
              
              //this.storageService.deleteItem("proforma", proforma, proforma.idFacturaCliente, "BAJA", `Baja de proforma N° ${proforma.idFacturaCliente} del Cliente ${this.getCliente(proforma.idCliente)}`)
              
              
            }
          }
        })         */
          
      break;
      default:
        alert("error de reimpresion")
      break;
    }
  }

  async consultarOperacionesSeleccionadas(proforma:ConId<InformeLiq>, origen:string) {
/*     if (!this.operaciones || this.operaciones.length === 0) {
      Swal.fire('Error', 'No hay operaciones seleccionadas.', 'error');
      return;
    } */

    this.isLoading = true;
    let componente: string = origen === 'cliente' ? "informesOpClientes" : origen === 'chofer' ? "informesOpChoferes" : "informesOpProveedores"
    try {
      const consulta = await this.dbFirebase.obtenerDocsPorIdsOperacion(       
        componente,         // nombre de la colección
        proforma.operaciones       // array de idsOperacion
      );
      console.log("consulta", consulta);
      

      this.informesOp = consulta.encontrados;

      if (consulta.idsFaltantes.length) {
        Swal.fire({
          icon: 'warning',
          title: 'Atención',
          text: `Se encontraron ${consulta.encontrados.length} informes, pero faltan ${consulta.idsFaltantes.length}.`,
          footer: `IDs faltantes: ${consulta.idsFaltantes.join(', ')}`
        });
      } else {
        //Swal.fire('Éxito', 'Se encontraron todas las operaciones.', 'success');
      }

    } catch (error) {
      console.error("'Error al consultar por los informes", error);
      Swal.fire('Error', 'Falló la consulta de los informes.', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  openModalDetalleFactura(factura:any, facturasOp: InformeOp[], origen:string){
    //console.log("lega??");
    
      {
        const modalRef = this.modalService.open(ModalFacturaComponent, {
          windowClass: 'myCustomModalClass',
          centered: true,
          scrollable: true, 
          size: 'lg',     
        });       
        ////console.log("factura",factura);
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

    procesarProforma(proforma:ConIdType<InformeLiq>, origen:string, accion:string, tipo:string){
      let titulo:string = origen === 'cliente' ? 'Cliente' : origen === 'chofer' ? 'Chofer' : 'Proveedor';
      let objeto:string = origen === 'cliente' ? this.getCliente(proforma.entidad.id) : origen === 'chofer' ? this.getChofer(proforma.entidad.id) : this.getProveedor(proforma.entidad.id);
      
      let proceso: string = accion === 'baja' ? 'anular' : 'generar la liquidación de' 
      ////console.log("proceso", proceso);
      
      Swal.fire({
        title: `¿Desea ${proceso} la proforma N° ${proforma.idInfLiq} del ${titulo} ${objeto}?`,
        text: `${accion === 'baja' ? 'Esta acción revertirá las operaciones al modulo Liquidación' : ''}`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Confirmar",
        cancelButtonText: "Cancelar"
      }).then((result) => {
        if (result.isConfirmed) {
          if(accion === 'facturar'){
            this.generarNumLiquidacion(proforma, origen);
          }
          this.obtenerFacturasOp(proforma, origen, accion, tipo)
        
        }
      });
    }

  async generarNumLiquidacion(proforma: ConId<InformeLiq>, origen:any){
    const numInterno = await this.numeradorService.generarNumeroInterno(origen);
    proforma.numeroInterno = numInterno
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

   editarOperacionesFac(factura:InformeOp, componente:string){
     ////console.log("editarOperacionesFac",factura);
     //factura.idOperacion
     let op:ConId<Operacion>;
     this.dbFirebase
     .obtenerTarifaIdTarifa("operaciones",factura.idOperacion, "idOperacion")
     .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
     .subscribe(data => {      
         op = data;
         ////console.log("OP LIQUIDADA: ", op);
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
 
     ////console.log("llamada al storage desde liq-cliente, deleteItem", item);
     this.storageService.deleteItem(componente, item, item.idFacturaOp, "INTERNA", "");    
 
   }

   facturarProforma(proforma:ConIdType<InformeLiq>, facturasOp: ConIdType<InformeOp>[], clientes:any, choferes:any, origen:string, tipo:string){
    let {id,type, ...prof} = proforma;
    let facOpColeccion: string = origen === 'cliente' ? 'informesOpClientes' : origen === 'chofer' ? 'informesOpChoferes' : origen === 'proveedor' ? 'informesOpProveedores' : '';
    let facOpLiqColeccion: string = origen === 'cliente' ? 'infOpLiqClientes' : origen === 'chofer' ? 'infOpLiqChoferes' : origen === 'proveedor' ? 'infOpLiqProveedores' : '';
    
    
    
    this.procesarFacturacion(facturasOp, origen,facOpLiqColeccion,facOpColeccion,proforma,'resumenLiq', clientes, choferes, tipo)
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

   descargarFactura(proforma:any, facturasOp: ConId<InformeOp>[], origen:string, clientes: any, choferes: any, tipo:string){
      let titulo:string = origen === 'cliente' ? 'Cliente' : origen === 'chofer' ? 'Chofer' : 'Proveedor'
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
              if(tipo ==='excel'){
                  this.excelServ.exportToExcelInforme(proforma, facturasOp, clientes, choferes, 'factura');
              } else{
                  this.pdfServ.exportToPdfInforme(proforma, facturasOp, clientes, choferes, 'factura');
              }
              /* switch(origen){
                case 'cliente':
                  this.excelServ.exportToExcelInforme(proforma, facturasOp, clientes, choferes, 'factura');
                  break;
                case 'chofer':
                  this.excelServ.exportToExcelInforme(proforma, facturasOp, clientes, choferes, 'factura');
                  break;
                case 'proveedor':
                  this.excelServ.exportToExcelInforme(proforma, facturasOp, clientes, choferes, 'factura');
                  break;
                default:
                  break;
              }    */
              
            }
          });   

                
   }

   procesarFacturacion(facturasOp: ConId<InformeOp>[], modo:string, compAlta: string, compBaja:string, factura:ConIdType<InformeLiq>, compFactura:string, clientes: any, choferes: any, tipo:string) {
     this.isLoading = true;
     let detalleNombre: string = modo === "cliente" ? "Cliente" : modo === "chofer" ? "Chofer" : "Proveedor";          
     
     this.dbFirebase.procesarLiquidacion(facturasOp, modo, compAlta, compBaja, factura, compFactura)
       .then((result) => {
         this.isLoading = false;
         //console.log("resultado: ", result);
         if(result.exito){
             this.storageService.logMultiplesOp(factura.operaciones, "LIQUIDAR", "operaciones", `Operación del ${detalleNombre} ${factura.entidad.razonSocial} Liquidada`,result.exito)
             this.storageService.logSimple(factura.entidad.id,"ALTA", compFactura, `Alta de Factura del ${detalleNombre} ${factura.entidad.razonSocial}`, result.exito )
             this.storageService.deleteItem("proforma", factura, factura.entidad.id, "INTERNA", ``)
             Swal.fire({
                   icon: "success",
                   //title: "Oops...",
                   text: 'La liquidación se procesó con éxito.',
                   confirmButtonColor: "#3085d6",
                   confirmButtonText: "Confirmar",
                   //footer: `${msj}`
                 }).then(() => {
                     this.descargarFactura(factura, facturasOp, modo, clientes, choferes, tipo )  
                 });
         } else {
            this.storageService.logMultiplesOp(factura.operaciones, "LIQUIDAR", "operaciones", `Operación del ${detalleNombre} ${factura.entidad.razonSocial} Liquidada`,result.exito)
            this.storageService.logSimple(factura.entidad.id,"ALTA", compFactura, `Alta de Factura del ${detalleNombre} ${factura.entidad.razonSocial}`, result.exito )
            this.storageService.deleteItem("proforma", factura, factura.entidad.id, "INTERNA", ``)
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
