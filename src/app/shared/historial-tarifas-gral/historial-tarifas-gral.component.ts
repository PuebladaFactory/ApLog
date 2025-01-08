import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { CategoriaTarifa, TarifaGralCliente, TarifaTipo } from 'src/app/interfaces/tarifa-gral-cliente';
import { TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-historial-tarifas-gral',
  templateUrl: './historial-tarifas-gral.component.html',
  styleUrls: ['./historial-tarifas-gral.component.scss']
})
export class HistorialTarifasGralComponent implements OnInit {
  
  @Input() fromParent:any;;
  tarifasHistorial: TarifaGralCliente[] = [];
  tarifasPersHistorial!: TarifaPersonalizadaCliente[];
  $clientes!: Cliente[];
  $choferes!: Chofer[];
  $proveedores!: Proveedor[];
  aumentos: number[] = [];  // Array para almacenar el % de aumento entre tarifas consecutivas
  aumentosPersonalizados: number[] = [];
  tPersonalizada: boolean = false;  
  limite:number = 5;
  private destroy$ = new Subject<void>(); // Subject para manejar la destrucción

  constructor(private storageService: StorageService, public activeModal: NgbActiveModal) {}

  ngOnInit(): void {    
 
    console.log("0)", this.fromParent);
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
    this.consultarTarifas()
    
  }

  ngOnDestroy(): void {
    // Completa el Subject para cancelar todas las suscripciones
    this.destroy$.next();
    this.destroy$.complete();
  }

  consultarTarifas(){
    switch(this.fromParent.modo){
      case 'clientes':
        if (!this.fromParent.tEspecial) {
          this.storageService.getAllSortedLimit('tarifasGralCliente', 'idTarifa', 'desc', this.limite, 'historialTarifaGralCliente');
        } else {
          this.storageService.getAllSortedIdLimit('tarifasEspCliente', 'idCliente', this.fromParent.id, 'idTarifa', 'desc', this.limite, 'historialTarifaGralCliente');
        }

        this.storageService.historialTarifaGralCliente$.subscribe((tarifas: TarifaGralCliente[]) => {
          this.tarifasHistorial = tarifas.sort((a, b) => b.idTarifa - a.idTarifa);
          this.calcularAumentos();
        });
        break;

      case "choferes":{
        if (!this.fromParent.tEspecial) {
          this.storageService.getAllSortedLimit('tarifasGralChofer', 'idTarifa', 'desc', this.limite, 'historialTarifaGralChofer');
        } else {
          this.storageService.getAllSortedIdLimit('tarifasEspChofer', 'idChofer', this.fromParent.id, 'idTarifa', 'desc', this.limite, 'historialTarifaGralChofer');
        }

        this.storageService.historialTarifaGralChofer$.subscribe((tarifas: TarifaGralCliente[]) => {
          this.tarifasHistorial = tarifas.sort((a, b) => b.idTarifa - a.idTarifa);
          this.calcularAumentos();
        });
        
        break
      };
      case "proveedores":{
        if (!this.fromParent.tEspecial) {
          this.storageService.getAllSortedLimit('tarifasGralProveedor', 'idTarifa', 'desc', this.limite, 'historialTarifaGralProveedor');
        } else {
          this.storageService.getAllSortedIdLimit('tarifasEspProveedor', 'idProveedor', this.fromParent.id, 'idTarifa', 'desc', this.limite, 'historialTarifaGralProveedor');
        }

        this.storageService.historialTarifaGralProveedor$.subscribe((tarifas: TarifaGralCliente[]) => {
          this.tarifasHistorial = tarifas.sort((a, b) => b.idTarifa - a.idTarifa);
          this.calcularAumentos();
        });
        
        break
      }
    
      case "personalizada": {
        this.tPersonalizada = true;        
        this.storageService.getAllSortedIdLimit('tarifasPersCliente', 'idCliente', this.fromParent.id, 'idTarifa', 'desc', this.limite, 'historialTarifaPersCliente');
        this.storageService.historialTarifaPersCliente$.subscribe((tarifas: TarifaPersonalizadaCliente[]) => {
          this.tarifasPersHistorial = tarifas.sort((a, b) => b.idTarifa - a.idTarifa);
          console.log(this.tarifasPersHistorial);          
          this.calcularAumentos();
        });

        break
      }

      default:{
        alert("error en modo")
        break
      }
    }
  }

  obtenerTipoTarifa(tipo: TarifaTipo): string {
    if (tipo.general) return 'General';
    if (tipo.especial) return 'Especial';
    if (tipo.eventual) return 'Eventual';
    if (tipo.personalizada) return 'Personalizada';
    return 'Desconocido';
  }

