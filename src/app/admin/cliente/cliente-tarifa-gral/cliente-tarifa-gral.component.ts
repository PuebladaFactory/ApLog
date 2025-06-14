import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Cliente } from 'src/app/interfaces/cliente';
import { AdicionalTarifa, CategoriaTarifa, TarifaGralCliente, TarifaTipo } from 'src/app/interfaces/tarifa-gral-cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';
import { HistorialTarifasGralComponent } from 'src/app/shared/historial-tarifas-gral/historial-tarifas-gral.component';
import { TarigaGralEdicionComponent } from 'src/app/shared/tariga-gral-edicion/tariga-gral-edicion.component';
import { Subject, takeUntil } from 'rxjs';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { ConIdType } from 'src/app/interfaces/conId';

@Component({
    selector: 'app-cliente-tarifa-gral',
    templateUrl: './cliente-tarifa-gral.component.html',
    styleUrls: ['./cliente-tarifa-gral.component.scss'],
    standalone: false
})
export class ClienteTarifaGralComponent implements OnInit {

  @Input() tEspecial!: boolean;
  @Input() idClienteEsp!:any;

  tarifaForm: FormGroup;
  tarifasGralCliente!: ConIdType<TarifaGralCliente>[]; // Este es el objeto que obtienes de Firebase
  ultTarifa!: ConIdType<TarifaGralCliente>;
  porcentajeAumento: FormControl = new FormControl(0); // Para el aumento porcentual
  nuevaTarifaGral!: TarifaGralCliente;
  categoria!: CategoriaTarifa
  componente: string ="tarifasGralCliente";
  esAutomatico: boolean = true;  // Selección automática por defecto
  categorias: CategoriaTarifa[] = []
  ultTarifaGeneral!: ConIdType<TarifaGralCliente>;
  ultTarifaEspecial!: ConIdType<TarifaGralCliente> | null;
  modoAutomatico = true;  // por defecto en modo automático
  $clientes!: ConIdType<Cliente>[];
  $clientesEsp! : ConIdType<Cliente> [];
  clienteSeleccionado!: ConIdType<Cliente>[]
  consolaTarifa: any = 0;
  modoTarifa: any = { 
    manual: false,
    automatico: true,
  }
  tarifaGeneral!: ConIdType<TarifaGralCliente>;  
  historial: boolean = false;
  modo: string = "clientes";
  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder, private storageService: StorageService, private modalService: NgbModal, private cdr: ChangeDetectorRef, private dbFirebase: DbFirestoreService, ) {
    this.tarifaForm = this.fb.group({
      filas: this.fb.array([]), // Array de filas
      seleccionarTodos: [false] // Checkbox para seleccionar todos
    });
    this.tEspecial = false
  }

  ngOnInit() {
    //console.log("0)",this.tEspecial);
        
    //////esto es la tarifa general
    this.storageService.setInfo("consolaTarifa", [0]);
    this.storageService.getObservable<ConIdType<TarifaGralCliente>>("tarifasGralCliente")
          .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
              .subscribe(data => {
                if (!Array.isArray(data) && typeof data === 'object' && data !== null) {
                  //console.log("data", data);
                  this.tarifaGeneral = data || {};  
                  this.tarifaGeneral.cargasGenerales = this.tarifaGeneral.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
                  //console.log("this.tarifaGeneral", this.tarifaGeneral);
                } else {
                  //console.error("El valor obtenido no es un objeto, es un array, null o no es un objeto válido.");
                  //console.log("data", data);
                  this.tarifaGeneral = data[0] || {};  
                  this.tarifaGeneral.cargasGenerales = this.tarifaGeneral.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
                  //console.log("this.tarifaGeneral", this.tarifaGeneral);
                }      
                  
                
                /////ESTO ES PARA LA TARIFA ESPECIAL//////
                if(this.tEspecial){
                  this.storageService.clienteSeleccionado$.subscribe(data => {      
                    this.idClienteEsp = data;
                    //this.storageService.getMostRecentItemId("tarifasEspCliente","idTarifa","idCliente",this.idClienteEsp[0]);
                    //this.storageService.syncChangesByOneElemId<TarifaGralCliente>("tarifasEspCliente","idTarifa","idCliente",this.idClienteEsp[0]);
                    this.storageService.getObservable<ConIdType<Cliente>>("clientes")
                        .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
                        .subscribe(data => {
                        this.$clientes = data;
                        this.$clientesEsp = this.$clientes.filter((cliente:Cliente)=>{
                          return cliente.tarifaTipo.especial === true 
                        })
                      //////////////////////console.log(this.$clientesEsp);            
                        this.clienteSeleccionado = this.$clientesEsp.filter((cliente:Cliente)=>{
                          return cliente.idCliente === this.idClienteEsp[0]; 
                        });
                    }); 
                  /* this.storageService.tarifasEspCliente$   
                      .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
                      .subscribe(data =>{ 
                        //console.log("data tarifa esp: ", data );
                        if (data) {
                          this.ultTarifaEspecial = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
                          this.ultTarifaEspecial.cargasGenerales = this.ultTarifaEspecial.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
                          console.log("ultTarifaEspecial: ", this.ultTarifaEspecial );
                          this.configurarTabla();
                        }                        
                    }); */ 
                    this.storageService.getObservable<ConIdType<TarifaGralCliente>>("tarifasEspCliente")
                    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
                        .subscribe(data => {                          
                          if (data) {
                            //console.log("data tEspecial", data);
                            let tarifas : any[] = data 
                            console.log("tarifas esp clientes", tarifas);
                            this.ultTarifaEspecial = tarifas.find((tarifa: TarifaGralCliente)  => tarifa.idCliente === this.idClienteEsp[0]);  
                            console.log("ultTarifaEspecial", this.ultTarifaEspecial);
                            if(this.ultTarifaEspecial){
                              this.ultTarifaEspecial.cargasGenerales = this.ultTarifaEspecial.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
                            }
                            
                            //console.log("this.ultTarifaEspecial", this.ultTarifaEspecial);
                            this.configurarTabla();        
                        }})
                    
                  })     
                } else {
                  //console.log("aca?");
                  
                  this.idClienteEsp = [0]
                  this.configurarTabla();
                }   
                
              })
    /* this.storageService.tarifasGralCliente$
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data => {
      if (data) {
        this.tarifaGeneral = data; // Ahora siempre es un objeto
        this.tarifaGeneral.cargasGenerales = this.tarifaGeneral.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
        console.log("1) ult tarifa GRAL: ", this.tarifaGeneral);
      }    
      /////ESTO ES PARA LA TARIFA ESPECIAL//////
      if(this.tEspecial){
        this.storageService.clienteSeleccionado$.subscribe(data => {      
          this.idClienteEsp = data;
          //this.storageService.getMostRecentItemId("tarifasEspCliente","idTarifa","idCliente",this.idClienteEsp[0]);
          //this.storageService.syncChangesByOneElemId<TarifaGralCliente>("tarifasEspCliente","idTarifa","idCliente",this.idClienteEsp[0]);
          this.storageService.clientes$    
              .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
              .subscribe(data => {
              this.$clientes = data;
              this.$clientesEsp = this.$clientes.filter((cliente:Cliente)=>{
                return cliente.tarifaTipo.especial === true 
              })
            //////////////////////console.log(this.$clientesEsp);            
              this.clienteSeleccionado = this.$clientesEsp.filter((cliente:Cliente)=>{
                return cliente.idCliente === this.idClienteEsp[0]; 
              });
          }); 
        this.storageService.tarifasEspCliente$   
            .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
            .subscribe(data =>{ 
              //console.log("data tarifa esp: ", data );
              if (data) {
                this.ultTarifaEspecial = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
                this.ultTarifaEspecial.cargasGenerales = this.ultTarifaEspecial.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
                console.log("ultTarifaEspecial: ", this.ultTarifaEspecial );
                this.configurarTabla();
              }                        
          }); 
          this.storageService.getObservable<TarifaGralCliente>("tarifasEspCliente")
          .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
              .subscribe(data => {
                if(data){
                  let tarifasEsp: any[] = data;  
                  this.ultTarifaEspecial = tarifasEsp.find((tarifa:TarifaGralCliente)=> tarifa.idCliente === this.idClienteEsp[0])
                  console.log("this.ultTarifaEspecial", this.ultTarifaEspecial);
                  this.configurarTabla();
                }
                
              })
          
        })     
      } else {
        this.idClienteEsp = [0]
        this.configurarTabla();
      }   
      
    })    */   
    /// esto es la consola de tarifa
    this.storageService.consolaTarifa$
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data =>{
      this.consolaTarifa = data;
      ////////////////////console.log("consola tarifa: ", this.consolaTarifa);   
      if(this.consolaTarifa > 0)  {
        this.calcularNuevaTarifaPorcentaje();
      } ;      
    });
    this.storageService.modoTarifa$
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data =>{
      this.modoTarifa = data;
      ////////////////////console.log("1) modoTarifa: ", this.modoTarifa);      
      this.manejoConsola();
    });

    // Sincroniza cambios en tiempo real
    //this.storageService.syncChangesByOneElem<TarifaGralCliente>('tarifasGralCliente', 'idTarifa');    
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  configurarTabla(){    
    this.resetTable();  // Limpia los datos existentes de la tabla
    //this.crearCategorias()
    this.inicializarTabla();
    this.onGenerarNuevaTarifaAutomatica();   
  }

  // Método para resetear la tabla
  resetTable() {
    this.filas.clear(); // Limpia el FormArray
  }

  inicializarTabla() {    
    console.log("this.tEspecial", this.tEspecial);
    
    if(this.tEspecial && this.ultTarifaEspecial){
      this.ultTarifa = this.ultTarifaEspecial;
    }else {
      this.ultTarifa = this.tarifaGeneral;
    }
    console.log("inicializarTabla: ultima tarifa: ", this.ultTarifa);
    
    // Si no hay tarifa anterior, crear 8 categorías vacías y las filas adicionales con valores predeterminados
    const categorias = this.tarifaGeneral.cargasGenerales.length > 0 
        ? this.tarifaGeneral.cargasGenerales.map((cat, index) => ({
            categoria: `Categoria ${index + 1}`,
            valorAnterior: !this.tEspecial? this.formatearValor(cat.valor) : this.ultTarifaEspecial && this.ultTarifaEspecial.cargasGenerales.length > 0 ? this.formatearValor(this.ultTarifaEspecial.cargasGenerales[index]?.valor) : this.formatearValor(0) ,
            nombreAnterior: this.tEspecial? this.tarifaGeneral.cargasGenerales[index]?.nombre : cat.nombre || '',
            adicionalKm: {
                primerSectorValor: !this.tEspecial? this.formatearValor(cat.adicionalKm?.primerSector) : this.ultTarifaEspecial && this.ultTarifaEspecial.cargasGenerales.length > 0 ? this.formatearValor(this.ultTarifaEspecial.cargasGenerales[index]?.adicionalKm?.primerSector) : this.formatearValor(0) ,
                sectoresSiguientesValor: !this.tEspecial? this.formatearValor(cat.adicionalKm?.sectoresSiguientes) : this.ultTarifaEspecial && this.ultTarifaEspecial.cargasGenerales.length > 0 ? this.formatearValor(this.ultTarifaEspecial.cargasGenerales[index]?.adicionalKm?.sectoresSiguientes) : this.formatearValor(0),
            },           
        }))
        : Array(8).fill(0).map((_, index) => ({
            categoria: `Categoria ${index + 1}`,
            valorAnterior: this.formatearValor(0),
            nombreAnterior: this.tarifaGeneral?.cargasGenerales[index]?.nombre || "",
            adicionalKm: {
                primerSectorValor: this.formatearValor(0),
                sectoresSiguientesValor: this.formatearValor(0),
            }
        }));
        //////console.log("0) categorias:", categorias )
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
            nuevaTarifa: [{ value:this.formatearValor(0), disabled: false },],
        }));

        // Fila para Km 1er Sector valor
        this.filas.push(this.fb.group({
            seleccionado: [false],
            categoria: [''],
            nombre: [{ value: 'Km 1er Sector valor', disabled: true }],
            ultimaTarifa: [{ value: cat.adicionalKm.primerSectorValor, disabled: true }],
            diferencia: [{ value: this.formatearValor(0), disabled: true }],
            nuevaTarifa: [{ value: this.formatearValor(0), disabled: false }]
        }));

        // Fila para Km Intervalos valor
        this.filas.push(this.fb.group({
            seleccionado: [false],
            categoria: [''],
            nombre: [{ value: 'Km Intervalos valor', disabled: true }],
            ultimaTarifa: [{ value: cat.adicionalKm.sectoresSiguientesValor, disabled: true }],
            diferencia: [{ value: this.formatearValor(0), disabled: true }],
            nuevaTarifa: [{ value: this.formatearValor(0), disabled: false }]
        }));
    });
    ////////////console.log("1)", this.ultTarifa?.adicionales?.acompaniante);
    
    // Fila para Acompañante
    this.filas.push(this.fb.group({
        seleccionado: [true],
        categoria: ['Acompañante'],
        nombre: [{ value: '', disabled: true }],
        ultimaTarifa: [{ value: this.tEspecial && !this.ultTarifaEspecial ? this.formatearValor(0) : this.ultTarifa?.adicionales?.acompaniante !== undefined ? this.formatearValor(this.ultTarifa?.adicionales?.acompaniante) : this.formatearValor(0), disabled: true }],        
        diferencia: [{ value: this.formatearValor(0), disabled: true }],
        nuevaTarifa: [{ value: this.formatearValor(0), disabled: false }]
    }));
    // Fila para Km 1er Sector distancia
    this.filas.push(this.fb.group({
        seleccionado: [false],
        categoria: ['Km 1er Sector distancia'],
        nombre: [{ value: '', disabled: true }],
        ultimaTarifa: [{ value: this.tEspecial && !this.ultTarifaEspecial ? this.formatearValor(0) : this.ultTarifa?.adicionales?.KmDistancia?.primerSector !== undefined ? this.formatearValor(this.ultTarifa?.adicionales?.KmDistancia?.primerSector) : this.formatearValor(0), disabled: true }],
        diferencia: [{ value: this.formatearValor(0), disabled: true }],
        nuevaTarifa: [{ value: this.ultTarifa?.adicionales?.KmDistancia?.sectoresSiguientes !== undefined ? this.formatearValor(this.ultTarifa?.adicionales?.KmDistancia?.primerSector) : this.formatearValor(0), disabled: false }]
    }));

    // Fila para Km Intervalos distancia
    this.filas.push(this.fb.group({
        seleccionado: [false],
        categoria: ['Km Intervalos distancia'],
        nombre: [{ value: '', disabled: true }],
        ultimaTarifa: [{ value: this.tEspecial && !this.ultTarifaEspecial ? this.formatearValor(0) : this.ultTarifa?.adicionales?.KmDistancia?.sectoresSiguientes !== undefined ?  this.formatearValor(this.ultTarifa?.adicionales?.KmDistancia?.sectoresSiguientes) : this.formatearValor(0), disabled: true }],
        diferencia: [{ value: this.formatearValor(0), disabled: true }],
        nuevaTarifa: [{ value: this.ultTarifa?.adicionales?.KmDistancia?.sectoresSiguientes !== undefined ? this.formatearValor(this.ultTarifa?.adicionales?.KmDistancia?.sectoresSiguientes) : this.formatearValor(0), disabled: false }]
    }));
}

  formatearValor(valor: number) : any{
     let nuevoValor =  new Intl.NumberFormat('es-ES', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(valor);
    //////////////////console.log(nuevoValor);    
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
        ////////////console.log("seleccionadoControl:", seleccionadoControl?.value);
        
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
          //////////console.log("A)",nuevoValor);
          
          if(typeof(nuevoValor) === "number") {
            const diferencia = nuevoValor - ultimaTarifa;
            ////////////console.log("diferencia : ", diferencia ); 
            diferenciaControl?.setValue(this.formatearValor(diferencia));
          } else {
            const diferencia = this.limpiarValorFormateado(nuevoValor) - ultimaTarifa;
            ////////////console.log("diferencia : ", diferencia ); 
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
    //////console.log("largo: ", filas.length);
    ////console.log("todo: ", filas.value);
    // Construcción del array `cargasGenerales` basado en los datos del formulario
    const cargasGenerales: CategoriaTarifa[] = [];
  
    for (let i = 0; i < filas.length - 3; i += 3) { // Se itera en pasos de 3 filas (categoría + 2 adicionales)
        const categoriaFila = filas.at(i);
        const kmPrimerSectorFila = filas.at(i + 1);
        const kmIntervalosFila = filas.at(i + 2);
        
        //////console.log("categoriaFila categoria: ", categoriaFila.get('nombre')?.value, "categoriaFila orden: ",categoriaFila.get('orden')?.value);
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
      
        idTarifa: new Date().getTime(),
        fecha: new Date().toISOString().split('T')[0],
        cargasGenerales: cargasGenerales,
        adicionales: adicionales,
        tipo: tipo,
        idCliente: 0,
        idChofer: 0,
        idProveedor: 0, 
    };
}

  obtenerNombreCat(control: AbstractControl): string {
    return control.get('nombre')?.value || ''
  }

  obtenerValorCat(control: AbstractControl): number {
    return this.limpiarValorFormateado(control.get('nuevaTarifa')?.value || 0);
  }

  addItem(){    
    //////////////console.log("1)",this.nuevaTarifaGral);
    let clientes: ConIdType<Cliente> [] = this.storageService.loadInfo("clientes")
    if(!this.tEspecial){    ///TARIFA GENERAL
        if(this.tarifaGeneral){
          this.storageService.addItem("historialTarifasGralCliente", this.tarifaGeneral, this.tarifaGeneral.idTarifa, "INTERNA", "" );
          this.storageService.deleteItem("tarifasGralCliente", this.tarifaGeneral, this.tarifaGeneral.idTarifa, "INTERNA", "" );
        }
        this.storageService.addItem(this.componente, this.nuevaTarifaGral, this.nuevaTarifaGral.idTarifa, "ALTA", "Alta de Tarifa General para Clientes");     
        this.consolaTarifa = 0;
        this.storageService.setInfo("consolaTarifa", this.consolaTarifa);        
        if(clientes.length > 0){
            clientes.forEach((c:ConIdType<Cliente>)=>{
              if(c.tarifaTipo.general){
                c.tarifaAsignada = true;
                c.idTarifa = this.nuevaTarifaGral.idTarifa;
                let {id, type, ...cliente } = c
                this.storageService.updateItem("clientes", cliente, c.idCliente, "INTERNA", "", c.id);
              }
            })
        }      
    }else if(this.tEspecial){  ///TARIFA ESPECIAL
      this.nuevaTarifaGral.idCliente = this.idClienteEsp[0];
      this.nuevaTarifaGral.tipo.general = false;
      this.nuevaTarifaGral.tipo.especial = true;
      if(this.ultTarifaEspecial){
        this.storageService.addItem("historialTarifasEspCliente", this.ultTarifaEspecial, this.ultTarifaEspecial.idTarifa, "INTERNA", "" );
        this.storageService.deleteItem("tarifasEspCliente", this.ultTarifaEspecial, this.ultTarifaEspecial.idTarifa, "INTERNA", "" );
      }
      this.storageService.addItem("tarifasEspCliente", this.nuevaTarifaGral, this.nuevaTarifaGral.idTarifa, "ALTA", `Alta de Tarifa Especial para Cliente ${this.getClienteEsp(this.idClienteEsp[0])}`);      
      this.consolaTarifa = 0;
      this.storageService.setInfo("consolaTarifa", this.consolaTarifa);
      if(clientes.length > 0){
        clientes.forEach((c:ConIdType<Cliente>)=>{
          if(c.tarifaTipo.especial  && c.idCliente === this.idClienteEsp[0]){
            c.tarifaAsignada = true;
            c.idTarifa = this.nuevaTarifaGral.idTarifa;
            let {id, type, ...cliente } = c
            this.storageService.updateItem("clientes", cliente, c.idCliente, "INTERNA", "", c.id);            
          }
        });
      
    }      
         
    }

    //console.log("Tarifa nueva: ", this.nuevaTarifaGral);
     
    
  }

  
  openModalEdicion(): void {      
    {
      const modalRef = this.modalService.open(TarigaGralEdicionComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'md', 
        //backdrop:"static" 
      });      

    let tarifa: TarifaGralCliente;
    let modo: string = "";
    let origen: string = "clientes";


      if(this.tEspecial && this.ultTarifaEspecial){
        tarifa = this.ultTarifaEspecial;
        modo = "especial"
      }else{
        tarifa = this.ultTarifa;
        modo = "general";
      }

    let info = {
        modo: modo,
        item: tarifa,
        origen: origen,
      } 
      //////////////console.log()(info); */
      
      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
          this.ngOnInit()
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

  abrirHistorialTarifas(){
    console.log("aca?");
    
    {
      const modalRef = this.modalService.open(HistorialTarifasGralComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'xl', 
        //backdrop:"static" 
      });      

    let info = {
        modo: "clientes",
        tEspecial: this.tEspecial,
        id: this.idClienteEsp[0],
      } 
      //console.log("tarifaGralCliente: info:", info);
      
      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {},
        (reason) => {}
      );
    }
  }

  getClienteEsp(idCliente:number){
    let clientes : Cliente[] = [];

    clientes = this.$clientesEsp.filter(c => c.idCliente === idCliente);

    return clientes[0].razonSocial;

  }

  actClienteGral(){
    let clientes: Cliente [] = this.storageService.loadInfo("clientes")
    
        if(clientes.length > 0){
            clientes.forEach((c:Cliente)=>{
              if(c.tarifaTipo.general){
                c.tarifaAsignada = true;
                c.idTarifa = this.tarifaGeneral.idTarifa;
                //this.storageService.updateItem("clientes", c, c.idCliente, "INTERNA", "");
              }
            })
        }      
    
    
  }
  actClienteEsp(){

    let clientes: Cliente [] = this.storageService.loadInfo("clientes")
    
        
        if(clientes.length > 0){
          
            
        }      

  }

  actCliente(){    
    let clientes: Cliente [] = this.storageService.loadInfo("clientes")
        
    if(clientes.length > 0){
      clientes.forEach((c:any)=>{
          c = {
            ...c,
            idTarifa : 0,
          }
          //this.storageService.updateItem("clientes", c, c.idCliente, "INTERNA", "");
        })
    }      

    
    
    
}



}
