import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { FacturaOp } from 'src/app/interfaces/factura-op';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { StorageService } from 'src/app/servicios/storage/storage.service';


@Component({
  selector: 'app-modal-factura',
  templateUrl: './modal-factura.component.html',
  styleUrls: ['./modal-factura.component.scss']
})
export class ModalFacturaComponent implements OnInit {
  
  @Input() fromParent : any;
  titulo:string = "" ;
  facOp!: FacturaOp[];
  $choferes!: Chofer[];
  $clientes!: Cliente[];
  $proveedores!: Proveedor[];
  factura: any;
  searchText: string = "";
  private destroy$ = new Subject<void>(); // Subject para manejar la destrucción


  constructor(public activeModal: NgbActiveModal, private storageService: StorageService){}
  
  ngOnInit(): void {
    this.storageService.choferes$
      .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
      .subscribe(data => {
        this.$choferes = data;
        this.$choferes = this.$choferes.sort((a, b) => a.apellido.localeCompare(b.apellido)); // Ordena por el nombre del chofer
      });
    this.storageService.clientes$
      .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
      .subscribe(data => {
        this.$clientes = data;
        this.$clientes = this.$clientes.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
    }); 
      this.storageService.proveedores$
      .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
      .subscribe(data => {
        this.$proveedores = data;
        this.$proveedores = this.$proveedores.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
    });  


    console.log("fromParent", this.fromParent);
    this.facOp = this.fromParent.facOp
    this.factura = this.fromParent.item;
    if(this.fromParent.modo === "facturacion"){
      switch(this.fromParent.tipo){
        case "clientes":
          this.titulo = this.fromParent.item.razonSocial
          break;
        case "choferes":
          this.titulo = this.fromParent.item.apellido + " " + this.fromParent.item.nombre
          break;
        case "proveedores":
          this.titulo = this.fromParent.item.razonSocial
          break;
        default:
          break;
      }
    }
  }

  getChofer(idChofer: number){
    let chofer: Chofer []
    chofer = this.$choferes.filter((chofer:Chofer)=>{
      return chofer.idChofer === idChofer
    })
    if(chofer[0]){
      return chofer[0].apellido + " " + chofer[0].nombre; 
    } else {
      return `Chofer dado de baja. idChofer ${idChofer}`;
    }
  
  }

  getCliente(idCliente: number){
    let cliente: Cliente []
    cliente = this.$clientes.filter((cliente:Cliente)=>{
      return cliente.idCliente === idCliente
    })
    if(cliente[0]){
      return cliente[0].razonSocial;
    } else {
      return `Cliente dado de baja. idChofer ${idCliente}`;
    }

  } 

}
