import { Component, Input, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl } from '@angular/forms';
import { AdicionalTarifa, CategoriaTarifa, TarifaGralChofer } from 'src/app/interfaces/tarifa-gral-chofer';
import { TarifaGralCliente, TarifaTipo } from 'src/app/interfaces/tarifa-gral-cliente';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-choferes-tarifa-gral',
  templateUrl: './choferes-tarifa-gral.component.html',
  styleUrls: ['./choferes-tarifa-gral.component.scss']
})
export class ChoferesTarifaGralComponent implements OnInit {

  @Input() tEspecial!: boolean;
  @Input() idChoferEsp!:any;
  @Input() idClienteEsp!:any;

  tarifaForm!:any; 
  ultTarifaCliente!: TarifaGralCliente; 
  ultTarifaEspecial!: TarifaGralChofer;
  ultTarifaGralChofer!: TarifaGralChofer;
  porcentajeAumento: FormControl = new FormControl(0); // Para el aumento porcentual
  categoria!: CategoriaTarifa;
  categorias: CategoriaTarifa[] = [];
  nuevaTarifaGral!: TarifaGralChofer;
  componente: string ="tarifasGralChofer";

  constructor(private fb: FormBuilder, private storageService: StorageService, private dbFirebase: DbFirestoreService) {
    this.tarifaForm = this.fb.group({
      filas: this.fb.array([]), // Array de filas
      seleccionarTodos: [false] // Checkbox para seleccionar todos
    });
    this.tEspecial = false
  }
  ngOnInit(): void { 
    console.log("0)",this.tEspecial);
    //console.log("0)",this.idChoferEsp);
    //console.log("0)",this.idClienteEsp);
    this.storageService.choferSeleccionado$.subscribe(data => {      ///
      this.idChoferEsp = data
      //console.log("0A)",this.idChoferEsp);
      if(this.tEspecial){
        this.storageService.getElemntByIdLimit("tarifasEspChofer","idChofer","idTarifa",this.idChoferEsp[0],"ultTarifaEspChofer");
      }
    });
    this.storageService.clienteSeleccionado$.subscribe(data => {      
      this.idClienteEsp = data
      //console.log("0B)",this.idClienteEsp);
    })
    
    this.storageService.ultTarifaGralCliente$.subscribe(data =>{
      ////console.log("data: ", data);                
      this.ultTarifaCliente = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
      this.ultTarifaCliente.cargasGenerales = this.ultTarifaCliente.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
      ////console.log("1) ult tarifa GRAL CLIENTE: ",this.ultTarifaCliente);        
      this.storageService.ultTarifaGralChofer$.subscribe(data =>{
        this.ultTarifaGralChofer = data || {};
        this.ultTarifaGralChofer.cargasGenerales = this.ultTarifaGralChofer.cargasGenerales || [];
        ////console.log("2) ult tarifa GRAL CHOFER: ", this.ultTarifaGralChofer);
        this.configurarTabla();
      })
    });                  
    
  }

  configurarTabla(){
    if(this.tEspecial){
      ////console.log("3a) tarifa especial: ", this.tEspecial);      
      ////console.log("3b) tarifa general: ", this.ultTarifaCliente);      
      this.storageService.ultTarifaEspChofer$
      //.pipe(take(2)) // Asegúrate de que la suscripción se complete después de la primera emisión
      .subscribe(data =>{
      ////console.log("2c) data: ", data);                
      this.ultTarifaEspecial = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
      this.ultTarifaEspecial.cargasGenerales = this.ultTarifaEspecial.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
      //console.log("2d) ult tarifa ESP: ",this.ultTarifaEspecial);        
      this.resetTable();  // Limpia los datos existentes de la tabla;
      this.crearCategorias()
      this.inicializarTabla();
      this.onGenerarNuevaTarifaAutomatica();   
    })
    }else{
      ////console.log("1a) tarifa especial: ", this.tEspecial);      
      ////console.log("1b) tarifa general: ", this.ultTarifaCliente);      
      this.resetTable();  // Limpia los datos existentes de la tabla
      this.crearCategorias()
      this.inicializarTabla();
      this.onGenerarNuevaTarifaAutomatica();   
    }
  }

  crearCategorias(){
    this.categorias = []
    for(let i=0; i<8; i++ ){
      this.categoria ={
        orden: i+1,
        nombre: "",
        valor: 0,
      }
      this.categorias.push(this.categoria);
    }
    ////console.log(this.categorias);      
  }

  // Método para resetear la tabla
  resetTable() {
    this.filas.clear(); // Limpia el FormArray
  }