  getNombre(id:number){
    switch(this.fromParent.modo){
      case 'clientes':
        let cliente = this.$clientes.filter((c)=>c.idCliente === id)
        return cliente[0].razonSocial
        ;

      case "choferes":{
        let chofer = this.$choferes.filter((c)=>c.idChofer === id)
        return chofer[0].apellido + " " + chofer[0].nombre
        ;
      };
      case "proveedores":{
        let proveedor = this.$proveedores.filter((c)=>c.idProveedor === id)
        return proveedor[0].razonSocial
        ;
      }
      default :{
        return ""
      }

    }    

  }

  calcularValorTotal(cargasGenerales: CategoriaTarifa[]): number {
    return cargasGenerales.reduce((total, categoria) => total + categoria.valor, 0);
  }

  calcularAumentos(): void {
    if(!this.tPersonalizada){
        this.aumentos = new Array(this.tarifasHistorial.length).fill(0); // Inicializamos el array con ceros
    
        for (let i = this.tarifasHistorial.length - 1; i > 0; i--) {
          const tarifaActual = this.tarifasHistorial[i];
          const tarifaSiguiente = this.tarifasHistorial[i - 1];
      
          const aumentoTotal = tarifaSiguiente.cargasGenerales.reduce((total, categoriaSiguiente, index) => {
            const categoriaActual = tarifaActual.cargasGenerales[index];
            if (categoriaActual) {
              const aumentoCategoria = ((categoriaSiguiente.valor - categoriaActual.valor) / categoriaActual.valor) * 100;
              return total + aumentoCategoria;
            }
            return total;
          }, 0);
      
          // Calculamos el promedio de aumento para todas las categorías
          const promedioAumento = aumentoTotal / tarifaSiguiente.cargasGenerales.length;
          this.aumentos[i - 1] = promedioAumento; // Guardamos el aumento en la posición de la tarifa "más antigua"
        }
    } else {
      // Inicializamos el array de aumentos con 0 para cada tarifa
  this.aumentosPersonalizados = new Array(this.tarifasPersHistorial.length).fill(0);

  // Recorremos el array de tarifas desde la más antigua hasta la más reciente
  for (let i = this.tarifasPersHistorial.length - 1; i > 0; i--) {
    const tarifaActual = this.tarifasPersHistorial[i];
    const tarifaSiguiente = this.tarifasPersHistorial[i - 1];

    let aumentoTotalACobrar = 0;
    let aumentoTotalAPagar = 0;
    let numCategorias = 0;

    // Iteramos sobre las secciones y las categorías de cada sección
    tarifaSiguiente.secciones.forEach((seccionSiguiente, seccionIndex) => {
      const seccionActual = tarifaActual.secciones[seccionIndex];

      if (seccionActual) {
        seccionSiguiente.categorias.forEach((categoriaSiguiente, categoriaIndex) => {
          const categoriaActual = seccionActual.categorias[categoriaIndex];

          if (categoriaActual) {
            // Calculamos el aumento de aCobrar
            const aumentoACobrar = ((categoriaSiguiente.aCobrar - categoriaActual.aCobrar) / categoriaActual.aCobrar) * 100;
            aumentoTotalACobrar += aumentoACobrar;

            // Calculamos el aumento de aPagar
            const aumentoAPagar = ((categoriaSiguiente.aPagar - categoriaActual.aPagar) / categoriaActual.aPagar) * 100;
            aumentoTotalAPagar += aumentoAPagar;

            numCategorias++;
          }
        });
      }
    });

    // Calculamos el promedio de aumento para aCobrar y aPagar
    const promedioAumentoACobrar = aumentoTotalACobrar / numCategorias;
    const promedioAumentoAPagar = aumentoTotalAPagar / numCategorias;

    // Guardamos el promedio de los dos aumentos en el índice correspondiente de aumentosPersonalizados
    this.aumentosPersonalizados[i - 1] = (promedioAumentoACobrar + promedioAumentoAPagar) / 2;
  }
      
    }
  }

  mostrarInfo(){
    Swal.fire({
      position: "top-end",
      //icon: "success",
      //title: "Your work has been saved",
      text:"El porcentaje se calcula como un promedio de todas las categorias",
      showConfirmButton: false,
      timer: 10000
    });
  }

  getCliente(id:number){
    let cliente = this.$clientes.filter((c)=> c.idCliente === id)
    console.log(cliente[0].razonSocial);
    
    return cliente[0].razonSocial
  }

}
