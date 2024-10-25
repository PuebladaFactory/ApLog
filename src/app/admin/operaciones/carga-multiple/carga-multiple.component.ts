import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Operacion, TarifaPersonalizada } from 'src/app/interfaces/operacion';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { Seccion, TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
import { BuscarTarifaService } from 'src/app/servicios/buscarTarifa/buscar-tarifa.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-carga-multiple',
  templateUrl: './carga-multiple.component.html',
  styleUrls: ['./carga-multiple.component.scss']
})
export class CargaMultipleComponent implements OnInit {

  componente:string = "operaciones"
  op!: Operacion;
  $choferes!: Chofer[];
  $clientes!: Cliente[];
  $proveedores!: Proveedor[];
  tarifaClienteSel!: TarifaGralCliente;
  tarifaPersonalizada!: TarifaPersonalizadaCliente;
  ultTarifaGralCliente!: TarifaGralCliente;
  ultTarifaGralChofer!: TarifaGralCliente;
  ultTarifaEspCliente!: TarifaGralCliente;
  ultTarifaEspChofer!: TarifaGralCliente;
  ultTarifaGralProveedor!: TarifaGralCliente;
  ultTarifaEspProveedor!: TarifaGralCliente;
  clienteSeleccionado!: Cliente;
  tPersonalizada: boolean = false;
  patenteChofer: string = "";
  vehiculoSeleccionado!: Vehiculo;
  tarifaPersSelecionada!: TarifaPersonalizada;
  seccionElegida!: Seccion;
  mostrarCategoria: boolean = false;
  operacionesForm!: FormGroup; // Usamos un formulario reactivo para manejar las selecciones
  operaciones!: Operacion[];


  constructor(public activeModal: NgbActiveModal, private fb: FormBuilder, private storageService: StorageService, private buscarTarifaServ: BuscarTarifaService){
    this.operacionesForm = this.fb.group({
      fecha: ['', []],
      cliente: [null, []],
      choferes: this.fb.array([])
    });
    
  }
  
  
  ngOnInit(): void {      
    this.storageService.clientes$.subscribe(data => {
      this.$clientes = data;
    }); 
    this.storageService.proveedores$.subscribe(data => {
      this.$proveedores = data;
    });    
    this.storageService.ultTarifaPersCliente$.subscribe(data => {
      this.tarifaPersonalizada = data || {}
    })       
    /////////TARIFA GENERAL CLIENTE /////////////////////////
    this.storageService.ultTarifaGralCliente$.subscribe(data =>{
      ////////////////console.log("data: ", data);                
      this.ultTarifaGralCliente = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
      this.ultTarifaGralCliente.cargasGenerales = this.ultTarifaGralCliente.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
      ////////////console.log("1) ult tarifa GRAL CLIENTE: ",this.ultTarifaGralCliente);              
    });
    /////////TARIFA GENERAL CHOFER /////////////////////////
    this.storageService.ultTarifaGralChofer$.subscribe(data =>{
      ////////////////console.log("data: ", data);                
      this.ultTarifaGralChofer = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
      this.ultTarifaGralChofer.cargasGenerales = this.ultTarifaGralChofer.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
      ////////////console.log("2) ult tarifa GRAL CHOFER: ",this.ultTarifaGralChofer);              
    });
    /////////TARIFA ESPECIAL CLIENTE /////////////////////////
    this.storageService.ultTarifaEspCliente$
      //.pipe(take(3)) // Asegúrate de que la suscripción se complete después de la primera emisión
      .subscribe(data =>{            
      this.ultTarifaEspCliente = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
      this.ultTarifaEspCliente.cargasGenerales = this.ultTarifaEspCliente.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
      ////////////console.log("3) ult tarifa ESP CLIENTE: ",this.ultTarifaEspCliente);              
    })
    /////////TARIFA ESPECIAL CHOFER /////////////////////////
    this.storageService.ultTarifaEspChofer$
      //.pipe(take(2)) // Asegúrate de que la suscripción se complete después de la primera emisión
      .subscribe(data =>{
      ////////////////console.log("2c) data: ", data);                
      this.ultTarifaEspChofer = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
      this.ultTarifaEspChofer.cargasGenerales = this.ultTarifaEspChofer.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
      ////////////console.log("4) ult tarifa ESP CHOFER: ",this.ultTarifaEspChofer);           
    })
    //////////////// TARIFA GENERAL PROVEEDORES ///////////////////
    this.storageService.ultTarifaGralProveedor$.subscribe(data =>{
      ////////////console.log("data", data);        
      this.ultTarifaGralProveedor = data || {};
      this.ultTarifaGralProveedor.cargasGenerales = this.ultTarifaGralProveedor.cargasGenerales || [];
      ////////////console.log("5) ult tarifa GRAL PROVEEDOR: ", this.ultTarifaGralProveedor);      
    })
    ////////////////TARIFA ESPECIAL PROVEEDORES//////////////////
    this.storageService.ultTarifaEspProveedor$
    //.pipe(take(2)) // Asegúrate de que la suscripción se complete después de la primera emisión
    .subscribe(data =>{
    ////////////////console.log("2c) data: ", data);                
    this.ultTarifaEspProveedor = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
    this.ultTarifaEspProveedor.cargasGenerales = this.ultTarifaEspProveedor.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
    ////////////console.log("6) ult tarifa ESP PROVEEDOR: ",this.ultTarifaEspProveedor);           
    });  
    this.storageService.choferes$.subscribe(data => {
      this.$choferes = data;
      this.inicializarChoferes();
    });
  }

