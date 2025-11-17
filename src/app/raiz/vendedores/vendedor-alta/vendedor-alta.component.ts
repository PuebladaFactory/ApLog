import { Component, Input, OnInit, TemplateRef } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { Asignacion, Vendedor } from 'src/app/interfaces/vendedor';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ValidarService } from 'src/app/servicios/validar/validar.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-vendedor-alta',
  standalone: false,
  templateUrl: './vendedor-alta.component.html',
  styleUrl: './vendedor-alta.component.scss'
})
export class VendedorAltaComponent implements OnInit{

  @Input() fromParent:any
  
  componente:string = "vendedores"
  form:any;  
  soloVista: boolean = false;
  clientes!: ConId<Cliente>[];
  clientesAsignados!: ConId<Cliente>[];
  asignaciones: Asignacion[] = [];
  asignacion!: Asignacion;
  isLoading: boolean = false;
  vendedor!: Vendedor;
  vendedorEditar!: ConIdType<Vendedor>;
  clienteSeleccionado!: ConId<Cliente>;
  porcentajeAsignado: number = 0;
  asignacionEditar!: Asignacion;
  accionCliente: string = "";  
  modo: string  = "";


  constructor(
    private fb: FormBuilder, 
    private storageService: StorageService, 
    private modalService: NgbModal, 
    public activeModal: NgbActiveModal,    
    private dbFirestore: DbFirestoreService,
  ) {
    this.form = this.fb.group({      
      nombre: ["", [Validators.required, Validators.maxLength(30)]], 
      apellido: ["",[Validators.required, Validators.maxLength(30)]], 
      cuit: ["",[
        Validators.required,
        Validators.minLength(13),
        Validators.maxLength(13), // Ajustado para incluir los guiones
        ValidarService.cuitValido,
      ],],                  
      email: ["",[Validators.required, Validators.email]],
      celularContacto: ["",[Validators.required,Validators.minLength(10), Validators.maxLength(10)]],
      
    });
   
   }

  ngOnInit(): void {
    console.log("0)", this.fromParent);
    
    this.clientes = this.storageService.loadInfo('clientes');
    this.clientes = this.clientes.sort((a, b) =>
          a.razonSocial.localeCompare(b.razonSocial)
        );
    console.log("1)", this.fromParent);
    this.modo = this.fromParent.modo;
    
    if(this.fromParent.modo === "vista"){
      this.soloVista = true;
      this.armarForm();
    }else if(this.fromParent.modo === "alta") {       
      this.soloVista = false;
    } else if(this.fromParent.modo === "edicion"){
      this.soloVista = false;
      this.vendedorEditar = this.fromParent.item;      
      this.armarForm();
    }

   }

  armarForm(){
    this.form.patchValue({
      nombre: this.vendedorEditar.datosPersonales.nombre, 
      apellido: this.vendedorEditar.datosPersonales.apellido, 
      cuit: this.vendedorEditar.datosPersonales.cuit,
      email: this.vendedorEditar.datosPersonales.mail,
      celularContacto: this.vendedorEditar.datosPersonales.celular,
    });
    this.asignaciones = this.vendedorEditar.asignaciones
  }

  async onSubmit(){  
    if(this.asignaciones.length === 0 ) return this.mensajesError('Debe asignar un cliente al vendedor'); 
    let titulo = this.fromParent.modo === "alta" ? 'el alta' : 'la edición'

    const confirmacion = await Swal.fire({
      title: `¿Confirma ${titulo} del Vendedor?`,      
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    })
    if (confirmacion.isConfirmed) {      
      this.armarVendedor();
      const existe = await this.dbFirestore.existeCuit('vendedores', this.vendedor.datosPersonales.cuit);
      console.log("vendedor: ", this.vendedor, "existe: ", existe);
      if(this.modo === 'alta' && existe) return this.mensajesError('Error: Ya existe un vendedor con ese CUIT. Alta cancelada');
      if(this.modo === 'edicion' && !existe) return this.mensajesError('Error: No se puede encontrar ningún vendedor con ese CUIT. Edición cancelada');
      if(this.modo === 'alta'){
        this.storageService.addItem("vendedores", this.vendedor, this.vendedor.idVendedor, "ALTA", `Alta del vendedor ${this.vendedor.datosPersonales.apellido} + ${this.vendedor.datosPersonales.nombre}`);
      } else {
        let {id, type, ...vendedor} = this.vendedorEditar
        this.storageService.updateItem("vendedores", vendedor, vendedor.idVendedor, "EDICION", `Edición del vendedor ${vendedor.datosPersonales.apellido} + ${vendedor.datosPersonales.nombre}`, this.vendedorEditar.id);
      }

      Swal.fire({
        title: "Confirmado",
        text: `${this.modo} exitosa`,
        icon: "success"
      }).then((result)=>{
        if (result.isConfirmed) {
          this.activeModal.close();
        }
      });           
    }       
   
    
  }

