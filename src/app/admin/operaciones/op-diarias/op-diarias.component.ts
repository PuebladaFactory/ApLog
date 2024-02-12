import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Operacion } from 'src/app/interfaces/operacion';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-op-diarias',
  templateUrl: './op-diarias.component.html',
  styleUrls: ['./op-diarias.component.scss']
})
export class OpDiariasComponent implements OnInit {
  

  componente:string = "operacionesActivas"
  form:any;
  //operaciones$: any;
  opEditar!: Operacion;
  clientes$: any;
  choferes$: any;
  $clientes: any;
  $choferes: any;
  clienteSeleccionado!: Cliente;
  choferSeleccionado!: Chofer;
  opActivas$!: any;  
  public show: boolean = false;
  public buttonName: any = 'Consultar Operaciones';
  public showAlta: boolean = false;
  public buttonNameAlta: any = 'Alta de Operación';
  public showManual: boolean = false;
  public buttonNameManual: any = 'Carga Manual';
  consultasOp$!:any;
  $consultasOp!:any;
  titulo: string = "consultasOpActivas"
  btnConsulta:boolean = false;
  hoy: any = new Date().toISOString().split('T')[0];
  yesterday: any = new Date(Date.now() - 864e5).toISOString().split('T')[0];
  searchText: string = "";
  unidadesConFrio: boolean = false;
  acompaniante: boolean = false;
  

  constructor(private fb: FormBuilder, private storageService: StorageService, private router: Router, ) {
    this.form = this.fb.group({      
      fecha: [""],    
      observaciones: [""],
    })
   }
  ngOnInit(): void {
    //this.choferes$ = this.storageService.choferes$; 
    this.storageService.choferes$.subscribe(data => {
      this.$choferes = data;
    });
    //this.clientes$ = this.storageService.clientes$;
    this.storageService.clientes$.subscribe(data => {
      this.$clientes = data;
    });    
    //this.opActivas$ = this.storageService.opActivas$;
    //this.consultasOp$ = this.storageService.consultasOpActivas$;
    this.storageService.consultasOpActivas$.subscribe(data => {
      this.$consultasOp = data;
    });
    //console.log("esto es op-diarias. consultasOp: ", this.consultasOp$);
    this.consultaOpDelDia();
    this.toggleAltaOp();    
  }

  
  abrirEdicion(op:Operacion):void {
    this.opEditar = op;    
    this.clienteSeleccionado = op.cliente;
    this.choferSeleccionado = op.chofer;
    this.unidadesConFrio = op.unidadesConFrio;
    this.acompaniante = op.acompaniante;

    //console.log("este es la op a editar: ", this.opEditar);
    this.armarForm();
    
  }

  armarForm(){
    this.form.patchValue({
      fecha: this.opEditar.fecha,
      observaciones: this.opEditar.observaciones
    })
  }

  onSubmit(){   
    this.opEditar.fecha = this.form.value.fecha;
    this.opEditar.observaciones = this.form.value.observaciones;
    this.opEditar.cliente = this.clienteSeleccionado;
    this.opEditar.chofer  = this.choferSeleccionado;
    this.opEditar.unidadesConFrio = this.unidadesConFrio;
    this.opEditar.acompaniante = this.acompaniante;
    console.log("este es el cliente editado: ", this.opEditar);
    this.update();    
   }

   update(): void {
    this.storageService.updateItem(this.componente, this.opEditar)
    this.ngOnInit();  
    this.form.reset();   

  }

  eliminarOperacion(op: Operacion){
    this.storageService.deleteItem(this.componente, op);
    this.ngOnInit();    
  }

  changeCliente(e: any) {
    //console.log(e.target.value)
    let clienteForm;
    clienteForm = this.$clientes.filter(function (cliente: any) { 
      return cliente.razonSocial === e.target.value
    });
    this.clienteSeleccionado = clienteForm[0];               
    //console.log(this.clienteSeleccionado);
  }

  changeChofer(e: any) {
    //console.log(e.target.value)
    let choferForm;
    choferForm = this.$choferes.filter(function (chofer: any) { 
      return chofer.apellido === e.target.value
    });
    this.choferSeleccionado = choferForm[0];               
    //console.log(this.choferSeleccionado);
  }
 

  toggle() {
    this.show = !this.show;
    // Change the name of the button.
    if (this.show) this.buttonName = 'Cerrar';
    else this.buttonName = 'Consultar Operaciones';
  }

  toggleAltaOp() {
    this.showAlta = !this.showAlta;
    // Change the name of the button.
    if (this.showAlta) this.buttonNameAlta = 'Cerrar';
    else this.buttonNameAlta = 'Alta de Operación';
  }

  toggleManualOp() {
    this.showManual = !this.showManual;
    // Change the name of the button.
    if (this.showManual) this.buttonNameManual = 'Cerrar';
    else this.buttonNameManual = 'Alta de Operación';
  }

  consultaOpDelDia(){
     if(!this.btnConsulta){            
      this.storageService.getByDateValue("operacionesActivas", "fecha", this.hoy, this.hoy, this.titulo);    
    }     
  }

  getMsg(msg: any) {
    this.btnConsulta = true;
  }

  selectUCF(e: any) {
    console.log(e.target.value)
    if(e.target.value === "si"){
      this.unidadesConFrio = true;
    }else{
      this.unidadesConFrio = false;
    }   
    
  }

  selectAcompaniante(e: any) {
    console.log(e.target.value)
    console.log(e.target.value)
    if(e.target.value === "si"){
      this.acompaniante = true;
    }else{
      this.acompaniante = false;
    }
    //console.log("acompaniante: ", this.acompaniante);
  }
 
}