  inicializarTabla() {
    const categorias = [
      { categoria: 'Categoria 1', valorAnterior: this.tEspecial? this.ultTarifaEspecial?.cargasGenerales[0]?.valor : this.ultTarifaGralChofer?.cargasGenerales[0]?.valor || 0, nombreAnterior: this.ultTarifaCliente?.cargasGenerales[0]?.nombre || '' },
      { categoria: 'Categoria 2', valorAnterior: this.tEspecial? this.ultTarifaEspecial.cargasGenerales[1]?.valor : this.ultTarifaGralChofer?.cargasGenerales[1]?.valor || 0, nombreAnterior: this.ultTarifaCliente.cargasGenerales[1]?.nombre || '' },
      { categoria: 'Categoria 3', valorAnterior: this.tEspecial? this.ultTarifaEspecial.cargasGenerales[2]?.valor : this.ultTarifaGralChofer?.cargasGenerales[2]?.valor || 0, nombreAnterior: this.ultTarifaCliente.cargasGenerales[2]?.nombre || '' },
      { categoria: 'Categoria 4', valorAnterior: this.tEspecial? this.ultTarifaEspecial.cargasGenerales[3]?.valor : this.ultTarifaGralChofer?.cargasGenerales[3]?.valor || 0, nombreAnterior: this.ultTarifaCliente.cargasGenerales[3]?.nombre || '' },
      { categoria: 'Categoria 5', valorAnterior: this.tEspecial? this.ultTarifaEspecial.cargasGenerales[4]?.valor : this.ultTarifaGralChofer?.cargasGenerales[4]?.valor || 0, nombreAnterior: this.ultTarifaCliente.cargasGenerales[4]?.nombre || '' },
      { categoria: 'Categoria 6', valorAnterior: this.tEspecial? this.ultTarifaEspecial.cargasGenerales[5]?.valor : this.ultTarifaGralChofer?.cargasGenerales[5]?.valor || 0, nombreAnterior: this.ultTarifaCliente.cargasGenerales[5]?.nombre || '' },
      { categoria: 'Categoria 7', valorAnterior: this.tEspecial? this.ultTarifaEspecial.cargasGenerales[6]?.valor : this.ultTarifaGralChofer?.cargasGenerales[6]?.valor || 0, nombreAnterior: this.ultTarifaCliente.cargasGenerales[6]?.nombre || '' },
      { categoria: 'Categoria 8', valorAnterior: this.tEspecial? this.ultTarifaEspecial.cargasGenerales[7]?.valor : this.ultTarifaGralChofer?.cargasGenerales[7]?.valor || 0, nombreAnterior: this.ultTarifaCliente.cargasGenerales[7]?.nombre || '' },
      { categoria: 'Acompañante', valorAnterior: this.tEspecial? this.ultTarifaEspecial.adicionales?.acompaniante : this.ultTarifaGralChofer?.adicionales?.acompaniante || 0, nombreAnterior: '' },
      { categoria: 'Km 1er Sector distancia', valorAnterior: this.tEspecial? this.ultTarifaEspecial?.adicionales?.adicionalKm?.primerSector?.distancia : this.ultTarifaGralChofer?.adicionales?.adicionalKm?.primerSector?.distancia || 0, nombreAnterior: '' },
      { categoria: 'Km 1er Sector valor', valorAnterior: this.tEspecial? this.ultTarifaEspecial.adicionales?.adicionalKm?.primerSector?.valor : this.ultTarifaGralChofer?.adicionales?.adicionalKm?.primerSector?.valor || 0, nombreAnterior: '' },
      { categoria: 'Km Intervalos distancia', valorAnterior: this.tEspecial? this.ultTarifaEspecial?.adicionales?.adicionalKm?.sectoresSiguientes?.intervalo : this.ultTarifaGralChofer?.adicionales?.adicionalKm?.sectoresSiguientes?.intervalo || 0, nombreAnterior: '' },
      { categoria: 'Km Intervalos valor', valorAnterior: this.tEspecial? this.ultTarifaEspecial.adicionales?.adicionalKm?.sectoresSiguientes?.valor : this.ultTarifaGralChofer?.adicionales?.adicionalKm?.sectoresSiguientes?.valor || 0, nombreAnterior: '' },
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

  onGenerarNuevaTarifaManual() {
    if(this.tEspecial){
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
          //fila.get('nombre')?.enable();
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
    const cargasGenerales: any = {
      categoria1: this.crearCategoriaTarifa(filas.at(0)),
      categoria2: this.crearCategoriaTarifa(filas.at(1)),
      categoria3: this.crearCategoriaTarifa(filas.at(2)),
      categoria4: this.crearCategoriaTarifa(filas.at(3)),
      categoria5: this.crearCategoriaTarifa(filas.at(4)),
      categoria6: this.crearCategoriaTarifa(filas.at(5)),
      categoria7: this.crearCategoriaTarifa(filas.at(6)),
      categoria8: this.crearCategoriaTarifa(filas.at(7)),
    };
    for(let i=0; i<8; i++ ){
      this.categorias[i] ={
        orden: this.categorias[i].orden,
        nombre: this.obtenerNombreCat(filas.at(i)),
        valor: this.obtenerValorCat(filas.at(i)),
      }
      
    }

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
      },
      publicidad:0,
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
      cargasGenerales: this.categorias,
      adicionales: adicionales,
      tipo: tipo,
      idCliente: null,
      idChofer: null,
    };

    //console.log("esta es la NUEVA TARIFA: ",this.nuevaTarifaGral);
  }

  crearCategoriaTarifa(control: AbstractControl): CategoriaTarifa {
/*     return {
      nombre: control.get('nombre')?.value || '',
      valor: control.get('nuevaTarifa')?.value || 0
    }; */
    return {
      orden:0,
      nombre: control.get('nombre')?.value || '',
      valor: control.get('nuevaTarifa')?.value || 0
    };

  }

  obtenerNombreCat(control: AbstractControl): string {
    return control.get('nombre')?.value || ''
  }

  obtenerValorCat(control: AbstractControl): number {
    return control.get('nuevaTarifa')?.value || ''
  }

  addItem(){    
    ////console.log("1)",this.tEspecial);
    if(!this.tEspecial){
      this.storageService.addItem(this.componente, this.nuevaTarifaGral);     
    }else if(this.tEspecial){
      this.nuevaTarifaGral.idChofer = this.idChoferEsp[0];
      this.nuevaTarifaGral.idCliente = this.idClienteEsp[0];
      this.nuevaTarifaGral.tipo.general = false;
      this.nuevaTarifaGral.tipo.especial = true;
      this.storageService.addItem("tarifasEspChofer", this.nuevaTarifaGral);         
    }
    //
   
  }



}