  inicializarChoferes() {
    //const choferesFormArray = this.operacionesForm.get('choferes') as FormArray;
    //////////console.log("1)", choferesFormArray.value);
    this.$choferes.forEach(chofer => {
      this.choferesFormArray.push(this.fb.group({
        seleccionado: [false],
        chofer: [chofer],  // Aquí pasas el objeto completo chofer
        nombre: [chofer.apellido + " " + chofer.nombre],  // Aquí pasas el objeto completo chofer
        vehiculoSeleccionado: [chofer.vehiculo],
        patenteChofer: [chofer.vehiculo.length === 1 ? chofer.vehiculo[0].dominio : "" ],
        tarifa:[chofer.tarifaTipo?.especial ? "Especial" : chofer.tarifaTipo?.eventual ? "Eventual" : "General"],
        acompaniante: [false],
        seccion: [""],
        categoria: [""],
        observaciones: ['']
      }));
    });
    ////////console.log("2)",this.choferesFormArray.value);
  }

  // Seleccionar o deseleccionar todos los choferes
  onSeleccionarTodosChange(event: any) {
    const seleccion = event.target.checked;
    this.choferesFormArray.controls.forEach(control => {
      control.patchValue({ seleccionado: seleccion });
    });
  }
  

  changeCliente(e: any) {
    //////////////////console.log()(e.target.value)
    
    let clienteForm = this.$clientes.filter(function (cliente: Cliente) { 
        return cliente.idCliente === Number(e.target.value)
    });
    //////////////////console.log()(clienteForm);
    
    this.clienteSeleccionado = clienteForm[0];               
    //////////////////console.log()(this.clienteSeleccionado);    
    

    if(this.clienteSeleccionado.tarifaTipo.personalizada){
      this.storageService.getElemntByIdLimit("tarifasPersCliente", "idCliente", "idTarifa", this.clienteSeleccionado?.idCliente, "ultTarifaPersCliente" )
      this.tPersonalizada = true;  
      //console.log("tarifa personalizada: SI");
          
    } else {
      this.tPersonalizada = false;  
      //console.log("tarifa personalizada: NO");
    }
  }

// Obtener el FormArray de choferes
  get choferesFormArray(): FormArray {
    return this.operacionesForm.get('choferes') as FormArray;
  }



  // Manejar el cambio de vehículo para un chofer específico
  changeVehiculo(index: number, event: any) {
    const vehiculoDominio = event.target.value;
    //////console.log("vehiculo: ", vehiculoDominio);
    
    this.choferesFormArray.at(index).patchValue({ patenteChofer: vehiculoDominio });
  }
    // Manejar el cambio de sección
    changeSeccion(index: number, event: any) {
      const seccionId = event.target.value;
      this.seccionElegida = this.tarifaPersonalizada.secciones[event.target.value - 1]; 
      this.choferesFormArray.at(index).patchValue({ seccion: seccionId, categoria: null });
      // Aquí puedes cargar las categorías correspondientes a la sección seleccionada si es necesario
    }
  
    // Manejar el cambio de categoría
    changeCategoria(index: number, event: any) {
      const categoriaId = event.target.value;
      this.choferesFormArray.at(index).patchValue({ categoria: categoriaId });
    }

