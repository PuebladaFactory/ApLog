import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { TarifaEventual } from 'src/app/interfaces/tarifa-eventual';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-tarifas-eventuales',
  templateUrl: './tarifas-eventuales.component.html',
  styleUrls: ['./tarifas-eventuales.component.scss']
})
export class TarifasEventualesComponent implements OnInit {
  moduloOrigen: string | null = null;
  $clientes!: Cliente[];
  $choferes!: Chofer[];
  $proveedores!: Proveedor[];
  objetos!: any [];
  idConsulta!: number;
  limite: number = 5;
  seleccion: string = "";
  tarifasEventuales!: TarifaEventual[];


  constructor(private router: Router, private storageService: StorageService) {}

  ngOnInit(): void {
    // Obtenemos la URL completa y dividimos los segmentos para obtener el módulo de origen
    const urlSegments = this.router.url.split('/');
    if (urlSegments.length > 1) {
      this.moduloOrigen = urlSegments[1]; // Esto será 'clientes' o 'choferes'
      console.log('Módulo origen:', this.moduloOrigen);
    }

    this.storageService.choferes$.subscribe(data => {
      this.$choferes = data;
      this.$choferes = this.$choferes        
        .sort((a, b) => a.apellido.localeCompare(b.apellido)); // Ordena por el nombre del chofer
    });
    this.storageService.clientes$.subscribe(data => {
      this.$clientes = data;
      this.$clientes = this.$clientes.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
    }); 
    this.storageService.proveedores$.subscribe(data => {
      this.$proveedores = data;       
      this.$proveedores = this.$proveedores.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer     
    })   
    this.changeObjeto()
  }

  changeObjeto(){
    switch(this.moduloOrigen){
      case "clientes":{
        this.objetos = this.$clientes
        console.log("objetos: ", this.objetos);
        break;        
      }
      case "choferes":{
        this.objetos = this.$choferes
        console.log("objetos: ", this.objetos);
        break;        
      }
      case "proveedores":{
        this.objetos = this.$proveedores
        console.log("objetos: ", this.objetos);
        break;        
      }
      default:{
        alert("error")
        break;
      }
    }
  }

  moduloFormateado(){
    if(this.moduloOrigen){
      const firstLetter = this.moduloOrigen?.charAt(0);
      const rest = this.moduloOrigen?.slice(1);
      return firstLetter.toUpperCase() + rest;
    } else {
      return ""
    }    
  }

  selectObjeto(e: any) {    
    switch(this.moduloOrigen){
      case "clientes":{
        let cliente: Cliente[];        
        cliente = this.objetos.filter((c)=> c.id === e.target.value);
        this.idConsulta = cliente[0].idCliente;     
        this.seleccion = cliente[0].razonSocial;
        console.log("idConsulta: ", this.idConsulta);
        this.consultarTarifasEventuales();
        break;        
      }
      case "choferes":{
        let chofer: Chofer[];        
        chofer = this.objetos.filter((c)=> c.id === e.target.value);
        this.idConsulta = chofer[0].idChofer;        
        console.log("idConsulta: ", this.idConsulta);
        this.consultarTarifasEventuales();
        break;        
      }
      case "proveedores":{
        let proveedor: Proveedor[];        
        proveedor = this.objetos.filter((c)=> c.id === e.target.value);
        this.idConsulta = proveedor[0].idProveedor;        
        console.log("idConsulta: ", this.idConsulta);
        this.consultarTarifasEventuales();
        break;        
      }
      default:{
        alert("error")
        break;
      }
    }
    
  }

  consultarTarifasEventuales(){
    switch(this.moduloOrigen){
      case "clientes":{
          this.storageService.getAllSortedIdLimit("tarifasEventuales", "idCliente", this.idConsulta, "idTarifa", "desc", this.limite,"tarifasEventuales");          
        break;        
      }
      case "choferes":{
        this.storageService.getAllSortedIdLimit("tarifasEventuales", "idChofer", this.idConsulta, "idTarifa", "desc", this.limite,"tarifasEventuales");
        break;        
      }
      case "proveedores":{
        this.storageService.getAllSortedIdLimit("tarifasEventuales", "idProveedor", this.idConsulta, "idTarifa", "desc", this.limite,"tarifasEventuales");
        break;        
      }
      default:{
        alert("error")
        break;
      }
    }
    
    this.storageService.tarifasEventuales$.subscribe(data => {
      this.tarifasEventuales = data || [];
      this.tarifasEventuales = this.tarifasEventuales.sort((a, b) => b.idTarifa - a.idTarifa);
      console.log("tarifas eventuales: ", this.tarifasEventuales);
    
    });
  }

  formatearValor(valor: number) : any{
    let nuevoValor =  new Intl.NumberFormat('es-ES', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }).format(valor);
  ////////////console.log(nuevoValor);    
  return nuevoValor
  }

  getCliente(id: number){
    let cliente: Cliente[] = this.$clientes.filter(c=>c.idCliente === id);
    return cliente[0].razonSocial;
  }

  getChofer(id: number){
    let chofer: Chofer[] = this.$choferes.filter(c=>c.idChofer === id);
    return chofer[0].apellido + " " + chofer[0].nombre;
  }

  getProveedor(id:number){
    let proveedor: Proveedor[] = this.$proveedores.filter(p=>p.idProveedor === id);
    return proveedor[0].razonSocial;
  }

}
