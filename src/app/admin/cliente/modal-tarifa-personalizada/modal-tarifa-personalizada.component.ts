import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { CategoriaTarifa, Seccion, TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
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
    this.$ultimaTarifa = this.fromParent.item;
    this.nuevaTarifa = this.fromParent.item;
  }

  // Método para calcular automáticamente el aumento en las tarifas
  aplicarPorcentaje(): void {
    if (this.modoAutomatico) {
      this.$ultimaTarifa.secciones.forEach(seccion => {
        seccion.categorias.forEach(categoria => {
          // Calcula nuevos valores y limita a dos decimales, luego convierte a número
          categoria.nuevoACobrar = categoria.aCobrar + (categoria.aCobrar * (this.porcentajeAumento / 100));
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
    if(this.fromParent.modo === 'aumentar'){
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
          }).then((result)=>{
            if (result.isConfirmed) {
              this.activeModal.close();
            }
          });                   
        }
      });     
    } else {
      Swal.fire({
        title: "¿Confirmar los cambios en la tarifa?",
        //text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Confirmar",
        cancelButtonText: "Cancelar"
      }).then((result) => {
        if (result.isConfirmed) {        
          this.updateItem();
          Swal.fire({
            title: "Confirmado",
            text: "Alta exitosa",
            icon: "success"
          }).then((result)=>{
            if (result.isConfirmed) {
              this.activeModal.close();
            }
          });                   
        }
      }); 
    }
      
      
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
  }

  formatearValor(valor: number) : any{
    let nuevoValor =  new Intl.NumberFormat('es-ES', { 
     minimumFractionDigits: 2, 
     maximumFractionDigits: 2 
   }).format(valor);
   //////console.log(nuevoValor);    
   return nuevoValor
 }

  // Función que convierte un string formateado en un número correcto para cálculos
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

updateItem(){
  this.$ultimaTarifa.secciones.forEach((seccion:Seccion)=>{
    seccion.categorias.forEach((categoria:CategoriaTarifa)=>{
      categoria.aCobrar = this.limpiarValorFormateado(categoria.aCobrar);
      categoria.aPagar = this.limpiarValorFormateado(categoria.aPagar);
    })
  })
  console.log("TARIFA EDITADA", this.$ultimaTarifa);
  this.storageService.updateItem(this.componente, this.$ultimaTarifa);   
}

}
