import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FacturaChofer } from 'src/app/interfaces/factura-chofer';

import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ModalDetalleComponent } from '../modal-detalle/modal-detalle.component';
import { FacturaOp } from 'src/app/interfaces/factura-op';
import { Subject, takeUntil } from 'rxjs';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import Swal from 'sweetalert2';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';

@Component({
    selector: 'app-facturacion-chofer',
    templateUrl: './facturacion-chofer.component.html',
    styleUrls: ['./facturacion-chofer.component.scss'],
    standalone: false
})
export class FacturacionChoferComponent implements OnInit {
  
  searchText!:string;  
  $facturasChofer!: ConId<FacturaChofer>[];    
  datosTablaChofer: any[] = [];
  mostrarTablaChofer: boolean[] = [];    
  facturaChofer!: ConId<FacturaChofer>;  
  $facturaOpChofer: ConId<FacturaOp>[] = [];
  facturasPorChofer: Map<number, FacturaChofer[]> = new Map<number, FacturaChofer[]>();
  
  totalCant: number = 0;
  totalSumaAPagar: number = 0;
  totalSumaACobrar: number = 0;
  totalGanancia: number = 0;
  totalPorcentajeGanancia: number = 0;
  totalFaltaPagar: number = 0;
  /////////////////////////////////////////////////
  filtroBusqueda: string = '';
  datosFiltrados = [...this.datosTablaChofer];
  ordenColumna: string = '';
  ordenAscendente: boolean = true;
  private destroy$ = new Subject<void>(); // Subject para manejar la destrucción
  isLoading: boolean = false;

    constructor(
      private storageService: StorageService,
      private modalService: NgbModal,
      private dbFirebase: DbFirestoreService,
    ) {}
  
    ngOnInit(): void {
      this.storageService.getObservable<ConId<FacturaChofer>>("facturaChofer")
      .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
      .subscribe(data => {
        this.$facturasChofer = data;
        this.$facturasChofer = this.$facturasChofer.sort((a, b) => a.apellido.localeCompare(b.apellido)); // Ordena por el nombre del chofer
        this.procesarDatosParaTabla();
        this.mostrarTablaChofer = new Array(this.datosTablaChofer.length).fill(false); // Mueve esta línea aquí
      });
    
      /* this.storageService.consultasFacOpLiqChofer$
      .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
      .subscribe(data => {
        this.$facturaOpChofer = data;
      }); */
    }

    ngOnDestroy(): void {
      // Completa el Subject para cancelar todas las suscripciones
      this.destroy$.next();
      this.destroy$.complete();
    }


    procesarDatosParaTabla() {
      const choferesMap = new Map<number, any>();
      //////console.log()(this.$facturasChofer);
      
      if(this.$facturasChofer !== null){
        // Inicializar los totales a cero
        this.totalCant = 0;
        this.totalSumaAPagar = 0;
        this.totalSumaACobrar = 0;
        this.totalGanancia = 0;
        this.totalPorcentajeGanancia = 0;
        this.totalFaltaPagar = 0;
    
        // Procesar cada factura y actualizar los datos del cliente
        this.$facturasChofer.forEach((factura: FacturaChofer) => {
          if (!choferesMap.has(factura.idChofer)) {
            choferesMap.set(factura.idChofer, {
              idChofer: factura.idChofer,            
              chofer: factura.apellido + " " + factura.nombre,            
              sumaAPagar: 0,
              sumaACobrar: 0,
              faltaPagar: 0,
              total: 0,
              cant: 0,
              neta: 0,
              porcentaje:0,
            });
          }
    
          const chofer = choferesMap.get(factura.idChofer);
          //cliente.sumaACobrar++;
          if (factura.cobrado) {
            chofer.sumaAPagar += Number(factura.valores.total);
          } else {
            chofer.sumaAPagar += Number(factura.valores.total);
            chofer.faltaPagar += Number(factura.valores.total);
          }
          chofer.total += Number(factura.valores.total);
          chofer.sumaACobrar += Number(factura.montoFacturaCliente);  
          chofer.cant += Number(factura.operaciones.length);    
          chofer.neta = chofer.sumaACobrar - chofer.sumaAPagar
          chofer.porcentaje = (chofer.neta * 100) / chofer.sumaACobrar  
        });
    
        this.datosTablaChofer = Array.from(choferesMap.values());
        //////console.log()("Datos para la tabla: ", this.datosTablaChofer); 
        
        this.datosTablaChofer.forEach(chofer => {
          this.totalCant += chofer.cant;
          this.totalSumaAPagar += chofer.sumaAPagar;
          this.totalSumaACobrar += chofer.sumaACobrar;
          this.totalFaltaPagar += chofer.faltaPagar;
        });
    
        // Calcular totales de ganancia y porcentaje de ganancia
        this.totalGanancia = this.totalSumaACobrar - this.totalSumaAPagar;
        if (this.totalSumaACobrar > 0) {
          this.totalPorcentajeGanancia = (this.totalGanancia * 100) / this.totalSumaACobrar;
        } else {
          this.totalPorcentajeGanancia = 0;
        }
      }    
      this.datosFiltrados = this.datosTablaChofer;
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

    mostrarMasDatos(index: number, chofer:any) {   
  
      if (this.datosTablaChofer && this.datosTablaChofer[index]) {
        this.mostrarTablaChofer[index] = !this.mostrarTablaChofer[index];
        const choferId = this.datosTablaChofer[index].idChofer;
        const facturasChofer = this.$facturasChofer.filter((factura: any) => factura.idChofer === choferId);
        this.facturasPorChofer.set(choferId, facturasChofer);        
        ////console.log("1) facturasCliente: ", facturasCliente);
        ////console.log("2) facturas por cliente: ", this.facturasPorCliente);
        this.openModal(facturasChofer, index)  
        
      } else {
        console.error('Elemento en datosTablaCliente no encontrado en el índice:', index);
      }
    }

    cerrarTabla(index: number){
      this.mostrarTablaChofer[index] = !this.mostrarTablaChofer[index];
    }
 
    openModal(factura: any, index: number): void {          
      {
        const modalRef = this.modalService.open(ModalDetalleComponent, {
          windowClass: 'myCustomModalClass',
          centered: true,
          size: 'xl', 
          backdrop:"static" 
        });

      let info = {
          modo: "choferes",
          item: factura,
        }; 
        ////console.log()(info);
        
        modalRef.componentInstance.fromParent = info;
        modalRef.result.then(
          (result) => {
            //////console.log()("ROOWW:" ,row);
            
          //this.selectCrudOp(result.op, result.item);
        
          },
          (reason) => {}
        );
      }
    }

     ////////////////////////
    filtrarTabla(): void {
      const filtro = this.filtroBusqueda.toLowerCase();
      this.datosFiltrados = this.datosTablaChofer.filter(chofer =>
        chofer.chofer.toLowerCase().includes(filtro) ||
        chofer.cant.toString().includes(filtro) ||
        chofer.sumaACobrar.toString().includes(filtro) ||
        chofer.sumaAPagar.toString().includes(filtro) ||
        chofer.faltaPagar.toString().includes(filtro) ||
        chofer.neta.toString().includes(filtro) ||
        chofer.porcentaje.toString().includes(filtro)
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
        console.log("this.$facturasChofer", this.$facturasChofer);
        this.dbFirebase.eliminarMultiple(this.$facturasChofer, "facturaChofer").then((result)=>{
          this.isLoading = false;
          if(result.exito){
            alert("se eliminaron correctamente")
          } else {
            alert(`error en la eliminación: ${result.mensaje}` )
          }
        })
      }

}
