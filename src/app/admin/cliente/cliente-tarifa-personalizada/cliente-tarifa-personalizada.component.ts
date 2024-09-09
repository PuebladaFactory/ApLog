import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CategoriaTarifa, Seccion, TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cliente-tarifa-personalizada',
  templateUrl: './cliente-tarifa-personalizada.component.html',
  styleUrls: ['./cliente-tarifa-personalizada.component.scss']
})
export class ClienteTarifaPersonalizadaComponent implements OnInit {

  /* tarifaForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.tarifaForm = this.fb.group({
      secciones: this.fb.array([]),
      tipo: this.fb.group({
        general: [false],
        especial: [false],
        eventual: [false],
      })
    });
  }

  get secciones(): FormArray {
    return this.tarifaForm.get('secciones') as FormArray;
  }
  
  getCategorias(i: number): FormArray {
    return this.secciones.at(i).get('categorias') as FormArray;
  }

  nuevaSeccion(): void {
    const seccionForm = this.fb.group({
      nombreSeccion: [`Seccion ${this.secciones.length + 1}`],
      categorias: this.fb.array([])
    });
    this.secciones.push(seccionForm);
    console.log(this.secciones);
    
    
  }

  nuevaCategoria(index: number): void {
    const categorias = (this.secciones.at(index).get('categorias') as FormArray);
    const categoriaForm = this.fb.group({
      nombreCategoria: [`Categoria ${categorias.length + 1}`],
      valor: ['', Validators.required]
    });
    categorias.push(categoriaForm);
  }

  guardarTarifa(): void {
    const nuevaTarifa: TarifaPersonalizadaCliente = {
      id: null,
      idTarifa: new Date().getTime(),
      fecha: new Date().toISOString().split('T')[0],
      secciones: this.tarifaForm.value.secciones,
      tipo: this.tarifaForm.value.tipo
    };
    console.log('Tarifa Personalizada Guardada:', nuevaTarifa);
    // Aquí puedes hacer la lógica de guardado en Firebase o donde necesites.
  } */

    secciones: Seccion [] = [];
    seccion! : Seccion;
    categorias : CategoriaTarifa[] = [];
    categoria!: CategoriaTarifa;
    seccionesForm!: FormArray;
    inputSecciones!: any;
    categoriaForm: any;
    descripcionForm: any;
    tarifaPersonalizadaCliente!: TarifaPersonalizadaCliente;

  constructor(private fb: FormBuilder) {
    this.inputSecciones = this.fb.group({
      cantSecciones : [""],
          })
    this.categoriaForm = this.fb.group({
      categoriaNum : [""],
      nombre: [""],
      aCobrar: [""],
      aPagar: [""],
          })
    this.seccionesForm = this.fb.array([]);
    this.descripcionForm = this.fb.group({
      descripcion : [""],
          })
    this.secciones = [];
  }

  ngOnInit(): void {
  }

  agregarSeccion() {        
    let orden = this.secciones.length
    this.seccion = {      
      orden: orden + 1,
      descripcion: "",
      categorias: [],
    }
    this.secciones.push(this.seccion);
    console.log("1) secciones: ", this.secciones);    
  }

  eliminarSeccion(index:number){
    console.log(index);    
    this.secciones.splice(index, 1);
    console.log("1.b) secciones: ", this.secciones);    
  }

  agregarCategoria(index: number) {       
    
    console.log("1)seccion", this.secciones[index]);
    this.categoria = {
      orden: this.secciones[index].categorias.length + 1,
      nombre: this.categoriaForm.value.nombre,
      aCobrar: this.categoriaForm.value.aCobrar,
      aPagar: this.categoriaForm.value.aPagar,
    }
    console.log("2)", this.categoria);
    //this.categorias.push(this.categoria)
    //console.log("3)", this.categorias);
    this.secciones[index].categorias.push(this.categoria)
    this.categoriaForm.reset()
    console.log("3)Secciones:" , this.secciones);    
  }

  eliminarcategoria(index: number, orden:number) {
    this.secciones[index].categorias.splice(orden, 1);
  }

  agregarDescripcion(index:number) {
    console.log(this.descripcionForm.value.descripcion);
    console.log(this.secciones);
    this.secciones[index].descripcion = this.descripcionForm.value.descripcion;
    this.descripcionForm.reset();
  }

  /* agregarCategorias(index: number) {    
    console.log("1.05) index: ", index); // esto es la posicion de la seccion dentro del array secciones
    console.log("1.10) numCategorias: ", this.seccionesForm.value[index].numCategorias); //cuantas categorias va a tener la seccion
    //const numCategorias = this.secciones.at(index).get('numCategorias')?.value;
    const numCategorias = this.seccionesForm.value[index].numCategorias;
    const categoriasArray = this.seccionesForm.at(index).get('categorias') as FormArray;
    console.log("1.25) categoriasArray: ", categoriasArray.value);
    console.log("1.50) numCategorias: ", numCategorias);
    // Limpiar las categorías existentes antes de agregar las nuevas
    categoriasArray.clear();

    for (let i = 0; i < numCategorias; i++) {
      categoriasArray.push(this.fb.group({
        numeroCategoria: [`Categoria ${categoriasArray.length + 1}`],
        nombreCategoria: [''],
        valor: [0]
      }));
    }
    console.log("2)categorias: ",categoriasArray.value);
    console.log("3)secciones: ", this.seccionesForm.value);
    
  } */

  crearTarifa() {
    this.tarifaPersonalizadaCliente = {
      id: null,
      idTarifa: new Date().getTime(),
      fecha: new Date().toISOString().split('T')[0],
      secciones: this.secciones,
      tipo: { general: false, especial: false, eventual: false, personalizada:true }  // Ajusta según sea necesario
    };
    
    console.log('Tarifa guardada:', this.tarifaPersonalizadaCliente);
    // Aquí puedes llamar a un servicio para guardar la tarifa en la base de datos
  }

  mostrarInfo(){
    Swal.fire({
      position: "top-end",
      //icon: "success",
      //title: "Your work has been saved",
      text:"Las tarifas personalizas estan compuestas por secciones, las cuales a su vez estan compuestas por categorias. Se pueden crear cuantas secciones se deseen. Y dentro de cada sección,cuantas categorias se deseen. Cada seccion tien un campo 'Descripcion', el cual es opcional y solo tiene caracter informativo. Cada categoria está numerada y compuesta por un campo 'nombre', el cual sirve para nombrar la categoria, el campo 'a cobrar', donde se debe guardar el monto a cobrar al cliente, y un campo 'a pagar', donde se debe ingresar el monto a pagar al chofer que realice el viaje.",
      showConfirmButton: false,
      timer: 10000
    });
  }

}