    selectAcompaniante(index: number, event: any) {
      let acompaniante = event.target.value.toLowerCase() == 'true';      
      this.choferesFormArray.at(index).patchValue({ acompaniante: acompaniante });
    }


    
// Lógica para enviar las operaciones al guardar
onSubmit() {
    let formValue = this.operacionesForm.value;
    let fecha: Date = formValue.fecha;
    let proveedor
    const cliente: Cliente | null = this.clienteSeleccionado;
    //////console.log("1) choferes seleccionados: ", cliente);
    if (!fecha) {
      // Manejar errores de validación
      this.mensajesError('Por favor, seleccione una fecha.');
      return;
    }
    if (!cliente) {
      // Manejar errores de validación
      this.mensajesError('Por favor, seleccione un cliente.');
      return;
    }

    // Filtrar los choferes seleccionados
    let choferesSeleccionados = formValue.choferes.filter((c: any) => c.seleccionado);
    //////console.log("2) choferes seleccionados: ", choferesSeleccionados);    

    if (choferesSeleccionados.length === 0) {
      this.mensajesError('Por favor, selecciona al menos un chofer.');
      return;
    }

    let choferesSinPatente = choferesSeleccionados.filter((choferForm: any) => {
      console.log("choferForm: ", choferForm);        
      return choferForm.patenteChofer === "";
    });
        
    // Si hay choferes sin sección o categoría seleccionadas
    if (choferesSinPatente.length > 0) {
      this.mensajesError('Uno de los choferes seleccionados no tiene definido el vehiculo.');
      return;
    }
    
    console.log("choferesSeleccionados: ", choferesSeleccionados);        
     // Verificar si el cliente tiene una tarifa personalizada
     if (this.tPersonalizada) {
      const choferesSinSeccionOCategoria = choferesSeleccionados.filter((choferForm: any) => {
        console.log("choferForm: ", choferForm);        
        return choferForm.seccion === "" || choferForm.seccion === null || choferForm.categoria === "" || choferForm.categoria === null;
      });
      
      
      // Si hay choferes sin sección o categoría seleccionadas
      if (choferesSinSeccionOCategoria.length > 0) {
        this.mensajesError('Por favor, seleccione una sección y una categoría para todos los choferes.');
        return;
      }
    }

    let baseTime = new Date().getTime(); // Obtén el timestamp base
    let increment = 0;
    

/*     if(cliente.tarifaTipo.especial && !this.tPersonalizada){
      this.storageService.getElemntByIdLimit("tarifasEspCliente","idCliente","idTarifa",this.clienteSeleccionado.idCliente,"ultTarifaEspCliente");  
    } */

    choferesSeleccionados.forEach((choferForm:any) => {      
     
    
      // Crear operaciones para cada chofer seleccionado
      //let operaciones: Operacion[] = choferesSeleccionados.map((choferForm: any) => {      
      this.operaciones = choferesSeleccionados.map((choferForm: any) => {      
        let idOperacionUnico = baseTime + increment; // Agrega un incremento al timestamp
        increment++; // Aumenta el incremento para la siguiente operación
        let chofer: Chofer = choferForm.chofer;
        let vehiculoSeleccionado: Vehiculo [] = choferForm.vehiculoSeleccionado;      
        let observaciones: string = choferForm.observaciones || '';
        let patenteChofer: string = vehiculoSeleccionado.length === 1 ? vehiculoSeleccionado[0].dominio : choferForm.patenteChofer;
        let acompaniante: boolean = choferForm.acompaniante;
        let seccion: number = this.tPersonalizada ? choferForm.seccion : 0;
        let categoria: number = this.tPersonalizada ? choferForm.categoria : 0;
        //////console.log("2.2) seccion y categoria: ", seccion, "/", categoria);  
       /*  if (patenteChofer === "") {
            this.mensajesError('Uno de los choferes seleccionados no tiene definido el vehiculo.');
            return;
        } */       
        // Obtener el vehículo seleccionado
        //const vehiculo = chofer.vehiculo.find(v => v.dominio === vehiculoDominio);
  
        // Crear la operación
        console.log("antes de crear las op, tPersonalizada: ",this.tPersonalizada);
        
        const operacion: Operacion = {
            id: null, // Será asignado por la base de datos
            idOperacion: idOperacionUnico,
            fecha: fecha,
            km: 0,    
            documentacion: null,
            cliente: cliente,
            chofer: chofer,
            observaciones: observaciones,   
            acompaniante: acompaniante, 
            facturaCliente: 0,
            facturaChofer: 0,            
            tarifaEventual: {
              chofer: { concepto: '', valor: 0 },
              cliente: { concepto: '', valor: 0 }
            },            
            tarifaPersonalizada: this.tPersonalizada ? {
              seccion: seccion,
              categoria: categoria,
              nombre: this.tarifaPersonalizada.secciones[seccion - 1].categorias[categoria - 1].nombre, // Puedes definir cómo obtener este valor
              aCobrar: this.tarifaPersonalizada.secciones[seccion - 1].categorias[categoria - 1].aCobrar, // Ajustar según tu lógica
              aPagar: this.tarifaPersonalizada.secciones[seccion - 1].categorias[categoria - 1].aPagar // Ajustar según tu lógica
            } : {
              seccion: 0,
              categoria: 0,
              nombre: '',
              aCobrar: 0,
              aPagar: 0
            },
            patenteChofer: patenteChofer,
            estado: {
              abierta: true,
              cerrada: false,
              facturada: false
            },            
            tarifaTipo: this.tPersonalizada ? {
              general: false,
              especial: false,
              eventual: false,   
              personalizada: true, 
            } : cliente.tarifaTipo.especial || chofer.tarifaTipo.especial ? {
              general: false,
              especial: true,
              eventual: false,   
              personalizada: false, 
            } : {
              general: true,
              especial: false,
              eventual: false,   
              personalizada: false, 
            } ,
            valores:{
             
              cliente:{
                acompValor: 0,
                kmAdicional: 0,
                tarifaBase: this.tPersonalizada ? this.tarifaPersonalizada.secciones[seccion - 1].categorias[categoria - 1].aCobrar : 0, // Ajustar según tu lógica
                aCobrar: this.tPersonalizada ? this.tarifaPersonalizada.secciones[seccion - 1].categorias[categoria - 1].aCobrar : 0, // Ajustar según tu lógica
              },
              chofer:{
                acompValor: 0,
                kmAdicional: 0,
                tarifaBase: this.tPersonalizada ? this.tarifaPersonalizada.secciones[seccion - 1].categorias[categoria - 1].aPagar : 0, // Ajustar según tu lógica
                aPagar: this.tPersonalizada ? this.tarifaPersonalizada.secciones[seccion - 1].categorias[categoria - 1].aPagar : 0, // Ajustar según tu lógica
              }
            }
        };
        if(operacion.tarifaTipo.especial){
            if(cliente.tarifaTipo.especial){///si el cliente tiene una tarifa especial la buscar y llama al servicio
                /////////TARIFA ESPECIAL CLIENTE /////////////////////////
                this.storageService.getElemntByIdLimit("tarifasEspCliente","idCliente","idTarifa",this.clienteSeleccionado.idCliente,"ultTarifaEspCliente");  
                this.storageService.ultTarifaEspCliente$                
                .subscribe(data =>{            
                this.ultTarifaEspCliente = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
                this.ultTarifaEspCliente.cargasGenerales = this.ultTarifaEspCliente.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
                //////console.log("3) ult tarifa ESP CLIENTE: ",this.ultTarifaEspCliente);              
                if(this.ultTarifaEspCliente.cargasGenerales.length > 0){
                  operacion.valores.cliente.aCobrar = this.aCobrarOp(cliente, chofer, patenteChofer);
                  operacion.valores.cliente.tarifaBase = operacion.valores.cliente.aCobrar;
                };                
                })
              } else {
              operacion.valores.cliente.aCobrar = this.aCobrarOp(cliente, chofer, patenteChofer); ///sino quiere decir q el cliente tiene una tarifa general              
              operacion.valores.cliente.tarifaBase = operacion.valores.cliente.aCobrar;
            }
            if(chofer.tarifaTipo.especial){ ///si el chofer/proveedor tiene una tarifa especial la buscar y llama al servicio
              if(chofer.proveedor === "monotributista"){
                this.storageService.getElemntByIdLimit("tarifasEspChofer","idChofer","idTarifa",chofer.idChofer,"ultTarifaEspChofer");
                this.storageService.ultTarifaEspChofer$          
                  .subscribe(data =>{          
                  this.ultTarifaEspChofer = data || {};     
                  this.ultTarifaEspChofer.cargasGenerales = this.ultTarifaEspChofer.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío      
                  if(this.ultTarifaEspChofer.cargasGenerales.length > 0){
                    operacion.valores.chofer.aPagar = this.aPagarOp(chofer, patenteChofer);
                    operacion.valores.chofer.tarifaBase = operacion.valores.chofer.aPagar
                  }                
                })
              }else{
                  proveedor = this.$proveedores.filter((proveedor:Proveedor) =>{
                    return proveedor.razonSocial = chofer.proveedor
                  })                  
                  this.storageService.getElemntByIdLimit("tarifasEspProveedor","idProveedor","idTarifa",proveedor[0].idProveedor,"ultTarifaEspProveedor");
                  this.storageService.ultTarifaEspProveedor$          
                    .subscribe(data =>{          
                    this.ultTarifaEspProveedor = data || {};           
                    this.ultTarifaEspProveedor.cargasGenerales = this.ultTarifaEspProveedor.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío      
                    if(this.ultTarifaEspProveedor.cargasGenerales.length > 0){
                      operacion.valores.chofer.aPagar = this.aPagarOp(chofer, patenteChofer);                      
                      operacion.valores.chofer.tarifaBase = operacion.valores.chofer.aPagar;
                    };                    
                    });                  
              }
            } else {
              operacion.valores.chofer.aPagar = this.aPagarOp(chofer, patenteChofer); ///sino quiere decir q el cliente tiene una tarifa general
              operacion.valores.chofer.tarifaBase = operacion.valores.chofer.aPagar;
            }
        } else if(operacion.tarifaTipo.general){
          operacion.valores.cliente.aCobrar = this.aCobrarOp(cliente, chofer, patenteChofer) ///sino quiere decir q el cliente tiene una tarifa general
          operacion.valores.cliente.tarifaBase = operacion.valores.cliente.aCobrar;
          operacion.valores.chofer.aPagar = this.aPagarOp(chofer, patenteChofer); ///sino quiere decir q el cliente tiene una tarifa general
          operacion.valores.chofer.tarifaBase = operacion.valores.chofer.aPagar;
        }
                          
        
      return operacion
              
        
      });
      
      console.log("1) operaciones: ",this.operaciones );   
      
      this.addItem()
   
  })

    
}


aCobrarOp(cliente: Cliente, chofer: Chofer, patente:string ){  
  let tarifa
  if(cliente.tarifaTipo.especial){
    tarifa = this.ultTarifaEspCliente;
    console.log("1A) tarifa esp cobrar: ", tarifa);    
  } else {
    tarifa = this.ultTarifaGralCliente;
    console.log("1B) tarifa gral cobrar: ", tarifa);    
  }
  return this.buscarTarifaServ.$getACobrar(tarifa, chofer, patente);  
}

aPagarOp(chofer: Chofer, patente: string){

  let tarifa;  
  if(chofer.tarifaTipo.especial){
    if(chofer.proveedor === "monotributista"){
      tarifa = this.ultTarifaEspChofer; 
      console.log("2A) tarifa esp chofer a pagar: ", tarifa);        
    } else {
      tarifa = this.ultTarifaEspProveedor;
      console.log("2B) tarifa esp proveedor a pagar: ", tarifa);       
    }

  }else{
    if(chofer.proveedor === "monotributista"){
      tarifa = this.ultTarifaGralChofer;
      console.log("2B) tarifa gral chofer a pagar: ", tarifa);   
    } else {
      tarifa = this.ultTarifaGralProveedor;
      console.log("2B) tarifa gral proveedor a pagar: ", tarifa);   
    }    
  }
  return this.buscarTarifaServ.$getAPagar(tarifa, chofer, patente);  
  

}
    mensajesError(msj:string){
      Swal.fire({
        icon: "error",
        //title: "Oops...",
        text: `${msj}`
        //footer: `${msj}`
      });
    }

    async addItem(): Promise<void> {
      
        const result = await Swal.fire({
          title: "¿Desea agregar las operaciones?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          confirmButtonText: "Agregar",
          cancelButtonText: "Cancelar"
        });
         if (result.isConfirmed) {
          for (const op of this.operaciones) {
          // Guardar la operación en la base de datos
          await this.storageService.addItem(this.componente, op);
          
         
        }
        await Swal.fire({
          title: "Confirmado",
          text: "Las operaciones han sido agregadas.",
          icon: "success"
        }).then((result)=>{
          if (result.isConfirmed) {
            this.activeModal.close();
          }
        });
         }
      console.log("Todas las operaciones se han agregado.");
    }



}