  armarVendedor(){
    let formValue = this.form.value;
    // Eliminar los guiones del CUIT
    let cuitSinGuiones = formValue.cuit.replace(/-/g, '');       
        
    this.vendedor = {
      idVendedor: new Date().getTime() + Math.floor(Math.random() * 1000),
      datosPersonales: {
          nombre: formValue.nombre,
          apellido: formValue.apellido,
          cuit: cuitSinGuiones,
          celular: formValue.celularContacto,
          mail: formValue.email,
      },
      asignaciones: this.asignaciones,
      activo: true,
      
    };                
    
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.form.get(controlName);
    return control?.hasError(errorName) && control.touched;
  }
    
  mensajesError(msj:string){
    Swal.fire({
      icon: "error",
      //title: "Oops...",
      text: `${msj}`
      //footer: `${msj}`
    });
  }
  
  formatCuit(cuitNumber: number | string): string {
    // Convertir el número a string, si no lo es
    const cuitString = cuitNumber.toString();
  
    // Validar que tiene exactamente 11 dígitos
    if (cuitString.length !== 11 || isNaN(Number(cuitString))) {
      throw new Error('El CUIT debe ser un número de 11 dígitos');
    }
  
    // Insertar los guiones en las posiciones correctas
    return `${cuitString.slice(0, 2)}-${cuitString.slice(2, 10)}-${cuitString.slice(10)}`;
  }

  openModal(modalRef: TemplateRef<any>, accion:string): void {   
    this.accionCliente = accion;
    const modal = this.modalService.open(modalRef, { centered: true });
  }

  getCliente(id:number){
    let cliente
    cliente = this.clientes.find(c=> c.idCliente === id)
    if(cliente){
      return cliente.razonSocial
    } else {
      return ""
    }
  }

  changeCliente(e: any) {
    //////////console.log()(e.target.value)
    
    let clienteSelec = this.clientes.find(function (cliente: Cliente) { 
        return cliente.idCliente === Number(e.target.value)
    });   
    
    if(clienteSelec) this.clienteSeleccionado = clienteSelec;                
  }

  changePorcentaje(event: any) {
    let valor = Number(event.target.value);

    // Validar rango (0–100)
    if (isNaN(valor) || valor < 0 || valor > 100) {
      alert('El multiplicador debe estar entre 0 y 100');

      // Reasignar valor válido
      valor = 1;
      this.porcentajeAsignado = valor;

      // Forzar actualización visual del input
      event.target.value = valor.toString();

      return;
    }

    
  }

  guardarClienteAsignado(modal: any) {
    if (this.clienteSeleccionado && this.porcentajeAsignado && this.accionCliente === 'alta') {
      this.asignacion = {
        idAsignacion: new Date().getTime() + Math.floor(Math.random() * 1000),
        idCliente : this.clienteSeleccionado.idCliente,
        porcentaje: this.porcentajeAsignado
      }
      this.asignaciones.push(this.asignacion)
      console.log("this.asignacion", this.asignacion);
      
    } else if(this.accionCliente === 'edicion'){
      const index = this.asignaciones.findIndex(obj => obj.idAsignacion === this.asignacionEditar.idAsignacion);
      if (index !== -1) {
        this.asignaciones.splice(index, 1);
        this.asignacion = {
          idAsignacion: new Date().getTime() + Math.floor(Math.random() * 1000),
          idCliente : this.clienteSeleccionado.idCliente,
          porcentaje: this.porcentajeAsignado
        }
        this.asignaciones.push(this.asignacion)
      }
    }


    modal.close(); // El finally del modal se encarga de limpiar
  }

  eliminarAsignacion(indice:number){
  
      console.log("llega aca?");
      
  
      Swal.fire({
        title: `Desea eliminar la asignación del vendedor?`,
        //text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Confirmar",
        cancelButtonText: "Cancelar"
      }).then((result) => {
        if (result.isConfirmed) {     
          this.asignaciones.splice(indice, 1);    
          Swal.fire({
            title: "Confirmado",
            text: `Asignación eliminada`,
            icon: "success"
          })           
        }
      });       
      
    }
  
    editarAsignacion(modalRef: TemplateRef<any>, asignacion: Asignacion, indice:number){    
      this.asignacionEditar = asignacion;
      this.porcentajeAsignado = asignacion.porcentaje;
      this.openModal(modalRef, 'edicion')
  
    }


}
