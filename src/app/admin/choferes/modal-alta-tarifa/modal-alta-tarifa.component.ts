import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Chofer } from 'src/app/interfaces/chofer';
import { AdicionalKm, TarifaChofer, TarifaEspecial } from 'src/app/interfaces/tarifa-chofer';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-modal-alta-tarifa',
  templateUrl: './modal-alta-tarifa.component.html',
  styleUrls: ['./modal-alta-tarifa.component.scss']
})
export class ModalAltaTarifaComponent implements OnInit {
  @Input() fromParent: any;
  
  /* form:any;   */
  choferSeleccionado!: Chofer;
  tarifa!:TarifaChofer;  
  componente: string = "tarifasChofer";
  tarifasChofer!: any;
  ultimaTarifa!: TarifaChofer | null;
  porcentaje:boolean = false;
  valor:boolean = false;
  incrementoPorcentual: number = 0;
  formaIngreso: string = 'porcentaje';
  selectAll: boolean = true;
  categorias = [
    { nombre: 'Jornada', seleccionado: true, nuevaTarifa: 0, manual: false, disabled: false },
    { nombre: 'Publicidad', seleccionado: true, nuevaTarifa: 0, manual: false, disabled: false },    
    { nombre: 'Acompañante', seleccionado: true, nuevaTarifa: 0, manual: false, disabled: false },
    { nombre: 'Km 1er Sector distancia', seleccionado: false, nuevaTarifa: 0, manual: false, disabled: true },
    { nombre: 'Km 1er Sector valor', seleccionado: true, nuevaTarifa: 0, manual: false, disabled: false },
    { nombre: 'Km Intervalos distancia', seleccionado: false, nuevaTarifa: 0, manual: false, disabled: true },
    { nombre: 'Km Intervalos valor', seleccionado: true, nuevaTarifa: 0, manual: false, disabled: false },
    { nombre: 'Tarifa Especial Concepto', seleccionado: false, nuevaTarifa: "", manual: false, disabled: true },
    { nombre: 'Tarifa Especial Valor', seleccionado: false, nuevaTarifa: 0, manual: false, disabled: false }
  ];
  nuevaTarifaChofer!: TarifaChofer;

  constructor(public activeModal: NgbActiveModal,  private storageService: StorageService){}
  
  ngOnInit(): void {
    this.choferSeleccionado = this.fromParent.chofer
    this.tarifasChofer = this.fromParent.tarifas    
    this.buscarUltTarifa();  
  }

  buscarUltTarifa(){
    // Encontrar la tarifa con el idTarifa más elevado
    if(this.tarifasChofer.length > 0){
    this.ultimaTarifa = this.tarifasChofer.reduce((tarifaMaxima: { idTarifa: number; }, tarifaActual: { idTarifa: number; }) => {
      return tarifaActual.idTarifa > tarifaMaxima.idTarifa ? tarifaActual : tarifaMaxima;
    });
    } else {
      this.ultimaTarifa = null
    }
    // Ahora, ultimaTarifa contiene la tarifa con el idTarifa más elevado
    //console.log("1) ultima: ", this.ultimaTarifa);    
  }

  onSubmit() {
    this.addItem() 
  }

