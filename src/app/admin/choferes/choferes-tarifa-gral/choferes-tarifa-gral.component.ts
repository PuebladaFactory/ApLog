import { Component, Input, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AdicionalTarifa, CategoriaTarifa, TarifaGralCliente, TarifaTipo } from 'src/app/interfaces/tarifa-gral-cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { HistorialTarifasGralComponent } from 'src/app/shared/historial-tarifas-gral/historial-tarifas-gral.component';
import { TarigaGralEdicionComponent } from 'src/app/shared/tariga-gral-edicion/tariga-gral-edicion.component';

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
  ultTarifaEspecial!: TarifaGralCliente;
  ultTarifaGralChofer!: TarifaGralCliente;
  ultTarifa!: TarifaGralCliente;
  porcentajeAumento: FormControl = new FormControl(0); // Para el aumento porcentual
  categoria!: CategoriaTarifa;
  categorias: CategoriaTarifa[] = [];
  nuevaTarifaGral!: TarifaGralCliente;
  componente: string ="tarifasGralChofer";
  consolaTarifa: any = 0;
  modoTarifa: any = { 
    manual: false,
    automatico: true,
  };
  $choferes!: Chofer[];
  chofer!: Chofer[];
  vehiculos!: Vehiculo [];
  $clientes!: Cliente[];

  constructor(private fb: FormBuilder, private storageService: StorageService, private modalService: NgbModal) {
    this.tarifaForm = this.fb.group({
      filas: this.fb.array([]), // Array de filas
      seleccionarTodos: [false] // Checkbox para seleccionar todos
    });
    this.tEspecial = false
  }
  ngOnInit(): void { 
    ////////console.log("0)",this.tEspecial);
    //////////console.log("0)",this.idChoferEsp);
    ////console.log("0)",this.idClienteEsp);
    //// CHOFER SELECCIONADO PARA LA TARIFA ESPECIAL ///////////////
    //this.storageService.getUltElemColeccion("tarifasGralChofer", "idTarifa", "desc", 1,"ultTarifaGralChofer")
    this.storageService.choferSeleccionado$.subscribe(data => {      ///
      this.idChoferEsp = data
      ////console.log("0A)",this.idChoferEsp);
      if(this.tEspecial){
        this.storageService.getMostRecentItemId("tarifasEspChofer","idTarifa","idChofer",this.idChoferEsp[0]);
        //this.storageService.getElemntByIdLimit("tarifasEspChofer","idChofer","idTarifa",this.idChoferEsp[0],"ultTarifaEspChofer");
        this.storageService.choferes$.subscribe(data => {
          this.$choferes = data;
          this.chofer = this.$choferes.filter((chofer:Chofer) => {
            return chofer.idChofer === this.idChoferEsp[0];
          });
          ////////console.log("chofer seleccionado: ", this.chofer);
          this.vehiculos = this.chofer[0].vehiculo
        });
        this.storageService.syncChangesByOneElemId<TarifaGralCliente>("tarifasEspChofer","idTarifa","idChofer",this.idChoferEsp[0]);
      }
    });
    //// CLIENTE SELECCIONADO PARA LA TARIFA ESPECIAL ///////////////
    this.storageService.clienteSeleccionado$.subscribe(data => {      
      this.idClienteEsp = data
      //console.log("0B)",this.idClienteEsp);
    })

    //// TARIFA GENERAL CHOFER
    this.storageService.tarifasGralChofer$.subscribe(data =>{
        console.log("data tgChofer", data);        
        this.ultTarifaGralChofer = data || {};
        this.ultTarifaGralChofer.cargasGenerales = this.ultTarifaGralChofer.cargasGenerales || [];
        ////////console.log("2) ult tarifa GRAL CHOFER: ", this.ultTarifaGralChofer);
         //// TARIFA GENERAL CLIENTE
        this.storageService.tarifasGralCliente$.subscribe(data =>{
            console.log("data tgCliente: ", data);                
            this.ultTarifaCliente = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
            this.ultTarifaCliente.cargasGenerales = this.ultTarifaCliente.cargasGenerales || [];
            ////////console.log("1) ult tarifa GRAL CLIENTE: ",this.ultTarifaCliente);        
            this.configurarTabla();
          
        });       
    
    })
    
   
    
    
    //////// CONSOLA DE TARIFA ////////////////////////////
    this.storageService.consolaTarifa$.subscribe(data =>{
      this.consolaTarifa = data;
      ////////console.log("consola tarifa: ", this.consolaTarifa);   
      if(this.consolaTarifa > 0)  {
        this.calcularNuevaTarifaPorcentaje();
      } ;      
    });
    this.storageService.modoTarifa$.subscribe(data =>{
      this.modoTarifa = data;
      ////////console.log("1) modoTarifa: ", this.modoTarifa);      
      this.manejoConsola();
    });

    this.storageService.clientes$.subscribe(data => {
      this.$clientes = data;
    });    
    
    this.storageService.syncChangesByOneElem<TarifaGralCliente>('tarifasGralCliente', 'idTarifa');    
    this.storageService.syncChangesByOneElem<TarifaGralCliente>('tarifasGralChofer', 'idTarifa');    
    this.configurarTabla();
  }

  configurarTabla(){
    if(this.tEspecial){
      ////////////console.log("3a) tarifa especial: ", this.tEspecial);      
      ////////////console.log("3b) tarifa general: ", this.ultTarifaCliente);      
      this.storageService.tarifasEspChofer$
      //.pipe(take(2)) // Asegúrate de que la suscripción se complete después de la primera emisión
      .subscribe(data =>{
      ////////////console.log("2c) data: ", data);                
      this.ultTarifaEspecial = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
      this.ultTarifaEspecial.cargasGenerales = this.ultTarifaEspecial.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
      console.log("2d) ult tarifa ESP: ",this.ultTarifaEspecial);        
      this.resetTable();  // Limpia los datos existentes de la tabla;
      //this.crearCategorias()
      this.inicializarTabla();
      this.onGenerarNuevaTarifaAutomatica();   
    })
    }else{
      console.log("1a) tarifa gral cliente: ", this.ultTarifaCliente);      
      console.log("1b) tarifa gral chofer: ", this.ultTarifaGralChofer);      
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
    //////console.log("1) cliente: ", this.ultTarifaCliente );
    //////console.log("2) chofer: ", this.ultTarifaGralChofer );
    //////console.log("2) chofer especial: ", this.ultTarifaEspecial );
    if(this.tEspecial){
      this.ultTarifa = this.ultTarifaEspecial;
    }else {
      this.ultTarifa = this.ultTarifaGralChofer;
    }
      console.log("ultima tarifa Especial: ", this.ultTarifa);
    const categorias = this.ultTarifa?.cargasGenerales?.length > 0 
     ? this.ultTarifaGralChofer.cargasGenerales.map((cat, index) => ({
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
      nombreAnterior:  this.ultTarifaCliente?.cargasGenerales[index]?.nombre || "",
      adicionalKm: {
          primerSectorValor: 0,
          sectoresSiguientesValor: 0
      },
      orden: index + 1
    }));
    ;
    console.log("1)", categorias);
    if(this.tEspecial){
      categorias.forEach((cat, index) => {
        // Verificar si el vehículo tiene esta categoría
        const vehiculoTieneCategoria = this.vehiculos.some(vehiculo => vehiculo.categoria.catOrden === cat.orden);
        console.log("vehiculoTieneCategoria: ", vehiculoTieneCategoria);
        
        // Resaltar y habilitar inputs de las categorías y adicionales según el chofer y la tarifa especial
        const isInputEnabled = this.tEspecial && vehiculoTieneCategoria;
    
        // Fila principal para la categoría
        this.filas.push(this.fb.group({
          seleccionado: [vehiculoTieneCategoria ? true : false],
          categoria: [cat.categoria],
          nombre: [{ value: cat.nombreAnterior, disabled: !isInputEnabled }],
          ultimaTarifa: [{ value: vehiculoTieneCategoria?  this.obtenerValorCatEsp(cat, 1) : this.formatearValor(0), disabled: true }],
          diferencia: [{ value: this.formatearValor(0), disabled: true }],
          nuevaTarifa: [{ value: this.formatearValor(0), disabled: !isInputEnabled }],
          orden: cat.orden
        }));
    
        // Fila para Km 1er Sector valor
        this.filas.push(this.fb.group({
          seleccionado: [vehiculoTieneCategoria ? true : false],
          categoria: [''],
          nombre: [{ value: 'Km 1er Sector valor', disabled: true }],
          ultimaTarifa: [{ value: vehiculoTieneCategoria? this.obtenerValorCatEsp(cat, 2) : this.formatearValor(0), disabled: true }],
          diferencia: [{ value: this.formatearValor(0), disabled: true }],
          nuevaTarifa: [{ value: this.formatearValor(0), disabled: !isInputEnabled }],
          orden: cat.orden
        }));
    
        // Fila para Km Intervalos valor
        this.filas.push(this.fb.group({
          seleccionado: [vehiculoTieneCategoria ? true : false],
          categoria: [''],
          nombre: [{ value: 'Km Intervalos valor', disabled: true }],
          ultimaTarifa: [{ value: vehiculoTieneCategoria? this.obtenerValorCatEsp(cat, 3) : this.formatearValor(0), disabled: true }],
          diferencia: [{ value: this.formatearValor(0), disabled: true }],
          nuevaTarifa: [{ value: this.formatearValor(0), disabled: !isInputEnabled }],
          orden: cat.orden
        }));
      });

    } else {
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
    }


  
    
    
    // Fila para Acompañante
    this.filas.push(this.fb.group({
        seleccionado: [true],
        categoria: ['Acompañante'],
        nombre: [{ value: '', disabled: true }],
        ultimaTarifa: [{ value: this.ultTarifa?.adicionales?.acompaniante !== undefined ? this.formatearValor(this.ultTarifa?.adicionales?.acompaniante) : this.formatearValor(0), disabled: true }],        
        diferencia: [{ value: this.formatearValor(0), disabled: true }],
        nuevaTarifa: [{ value: this.formatearValor(0), disabled: true }],
        orden: this.ultTarifaCliente?.cargasGenerales.length + 1,
    }));
    // Fila para Km 1er Sector distancia
    this.filas.push(this.fb.group({
        seleccionado: [false],
        categoria: ['Km 1er Sector distancia'],
        nombre: [{ value: '', disabled: true }],
        ultimaTarifa: [{ value: this.ultTarifa?.adicionales?.KmDistancia?.primerSector !== undefined ? this.formatearValor(this.ultTarifa?.adicionales?.KmDistancia?.primerSector) : this.formatearValor(0), disabled: true }],
        diferencia: [{ value: this.formatearValor(0), disabled: true }],
        nuevaTarifa: [{ value: this.ultTarifa?.adicionales?.KmDistancia?.sectoresSiguientes !== undefined ? this.formatearValor(this.ultTarifa?.adicionales?.KmDistancia?.primerSector) : this.formatearValor(0), disabled: true }],
        orden: this.ultTarifaCliente?.cargasGenerales.length + 2,
    }));

    // Fila para Km Intervalos distancia
    this.filas.push(this.fb.group({
        seleccionado: [false],
        categoria: ['Km Intervalos distancia'],
        nombre: [{ value: '', disabled: true }],
        ultimaTarifa: [{ value: this.ultTarifa?.adicionales?.KmDistancia?.sectoresSiguientes !== undefined ?  this.formatearValor(this.ultTarifa?.adicionales?.KmDistancia?.sectoresSiguientes) : this.formatearValor(0), disabled: true }],
        diferencia: [{ value: this.formatearValor(0), disabled: true }],
        nuevaTarifa: [{ value: this.ultTarifa?.adicionales?.KmDistancia?.sectoresSiguientes !== undefined ? this.formatearValor(this.ultTarifa?.adicionales?.KmDistancia?.sectoresSiguientes) : this.formatearValor(0), disabled: true }],
        orden: this.ultTarifaCliente?.cargasGenerales.length + 3,
    }));
    console.log("2)", categorias);  
}

obtenerValorCatEsp(cat:any, indice: number){
  //console.log("A)cat", cat);
  //console.log("B)indice", indice);
  //console.log("C)ultTarifa.cargasGenerales", this.ultTarifa.cargasGenerales);
  if(this.ultTarifa.cargasGenerales.length > 0) {
    let catTarifa: any = [] 
    catTarifa = this.ultTarifa.cargasGenerales.filter((c:CategoriaTarifa)=>{return c.orden === cat.orden})
    //console.log("D)catTarifa: ", catTarifa);
    switch (true) {
       case indice === 1 :{
         return this.formatearValor(catTarifa[0].valor);        
       } 
       case indice === 2 :{
         return this.formatearValor(catTarifa[0].adicionalKm.primerSector);        
       } 
       case indice === 3 :{
         return this.formatearValor(catTarifa[0].adicionalKm.sectoresSiguientes);        
       } 
       default:{
         return this.formatearValor(0);        
       }
    } 
  } else {
    return this.formatearValor(0);
  }
  
}

  formatearValor(valor: number) : any{
    let nuevoValor =  new Intl.NumberFormat('es-ES', { 
     minimumFractionDigits: 2, 
     maximumFractionDigits: 2 
   }).format(valor);
   //////////////console.log(nuevoValor);    
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
      if(this.tEspecial){
        const porcentaje = this.consolaTarifa; // Porcentaje a aplicar

        this.filas.controls.forEach((fila, index) => {
          const categoria = fila.get('categoria')?.value;
          const ultimaTarifaControl = fila.get('ultimaTarifa');
          const nuevaTarifaControl = fila.get('nuevaTarifa');
          const diferenciaControl = fila.get('diferencia');
      
          // Solo aplicamos el porcentaje a las categorías correspondientes y el campo "Acompañante"
          if (this.comprobarCategoria(fila.get('orden')?.value) && categoria !== 'Km 1er Sector distancia' && categoria !== 'Km Intervalos distancia' ) {
            const ultimaTarifa = this.limpiarValorFormateado(ultimaTarifaControl?.value) || 0;
            const nuevaTarifa = ultimaTarifa * (1 + porcentaje);
      
            nuevaTarifaControl?.setValue(this.formatearValor(nuevaTarifa));
            diferenciaControl?.setValue(this.formatearValor(nuevaTarifa - ultimaTarifa));
          }
         
        });
      } else {
        const porcentaje = this.consolaTarifa;  // Porcentaje a aplicar
        this.filas.controls.forEach((fila, index) => {
            
            const seleccionadoControl = fila.get('seleccionado'); 
            const nombre = fila.get('nombre'); 
            const ultimaTarifaControl = fila.get('ultimaTarifa');
            const nuevaTarifaControl = fila.get('nuevaTarifa');
            const diferenciaControl = fila.get('diferencia');
            ////////console.log("seleccionadoControl:", seleccionadoControl?.value);
      
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
    if(this.tEspecial){
      this.filas.controls.forEach((fila) => {       
        const nuevaTarifaControl = fila.get('nuevaTarifa');
        const diferenciaControl = fila.get('diferencia');
        const ultimaTarifaControl = fila.get('ultimaTarifa');
    
        // Habilitar solo las categorías correspondientes y los adicionales
        if (this.comprobarCategoria(fila.get('orden')?.value) ) {
          nuevaTarifaControl?.enable();
    
          // Listener para calcular la diferencia cuando cambia el valor de la nueva tarifa
          nuevaTarifaControl?.valueChanges.subscribe((nuevoValor) => {
            const ultimaTarifa = this.limpiarValorFormateado(ultimaTarifaControl?.value || 0);
            const diferencia = this.limpiarValorFormateado(nuevoValor) - ultimaTarifa;
            diferenciaControl?.setValue(this.formatearValor(diferencia));
          });
        }
      });
    } else {
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
          //////console.log("A)",nuevoValor);
          
          if(typeof(nuevoValor) === "number") {
            const diferencia = nuevoValor - ultimaTarifa;
            ////////console.log("diferencia : ", diferencia ); 
            diferenciaControl?.setValue(this.formatearValor(diferencia));
          } else {
            const diferencia = this.limpiarValorFormateado(nuevoValor) - ultimaTarifa;
            ////////console.log("diferencia : ", diferencia ); 
            diferenciaControl?.setValue(this.formatearValor(diferencia));
          }
           
        });
    });

    }
}
  
