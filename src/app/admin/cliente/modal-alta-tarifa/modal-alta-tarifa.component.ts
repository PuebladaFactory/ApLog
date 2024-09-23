import { Component, Input, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Cliente } from 'src/app/interfaces/cliente';
import { AdicionalKm, AdicionalTarifa, TarifaCliente, TarifaEspecial } from 'src/app/interfaces/tarifa-cliente';
import { CategoriaTarifa, TarifaGralCliente, TarifaTipo } from 'src/app/interfaces/tarifa-gral-cliente';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-modal-alta-tarifa',
  templateUrl: './modal-alta-tarifa.component.html',
  styleUrls: ['./modal-alta-tarifa.component.scss']
})
export class ModalAltaTarifaComponent implements OnInit {
 tarifaForm: FormGroup;
  tarifasGralCliente!: TarifaGralCliente []; // Este es el objeto que obtienes de Firebase
  ultTarifa!: TarifaGralCliente;
  porcentajeAumento: FormControl = new FormControl(0); // Para el aumento porcentual
  nuevaTarifaGral!: TarifaGralCliente;
  componente: string ="tarifasGralCliente";
  esAutomatico: boolean = true;  // Selección automática por defecto

  constructor(private fb: FormBuilder, private storageService: StorageService, private dbFirebase: DbFirestoreService) {
    this.tarifaForm = this.fb.group({
      filas: this.fb.array([]), // Array de filas
      seleccionarTodos: [false] // Checkbox para seleccionar todos
    });
  }

