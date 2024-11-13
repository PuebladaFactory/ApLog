import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { CategoriaTarifa, TarifaGralCliente, TarifaTipo } from 'src/app/interfaces/tarifa-gral-cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-historial-tarifas-gral',
  templateUrl: './historial-tarifas-gral.component.html',
  styleUrls: ['./historial-tarifas-gral.component.scss']
})
export class HistorialTarifasGralComponent implements OnInit {
  
  @Input() fromParent:any;;
  tarifasHistorial: TarifaGralCliente[] = [];
  $clientes!: Cliente[];
  $choferes!: Chofer[];
  $proveedores!: Proveedor[];
  aumentos: number[] = [];  // Array para almacenar el % de aumento entre tarifas consecutivas
  

  constructor(private storageService: StorageService, public activeModal: NgbActiveModal) {}

  ngOnInit(): void {    
 
    console.log("0)", this.fromParent);
    this.storageService.choferes$.subscribe(data => {
      this.$choferes = data;      
    });
    this.storageService.clientes$.subscribe(data => {
      this.$clientes = data;      
    }); 
    this.storageService.proveedores$.subscribe(data => {
      this.$proveedores = data;            
    })   
    
    switch(this.fromParent.modo){
      case 'clientes':
        if (!this.fromParent.tEspecial) {
          this.storageService.getAllSortedLimit('tarifasGralCliente', 'idTarifa', 'desc', 10, 'historialTarifaGralCliente');
        } else {
          this.storageService.getAllSortedIdLimit('tarifasEspCliente', 'idCliente', this.fromParent.id, 'idTarifa', 'desc', 5, 'historialTarifaGralCliente');
        }

        this.storageService.historialTarifaGralCliente$.subscribe((tarifas: TarifaGralCliente[]) => {
          this.tarifasHistorial = tarifas.sort((a, b) => b.idTarifa - a.idTarifa);
          this.calcularAumentos();
        });
        break;

      case "choferes":{
        if (!this.fromParent.tEspecial) {
          this.storageService.getAllSortedLimit('tarifasGralChofer', 'idTarifa', 'desc', 10, 'historialTarifaGralChofer');
        } else {
          this.storageService.getAllSortedIdLimit('tarifasEspChofer', 'idChofer', this.fromParent.id, 'idTarifa', 'desc', 5, 'historialTarifaGralChofer');
        }

        this.storageService.historialTarifaGralChofer$.subscribe((tarifas: TarifaGralCliente[]) => {
          this.tarifasHistorial = tarifas.sort((a, b) => b.idTarifa - a.idTarifa);
          this.calcularAumentos();
        });
        
        break
      };
      case "proveedores":{
        if (!this.fromParent.tEspecial) {
          this.storageService.getAllSortedLimit('tarifasGralProveedor', 'idTarifa', 'desc', 10, 'historialTarifaGralProveedor');
        } else {
          this.storageService.getAllSortedIdLimit('tarifasEspProveedor', 'idProveedor', this.fromParent.id, 'idTarifa', 'desc', 5, 'historialTarifaGralProveedor');
        }

        this.storageService.historialTarifaGralProveedor$.subscribe((tarifas: TarifaGralCliente[]) => {
          this.tarifasHistorial = tarifas.sort((a, b) => b.idTarifa - a.idTarifa);
          this.calcularAumentos();
        });
        
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

  formatearValor(valor: number) : any{
    let nuevoValor =  new Intl.NumberFormat('es-ES', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }).format(valor);
  ////////////console.log(nuevoValor);    
  return nuevoValor
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
  }

}
