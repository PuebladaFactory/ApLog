import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-modal-tarifa-personalizada',
  templateUrl: './modal-tarifa-personalizada.component.html',
  styleUrls: ['./modal-tarifa-personalizada.component.scss']
})
export class ModalTarifaPersonalizadaComponent implements OnInit {
  
  @Input() fromParent:any;
  $ultimaTarifa!: TarifaPersonalizadaCliente;  
  modoAutomatico = true;  // por defecto en modo automático
  porcentajeAumento: number = 0; // variable para almacenar el porcentaje
  nuevaTarifa!: TarifaPersonalizadaCliente;  // suponiendo que ya tienes los datos cargados
  componente: string = "tarifasPersCliente"
  
  constructor(public activeModal: NgbActiveModal, private storageService: StorageService){}

  ngOnInit(): void {    
    console.log("0) ", this.fromParent);
    this.$ultimaTarifa = this.fromParent;
    this.nuevaTarifa = this.fromParent;
  }

  // Método para calcular automáticamente el aumento en las tarifas
  aplicarPorcentaje(): void {
    if (this.modoAutomatico) {
      this.$ultimaTarifa.secciones.forEach(seccion => {
        seccion.categorias.forEach(categoria => {
          // Calcula nuevos valores y limita a dos decimales, luego convierte a número
          categoria.nuevoACobrar = parseFloat((categoria.aCobrar + (categoria.aCobrar * (this.porcentajeAumento / 100))).toFixed(2));
          categoria.nuevoAPagar = categoria.aPagar + (categoria.aPagar * (this.porcentajeAumento / 100));
        });
      });
    }
  }
  
  // Método para calcular la diferencia
  calcularDiferencia(valorOriginal: number, nuevoValor: number | null | undefined): number {
    if (nuevoValor === null || nuevoValor === undefined || nuevoValor === 0) {
      return 0;  // Devuelve 0 si no hay nuevo valor calculado
    }
    return nuevoValor - valorOriginal;
  }

  // Cambia entre modos automático y manual
  cambiarModo(modo: 'manual' | 'automatico'): void {
    this.modoAutomatico = modo === 'automatico';
  }

  // Método para generar el objeto final
  onSubmit(): void {
    Swal.fire({
      title: "¿Confirmar el alta de la tarifa?",
      //text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {        
        this.crearTarifa();
        Swal.fire({
          title: "Confirmado",
          text: "Alta exitosa",
          icon: "success"
        })           
      }
    });   
  }
    // Clonamos la tarifa original y actualizamos los valores
   
    crearTarifa(): void {
    const tarifaNueva: TarifaPersonalizadaCliente = {
      ...this.nuevaTarifa,
      idTarifa: new Date().getTime(),  // Asignar nuevo idTarifa
      id: null,
      fecha: new Date().toISOString().split('T')[0],
      secciones: this.$ultimaTarifa.secciones.map(seccion => ({
        ...seccion,
        categorias: seccion.categorias.map(categoria => ({
          ...categoria,
          // Asignamos los valores de nuevoACobrar a aCobrar, y de nuevoAPagar a aPagar
          aCobrar: categoria.nuevoACobrar,
          aPagar: categoria.nuevoAPagar,
          // Reseteamos los valores de nuevoACobrar y nuevoAPagar a 0
          nuevoACobrar: 0,
          nuevoAPagar: 0
        }))
      }))
    };
  
    // Aquí puedes guardar o enviar el objeto tarifaNueva
    console.log("Tarifa Nueva Guardada: ", tarifaNueva);
    this.addItem(tarifaNueva)
  }

  addItem(item:TarifaPersonalizadaCliente){
    this.storageService.addItem(this.componente, item);    
    this.activeModal.close()
  }

}
