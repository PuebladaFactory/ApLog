import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ModalDetalleComponent } from '../modal-detalle/modal-detalle.component';
import { FacturaCliente } from 'src/app/interfaces/factura-cliente';
import { FacturaOp } from 'src/app/interfaces/factura-op';
import { Subject, takeUntil } from 'rxjs';
import { ConId } from 'src/app/interfaces/conId';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-facturacion-cliente',
    templateUrl: './facturacion-cliente.component.html',
    styleUrls: ['./facturacion-cliente.component.scss'],
    standalone: false
})
export class FacturacionClienteComponent implements OnInit {
  
  datosTablaCliente: any[] = [];
  facturasPorCliente = new Map<number, any[]>();
  mostrarTablaCliente: boolean[] = [];
  searchText: string = '';
  $facturasCliente!: ConId<FacturaCliente>[];
  $facturaOpCliente!: ConId<FacturaOp>[];
  operacionFac: any[] = [];
  totalCant: number = 0;
  totalSumaAPagar: number = 0;
  totalSumaACobrar: number = 0;
  totalGanancia: number = 0;
  totalPorcentajeGanancia: number = 0;
  totalFaltaCobrar: number = 0;
  /////////////////////////////////////////////////
  filtroBusqueda: string = '';
  datosFiltrados = [...this.datosTablaCliente];
  ordenColumna: string = '';
  ordenAscendente: boolean = true;
  iconosColumnas: any [] = [];
  private destroy$ = new Subject<void>(); // Subject para manejar la destrucción

    constructor(
      private storageService: StorageService,
      private modalService: NgbModal
    ) {}
  
    ngOnInit(): void {
      this.storageService.getObservable<ConId<FacturaCliente>>("facturaCliente")
      .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
      .subscribe(data => {
        
        if(data){
          this.$facturasCliente = data;
          this.$facturasCliente = this.$facturasCliente.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
          this.procesarDatosParaTabla();
          this.mostrarTablaCliente = new Array(this.datosTablaCliente.length).fill(false); // Mueve esta línea aquí
        } else {
          this.mensajesError("error facturacion-cliente: facturaCliente")
        }
      });
      /* this.storageService.consultasFacOpLiqCliente$
      .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
      .subscribe(data => {
        this.$facturaOpCliente = data;
      }); */      
    }

    ngOnDestroy(): void {
      // Completa el Subject para cancelar todas las suscripciones
      this.destroy$.next();
      this.destroy$.complete();
    }

  
    procesarDatosParaTabla() {
      const clientesMap = new Map<number, any>();
    
      if (this.$facturasCliente !== null) {
        // Inicializar los totales a cero
        this.totalCant = 0;
        this.totalSumaAPagar = 0;
        this.totalSumaACobrar = 0;
        this.totalGanancia = 0;
        this.totalPorcentajeGanancia = 0;
        this.totalFaltaCobrar = 0;
    
        // Procesar cada factura y actualizar los datos del cliente
        this.$facturasCliente.forEach((factura: any) => {
          if (!clientesMap.has(factura.idCliente)) {
            clientesMap.set(factura.idCliente, {
              idCliente: factura.idCliente,
              razonSocial: factura.razonSocial,
              sumaAPagar: 0,
              sumaACobrar: 0,
              faltaCobrar: 0,
              total: 0,
              cant: 0,
              neta:0,
              porcentaje:0
            });
          }
          const cliente = clientesMap.get(factura.idCliente);
          const totalFactura = Number(factura.valores.total);
          const montoFacturaChofer = Number(factura.montoFacturaChofer);
    
          if (factura.cobrado) {
            cliente.sumaACobrar += totalFactura;
          } else {
            cliente.sumaACobrar += totalFactura;
            cliente.faltaCobrar += totalFactura;
          }
          cliente.total += totalFactura;
          cliente.sumaAPagar += montoFacturaChofer;
          cliente.cant += Number(factura.operaciones.length);
          cliente.neta = cliente.sumaACobrar - cliente.sumaAPagar
          cliente.porcentaje = (cliente.neta * 100) / cliente.sumaACobrar
        });
    
        // Convertir los datos del cliente a una lista y calcular los totales globales
        this.datosTablaCliente = Array.from(clientesMap.values());
    
        this.datosTablaCliente.forEach(cliente => {
          this.totalCant += cliente.cant;
          this.totalSumaAPagar += cliente.sumaAPagar;
          this.totalSumaACobrar += cliente.sumaACobrar;
          this.totalFaltaCobrar += cliente.faltaCobrar;
        });
    
        // Calcular totales de ganancia y porcentaje de ganancia
        this.totalGanancia = this.totalSumaACobrar - this.totalSumaAPagar;
        if (this.totalSumaACobrar > 0) {
          this.totalPorcentajeGanancia = (this.totalGanancia * 100) / this.totalSumaACobrar;
        } else {
          this.totalPorcentajeGanancia = 0;
        }
      }
      this.datosFiltrados = this.datosTablaCliente;
      console.log("datos filtrados", this.datosFiltrados)
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
  
    mostrarMasDatos(index: number, cliente: any) {
      //console.log("index: ", index, " cliente: ", cliente);
      
      if (this.datosTablaCliente && this.datosTablaCliente[index]) {
        this.mostrarTablaCliente[index] = !this.mostrarTablaCliente[index];
        const clienteId = this.datosTablaCliente[index].idCliente;
        const facturasCliente = this.$facturasCliente.filter((factura: any) => factura.idCliente === clienteId);
        this.facturasPorCliente.set(clienteId, facturasCliente);        
        //console.log("1) facturasCliente: ", facturasCliente);
        //console.log("2) facturas por cliente: ", this.facturasPorCliente);
        this.openModal(facturasCliente, index);          
      } else {
        console.error('Elemento en datosTablaCliente no encontrado en el índice:', index);
      }
      
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
          modo: "clientes",
          item: factura,
        }; 
        ////console.log()(info);
        
        modalRef.componentInstance.fromParent = info;
        modalRef.result.then(
          (result) => {
            //////console.log()("ROOWW:" ,row);
            
  //        this.selectCrudOp(result.op, result.item);
         
          },
          (reason) => {}
        );
      }
    }
    
    ////////////////////////
    filtrarTabla(): void {
      const filtro = this.filtroBusqueda.toLowerCase();
      this.datosFiltrados = this.datosTablaCliente.filter(cliente =>
        cliente.razonSocial.toLowerCase().includes(filtro) ||
        cliente.cant.toString().includes(filtro) ||
        cliente.sumaACobrar.toString().includes(filtro) ||
        cliente.sumaAPagar.toString().includes(filtro) ||
        cliente.faltaCobrar.toString().includes(filtro) ||
        cliente.neta.toString().includes(filtro) ||
        cliente.porcentaje.toString().includes(filtro)
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

   // Icono de ordenamiento
   iconoOrdenamiento(columna: string): string {
    if (this.ordenColumna === columna) {
      return this.ordenAscendente ? 'bi bi-arrow-down' : 'bi bi-arrow-up';
    }
    return '';
  }

  mensajesError(msj:string){
    Swal.fire({
      icon: "error",
      //title: "Oops...",
      text: `${msj}`
      //footer: `${msj}`
    });
  }

  
}