  addItem(): void {  
    Swal.fire({
      title: "¿Agregar la tarifa?",
      //text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Agregar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        this.guardarTarifa()
        console.log("nueva tarifa: ", this.nuevaTarifaChofer);        
        this.storageService.addItem(this.componente, this.nuevaTarifaChofer); 
        Swal.fire({
          title: "Confirmado",
          text: "La tarifa ha sido agregada.",
          icon: "success"
        }).then((result)=>{
          if (result.isConfirmed) {
            this.activeModal.close();
          }
        });   
        
      }
    });      
    //this.closeModal();
  }  

  closeModal() {
    this.activeModal.close();    
  }

  getUltimaTarifa(categoria: string): number | string {
    // Implementa esta función para obtener el valor correcto según la categoría
    switch (categoria) {
      case 'Jornada':
        return this.ultimaTarifa !== null ? this.ultimaTarifa.valorJornada : 0;
      case 'Publicidad':
        return this.ultimaTarifa !== null ? this.ultimaTarifa.publicidad : 0;      
      case 'Acompañante':
        return this.ultimaTarifa !== null ? this.ultimaTarifa.acompaniante : 0;
      case 'Km 1er Sector distancia':
        return this.ultimaTarifa !== null ? this.ultimaTarifa.km.primerSector.distancia : 0;
      case 'Km 1er Sector valor':
        return this.ultimaTarifa !== null ? this.ultimaTarifa.km.primerSector.valor : 0;
      case 'Km Intervalos distancia':
        return this.ultimaTarifa !== null ? this.ultimaTarifa.km.sectoresSiguientes.intervalo : 0;
      case 'Km Intervalos valor':
        return this.ultimaTarifa !== null ? this.ultimaTarifa.km.sectoresSiguientes.valor : 0;      
      case 'Tarifa Especial Concepto':
        return this.ultimaTarifa !== null ? this.ultimaTarifa.tarifaEspecial.concepto === ''? 'Sin datos': this.ultimaTarifa.tarifaEspecial.concepto : 0;
      case 'Tarifa Especial Valor':
        return this.ultimaTarifa !== null ? (typeof this.ultimaTarifa.tarifaEspecial.valor === 'number'? this.ultimaTarifa.tarifaEspecial.valor : 0) : 0;
      default:
        return 0;
    }
  }

  calcularDiferencia(categoria: string, index: number): number {
    const ultimaTarifa = this.getUltimaTarifa(categoria);
    const nuevaTarifa = this.categorias[index].nuevaTarifa;

    if (typeof ultimaTarifa === 'number' && typeof nuevaTarifa === 'number') {
      return nuevaTarifa - ultimaTarifa;
    }
    return 0;
  }

  toggleSelectAll(event: any): void {
    this.selectAll = event.target.checked;
    this.categorias.forEach(categoria => {
      if (!categoria.disabled) {
        categoria.seleccionado = this.selectAll;
      }
    });
  }

  cambiarFormaIngreso(): void {
    if (this.formaIngreso === 'manual') {
      this.categorias.forEach(categoria => categoria.manual = true);
    } else if (this.formaIngreso === 'porcentaje') {
      this.categorias.forEach(categoria => {
        categoria.manual = false;
        if (categoria.nombre !== 'Tarifa Especial Valor') {
          categoria.disabled = true;
        }
        this.aplicarAumento();
    });
    // Asegurar que 'Tarifa Especial Valor' esté habilitado
    const tarifaEspecialValor = this.categorias.find(c => c.nombre === 'Tarifa Especial Valor');
    if (tarifaEspecialValor) {
      tarifaEspecialValor.disabled = false;
      tarifaEspecialValor.manual = true; // Permitir ingreso manual
    }
  }
  }

  aplicarAumento(): void {
    if (this.formaIngreso === 'porcentaje') {
      this.categorias.forEach(categoria => {
        if (categoria.seleccionado && !categoria.disabled) {
          const ultimaTarifa = this.getUltimaTarifa(categoria.nombre);
          //console.log("ultima TARIFA: ", ultimaTarifa);
          if (typeof ultimaTarifa === 'number') {
            categoria.nuevaTarifa = ultimaTarifa * (1 + this.incrementoPorcentual / 100);
          }
        }
        if (categoria.nombre === 'Km 1er Sector distancia' || categoria.nombre === 'Km Intervalos distancia') {
          // Mantener el valor actual de la última tarifa            
          const ultimaTarifa = this.getUltimaTarifa(categoria.nombre);
          categoria.nuevaTarifa = ultimaTarifa;
        }
      });
    }
  }

  guardarNuevaTarifaCliente(): TarifaChofer {
    
    const adicionalKm: AdicionalKm = {
      primerSector: {
        distancia: this.getNuevaTarifa('Km 1er Sector distancia'),
        valor: this.getNuevaTarifa('Km 1er Sector valor')
      },
      sectoresSiguientes: {
        intervalo: this.getNuevaTarifa('Km Intervalos distancia'),
        valor: this.getNuevaTarifa('Km Intervalos valor')
      }
    };
    const tarifaEspecial: TarifaEspecial = {
      concepto: this.getNuevaTarifa('Tarifa Especial Concepto'),
      valor: this.getNuevaTarifa('Tarifa Especial Valor')
    };

    const nuevaTarifaChofer: TarifaChofer = {
      id: null,
      idTarifa: new Date().getTime(),
      idChofer: this.choferSeleccionado.idChofer,
      fecha: new Date().toISOString().split('T')[0],
      valorJornada: this.getNuevaTarifa('Jornada'),
      acompaniante: this.getNuevaTarifa('Acompañante'),
      publicidad: this.getNuevaTarifa('Publicidad'),
      km : adicionalKm,
      tarifaEspecial: tarifaEspecial,
    };

    return nuevaTarifaChofer;
  }

  getNuevaTarifa(categoria: string): any {
    const cat = this.categorias.find(c => c.nombre === categoria);
    return cat ? cat.nuevaTarifa : 0;
  }

  guardarTarifa() {
    this.nuevaTarifaChofer = this.guardarNuevaTarifaCliente();
  }

}
