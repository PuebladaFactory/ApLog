import { Component, Input, OnInit } from "@angular/core";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { Cliente } from "src/app/interfaces/cliente";
import { ConId } from "src/app/interfaces/conId";
import { OpVenta, ResumenVenta } from "src/app/interfaces/resumen-venta";
import { Vendedor } from "src/app/interfaces/vendedor";
import { StorageService } from "src/app/servicios/storage/storage.service";

@Component({
  selector: "app-resumen-venta-detalle",
  standalone: false,
  templateUrl: "./resumen-venta-detalle.component.html",
  styleUrl: "./resumen-venta-detalle.component.scss",
})
export class ResumenVentaDetalleComponent implements OnInit {
  @Input() resumenVenta!: ConId<ResumenVenta>;

  clientes!: ConId<Cliente>[];
  vendedores!: ConId<Vendedor>[];
  clientesColapsados = new Set<number>();

  constructor(
    public activeModal: NgbActiveModal,
    private storageService: StorageService,    
  ) {}

  ngOnInit(): void {
    this.clientes = this.storageService.loadInfo('clientes');
    this.clientes = this.clientes.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer    
    this.vendedores = this.storageService.loadInfo('vendedores');
    this.vendedores = this.vendedores.sort((a, b) => a.datosPersonales.apellido.localeCompare(b.datosPersonales.apellido)); // Ordena por el nombre del chofer
    console.log();
    
  }

  

toggleCliente(idCliente: number) {
  if (this.clientesColapsados.has(idCliente)) {
    this.clientesColapsados.delete(idCliente);
  } else {
    this.clientesColapsados.add(idCliente);
  }
}

estaColapsado(idCliente: number): boolean {
  return this.clientesColapsados.has(idCliente);
}

  getVendedor(id: number) {
    let vendedor;
    vendedor = this.vendedores.find((v) => v.idVendedor === id);
    if (vendedor) {
      return (
        vendedor.datosPersonales.apellido +
        " " +
        vendedor.datosPersonales.nombre
      );
    } else {
      return "";
    }
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

  getOpCliente(id:number): OpVenta[]{
    let opCliente: OpVenta[] = this.resumenVenta.operaciones.filter(r=> r.idCliente === id);
    opCliente.sort((a,b)=> a.fecha.localeCompare(b.fecha));
    return opCliente;
  }
  
  getTotalOpCliente(id:number, comision: number): number{
    let opCliente: OpVenta[] = this.resumenVenta.operaciones.filter(r=> r.idCliente === id);
    let total = opCliente.reduce((acc, obj) => acc + ((obj.totalCliente * comision)/100), 0);
    return total;
  }


}
