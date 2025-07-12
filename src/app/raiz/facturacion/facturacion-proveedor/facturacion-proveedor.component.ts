import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';


import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ModalDetalleComponent } from '../modal-detalle/modal-detalle.component';

import { Subject, takeUntil } from 'rxjs';
import { ConId } from 'src/app/interfaces/conId';
import Swal from 'sweetalert2';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { InformeOp } from 'src/app/interfaces/informe-op';
import { InformeLiq } from 'src/app/interfaces/informe-liq';

@Component({
    selector: 'app-facturacion-proveedor',
    templateUrl: './facturacion-proveedor.component.html',
    styleUrls: ['./facturacion-proveedor.component.scss'],
    standalone: false
})
export class FacturacionProveedorComponent implements OnInit {
    
  informesLiqProveedor!: ConId<InformeLiq>[];  
  datosTablaProveedor: any[] = [];
  mostrarTablaProveedor: boolean[] = [];      
  informesOpProveedor: ConId<InformeOp>[] = []; 
  facturasPorProveedor: Map<number, InformeLiq[]> = new Map<number, InformeLiq[]>();
  
  totalCant: number = 0;
  totalSumaAPagar: number = 0;
  totalSumaACobrar: number = 0;
  totalGanancia: number = 0;
  totalPorcentajeGanancia: number = 0;
  totalFaltaPagar: number = 0;
  /////////////////////////////////////////////////
  filtroBusqueda: string = '';
  datosFiltrados = [...this.datosTablaProveedor];
  ordenColumna: string = '';
  ordenAscendente: boolean = true;
  ///////////////////////////////////////////////////
  private destroy$ = new Subject<void>(); // Subject para manejar la destrucción
  isLoading: boolean = false;
    
    constructor(
      private storageService: StorageService,
      private modalService: NgbModal,
      private dbFirebase: DbFirestoreService,
    ) {}

    ngOnInit(): void {
      this.storageService.getObservable<ConId<InformeLiq>>("resumenLiqProveedores")
      .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
      .subscribe(data => {
        console.log("facturas proveedores: ",data);
        if(data){
          
          this.informesLiqProveedor = data;
          this.informesLiqProveedor = this.informesLiqProveedor.sort((a, b) => a.entidad.razonSocial.localeCompare(b.entidad.razonSocial)); // Ordena por el nombre del chofer
          this.procesarDatosParaTabla();
          this.mostrarTablaProveedor = new Array(this.datosTablaProveedor.length).fill(false); // Mueve esta línea aquí
        }else {
          this.mensajesError("error facturacion-proveedor: facturaProveedor")
        }
       
      });
    
      /* this.storageService.consultasFacOpLiqProveedor$
      .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
      .subscribe(data => {
        this.informesOpProveedor = data;
      }); */
    }

    ngOnDestroy(): void {
      // Completa el Subject para cancelar todas las suscripciones
      this.destroy$.next();
      this.destroy$.complete();
    }

    procesarDatosParaTabla() {
      const proveedoresMap = new Map<number, any>();
      //console.log("procesarDatosParaTabla", this.informesLiqProveedor);
      
      if(this.informesLiqProveedor !== null){
        this.informesLiqProveedor.forEach((factura: InformeLiq) => {
            // Inicializar los totales a cero
          this.totalCant = 0;
          this.totalSumaAPagar = 0;
          this.totalSumaACobrar = 0;
          this.totalGanancia = 0;
          this.totalPorcentajeGanancia = 0;
          this.totalFaltaPagar = 0;
      
          // Procesar cada factura y actualizar los datos del cliente
          if (!proveedoresMap.has(factura.idInfLiq)) {
            proveedoresMap.set(factura.idInfLiq, {
              idProveedor: factura.entidad.id,
              proveedor: factura.entidad.razonSocial ,            
              sumaAPagar: 0,
              sumaACobrar: 0,
              faltaPagar: 0,
              total: 0,
              cant: 0,
              neta: 0,
              porcentaje:0,
            });
          }
    
          const proveedor = proveedoresMap.get(factura.idInfLiq);
          //cliente.sumaACobrar++;
          if (factura.cobrado) {
            proveedor.sumaAPagar += Number(factura.valores.total);
          } else {
            proveedor.sumaAPagar += Number(factura.valores.total);
            proveedor.faltaPagar += Number(factura.valores.total);
          }
          proveedor.total += factura.valores.total;  
          proveedor.sumaACobrar += Number(factura.valores.totalContraParte);      
          proveedor.cant += Number(factura.operaciones.length);    
          proveedor.neta = proveedor.sumaACobrar - proveedor.sumaAPagar
          proveedor.porcentaje = (proveedor.neta * 100) / proveedor.sumaACobrar   
        });
    
        this.datosTablaProveedor = Array.from(proveedoresMap.values());
        //////console.log()("Datos para la tabla: ", this.datosTablaProveedor); 
        this.datosTablaProveedor.forEach(proveedor => {
          this.totalCant += proveedor.cant;
          this.totalSumaAPagar += proveedor.sumaAPagar;
          this.totalSumaACobrar += proveedor.sumaACobrar;
          this.totalFaltaPagar += proveedor.faltaPagar;
        });
    
        // Calcular totales de ganancia y porcentaje de ganancia
        this.totalGanancia = this.totalSumaACobrar - this.totalSumaAPagar;
        if (this.totalSumaACobrar > 0) {
          this.totalPorcentajeGanancia = (this.totalGanancia * 100) / this.totalSumaACobrar;
        } else {
          this.totalPorcentajeGanancia = 0;
        }
      }
      this.datosFiltrados = this.datosTablaProveedor;
      //console.log("datos filtrados", this.datosFiltrados)
    }
  

