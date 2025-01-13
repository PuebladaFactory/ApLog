import { Component, Input, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AdicionalTarifa, CategoriaTarifa, TarifaGralCliente, TarifaTipo } from 'src/app/interfaces/tarifa-gral-cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';
import { Cliente } from 'src/app/interfaces/cliente';
import { HistorialTarifasGralComponent } from 'src/app/shared/historial-tarifas-gral/historial-tarifas-gral.component';
import { TarigaGralEdicionComponent } from 'src/app/shared/tariga-gral-edicion/tariga-gral-edicion.component';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-proveedores-tarifa-gral',
  templateUrl: './proveedores-tarifa-gral.component.html',
  styleUrls: ['./proveedores-tarifa-gral.component.scss']
})
export class ProveedoresTarifaGralComponent implements OnInit {

  @Input() tEspecial!: boolean;
  @Input() idProveedorEsp!:any;
  @Input() idClienteEsp!:any;

  tarifaForm!:any; 
  ultTarifaCliente!: TarifaGralCliente; 
  ultTarifaEspecial!: TarifaGralCliente;
  ultTarifaGralProveedor!: TarifaGralCliente;
  ultTarifa!: TarifaGralCliente;
  porcentajeAumento: FormControl = new FormControl(0); // Para el aumento porcentual
  categoria!: CategoriaTarifa;
  categorias: CategoriaTarifa[] = [];
  nuevaTarifaGral!: TarifaGralCliente;
  componente: string ="tarifasGralProveedor";
  consolaTarifa: any = 0;
  modoTarifa: any = { 
    manual: false,
    automatico: true,
  }
  $clientes!: Cliente[];
  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder, private storageService: StorageService, private modalService: NgbModal) {
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
    //////////TARIFA ESPECIAL////////
    this.storageService.setInfo("consolaTarifa", [0]);
    if(this.tEspecial){
      this.storageService.clienteSeleccionado$
      .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
      .subscribe(data => {      
        this.idClienteEsp = data
      //console.log("0B)",this.idClienteEsp);
      })
      //console.log("0b)",this.idProveedorEsp);      
      //this.storageService.getElemntByIdLimit("tarifasEspProveedor","idProveedor","idTarifa",this.idProveedorEsp[0],"ultTarifaEspProveedor");
      this.storageService.proveedorSeleccionado$
      .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
      .subscribe(data => {      ///
        this.idProveedorEsp = data
        //console.log("0c)",this.idProveedorEsp);
        this.storageService.syncChangesByOneElemId<TarifaGralCliente>('tarifasEspProveedor', 'idTarifa', "idProveedor",this.idProveedorEsp[0]);    
         //////tarifa especial: cliente seleccionado seleccionado
      });
     
    } else {
      this.idProveedorEsp = [0];
    }

     //// TARIFA GENERAL para obtener las categorias
    this.storageService.tarifasGralCliente$
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data =>{
      if(data){
        this.ultTarifaCliente = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos        
        this.ultTarifaCliente.cargasGenerales = this.ultTarifaCliente.cargasGenerales || [];
        console.log("2B) ult tarifa GRAL CLIENTE: ",this.ultTarifaCliente);         
      }
      if(this.tEspecial){
        this.storageService.tarifasEspProveedor$
            .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
            .subscribe(data =>{
              if(data){
                ////////////console.log("2c) data: ", data);                
                this.ultTarifaEspecial = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
                this.ultTarifaEspecial.cargasGenerales = this.ultTarifaEspecial.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
                console.log("2d) ult tarifa ESP: ",this.ultTarifaEspecial);    
                let tarifas = this.storageService.loadInfo("tarifasGralProveedor")
                this.ultTarifaGralProveedor = tarifas[0]    
                this.configurarTabla();  
              }              
        });
      } else {
        //TARIFA GRAL PROVEEDOR
        this.storageService.tarifasGralProveedor$
        .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
        .subscribe(data =>{
          if(data){               
            this.ultTarifaGralProveedor = data || {};                  
            this.ultTarifaGralProveedor.cargasGenerales = this.ultTarifaGralProveedor.cargasGenerales || [];            
            console.log("2) ult tarifa GRAL Proveedor: ", this.ultTarifaGralProveedor);   
            this.configurarTabla();         
          }            
        })
      }
      
    }); 
    //consola de tarifas
    this.storageService.consolaTarifa$
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data =>{
      this.consolaTarifa = data;
      console.log("consola tarifa: ", this.consolaTarifa);   
      if(this.consolaTarifa > 0)  {
        this.calcularNuevaTarifaPorcentaje();
      } ;      
    });
    //modo de tarifa
    this.storageService.modoTarifa$
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data =>{
      this.modoTarifa = data;
      console.log("1) modoTarifa: ", this.modoTarifa);      
      this.manejoConsola();
    });
    this.storageService.clientes$
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data => {
      this.$clientes = data;
    });   
    
    this.storageService.syncChangesByOneElem<TarifaGralCliente>('tarifasGralCliente', 'idTarifa');
    this.storageService.syncChangesByOneElem<TarifaGralCliente>('tarifasGralProveedor', 'idTarifa');    
    
    
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  configurarTabla(){  
    this.resetTable();  // Limpia los datos existentes de la tabla
    //.crearCategorias()
    this.inicializarTabla();
    this.onGenerarNuevaTarifaAutomatica(); 
  }

  // Método para resetear la tabla
  resetTable() {
    this.filas.clear(); // Limpia el FormArray
  }

  inicializarTabla() {    
    if(this.tEspecial){
      this.ultTarifa = this.ultTarifaEspecial;
    }else {
      this.ultTarifa = this.ultTarifaGralProveedor;
    }
    console.log("this.ultTarifa!!!!!!!!!!!:", this.ultTarifa);
    
    const categorias = this.ultTarifa?.cargasGenerales?.length > 0 
     ? this.ultTarifa.cargasGenerales.map((cat, index) => ({
        categoria: `Categoria ${index + 1}`,
        valorAnterior: this.formatearValor(cat.valor),
        nombreAnterior: this.ultTarifaCliente?.cargasGenerales[index]?.nombre || '',
        adicionalKm: {
            primerSectorValor: cat.adicionalKm.primerSector,
            sectoresSiguientesValor: cat.adicionalKm.sectoresSiguientes
        },
        orden: cat.orden
    }))
    : Array(this.ultTarifaCliente?.cargasGenerales.length).fill(0).map((_, index) => ({
      categoria: `Categoria ${index + 1}`,
      valorAnterior: this.formatearValor(0),
      nombreAnterior: this.ultTarifaCliente?.cargasGenerales[index]?.nombre || "",
      adicionalKm: {
          primerSectorValor: 0,
          sectoresSiguientesValor: 0
      },
      orden: index + 1
    }));
    ;
    console.log("categorias", categorias);
    
    categorias.forEach((cat, index) => {
        const isManualEnabled = this.isManualMethodSelected;
        const isNombreInputEnabled = index < 8 && isManualEnabled;

        // Fila principal para la categoría
        this.filas.push(this.fb.group({
            seleccionado: [true], 
            categoria: [cat.categoria],
            nombre: [{ value: cat.nombreAnterior, disabled: true }],
            ultimaTarifa: [{ value: cat.valorAnterior, disabled: true }],
            diferencia: [{ value: this.formatearValor(0), disabled: true }],
            nuevaTarifa: [{ value: this.formatearValor(0), disabled: true }]
        }));

        // Fila para Km 1er Sector valor
        this.filas.push(this.fb.group({
            seleccionado: [false],
            categoria: [''],
            nombre: [{ value: 'Km 1er Sector valor', disabled: true }],
            ultimaTarifa: [{ value: this.formatearValor(cat.adicionalKm.primerSectorValor), disabled: true }],
            diferencia: [{ value: this.formatearValor(0), disabled: true }],
            nuevaTarifa: [{ value: this.formatearValor(0), disabled: true }]
        }));

        // Fila para Km Intervalos valor
        this.filas.push(this.fb.group({
            seleccionado: [false],
            categoria: [''],
            nombre: [{ value: 'Km Intervalos valor', disabled: true }],
            ultimaTarifa: [{ value: this.formatearValor(cat.adicionalKm.sectoresSiguientesValor), disabled: true }],
            diferencia: [{ value: this.formatearValor(0), disabled: true }],
            nuevaTarifa: [{ value: this.formatearValor(0), disabled: true }]
        }));
    });

     // Fila para Acompañante
     this.filas.push(this.fb.group({
      seleccionado: [true],
      categoria: ['Acompañante'],
      nombre: [{ value: '', disabled: true }],
      ultimaTarifa: [{ value: this.ultTarifa?.adicionales?.acompaniante !== undefined ? this.formatearValor(this.ultTarifa?.adicionales?.acompaniante) : this.formatearValor(0), disabled: true }],        
      diferencia: [{ value: this.formatearValor(0), disabled: true }],
      nuevaTarifa: [{ value: this.formatearValor(0), disabled: true }]
  }));
  // Fila para Km 1er Sector distancia
  this.filas.push(this.fb.group({
      seleccionado: [false],
      categoria: ['Km 1er Sector distancia'],
      nombre: [{ value: '', disabled: true }],
      ultimaTarifa: [{ value: this.ultTarifa?.adicionales?.KmDistancia?.primerSector !== undefined ? this.formatearValor(this.ultTarifa?.adicionales?.KmDistancia?.primerSector) : this.formatearValor(0), disabled: true }],
      diferencia: [{ value: this.formatearValor(0), disabled: true }],
      nuevaTarifa: [{ value: this.ultTarifa?.adicionales?.KmDistancia?.sectoresSiguientes !== undefined ? this.formatearValor(this.ultTarifa?.adicionales?.KmDistancia?.primerSector) : this.formatearValor(0), disabled: true }]
  }));

  // Fila para Km Intervalos distancia
  this.filas.push(this.fb.group({
      seleccionado: [false],
      categoria: ['Km Intervalos distancia'],
      nombre: [{ value: '', disabled: true }],
      ultimaTarifa: [{ value: this.ultTarifa?.adicionales?.KmDistancia?.sectoresSiguientes !== undefined ?  this.formatearValor(this.ultTarifa?.adicionales?.KmDistancia?.sectoresSiguientes) : this.formatearValor(0), disabled: true }],
      diferencia: [{ value: this.formatearValor(0), disabled: true }],
      nuevaTarifa: [{ value: this.ultTarifa?.adicionales?.KmDistancia?.sectoresSiguientes !== undefined ? this.formatearValor(this.ultTarifa?.adicionales?.KmDistancia?.sectoresSiguientes) : this.formatearValor(0), disabled: true }]
  }));
}

  formatearValor(valor: number) : any{
    let nuevoValor =  new Intl.NumberFormat('es-ES', { 
     minimumFractionDigits: 2, 
     maximumFractionDigits: 2 
   }).format(valor);
   //////console.log(nuevoValor);    
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
      /* if(!this.tEspecial){
        if (fila.get('categoria')?.value.includes('Categoria')) {
            fila.get('nombre')?.enable();
        }
      }  */
        

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
        //id: null,
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
    ////console.log("1)",this.tEspecial);
    if(!this.tEspecial){
      this.storageService.addItem(this.componente, this.nuevaTarifaGral);     
    }else if(this.tEspecial){
      this.nuevaTarifaGral.idProveedor = this.idProveedorEsp[0];
      this.nuevaTarifaGral.idCliente = this.idClienteEsp[0];
      this.nuevaTarifaGral.tipo.general = false;
      this.nuevaTarifaGral.tipo.especial = true;
      this.storageService.addItem("tarifasEspProveedor", this.nuevaTarifaGral);         
    }
    //   
  }

  mostrarInfo(){
    Swal.fire({
      position: "top-end",
      //icon: "success",
      //title: "Your work has been saved",
      text:"Nombre de la categoria de la Tarifa General de los Clientes",
      showConfirmButton: false,
      timer: 10000
    });
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
    let modo: string = ""
    let origen: string = "proveedores"


      if(this.tEspecial){
        tarifa = this.ultTarifaEspecial;
        modo = "especial"
      }else{
        tarifa = this.ultTarifaGralProveedor;
        modo = "general";
      }

    let info = {
        modo: modo,
        item: tarifa,
        origen: origen,
      } 
      //console.log()(info); */
      
      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
          ////console.log()("ROOWW:" ,row);
          //this.storageService.getAllSorted("clientes", 'idCliente', 'asc')
//        this.selectCrudOp(result.op, result.item);
        //this.mostrarMasDatos(row);
        },
        (reason) => {}
      );
    }
  }

  getCliente(idCliente: number){
    let cliente:Cliente[] = this.$clientes.filter((c:Cliente) => c.idCliente === idCliente)
    if (cliente.length > 0){
      return cliente[0].razonSocial;
    } else {
      return "Error en los datos"
    }  
  }

  abrirHistorialTarifas(){
    {
      const modalRef = this.modalService.open(HistorialTarifasGralComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'xl', 
        //backdrop:"static" 
      });      

    let info = {
        modo: "proveedores",
        tEspecial: this.tEspecial,
        id: this.idProveedorEsp[0],
      } 
      //////////console.log()(info); */
      
      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {},
        (reason) => {}
      );
    }
  }

}
