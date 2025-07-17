import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, take, takeUntil } from 'rxjs';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { InformeOp } from 'src/app/interfaces/informe-op';

import { LogDoc } from 'src/app/interfaces/log-doc';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { PdfService } from 'src/app/servicios/informes/pdf/pdf.service';
import { LogService } from 'src/app/servicios/log/log.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
    selector: 'app-modal-objeto',
    templateUrl: './modal-objeto.component.html',
    styleUrls: ['./modal-objeto.component.scss'],
    standalone: false
})

export class ModalObjetoComponent implements OnInit {

  @Input() fromParent:any;
  @Input() fromParentPapelera:any;
  objeto!:any;
  arrayFacOp: InformeOp[] =[];
  $clientes!: Cliente[];
  $choferes!: Chofer[];
  $proveedores!: Proveedor[];
  chofer: string = "";
  private destroy$ = new Subject<void>(); // Subject para manejar la destrucción
  
  constructor(public activeModal: NgbActiveModal, private dbFirebase: DbFirestoreService, private storageService: StorageService,  private pdfServ: PdfService, private excelServ: ExcelService, private logService: LogService){}

  ngOnInit(): void {  
    console.log("this.fromParent", this.fromParent);    
    this.objeto = this.fromParent.item;
    console.log("this.objeto", this.objeto);
    
    if(this.fromParent.modo === 'facturaCliente' || this.fromParent.modo === 'facturaChofer' || this.fromParent.modo === 'facturaProveedor'){
      this.storageService.choferes$
          .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
          .subscribe(data => {
            this.$choferes = data;
          });
          this.storageService.clientes$
          .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
          .subscribe(data => {
            this.$clientes = data;
          }); 
          this.storageService.proveedores$
          .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
          .subscribe(data => {
            this.$proveedores = data;            
          })       
      this.buscarFacOp();
      console.log("this.arrayFacOp", this.arrayFacOp);
    }
    if(this.fromParent.modo === "choferes"){
      this.storageService.proveedores$
          .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
          .subscribe(data => {
            this.$proveedores = data;            
          })    
    }
    if(this.fromParent.modo === "legajos"){
      this.storageService.proveedores$
          .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
          .subscribe(data => {
            this.$proveedores = data;            
          })    
      this.getChofer(this.objeto.idChofer)
    }
    console.log("fromParentPapelera", this.fromParentPapelera);
    
  }

  ngOnDestroy(): void {
    // Completa el Subject para cancelar todas las suscripciones
    this.destroy$.next();
    this.destroy$.complete();
  }