  ngOnInit() {
   /*  this.storageService.ultTarifaGralCliente$.subscribe(data =>{
      //console.log("data: ", data);                
      this.ultTarifa = data;
      //console.log("1) ult tarifa: ",this.ultTarifa);        
      this.resetTable();  // Limpia los datos existentes de la tabla
      this.inicializarTabla();
      this.onGenerarNuevaTarifaAutomatica();   
    })       */        
  }

/*   // Método para resetear la tabla
  resetTable() {
    this.filas.clear(); // Limpia el FormArray
  }

  inicializarTabla() {
    const categorias = [
      { categoria: 'Categoria 1', valorAnterior: this.ultTarifa?.cargasGenerales.categoria1.valor || 0, nombreAnterior: this.ultTarifa?.cargasGenerales.categoria1.nombre || '' },
      { categoria: 'Categoria 2', valorAnterior: this.ultTarifa?.cargasGenerales.categoria2.valor || 0, nombreAnterior: this.ultTarifa?.cargasGenerales.categoria2.nombre || '' },
      { categoria: 'Categoria 3', valorAnterior: this.ultTarifa?.cargasGenerales.categoria3.valor || 0, nombreAnterior: this.ultTarifa?.cargasGenerales.categoria3.nombre || '' },
      { categoria: 'Categoria 4', valorAnterior: this.ultTarifa?.cargasGenerales.categoria4.valor || 0, nombreAnterior: this.ultTarifa?.cargasGenerales.categoria4.nombre || '' },
      { categoria: 'Categoria 5', valorAnterior: this.ultTarifa?.cargasGenerales.categoria5.valor || 0, nombreAnterior: this.ultTarifa?.cargasGenerales.categoria5.nombre || '' },
      { categoria: 'Categoria 6', valorAnterior: this.ultTarifa?.cargasGenerales.categoria6.valor || 0, nombreAnterior: this.ultTarifa?.cargasGenerales.categoria6.nombre || '' },
      { categoria: 'Categoria 7', valorAnterior: this.ultTarifa?.cargasGenerales.categoria7.valor || 0, nombreAnterior: this.ultTarifa?.cargasGenerales.categoria7.nombre || '' },
      { categoria: 'Categoria 8', valorAnterior: this.ultTarifa?.cargasGenerales.categoria8.valor || 0, nombreAnterior: this.ultTarifa?.cargasGenerales.categoria8.nombre || '' },
      { categoria: 'Acompañante', valorAnterior: this.ultTarifa?.adicionales.acompaniante || 0, nombreAnterior: '' },
      { categoria: 'Km 1er Sector distancia', valorAnterior: this.ultTarifa?.adicionales.adicionalKm.primerSector.distancia || 0, nombreAnterior: '' },
      { categoria: 'Km 1er Sector valor', valorAnterior: this.ultTarifa?.adicionales.adicionalKm.primerSector.valor || 0, nombreAnterior: '' },
      { categoria: 'Km Intervalos distancia', valorAnterior: this.ultTarifa?.adicionales.adicionalKm.sectoresSiguientes.intervalo || 0, nombreAnterior: '' },
      { categoria: 'Km Intervalos valor', valorAnterior: this.ultTarifa?.adicionales.adicionalKm.sectoresSiguientes.valor || 0, nombreAnterior: '' },
    ];
  
    categorias.forEach((cat, index) => {
      const isManualEnabled = this.isManualMethodSelected;
      const isNombreInputEnabled = index < 8 && isManualEnabled;
      this.filas.push(this.fb.group({
        seleccionado: [(index < 8 || index === 8 || index === 10 || index === 12) ? true : false], // Selecciona todos menos los indicados
        categoria: [cat.categoria],
        nombre: [{ value: cat.nombreAnterior, disabled: !isNombreInputEnabled }],
        ultimaTarifa: [{ value: cat.valorAnterior, disabled: true }],
        diferencia: [{ value: 0, disabled: true }],
        nuevaTarifa: [{ value: (cat.categoria === 'Km 1er Sector distancia' || cat.categoria === 'Km Intervalos distancia') ? cat.valorAnterior : 0, disabled: false }]
      }));
    });
  }

  get isManualMethodSelected(): boolean {
    return this.filas.controls.some(fila => !fila.get('nuevaTarifa')?.disabled);
  }

  get filas() {
    return this.tarifaForm.get('filas') as FormArray;
  }

  esInputNombreDeshabilitado(categoria: string): boolean {
    return [
      'Acompañante', 'Km 1er Sector distancia', 'Km 1er Sector valor', 'Km Intervalos distancia', 'Km Intervalos valor'
    ].includes(categoria);
  }

  calcularNuevaTarifaPorcentaje() {
    const porcentaje = this.porcentajeAumento.value / 100;

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
    });
  }

  onSeleccionarTodosChange(event: any) {
    const checked = event.target.checked;
    this.filas.controls.forEach(fila => {
      const seleccionadoControl = fila.get('seleccionado');
      seleccionadoControl?.setValue(checked);
      if (checked) {
        fila.get('nuevaTarifa')?.enable();
      } else {
        fila.get('nuevaTarifa')?.disable();
      }
    });
  }
  
  
  onGenerarNuevaTarifaManual() {
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
  }
  
  onGenerarNuevaTarifaAutomatica() {
    this.filas.controls.forEach(fila => {
      if (fila.get('categoria')?.value.includes('Categoria')) {
        fila.get('nombre')?.disable();
      }
      fila.get('nuevaTarifa')?.disable();
    });
  }

  guardarTarifa() {
    // Aquí podrías implementar la lógica para guardar la nueva tarifa en Firebase
    this.configurarNuevaTarifa();
    this.addItem();
      // Reinicializa la tabla
    this.resetTable();
    this.inicializarTabla();
    this.onGenerarNuevaTarifaAutomatica();

    // Limpia los campos de nuevaTarifa, excepto para las filas específicas
    this.filas.controls.forEach((fila, index) => {
        if (fila.get('categoria')?.value !== 'Km 1er Sector distancia' && fila.get('categoria')?.value !== 'Km Intervalos distancia') {
            fila.get('nuevaTarifa')?.setValue(0);
            fila.get('diferencia')?.setValue(0);
        }
    });
    
  }

  configurarNuevaTarifa() {
    const filas = this.tarifaForm.get('filas') as FormArray;

    // Construcción del objeto `CargasGenerales` basado en los datos del formulario
    const cargasGenerales: CargasGenerales = {
      categoria1: this.crearCategoriaTarifa(filas.at(0)),
      categoria2: this.crearCategoriaTarifa(filas.at(1)),
      categoria3: this.crearCategoriaTarifa(filas.at(2)),
      categoria4: this.crearCategoriaTarifa(filas.at(3)),
      categoria5: this.crearCategoriaTarifa(filas.at(4)),
      categoria6: this.crearCategoriaTarifa(filas.at(5)),
      categoria7: this.crearCategoriaTarifa(filas.at(6)),
      categoria8: this.crearCategoriaTarifa(filas.at(7)),
    };

    // Construcción del objeto `AdicionalTarifa` basado en los datos del formulario
    const adicionales: AdicionalTarifa = {
      acompaniante: filas.at(8).get('nuevaTarifa')?.value || 0,
      adicionalKm: {
        primerSector: {
          distancia: filas.at(9).get('nuevaTarifa')?.value || 0,
          valor: filas.at(10).get('nuevaTarifa')?.value || 0,
        },
        sectoresSiguientes: {
          intervalo: filas.at(11).get('nuevaTarifa')?.value || 0,
          valor: filas.at(12).get('nuevaTarifa')?.value || 0,
        }
      }
    };

    // Configuración del tipo de tarifa
    const tipo: TarifaTipo = {
      general: true, // Este tipo de tarifa es general
      especial: false,
      eventual: false,
      personalizada: false,
    };

    // Construcción del objeto `TarifaGralCliente`
    this.nuevaTarifaGral = {
      id: null,
      idTarifa: new Date().getTime(),
      fecha: new Date().toISOString().split('T')[0],
      cargasGenerales: cargasGenerales,
      adicionales: adicionales,
      tipo: tipo,
      idCliente: null,
    };

    console.log(this.nuevaTarifaGral);
  }

  crearCategoriaTarifa(control: AbstractControl): CategoriaTarifa {
    return {
      nombre: control.get('nombre')?.value || '',
      valor: control.get('nuevaTarifa')?.value || 0
    };
  }

  addItem(){
    this.storageService.addItem(this.componente, this.nuevaTarifaGral);     
   
  }
 */
}