onGenerarNuevaTarifaAutomatica() {
  this.filas.controls.forEach(fila => {
      const categoria = fila.get('categoria')?.value;
      if (categoria?.includes('Categoria') || categoria === '') {
          fila.get('nombre')?.disable();
          fila.get('nuevaTarifa')?.disable();
      }
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
  
    for (let i = 0; i < filas.length; i += 3) { // Se itera en pasos de 3 filas (categoría + 2 adicionales)
        const categoriaFila = filas.at(i);
        const kmPrimerSectorFila = filas.at(i + 1);
        const kmIntervalosFila = filas.at(i + 2);       
        
        if(this.tEspecial){
          //console.log("1)");
          if(categoriaFila.get('seleccionado')?.value && categoriaFila.get('nombre')?.value !== ""){            
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
        } else {
          
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
        //console.log("2)")
        
    }
    //console.log("cargasGenerales: ", cargasGenerales);
    // Construcción del objeto `AdicionalTarifa` para los valores generales
    const adicionales: AdicionalTarifa = {
      acompaniante: this.limpiarValorFormateado(filas.at(filas.length - 3).get('nuevaTarifa')?.value || 0),
      KmDistancia: {
          primerSector: this.limpiarValorFormateado(filas.at(filas.length - 2).get('nuevaTarifa')?.value || 0),
          sectoresSiguientes: this.limpiarValorFormateado(filas.at(filas.length - 1).get('nuevaTarifa')?.value || 0)
      }
  }
  
    // Construcción del tipo de tarifa
    const tipo: TarifaTipo = {
        general: true,
        especial: false,
        eventual: false,
        personalizada: false
    };
  
    // Construcción final del objeto `TarifaGralChofer`
    this.nuevaTarifaGral = {
      id: null,
      idTarifa: new Date().getTime(),
      fecha: new Date().toISOString().split('T')[0],
      cargasGenerales: cargasGenerales,
      adicionales: adicionales,
      tipo: tipo,
      idCliente: 0,
      idChofer: 0,
      idProveedor: 0, 
  };
  //console.log("NUEVA Tarifa: ", this.nuevaTarifaGral);
}


  obtenerNombreCat(control: AbstractControl): string {
    return control.get('nombre')?.value || ''
  }

  obtenerValorCat(control: AbstractControl): number {
    return this.limpiarValorFormateado(control.get('nuevaTarifa')?.value || 0);
  }

  addItem(){    
    ////////////console.log("1)",this.tEspecial);
    if(!this.tEspecial){
      this.storageService.addItem(this.componente, this.nuevaTarifaGral);     
      this.consolaTarifa = 0;
      this.storageService.setInfo("consolaTarifa", this.consolaTarifa)
    }else if(this.tEspecial){
      this.nuevaTarifaGral.idChofer = this.idChoferEsp[0];
      this.nuevaTarifaGral.idCliente = this.idClienteEsp[0];
      this.nuevaTarifaGral.tipo.general = false;
      this.nuevaTarifaGral.tipo.especial = true;
      this.storageService.addItem("tarifasEspChofer", this.nuevaTarifaGral);         
      this.consolaTarifa = 0;
      this.storageService.setInfo("consolaTarifa", this.consolaTarifa)
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
    let modo: string = "";
    let origen: string = "choferes"


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
        vehiculos: this.vehiculos,
        origen: origen,
      } 
      //////////console.log()(info); */
      
      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
         this.ngOnInit()
        },
        (reason) => {}
      );
    }
  }

  comprobarCategoria(categoria: number): boolean {
    // Extraer el número de la categoría de la cadena de texto (asumiendo el formato "Categoria X")
    ////console.log("1)",categoria);
    
  
    //const catNumero = parseInt(categoria.split(" ")[1], 10);
  
    // Lista de campos adicionales que siempre deben habilitarse/resaltarse
    const categoriasAdicionales = ['Acompañante', 'Km 1er Sector distancia', 'Km Intervalos distancia'];
  
    // Verificar si la categoría extraída corresponde a alguno de los vehículos del chofer
    const esCategoriaVehiculo = this.vehiculos.some((vehiculo: Vehiculo) => vehiculo.categoria.catOrden === categoria);
    ////console.log("2)",esCategoriaVehiculo);
    // Verificar si la categoría actual es una de las adicionales
    let esCategoriaAdicional 
    switch(categoria){
      case (this.ultTarifaCliente?.cargasGenerales.length + 1):{
        esCategoriaAdicional = true;
        break;
      }
      case (this.ultTarifaCliente?.cargasGenerales.length + 2):{
        esCategoriaAdicional = true;
        break;
      }
      case (this.ultTarifaCliente?.cargasGenerales.length + 3):{
        esCategoriaAdicional = true;
        break;
      }
      default:{
        esCategoriaAdicional = false;
        break
      }
      
    }
  
    // Devolver true si es una categoría de vehículo o una categoría adicional
    return esCategoriaVehiculo || esCategoriaAdicional  ;
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
        modo: "choferes",
        tEspecial: this.tEspecial,
        id: this.idChoferEsp[0],
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
