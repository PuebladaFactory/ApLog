import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
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

  
  constructor(public activeModal: NgbActiveModal, private fb: FormBuilder){}

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
          // Calcula nuevos valores y los guarda en los campos nuevos
          categoria.nuevoACobrar = categoria.aCobrar + (categoria.aCobrar * (this.porcentajeAumento / 100));
          categoria.nuevoAPagar = categoria.aPagar + (categoria.aPagar * (this.porcentajeAumento / 100));
        });
      });
    }
  }

  // Cambia entre modos automático y manual
  cambiarModo(modo: 'manual' | 'automatico'): void {
    this.modoAutomatico = modo === 'automatico';
  }

  // Método para generar el objeto final
  onSubmit(): void {
    // Guardar los valores de la nueva tarifa
    const tarifaNueva: TarifaPersonalizadaCliente = {
      ...this.nuevaTarifa,
      idTarifa: new Date().getTime(),  // asignar nuevo idTarifa
      secciones: this.$ultimaTarifa.secciones // los nuevos valores ya se habrán calculado o ingresado manualmente
    };
    console.log("Tarifa Nueva: ",tarifaNueva); // Guardar o enviar el objeto nuevaTarifa
  }


   /*  if(this.tEspecial){
      this.filas.controls.forEach((fila, index) => {
              
        const nuevaTarifaControl = fila.get('nuevaTarifa');
        const diferenciaControl = fila.get('diferencia');
        const ultimaTarifaControl = fila.get('ultimaTarifa');
        
        // Habilitar el input para la nueva tarifa
        nuevaTarifaControl?.enable();
    
        // Agregar un listener para calcular la diferencia
        nuevaTarifaControl?.valueChanges.subscribe((nuevoValor) => {
          const ultimaTarifa = ultimaTarifaControl?.value || 0;
          const diferencia = nuevoValor - ultimaTarifa;
          diferenciaControl?.setValue(diferencia);
        });
      });  
    } else{
      this.filas.controls.forEach((fila, index) => {
        if (fila.get('categoria')?.value.includes('Categoria')) {
          fila.get('nombre')?.enable();
        }
        const nuevaTarifaControl = fila.get('nuevaTarifa');
        const diferenciaControl = fila.get('diferencia');
        const ultimaTarifaControl = fila.get('ultimaTarifa');
        
        // Habilitar el input para la nueva tarifa
        nuevaTarifaControl?.enable();
    
        // Agregar un listener para calcular la diferencia
        nuevaTarifaControl?.valueChanges.subscribe((nuevoValor) => {
          const ultimaTarifa = ultimaTarifaControl?.value || 0;
          const diferencia = nuevoValor - ultimaTarifa;
          diferenciaControl?.setValue(diferencia);
        });
      });
    } */
    
  
  
  onGenerarNuevaTarifaAutomatica() {
  /*   this.filas.controls.forEach(fila => {
      if (fila.get('categoria')?.value.includes('Categoria')) {
        fila.get('nombre')?.disable();
      }
      fila.get('nuevaTarifa')?.disable();
    }); */
  }

  calcularNuevaTarifaPorcentaje() {
   /*  const porcentaje = this.porcentajeAumento.value / 100;

    this.filas.controls.forEach(fila => {
      const seleccionadoControl = fila.get('seleccionado');
      const ultimaTarifaControl = fila.get('ultimaTarifa');
      const nuevaTarifaControl = fila.get('nuevaTarifa');
      const diferenciaControl = fila.get('diferencia');

      if (seleccionadoControl?.value) {
        const ultimaTarifa = ultimaTarifaControl?.value || 0;
        const nuevaTarifa = ultimaTarifa * (1 + porcentaje);
        
        nuevaTarifaControl?.setValue(nuevaTarifa.toFixed(2));
        diferenciaControl?.setValue((nuevaTarifa - ultimaTarifa).toFixed(2));
      }
    }); */
  }

/*   onSubmit(){
    if (this.modoAjuste === 'manual') {
      // Tomar los valores manuales ingresados
      this.nuevaTarifa = JSON.parse(JSON.stringify(this.$ultimaTarifa));
    }
    // Guardar la nuevaTarifa en Firebase o donde sea necesario

    // Lógica para guardar nuevaTarifa en Firebase
  } */
  /*   ////console.log()(new Date().getTime());   
    const tarifaSeleccionada = this.getTarifaTipo();    
    if (this.form.valid) {
      if(this.fromParent.modo === "edicion"){
        this.cliente = this.form.value
        this.cliente.idCliente = this.clienteEditar.idCliente;
        this.cliente.id = this.clienteEditar.id;
        this.cliente.contactos = this.contactos;
        //console.log()(this.cliente);     
        this.cliente.tarifaTipo = tarifaSeleccionada; // Asigna el tipo de tarifa
        //console.log(this.cliente);      
        this.addItem("Edicion");        
        this.activeModal.close();    
      }else{
        this.cliente = this.form.value
        this.cliente.idCliente = new Date().getTime();
        this.cliente.contactos = this.contactos;
        //console.log()(this.cliente);     
        this.cliente.tarifaTipo = tarifaSeleccionada; // Asigna el tipo de tarifa
        //console.log(this.cliente);      
        this.addItem("Alta");        
        this.activeModal.close();    
      }      
    } else{
      //alert("error en el formulario")
      Swal.fire({
        icon: "error",
        
        text: "El formulario contiene errores ",
//        
      });

    } 
     */
   
}
