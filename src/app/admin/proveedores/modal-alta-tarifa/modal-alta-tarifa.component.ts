import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { TarifaCliente } from 'src/app/interfaces/tarifa-cliente';
import { AdicionalKm, AdicionalTarifa, CargasGenerales, TarifaEspecial, TarifaProveedor } from 'src/app/interfaces/tarifa-proveedor';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-modal-alta-tarifa',
  templateUrl: './modal-alta-tarifa.component.html',
  styleUrls: ['./modal-alta-tarifa.component.scss']
})
export class ModalAltaTarifaComponent implements OnInit{
  @Input() fromParent: any;
  /* form:any;   */
  proveedorSeleccionado!: Proveedor;
  tarifa!:TarifaProveedor;  
  componente: string = "tarifasProveedor";
  tarifasCliente!: any;
  ultimaTarifa!: TarifaProveedor | null;
  porcentaje:boolean = false;
  valor:boolean = false;
  incrementoPorcentual: number = 0;
  formaIngreso: string = 'porcentaje';
  selectAll: boolean = true;
  categorias = [
    { nombre: 'Utilitario', seleccionado: true, nuevaTarifa: 0, manual: false, disabled: false },
    { nombre: 'Furgon', seleccionado: true, nuevaTarifa: 0, manual: false, disabled: false },
    { nombre: 'Furgon Grande', seleccionado: true, nuevaTarifa: 0, manual: false, disabled: false },
    { nombre: 'Chasis Liviano', seleccionado: true, nuevaTarifa: 0, manual: false, disabled: false },
    { nombre: 'Chasis', seleccionado: true, nuevaTarifa: 0, manual: false, disabled: false },
    { nombre: 'Balancin', seleccionado: true, nuevaTarifa: 0, manual: false, disabled: false },
    { nombre: 'Semi Remolque Local', seleccionado: true, nuevaTarifa: 0, manual: false, disabled: false },
    { nombre: 'Portacontenedores', seleccionado: true, nuevaTarifa: 0, manual: false, disabled: false },
    { nombre: 'Acompañante', seleccionado: true, nuevaTarifa: 0, manual: false, disabled: false },
    { nombre: 'Km 1er Sector distancia', seleccionado: false, nuevaTarifa: 0, manual: false, disabled: true },
    { nombre: 'Km 1er Sector valor', seleccionado: true, nuevaTarifa: 0, manual: false, disabled: false },
    { nombre: 'Km Intervalos distancia', seleccionado: false, nuevaTarifa: 0, manual: false, disabled: true },
    { nombre: 'Km Intervalos valor', seleccionado: true, nuevaTarifa: 0, manual: false, disabled: false },
    { nombre: 'Tarifa Especial Concepto', seleccionado: false, nuevaTarifa: "", manual: false, disabled: true },
    { nombre: 'Tarifa Especial Valor', seleccionado: false, nuevaTarifa: 0, manual: false, disabled: false }
  ];
  nuevaTarifaCliente!: TarifaProveedor;

  constructor(public activeModal: NgbActiveModal,  private storageService: StorageService){}
  
  ngOnInit(): void {
    this.proveedorSeleccionado = this.fromParent.proveedor
    this.tarifasCliente = this.fromParent.tarifas    
    this.buscarUltTarifa();    
  }

  buscarUltTarifa(){
    // Encontrar la tarifa con el idTarifa más elevado
    if(this.tarifasCliente.length > 0){
    this.ultimaTarifa = this.tarifasCliente.reduce((tarifaMaxima: { idTarifa: number; }, tarifaActual: { idTarifa: number; }) => {
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
        console.log("nueva tarifa: ", this.nuevaTarifaCliente);        
        this.storageService.addItem(this.componente, this.nuevaTarifaCliente); 
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
      case 'Utilitario':
        return this.ultimaTarifa !== null ? this.ultimaTarifa.cargasGenerales.utilitario : 0;
      case 'Furgon':
        return this.ultimaTarifa !== null ? this.ultimaTarifa.cargasGenerales.furgon : 0;
      case 'Furgon Grande':
        return this.ultimaTarifa !== null ? this.ultimaTarifa.cargasGenerales.furgonGrande : 0;
      case 'Chasis Liviano':
        return this.ultimaTarifa !== null ? this.ultimaTarifa.cargasGenerales.chasisLiviano : 0;
      case 'Chasis':
        return this.ultimaTarifa !== null ? this.ultimaTarifa.cargasGenerales.chasis : 0;
      case 'Balancin':
        return this.ultimaTarifa !== null ? this.ultimaTarifa.cargasGenerales.balancin : 0;
      case 'Semi Remolque Local':
        return this.ultimaTarifa !== null ? this.ultimaTarifa.cargasGenerales.semiRemolqueLocal : 0;
      case 'Portacontenedores':
        return this.ultimaTarifa !== null ? this.ultimaTarifa.cargasGenerales.portacontenedores : 0;
      case 'Acompañante':
        return this.ultimaTarifa !== null ? this.ultimaTarifa.adicionales.acompaniante : 0;
      case 'Km 1er Sector distancia':
        return this.ultimaTarifa !== null ? this.ultimaTarifa.adicionales.adicionalKm.primerSector.distancia : 0;
      case 'Km 1er Sector valor':
        return this.ultimaTarifa !== null ? this.ultimaTarifa.adicionales.adicionalKm.primerSector.valor : 0;
      case 'Km Intervalos distancia':
        return this.ultimaTarifa !== null ? this.ultimaTarifa.adicionales.adicionalKm.sectoresSiguientes.intervalo : 0;
      case 'Km Intervalos valor':
        return this.ultimaTarifa !== null ? this.ultimaTarifa.adicionales.adicionalKm.sectoresSiguientes.valor : 0;      
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

  guardarNuevaTarifaCliente(): TarifaProveedor {
    const cargasGenerales: CargasGenerales = {
      utilitario: this.getNuevaTarifa('Utilitario'),
      furgon: this.getNuevaTarifa('Furgon'),
      furgonGrande: this.getNuevaTarifa('Furgon Grande'),
      chasisLiviano: this.getNuevaTarifa('Chasis Liviano'),
      chasis: this.getNuevaTarifa('Chasis'),
      balancin: this.getNuevaTarifa('Balancin'),
      semiRemolqueLocal: this.getNuevaTarifa('Semi Remolque Local'),
      portacontenedores: this.getNuevaTarifa('Portacontenedores')
    };

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

    const adicionales: AdicionalTarifa = {
      acompaniante: this.getNuevaTarifa('Acompañante'),
      adicionalKm: adicionalKm
    };

    const tarifaEspecial: TarifaEspecial = {
      concepto: this.getNuevaTarifa('Tarifa Especial Concepto'),
      valor: this.getNuevaTarifa('Tarifa Especial Valor')
    };

    const nuevaTarifaProveedor: TarifaProveedor = {
      id: null,
      idTarifaProveedor: new Date().getTime(),
      idProveedor: this.proveedorSeleccionado.idProveedor,
      fecha: new Date().toISOString().split('T')[0],
      cargasGenerales: cargasGenerales,
      adicionales: adicionales,
      tarifaEspecial: tarifaEspecial
    };

    return nuevaTarifaProveedor;
  }

  getNuevaTarifa(categoria: string): any {
    const cat = this.categorias.find(c => c.nombre === categoria);
    return cat ? cat.nuevaTarifa : 0;
  }

  guardarTarifa() {
    this.nuevaTarifaCliente = this.guardarNuevaTarifaCliente();
  }

}
