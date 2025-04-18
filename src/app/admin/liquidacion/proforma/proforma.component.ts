import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import { ConIdType } from 'src/app/interfaces/conId';
import { FacturaChofer } from 'src/app/interfaces/factura-chofer';
import { FacturaCliente } from 'src/app/interfaces/factura-cliente';
import { FacturaProveedor } from 'src/app/interfaces/factura-proveedor';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { FacturarOpComponent } from '../modales/facturar-op/facturar-op.component';
import { FacturaOp } from 'src/app/interfaces/factura-op';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { ModalFacturaComponent } from 'src/app/shared/modal-factura/modal-factura.component';

@Component({
  selector: 'app-proforma',
  templateUrl: './proforma.component.html',
  styleUrls: ['./proforma.component.scss']
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

  constructor(private storageService: StorageService, private modalService: NgbModal, private dbFirebase: DbFirestoreService){}
  
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
    console.log("this.proformasClientes", this.proformasClientes);
    console.log("this.proformasChoferes", this.proformasChoferes);
    console.log("this.proformasProveedores", this.proformasProveedores);
      
    this.proformasClientes = this.proformasClientes.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));
    this.proformasChoferes = this.proformasChoferes.sort((a, b) => a.apellido.localeCompare(b.apellido));
    this.proformasProveedores = this.proformasProveedores.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));
    
  }

  detalleProforma(proforma:any, origen: string, accion:string){
    console.log("origen: ", origen);
    console.log("proforma: ", proforma);
    let facturasOp: ConIdType<FacturaOp>[];
    let respuesta:any
    switch (origen){
    
      //////////////CLIENTES///////////////////////
      case "clientes":
          
          
          
          respuesta = this.encontrarMaximoYMinimo(proforma.operaciones)
          console.log("respuesta", respuesta);
          
          this.dbFirebase.getAllByDateValueField<ConIdType<FacturaOp>>("facturaOpCliente", "idOperacion",respuesta.min, respuesta.max, "idCliente", proforma.idCliente)
          .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
          .subscribe(data => {
            if(data){
              console.log("data facturaOpCliente", data);              
              facturasOp = data.filter((fac) => {
                return proforma.operaciones.includes(fac.idOperacion);
              });
              console.log("3) operacionFac!!!!: ", facturasOp);          
              if(accion === "vista"){
                  this.openModalDetalleFactura(proforma, facturasOp, origen);
              } else if (accion === "edicion"){
                  
              } else if (accion === "reimpresion"){
                  
              }
            }
          })
          
          //console.log("3) operacionFac: ", this.operacionFac);          
          break;
      //////////////CHOFERES///////////////////////
      case "choferes":
          /* console.log("1) row: ",row);    
          this.factura = this.data.filter((factura:FacturaChofer) => {
            return factura.idFacturaChofer === row.idFactura
          })
          console.log(this.factura[0]);
          respuesta = this.encontrarMaximoYMinimo(this.factura[0].operaciones)
          console.log("respuesta", respuesta);
          this.dbFirebase.getAllByDateValueField<FacturaOp>("facOpLiqChofer", "idOperacion",respuesta.min, respuesta.max, "idChofer", this.factura[0].idChofer)
          .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
          .subscribe(data => {
            if(data){
              console.log("data facOpLiqChofer", data);
              
              this.$facturasOpChofer = data.filter((fac) => {
                return this.factura[0].operaciones.includes(fac.idOperacion);
              });
              console.log("3) operacionFac!!!!: ", this.$facturasOpChofer);          
              if(accion === "detalle"){
                this.openModalDetalleFactura(this.factura[0], this.$facturasOpChofer);
              } else if (accion === "baja"){
                  this.bajaOp(this.factura[0]);
              } else if (accion === "reimpresion"){
                this.reimprimirFac(formato);
              }
            }
          }) */
          break;
      //////////////PROVEEDORES///////////////////////
      case "proveedores":
          /* console.log("1) row: ",row);    
          this.factura = this.data.filter((factura:FacturaProveedor) => {
            return factura.idFacturaProveedor === row.idFactura
          })
          console.log(this.factura[0]);
          respuesta = this.encontrarMaximoYMinimo(this.factura[0].operaciones)
          console.log("respuesta", respuesta);
          this.dbFirebase.getAllByDateValueField<FacturaOp>("facOpLiqProveedor", "idOperacion",respuesta.min, respuesta.max, "idProveedor", this.factura[0].idProveedor)
          .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
          .subscribe(data => {
            if(data){
              console.log("data facOpLiqProveedor", data);              
              this.$facturasOpProveedor = data.filter((fac) => {
                return this.factura[0].operaciones.includes(fac.idOperacion);
              });
              console.log("3) operacionFac!!!!: ", this.$facturasOpProveedor);          
              if(accion === "detalle"){
                this.openModalDetalleFactura(this.factura[0], this.$facturasOpProveedor);
              } else if (accion === "baja"){
                  this.bajaOp(this.factura[0]);
              } else if (accion === "reimpresion"){
                this.reimprimirFac(formato);
              }
            }
          }) */
          
      break;
      default:
        alert("error de reimpresion")
      break;
    }
      
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

  openModalDetalleFactura(factura:any, facturasOp: FacturaOp[], origen:string){
    console.log("lega??");
    
      {
        const modalRef = this.modalService.open(ModalFacturaComponent, {
          windowClass: 'myCustomModalClass',
          centered: true,
          scrollable: true, 
          size: 'lg',     
        });       
        console.log("factura",factura);
        let info = {
          modo: "facturacion",
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


}
