import { Component, Input, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { take } from 'rxjs';
import { Cliente } from 'src/app/interfaces/cliente';
import { AdicionalTarifa, CategoriaTarifa, TarifaGralCliente, TarifaTipo } from 'src/app/interfaces/tarifa-gral-cliente';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';
import { ModalTarifaGralEdicionComponent } from '../modal-tarifa-gral-edicion/modal-tarifa-gral-edicion.component';

@Component({
  selector: 'app-cliente-tarifa-gral',
  templateUrl: './cliente-tarifa-gral.component.html',
  styleUrls: ['./cliente-tarifa-gral.component.scss']
})
export class ClienteTarifaGralComponent implements OnInit {

  @Input() tEspecial!: boolean;
  @Input() idClienteEsp!:any;

  tarifaForm: FormGroup;
  tarifasGralCliente!: TarifaGralCliente []; // Este es el objeto que obtienes de Firebase
  ultTarifa!: TarifaGralCliente;
  porcentajeAumento: FormControl = new FormControl(0); // Para el aumento porcentual
  nuevaTarifaGral!: TarifaGralCliente;
  categoria!: CategoriaTarifa
  componente: string ="tarifasGralCliente";
  esAutomatico: boolean = true;  // Selección automática por defecto
  categorias: CategoriaTarifa[] = []
  ultTarifaGeneral!: TarifaGralCliente;
  ultTarifaEspecial!: TarifaGralCliente;
  modoAutomatico = true;  // por defecto en modo automático
  $clientes!: Cliente[];
  $clientesEsp! : Cliente [];
  clienteSeleccionado!: Cliente[]
  consolaTarifa: any = 0;
  modoTarifa: any = { 
    manual: false,
    automatico: true,
  }
  tarifaGeneral!: TarifaGralCliente;  

  constructor(private fb: FormBuilder, private storageService: StorageService, private modalService: NgbModal) {
    this.tarifaForm = this.fb.group({
      filas: this.fb.array([]), // Array de filas
      seleccionarTodos: [false] // Checkbox para seleccionar todos
    });
    this.tEspecial = false
  }

  ngOnInit() {
    //////////////console.log("0)",this.tEspecial);    
    /////esto es para la tarifa especial
    this.storageService.clienteSeleccionado$.subscribe(data => {      
      this.idClienteEsp = data
      //////////////console.log("0B) idCliente: ",this.idClienteEsp);
      if(this.tEspecial){
        this.storageService.getElemntByIdLimit("tarifasEspCliente","idCliente","idTarifa",this.idClienteEsp[0],"ultTarifaEspCliente");
        this.storageService.clientes$    
        .subscribe(data => {
          this.$clientes = data;
          this.$clientesEsp = this.$clientes.filter((cliente:Cliente)=>{
            return cliente.tarifaTipo.especial === true 
          })
          //////////////console.log(this.$clientesEsp);            
          this.clienteSeleccionado = this.$clientesEsp.filter((cliente:Cliente)=>{
            return cliente.idCliente === this.idClienteEsp[0]; 
          });
          
          
        });      
      }
    })
    
    //////esto es la tarifa general
    this.storageService.ultTarifaGralCliente$.subscribe(data =>{
      ////////////////console.log("data: ", data);                
      this.tarifaGeneral = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
      this.tarifaGeneral.cargasGenerales = this.tarifaGeneral.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
      ////////////////console.log("1) ult tarifa GRAL: ",this.ultTarifa);        
      this.configurarTabla();
    })      
    /// esto es la consola de tarifa
    this.storageService.consolaTarifa$.subscribe(data =>{
      this.consolaTarifa = data;
      ////////////console.log("consola tarifa: ", this.consolaTarifa);   
      if(this.consolaTarifa > 0)  {
        this.calcularNuevaTarifaPorcentaje();
      } ;      
    });
    this.storageService.modoTarifa$.subscribe(data =>{
      this.modoTarifa = data;
      ////////////console.log("1) modoTarifa: ", this.modoTarifa);      
      this.manejoConsola();
    });
    
  }

  configurarTabla(){
    if(this.tEspecial){
      this.storageService.ultTarifaEspCliente$   
      .subscribe(data =>{            
      this.ultTarifaEspecial = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
      this.ultTarifaEspecial.cargasGenerales = this.ultTarifaEspecial.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
      
      this.resetTable();  // Limpia los datos existentes de la tabla;
      //this.crearCategorias()
      this.inicializarTabla();
      this.onGenerarNuevaTarifaAutomatica();   
    });
    }else{      
      this.resetTable();  // Limpia los datos existentes de la tabla
      //this.crearCategorias()
      this.inicializarTabla();
      this.onGenerarNuevaTarifaAutomatica();   
    }
  }

  // Método para resetear la tabla
  resetTable() {
    this.filas.clear(); // Limpia el FormArray
  }

  inicializarTabla() {    
    if(this.tEspecial){
      this.ultTarifa = this.ultTarifaEspecial;
    }else {
      this.ultTarifa = this.tarifaGeneral;
    }
    // Si no hay tarifa anterior, crear 8 categorías vacías y las filas adicionales con valores predeterminados
    const categorias = this.ultTarifa?.cargasGenerales?.length > 0 
        ? this.ultTarifa.cargasGenerales.map((cat, index) => ({
            categoria: `Categoria ${index + 1}`,
            valorAnterior: this.formatearValor(cat.valor),
            nombreAnterior: this.tEspecial? this.ultTarifa.cargasGenerales[index]?.nombre : cat.nombre || '',
            adicionalKm: {
                primerSectorValor: cat.adicionalKm?.primerSector || 0,
                sectoresSiguientesValor: cat.adicionalKm?.sectoresSiguientes || 0,
            }
        }))
        : Array(8).fill(0).map((_, index) => ({
            categoria: `Categoria ${index + 1}`,
            valorAnterior: this.formatearValor(0),
            nombreAnterior: this.tEspecial? this.tarifaGeneral?.cargasGenerales[index]?.nombre : "",
            adicionalKm: {
                primerSectorValor: 0,
                sectoresSiguientesValor: 0
            }
        }));

    categorias.forEach((cat, index) => {
        const isManualEnabled = this.isManualMethodSelected;
        const isNombreInputEnabled = index < 8 && isManualEnabled;

        // Fila principal para la categoría
        this.filas.push(this.fb.group({
            seleccionado: [true], 
            categoria: [cat.categoria],
            nombre: [{ value: cat.nombreAnterior, disabled: !isNombreInputEnabled }],
            ultimaTarifa: [{ value: cat.valorAnterior, disabled: true }],
            diferencia: [{ value: this.formatearValor(0), disabled: true }],
            nuevaTarifa: [{ value:this.formatearValor(0), disabled: false }]
        }));

        // Fila para Km 1er Sector valor
        this.filas.push(this.fb.group({
            seleccionado: [false],
            categoria: [''],
            nombre: [{ value: 'Km 1er Sector valor', disabled: true }],
            ultimaTarifa: [{ value: this.formatearValor(cat.adicionalKm.primerSectorValor), disabled: true }],
            diferencia: [{ value: this.formatearValor(0), disabled: true }],
            nuevaTarifa: [{ value: this.formatearValor(0), disabled: false }]
        }));

        // Fila para Km Intervalos valor
        this.filas.push(this.fb.group({
            seleccionado: [false],
            categoria: [''],
            nombre: [{ value: 'Km Intervalos valor', disabled: true }],
            ultimaTarifa: [{ value: this.formatearValor(cat.adicionalKm.sectoresSiguientesValor), disabled: true }],
            diferencia: [{ value: this.formatearValor(0), disabled: true }],
            nuevaTarifa: [{ value: this.formatearValor(0), disabled: false }]
        }));
    });
    ////console.log("1)", this.ultTarifa?.adicionales?.acompaniante);
    
    // Fila para Acompañante
    this.filas.push(this.fb.group({
        seleccionado: [true],
        categoria: ['Acompañante'],
        nombre: [{ value: '', disabled: true }],
        ultimaTarifa: [{ value: this.ultTarifa?.adicionales?.acompaniante !== undefined ? this.formatearValor(this.ultTarifa?.adicionales?.acompaniante) : this.formatearValor(0), disabled: true }],        
        diferencia: [{ value: this.formatearValor(0), disabled: true }],
        nuevaTarifa: [{ value: this.formatearValor(0), disabled: false }]
    }));
    // Fila para Km 1er Sector distancia
    this.filas.push(this.fb.group({
        seleccionado: [false],
        categoria: ['Km 1er Sector distancia'],
        nombre: [{ value: '', disabled: true }],
        ultimaTarifa: [{ value: this.ultTarifa?.adicionales?.KmDistancia?.primerSector !== undefined ? this.formatearValor(this.ultTarifa?.adicionales?.KmDistancia?.primerSector) : this.formatearValor(0), disabled: true }],
        diferencia: [{ value: this.formatearValor(0), disabled: true }],
        nuevaTarifa: [{ value: this.ultTarifa?.adicionales?.KmDistancia?.sectoresSiguientes !== undefined ? this.formatearValor(this.ultTarifa?.adicionales?.KmDistancia?.primerSector) : 0, disabled: false }]
    }));

    // Fila para Km Intervalos distancia
    this.filas.push(this.fb.group({
        seleccionado: [false],
        categoria: ['Km Intervalos distancia'],
        nombre: [{ value: '', disabled: true }],
        ultimaTarifa: [{ value: this.ultTarifa?.adicionales?.KmDistancia?.sectoresSiguientes !== undefined ?  this.formatearValor(this.ultTarifa?.adicionales?.KmDistancia?.sectoresSiguientes) : this.formatearValor(0), disabled: true }],
        diferencia: [{ value: this.formatearValor(0), disabled: true }],
        nuevaTarifa: [{ value: this.ultTarifa?.adicionales?.KmDistancia?.sectoresSiguientes !== undefined ? this.formatearValor(this.ultTarifa?.adicionales?.KmDistancia?.sectoresSiguientes) : 0, disabled: false }]
    }));
}

  formatearValor(valor: number) : any{
     let nuevoValor =  new Intl.NumberFormat('es-ES', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(valor);
    //////////console.log(nuevoValor);    
    return nuevoValor
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

  manejoConsola(){
    if(this.modoTarifa.manual){
      this.onGenerarNuevaTarifaManual()
    } else {
      this.onGenerarNuevaTarifaAutomatica()
    }
  }

  calcularNuevaTarifaPorcentaje() {
    const porcentaje = this.consolaTarifa;  // Porcentaje a aplicar
    this.filas.controls.forEach((fila, index) => {
        const seleccionadoControl = fila.get('seleccionado'); 
        const nombre = fila.get('nombre'); 
        const ultimaTarifaControl = fila.get('ultimaTarifa');
        const nuevaTarifaControl = fila.get('nuevaTarifa');
        const diferenciaControl = fila.get('diferencia');
        ////console.log("seleccionadoControl:", seleccionadoControl?.value);
        
        if (seleccionadoControl?.value) {
            const ultimaTarifa = this.limpiarValorFormateado(ultimaTarifaControl?.value) || 0;
            const nuevaTarifa = ultimaTarifa * (1 + porcentaje);

            nuevaTarifaControl?.setValue(this.formatearValor(nuevaTarifa));
            diferenciaControl?.setValue(this.formatearValor(nuevaTarifa - ultimaTarifa));
        }       
        if (nombre?.value === "Km 1er Sector valor" || nombre?.value === "Km Intervalos valor") {
          const ultimaTarifa = this.limpiarValorFormateado(ultimaTarifaControl?.value) || 0;
          const nuevaTarifa = ultimaTarifa * (1 + porcentaje);

          nuevaTarifaControl?.setValue(this.formatearValor(nuevaTarifa));
          diferenciaControl?.setValue(this.formatearValor(nuevaTarifa - ultimaTarifa));
      }  
     
    });
    
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
      if(!this.tEspecial){
        if (fila.get('categoria')?.value.includes('Categoria')) {
            fila.get('nombre')?.enable();
        }
      } 
        

        const nuevaTarifaControl = fila.get('nuevaTarifa');
        const diferenciaControl = fila.get('diferencia');
        const ultimaTarifaControl = fila.get('ultimaTarifa');
                
        // Habilitar el input para la nueva tarifa
        nuevaTarifaControl?.enable();

        // Agregar un listener para calcular la diferencia en las filas de categorías y adicionales
        nuevaTarifaControl?.valueChanges.subscribe((nuevoValor) => {
          
          const ultimaTarifa = this.limpiarValorFormateado(ultimaTarifaControl?.value || 0);
          //console.log("A)",nuevoValor);
          
          if(typeof(nuevoValor) === "number") {
            const diferencia = nuevoValor - ultimaTarifa;
            ////console.log("diferencia : ", diferencia ); 
            diferenciaControl?.setValue(this.formatearValor(diferencia));
          } else {
            const diferencia = this.limpiarValorFormateado(nuevoValor) - ultimaTarifa;
            ////console.log("diferencia : ", diferencia ); 
            diferenciaControl?.setValue(this.formatearValor(diferencia));
          }
           
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

  cambiarModo(modo: 'manual' | 'automatico'): void {
    this.modoAutomatico = modo === 'automatico';
  }

  guardarTarifa() {
    // Aquí podrías implementar la lógica para guardar la nueva tarifa en Firebase
    this.configurarNuevaTarifa();
    Swal.fire({
      title: "¿Confirmar el alta de la Tarifa?",
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
    console.log("largo: ", filas.length);
    
    // Construcción del array `cargasGenerales` basado en los datos del formulario
    const cargasGenerales: CategoriaTarifa[] = [];
  
    for (let i = 0; i < filas.length - 3; i += 3) { // Se itera en pasos de 3 filas (categoría + 2 adicionales)
        const categoriaFila = filas.at(i);
        const kmPrimerSectorFila = filas.at(i + 1);
        const kmIntervalosFila = filas.at(i + 2);
        
        //console.log("nombre de la categoria: ", categoriaFila.get('nombre')?.value);
        if(categoriaFila.get('nombre')?.value !== ""){
        cargasGenerales.push({
            orden: i / 3 + 1,
            nombre: categoriaFila.get('nombre')?.value || '',
            valor: this.limpiarValorFormateado(categoriaFila.get('nuevaTarifa')?.value || 0),
            adicionalKm: {
                primerSector: this.limpiarValorFormateado(kmPrimerSectorFila.get('nuevaTarifa')?.value || 0),
                sectoresSiguientes: this.limpiarValorFormateado(kmIntervalosFila.get('nuevaTarifa')?.value || 0)
            }
        });
        }
        
    }
  
    // Construcción del objeto `AdicionalTarifa`
    const adicionales: AdicionalTarifa = {
        acompaniante: this.limpiarValorFormateado(filas.at(filas.length - 3).get('nuevaTarifa')?.value || 0),
        KmDistancia: {
            primerSector: this.limpiarValorFormateado(filas.at(filas.length - 2).get('nuevaTarifa')?.value || 0),
            sectoresSiguientes: this.limpiarValorFormateado(filas.at(filas.length - 1).get('nuevaTarifa')?.value || 0)
        }
    };
  
    // Configuración del tipo de tarifa
    const tipo: TarifaTipo = {
        general: true,
        especial: false,
        eventual: false,
        personalizada: false
    };
  
    // Construcción final del objeto `TarifaGralCliente`
    this.nuevaTarifaGral = {
        id: null,
        idTarifa: new Date().getTime(),
        fecha: new Date().toISOString().split('T')[0],
        cargasGenerales: cargasGenerales,
        adicionales: adicionales,
        tipo: tipo,
        idCliente: null,
        idChofer: null,
        idProveedor: null, 
    };
}

  obtenerNombreCat(control: AbstractControl): string {
    return control.get('nombre')?.value || ''
  }

  obtenerValorCat(control: AbstractControl): number {
    return this.limpiarValorFormateado(control.get('nuevaTarifa')?.value || 0);
  }

  addItem(){    
    //////console.log("1)",this.nuevaTarifaGral);
    if(!this.tEspecial){
      this.storageService.addItem(this.componente, this.nuevaTarifaGral);     
      this.consolaTarifa = 0;
      this.storageService.setInfo("consolaTarifa", this.consolaTarifa)
    }else if(this.tEspecial){
      this.nuevaTarifaGral.idCliente = this.idClienteEsp[0];
      this.nuevaTarifaGral.tipo.general = false;
      this.nuevaTarifaGral.tipo.especial = true;
      this.storageService.addItem("tarifasEspCliente", this.nuevaTarifaGral);      
      this.consolaTarifa = 0;
      this.storageService.setInfo("consolaTarifa", this.consolaTarifa)   
    }
      
  }

  
  openModalEdicion(): void {      
    {
      const modalRef = this.modalService.open(ModalTarifaGralEdicionComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'md', 
        //backdrop:"static" 
      });      

    let tarifa: TarifaGralCliente;
    let modo: string = ""


      if(this.tEspecial){
        tarifa = this.ultTarifaEspecial;
        modo = "especial"
      }else{
        tarifa = this.ultTarifa;
        modo = "general";
      }

    let info = {
        modo: modo,
        item: tarifa,
      } 
      //////console.log()(info); */
      
      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
         
        },
        (reason) => {}
      );
    }
  }

  agregarCategoria() {
    // Calcular el índice donde termina la última categoría
    const numCategorias = this.ultTarifa?.cargasGenerales?.length; 
    const indiceInsercion = numCategorias * 3; // Cada categoría tiene 3 filas, entonces multiplicamos
  
    const nuevaCategoria = {
      orden: numCategorias + 1, // El orden será el siguiente después de la última categoría existente
      nombre: 'Nueva Categoría',
      valor: 0,
      adicionalKm: {
        primerSector: 0,
        sectoresSiguientes: 0
      }
    };
  
    // Fila principal para la nueva categoría
    this.filas.insert(indiceInsercion, this.fb.group({
      seleccionado: [true], 
      categoria: [`Categoria ${nuevaCategoria.orden}`],
      nombre: [{ value: nuevaCategoria.nombre, disabled: false }],
      ultimaTarifa: [{ value: this.formatearValor(nuevaCategoria.valor), disabled: true }],
      diferencia: [{ value: this.formatearValor(0), disabled: true }],
      nuevaTarifa: [{ value: this.formatearValor(0), disabled: true }]
    }));
  
    // Fila para Km 1er Sector valor
    this.filas.insert(indiceInsercion + 1, this.fb.group({
      seleccionado: [false],
      categoria: [''],
      nombre: [{ value: 'Km 1er Sector valor', disabled: true }],
      ultimaTarifa: [{ value: this.formatearValor(nuevaCategoria.adicionalKm.primerSector), disabled: true }],
      diferencia: [{ value: this.formatearValor(0), disabled: true }],
      nuevaTarifa: [{ value: this.formatearValor(0), disabled: true }]
    }));
  
    // Fila para Km Intervalos valor
    this.filas.insert(indiceInsercion + 2, this.fb.group({
      seleccionado: [false],
      categoria: [''],
      nombre: [{ value: 'Km Intervalos valor', disabled: true }],
      ultimaTarifa: [{ value: this.formatearValor(nuevaCategoria.adicionalKm.sectoresSiguientes), disabled: true }],
      diferencia: [{ value: this.formatearValor(0), disabled: true }],
      nuevaTarifa: [{ value: this.formatearValor(0), disabled: true }]
    }));
  }


}
