import { Component, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-choferes-tarifa-especial',
    templateUrl: './choferes-tarifa-especial.component.html',
    styleUrls: ['./choferes-tarifa-especial.component.scss'],
    standalone: false
})
export class ChoferesTarifaEspecialComponent implements OnInit {

  $choferes!: Chofer[];
  $choferesEsp! : Chofer [];
  choferSeleccionado!: Chofer[];
  tEspecial: boolean = false;
  idChoferEsp!: number;
  $clientes!: Cliente[];
  clienteSeleccionado!: Cliente[];
  idClienteEsp!: any;
  consultaChofer: any [] = [];
  consultaCliente: any [] = [];
  private destroy$ = new Subject<void>();

  constructor(private storageService: StorageService){}

  ngOnInit() {
    this.storageService.choferes$
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data => {
      this.$choferes = data;     
      this.$choferesEsp = this.$choferes
      .filter((c:Chofer)=>{return c.tarifaTipo.especial === true && c.idProveedor === 0})
      .sort((a, b) => a.apellido.localeCompare(b.apellido)); // Ordena por el nombre del chofer
      console.log("1)choferes especiales: ", this.$choferesEsp);      
      this.tEspecial = false;
    })             
    this.storageService.clientes$
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data => {
      this.$clientes = data;    
      this.$clientes = this.$clientes      
      .sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del c  
      console.log("2)clientes: ", this.$clientes);      
      
    })             

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  changeChofer(e: any) {    
    console.log(e.target.value);    
    let id = Number(e.target.value);
    ////console.log()("1)",id);    
    this.choferSeleccionado = this.$choferesEsp.filter((chofer:Chofer)=>{
      ////console.log()("2", cliente.idCliente, id);
      return chofer.idChofer === id;
    })
    //this.tEspecial = true;
    this.idChoferEsp = id 
    this.consultaChofer.push(this.idChoferEsp);    
    this.storageService.setInfo("choferSeleccionado", this.consultaChofer);   
    this.consultaChofer = [];
  }

  changeCliente(e: any) {    
    console.log(e.target.value);    
    let id: number;  
    ////console.log()("1)",id);
    if(e.target.value === "todos"){
      this.idClienteEsp = 0;
    } else{
      id = Number(e.target.value);
      this.clienteSeleccionado = this.$clientes.filter((cliente:Cliente)=>{
        ////console.log()("2", cliente.idCliente, id);
        return cliente.idCliente === id;
      })      
      this.idClienteEsp = id; 
      console.log("id cliente eso: ", this.idClienteEsp);
      
    }
    this.tEspecial = true;
    this.consultaCliente.push(this.idClienteEsp)
    this.storageService.setInfo("clienteSeleccionado", this.consultaCliente);
    this.consultaCliente = [];   
  }

  mostrarInfo(){
    Swal.fire({
      position: "top-end",
      //icon: "success",
      //title: "Your work has been saved",
      text:"Seleccione los clientes para los cuales quiere que la tarifa sea aplicada",
      showConfirmButton: false,
      timer: 10000
    });
  }

}