    limpiarValorFormateado(valorFormateado: any): number {
      if (typeof valorFormateado === 'string') {
        // Si es un string, eliminar puntos de miles y reemplazar coma por punto
        return parseFloat(valorFormateado.replace(/\./g, '').replace(',', '.'));
      } else if (typeof valorFormateado === 'number') {
        // Si ya es un número, simplemente devuélvelo
        return valorFormateado;
      } else {
        // Si es null o undefined, devolver 0 como fallback
        return 0;
      }
    }


    mostrarMasDatos(index: number, proveedor:any) {   
    console.log("index: ", index)
    if (this.datosTablaProveedor && this.datosTablaProveedor[index]) {
      this.mostrarTablaProveedor[index] = !this.mostrarTablaProveedor[index];
      const proveedorId = this.datosTablaProveedor[index].idProveedor;
      console.log("proveedorId: ", proveedorId)
      const facturasProveedor = this.informesLiqProveedor.filter((factura: ConId<InformeLiq>) => factura.entidad.id === proveedorId);
      this.facturasPorProveedor.set(proveedorId, facturasProveedor);        
      console.log("1) facturasProveedor: ", facturasProveedor);
      console.log("2) facturas por proveedor: ", this.facturasPorProveedor);
      this.openModal(facturasProveedor, index)  
      
    } else {
      console.error('Elemento en datosTablaCliente no encontrado en el índice:', index);
    }
    }

    cerrarTabla(index: number){
      this.mostrarTablaProveedor[index] = !this.mostrarTablaProveedor[index];
    }

    openModal(informesLiq: ConId<InformeLiq>[], index: number): void {          
      {
        const modalRef = this.modalService.open(ModalDetalleComponent, {
          windowClass: 'myCustomModalClass',
          centered: true,
          size: 'xl', 
          backdrop:"static" 
        });

      let info = {
          modo: "proveedor",
          item: informesLiq,
        }; 
        //////console.log()(info);
        
        modalRef.componentInstance.fromParent = info;
        modalRef.result.then(
          (result) => {
            ////////console.log()("ROOWW:" ,row);
            
    //        this.selectCrudOp(result.op, result.item);
        
          },
          (reason) => {}
        );
      }
    }

         ////////////////////////
         filtrarTabla(): void {
          const filtro = this.filtroBusqueda.toLowerCase();
          this.datosFiltrados = this.datosTablaProveedor.filter(proveedor =>
            proveedor.proveedor.toLowerCase().includes(filtro) ||
            proveedor.cant.toString().includes(filtro) ||
            proveedor.sumaACobrar.toString().includes(filtro) ||
            proveedor.sumaAPagar.toString().includes(filtro) ||
            proveedor.faltaPagar.toString().includes(filtro) ||
            proveedor.neta.toString().includes(filtro) ||
            proveedor.porcentaje.toString().includes(filtro)
          );
        }
    
          // Ordenar por columna
        ordenar(columna: string): void {
          if (this.ordenColumna === columna) {
            this.ordenAscendente = !this.ordenAscendente;
          } else {
            this.ordenColumna = columna;
            this.ordenAscendente = true;
          }
          this.datosFiltrados.sort((a, b) => {
            const valorA = a[columna];
            const valorB = b[columna];
            if (typeof valorA === 'string') {
              return this.ordenAscendente
                ? valorA.localeCompare(valorB)
                : valorB.localeCompare(valorA);
            } else {
              return this.ordenAscendente ? valorA - valorB : valorB - valorA;
            }
          });
        }

          mensajesError(msj:string){
            Swal.fire({
              icon: "error",
              //title: "Oops...",
              text: `${msj}`
              //footer: `${msj}`
            });
          }

          
        borrarLiquidaciones(){
        this.isLoading = true;
        //console.log("this.informesLiqProveedor", this.informesLiqProveedor);
        this.dbFirebase.eliminarMultiple(this.informesLiqProveedor, "facturaProveedor").then((result)=>{
          this.isLoading = false;
          if(result.exito){
            alert("se eliminaron correctamente")
          } else {
            alert(`error en la eliminación: ${result.mensaje}` )
          }
        })
      }

}
