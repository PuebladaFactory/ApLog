import { Component, Input, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { take } from 'rxjs';
import { AdicionalTarifa, CargasGenerales, CategoriaTarifa, TarifaGralCliente, TarifaTipo } from 'src/app/interfaces/tarifa-gral-cliente';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cliente-tarifa-gral',
  templateUrl: './cliente-tarifa-gral.component.html',
  styleUrls: ['./cliente-tarifa-gral.component.scss']
})
export class ClienteTarifaGralComponent implements OnInit {

  @Input() tEspecial!: boolean;
  @Input() idClienteEsp!:number;

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
    this.tEspecial = false
  }

  ngOnInit() {
    //console.log(this.tEspecial!);
    if(!this.tEspecial){
      console.log("1a)",this.tEspecial);
      console.log("2a)",this.idClienteEsp);
      this.storageService.ultTarifaGralCliente$.subscribe(data =>{
        console.log("data: ", data);                
        this.ultTarifa = data;
        console.log("1) ult tarifa: ",this.ultTarifa);        
        this.resetTable();  // Limpia los datos existentes de la tabla
        this.inicializarTabla();
        this.onGenerarNuevaTarifaAutomatica();   
      })              
    } else if(this.tEspecial){
      console.log("1b)",this.tEspecial);
      console.log("2b)",this.idClienteEsp);
      this.storageService.getElemntByIdLimit("tarifasEspCliente","idCliente","idTarifa",this.idClienteEsp,"ultTarifaEspCliente")
      this.storageService.ultTarifaEspCliente$
      //.pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
      .subscribe(data =>{
        console.log("data: ", data);                
        this.ultTarifa = data;
        console.log("1) ult tarifa: ",this.ultTarifa);        
        this.resetTable();  // Limpia los datos existentes de la tabla
        this.inicializarTabla();
        this.onGenerarNuevaTarifaAutomatica();   
      })    
        
   /*      this.dbFirebase
          .obtenerTarifaMasReciente("tarifasEspCliente",this.idClienteEsp,"idCliente", "idTarifa")
          .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
          .subscribe(data => {      
            console.log("data: ", data);                
            this.ultTarifa = data;
            console.log("1) ult tarifa: ",this.ultTarifa);        
          }); */
        
    }
    
    
  }

  // Método para resetear la tabla
  resetTable() {
    this.filas.clear(); // Limpia el FormArray
  }

  inicializarTabla() {
    const categorias = [
      { categoria: 'Categoria 1', valorAnterior: this.ultTarifa?.cargasGenerales?.categoria1?.valor || 0, nombreAnterior: this.ultTarifa?.cargasGenerales?.categoria1?.nombre || '' },
      { categoria: 'Categoria 2', valorAnterior: this.ultTarifa?.cargasGenerales?.categoria2?.valor || 0, nombreAnterior: this.ultTarifa?.cargasGenerales?.categoria2?.nombre || '' },
      { categoria: 'Categoria 3', valorAnterior: this.ultTarifa?.cargasGenerales?.categoria3?.valor || 0, nombreAnterior: this.ultTarifa?.cargasGenerales?.categoria3?.nombre || '' },
      { categoria: 'Categoria 4', valorAnterior: this.ultTarifa?.cargasGenerales?.categoria4?.valor || 0, nombreAnterior: this.ultTarifa?.cargasGenerales?.categoria4?.nombre || '' },
      { categoria: 'Categoria 5', valorAnterior: this.ultTarifa?.cargasGenerales?.categoria5?.valor || 0, nombreAnterior: this.ultTarifa?.cargasGenerales?.categoria5?.nombre || '' },
      { categoria: 'Categoria 6', valorAnterior: this.ultTarifa?.cargasGenerales?.categoria6?.valor || 0, nombreAnterior: this.ultTarifa?.cargasGenerales?.categoria6?.nombre || '' },
      { categoria: 'Categoria 7', valorAnterior: this.ultTarifa?.cargasGenerales?.categoria7?.valor || 0, nombreAnterior: this.ultTarifa?.cargasGenerales?.categoria7?.nombre || '' },
      { categoria: 'Categoria 8', valorAnterior: this.ultTarifa?.cargasGenerales?.categoria8?.valor || 0, nombreAnterior: this.ultTarifa?.cargasGenerales?.categoria8?.nombre || '' },
      { categoria: 'Acompañante', valorAnterior: this.ultTarifa?.adicionales?.acompaniante || 0, nombreAnterior: '' },
      { categoria: 'Km 1er Sector distancia', valorAnterior: this.ultTarifa?.adicionales?.adicionalKm?.primerSector?.distancia || 0, nombreAnterior: '' },
      { categoria: 'Km 1er Sector valor', valorAnterior: this.ultTarifa?.adicionales?.adicionalKm?.primerSector?.valor || 0, nombreAnterior: '' },
      { categoria: 'Km Intervalos distancia', valorAnterior: this.ultTarifa?.adicionales?.adicionalKm?.sectoresSiguientes?.intervalo || 0, nombreAnterior: '' },
      { categoria: 'Km Intervalos valor', valorAnterior: this.ultTarifa?.adicionales?.adicionalKm?.sectoresSiguientes?.valor || 0, nombreAnterior: '' },
    ];
  
    categorias.forEach((cat, index) => {
      const isManualEnabled = this.isManualMethodSelected;
      const isNombreInputEnabled = index < 8 && isManualEnabled;
      this.filas.push(this.fb.group({
        seleccionado: [(index < 8 || index === 8 || index === 10 || index === 12) ? true : false], 
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
  
  /* onGenerarNuevaTarifaManual() {
    this.filas.controls.forEach(fila => {
      if (fila.get('categoria')?.value.includes('Categoria')) {
        fila.get('nombre')?.enable();
      }
      fila.get('nuevaTarifa')?.enable();
    });
  } */
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
    Swal.fire({
      title: "¿Confirmar el alta del Cliente?",
      //text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {        
        this.addItem()
        Swal.fire({
          title: "Confirmado",
          text: "Alta exitosa",
          icon: "success"
        }).then((result)=>{
          if (result.isConfirmed) {
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
        });   
        
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
    //console.log("1)",this.tEspecial);
    if(!this.tEspecial){
      this.storageService.addItem(this.componente, this.nuevaTarifaGral);     
    }else if(this.tEspecial){
      this.nuevaTarifaGral.idCliente = this.idClienteEsp;
      this.nuevaTarifaGral.tipo.general = false;
      this.nuevaTarifaGral.tipo.especial = true;
      this.storageService.addItem("tarifasEspCliente", this.nuevaTarifaGral);     
    }
    //
   
  }


}
