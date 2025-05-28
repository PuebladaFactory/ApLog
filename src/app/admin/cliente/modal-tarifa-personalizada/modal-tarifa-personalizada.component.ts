import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { TarifaPersonalizada } from 'src/app/interfaces/operacion';
import { CategoriaTarifa, Seccion, TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
import { FormatoNumericoService } from 'src/app/servicios/formato-numerico/formato-numerico.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-modal-tarifa-personalizada',
    templateUrl: './modal-tarifa-personalizada.component.html',
    styleUrls: ['./modal-tarifa-personalizada.component.scss'],
    standalone: false
})
export class ModalTarifaPersonalizadaComponent implements OnInit {
  
  @Input() fromParent:any;
  $ultimaTarifa!: ConIdType<TarifaPersonalizadaCliente>;  
  modoAutomatico = true;  // por defecto en modo automático
  porcentajeAumento: number = 0; // variable para almacenar el porcentaje
  nuevaTarifa!: ConIdType<TarifaPersonalizadaCliente>;  // suponiendo que ya tienes los datos cargados
  componente: string = "tarifasPersCliente";
  razonSocial: string = ""
  
  constructor(public activeModal: NgbActiveModal, private storageService: StorageService, private formNumServ: FormatoNumericoService){}

  ngOnInit(): void {    
    console.log("0) ", this.fromParent);
    this.nuevaTarifa = this.fromParent.item;    
    this.$ultimaTarifa = structuredClone(this.nuevaTarifa);
    this.razonSocial = this.fromParent.cliente;
  }

  // Método para calcular automáticamente el aumento en las tarifas
  aplicarPorcentaje(): void {
    if (this.modoAutomatico) {
      this.$ultimaTarifa.secciones.forEach(seccion => {
        seccion.categorias.forEach(categoria => {
          // Calcula nuevos valores y limita a dos decimales, luego convierte a número
          //console.log("categoria.aCobrar: ", categoria.aCobrar);
          //console.log("categoria.aPagar: ", categoria.aPagar);
          
          categoria.nuevoACobrar = categoria.aCobrar + (categoria.aCobrar * (this.porcentajeAumento / 100));
          categoria.nuevoAPagar = categoria.aPagar + (categoria.aPagar * (this.porcentajeAumento / 100));
        });
      });
    }
  }
  
  // Método para calcular la diferencia
  calcularDiferencia(valorOriginal: number, nuevoValor: number | null | undefined): number {
    //console.log("valorOriginal: ", valorOriginal, "nuevoValor: ", nuevoValor);
    
    if (nuevoValor === null || nuevoValor === undefined || this.formNumServ.convertirAValorNumerico(nuevoValor) === 0) {
      return 0;  // Devuelve 0 si no hay nuevo valor calculado
    }
    return this.formNumServ.convertirAValorNumerico(nuevoValor) - valorOriginal;
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
    const { id, type, ...data } = this.nuevaTarifa;      
    const tarifaNueva: TarifaPersonalizadaCliente = {
      ...data,
      idTarifa: new Date().getTime(),  // Asignar nuevo idTarifa
      //id: null,
      fecha: new Date().toISOString().split('T')[0],
      secciones: this.$ultimaTarifa.secciones.map(seccion => ({
        ...seccion,
        categorias: seccion.categorias.map(categoria => ({
          ...categoria,
          // Asignamos los valores de nuevoACobrar a aCobrar, y de nuevoAPagar a aPagar
          aCobrar: this.formNumServ.convertirAValorNumerico(categoria.nuevoACobrar),
          aPagar: this.formNumServ.convertirAValorNumerico(categoria.nuevoAPagar),
          // Reseteamos los valores de nuevoACobrar y nuevoAPagar a 0
          nuevoACobrar: 0,
          nuevoAPagar: 0
        }))
      }))
    };
  
    // Aquí puedes guardar o enviar el objeto tarifaNueva
    //console.log("Tarifa Nueva Guardada: ", tarifaNueva);
    console.log("this.nuevaTarifa", this.nuevaTarifa);    
    this.addItem(tarifaNueva)
  }

  addItem(item:TarifaPersonalizadaCliente){
    this.storageService.deleteItem(this.componente, this.nuevaTarifa, this.nuevaTarifa.idTarifa, "INTERNA", "" );
    this.storageService.addItem("historialTarifasPersCliente", this.nuevaTarifa, this.nuevaTarifa.idTarifa, "INTERNA", "" );    
    this.storageService.addItem(this.componente, item, item.idTarifa, "ALTA", `Alta de Tarifa Personalizada para Cliente ${this.razonSocial}`);        
    
  }

  moverTarifa(){
    this.storageService.deleteItem(this.componente, this.nuevaTarifa, this.nuevaTarifa.idTarifa, "INTERNA", "" );
    this.storageService.addItem("historialTarifasPersCliente", this.nuevaTarifa, this.nuevaTarifa.idTarifa, "INTERNA", "" );
  }

  borrarTarifa(){
    this.storageService.deleteItem(this.componente, this.fromParent.item, this.fromParent.item.idTarifa, "INTERNA", "" );
    //this.storageService.addItem("historialTarifasPersCliente", this.nuevaTarifa, this.nuevaTarifa.idTarifa, "INTERNA", "" );
  }


  // Función que convierte un string formateado en un número correcto para cálculos


updateItem(){
  this.$ultimaTarifa.secciones.forEach((seccion:Seccion)=>{
    seccion.categorias.forEach((categoria:CategoriaTarifa)=>{
      categoria.aCobrar = this.formNumServ.convertirAValorNumerico(categoria.aCobrar);
      categoria.aPagar = this.formNumServ.convertirAValorNumerico(categoria.aPagar);
    })
  })
  console.log("TARIFA EDITADA", this.$ultimaTarifa);
  let {id, type, ...tarifa } = this.$ultimaTarifa
  console.log("TARIFA EDITADA v2.0", tarifa);
  this.storageService.updateItem(this.componente, tarifa, this.$ultimaTarifa.idTarifa, "EDITAR", `Tarifa Personalizada para Cliente ${this.razonSocial}, editada`, this.$ultimaTarifa.id);   
}



}