  buscarFacOp(){
    let coleccion:string = this.fromParent.modo === 'facturaCliente' ? "facOpLiqCliente" : this.fromParent.modo === 'facturaChofer' ? "facOpLiqChofer" : "facOpLiqProveedor";
    let idObjeto: string = `id${this.fromParent.modo === 'facturaCliente' ? 'Cliente' : this.fromParent.modo === 'facturaChofer' ? 'Chofer' : 'Proveedor'}`
    
    console.log("objeto: ", idObjeto,);
    
    let idOpMaxMin = this.encontrarMaximoYMinimo(this.objeto.operaciones);
    console.log("idOpMaxMin", idOpMaxMin);
    
    this.dbFirebase.getAllColectionRangeIdValue<InformeOp>(
      coleccion,idOpMaxMin.min, idOpMaxMin.max, "idOperacion", idObjeto,
      this.fromParent.modo === 'facturaCliente' ? this.objeto.idCliente : this.fromParent.modo === 'facturaChofer' ? this.objeto.idChofer : this.objeto.idProveedor
    )  
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      if (data) {
        console.log("data", data);          
        this.arrayFacOp = data.filter((operacion) => {
          return this.objeto.operaciones.includes(operacion.idOperacion);
        });
        console.log("arrayFacOp", this.arrayFacOp);  
      }
    });
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
  

  reimprimirFac(formato: string) {    

    //reimpresion general
    if (formato === 'excel') {
      //console.log("3)factura y facturasOpCliente: ",factura[0], this.operacionFac );      
      this.excelServ.exportToExcelInforme(this.objeto, this.arrayFacOp, this.$clientes, this.$choferes, 'factura');
      this.logService.logEvent("REIMPRESION", "facturaCliente", `Reimpresion de detalle en excel de Factura Eliminada del Cliente ${this.objeto.razonSocial}`, this.objeto.idFacturaCliente, true);
    } else if(formato === 'pdf') {
      //console.log("3)factura y facturasOpCliente: ",factura[0], this.operacionFac );
      this.pdfServ.exportToPdfInforme(this.objeto, this.arrayFacOp, this.$clientes, this.$choferes, 'factura');
      this.logService.logEvent("REIMPRESION", "facturaCliente", `Reimpresion de detalle en pdf de Factura Eliminada del Cliente ${this.objeto.razonSocial}`, this.objeto.idFacturaCliente, true);
    } 


/*         switch(this.fromParent.modo){
            case 'facturaCliente':
              ////////////// FACTURA CLIENTE ///////////////////////
              if (formato === 'excel') {
                //console.log("3)factura y facturasOpCliente: ",factura[0], this.operacionFac );      
                this.excelServ.exportToExcelInforme(this.objeto, this.arrayFacOp, this.$clientes, this.$choferes, 'factura');
                this.logService.logEvent("REIMPRESION", "facturaCliente", `Reimpresion de detalle en excel de Factura Eliminada del Cliente ${this.objeto.razonSocial}`, this.objeto.idFacturaCliente, true);
              } else if(formato === 'pdf') {
                //console.log("3)factura y facturasOpCliente: ",factura[0], this.operacionFac );
                this.pdfServ.exportToPdfInforme(this.objeto, this.arrayFacOp, this.$clientes, this.$choferes, 'factura');
                this.logService.logEvent("REIMPRESION", "facturaCliente", `Reimpresion de detalle en pdf de Factura Eliminada del Cliente ${this.objeto.razonSocial}`, this.objeto.idFacturaCliente, true);
              }   
              break
            case 'facturaChofer':
              ////////////// FACTURA CHOFER ///////////////////////
              if (formato === 'excel') {
                //console.log("3)factura y facturasOpCliente: ",factura[0], this.operacionFac );      
                this.excelServ.exportToExcelInforme(this.objeto, this.arrayFacOp, this.$clientes, this.$choferes, 'factura');
                this.logService.logEvent("REIMPRESION", "facturaChofer", `Reimpresion de detalle en excel de Factura Eliminada del Chofer ${this.objeto.apellido} ${this.objeto.nombre}`, this.objeto.idFacturaCliente, true);
              } else if(formato === 'pdf') {
                //console.log("3)factura y facturasOpCliente: ",factura[0], this.operacionFac );
                this.pdfServ.exportToPdfInforme(this.objeto, this.arrayFacOp, this.$clientes, this.$choferes, 'factura');
                this.logService.logEvent("REIMPRESION", "facturaChofer", `Reimpresion de detalle en pdf de Factura Eliminada del Chofer ${this.objeto.apellido} ${this.objeto.nombre}`, this.objeto.idFacturaCliente, true);
              }  
              break
            case 'facturaProveedor':
              if (formato === 'excel') {
                ////////////// FACTURA PROVEEDOR ///////////////////////
                //console.log("3)factura y facturasOpProveedor: ",factura[0], this.operacionFac );      
                this.excelServ.exportToExcelInforme(this.objeto, this.arrayFacOp, this.$clientes, this.$choferes, 'factura');
                this.logService.logEvent("REIMPRESION", "facturaProveedor", `Reimpresion de detalle en excel del Proveedor ${this.objeto.razonSocial}`, this.objeto.idFacturaProveedor, true);
              } else if(formato === 'pdf') {
                //console.log("3)factura y facturasOpProveedor: ",factura[0], this.operacionFac );
                this.pdfServ.exportToPdfInforme(this.objeto, this.arrayFacOp, this.$clientes, this.$choferes, 'factura');
                this.logService.logEvent("REIMPRESION", "facturaProveedor", `Reimpresion de detalle en excel del Proveedor ${this.objeto.razonSocial}`, this.objeto.idFacturaProveedor, true);
              }   
            break
            default:
            break
        } */
      
      
      
    }

    getProveedor(id:number){
      let proveedor:Proveedor[];
      proveedor = this.$proveedores.filter((p:Proveedor)=>{
        return p.idProveedor === id;
      })
      return proveedor[0].razonSocial
    }

    getChofer(idChofer:number){
      let choferes: LogDoc[] = this.fromParentPapelera.filter((p:LogDoc)=>{
        return p.logEntry.coleccion === "choferes"
      })
      console.log("choferes", choferes);
      let choferDoc: LogDoc[] =  choferes.filter(cDoc => cDoc.objeto.idChofer === idChofer);
      console.log("choferDoc", choferDoc);
      this.chofer = choferDoc[0].objeto.apellido + " " + choferDoc[0].objeto.nombre
    }



}
