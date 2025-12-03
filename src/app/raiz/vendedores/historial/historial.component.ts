import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConId } from 'src/app/interfaces/conId';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { ResumenVenta } from 'src/app/interfaces/resumen-venta';
import { Vendedor } from 'src/app/interfaces/vendedor';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-historial',
  standalone: false,
  templateUrl: './historial.component.html',
  styleUrl: './historial.component.scss'
})
export class HistorialComponent implements OnInit, OnDestroy {

  vendedores!: ConId<Vendedor>[];
  clientes!: ConId<Cliente>[];
  choferes!: ConId<Chofer>[];
  proveedores!: ConId<Proveedor>[];
  private destroy$ = new Subject<void>(); // Subject para manejar la destrucción
  vendSeleccionado!: ConId<Vendedor>;
  resumenVentas: ConId<ResumenVenta>[] = [];
  limite:number = 12

  constructor(
    private storageService: StorageService,
  ){}

  ngOnInit(): void {

    /// CHOFERES/CLIENTES/PROVEEDORES
    this.choferes = this.storageService.loadInfo('choferes');
    this.choferes = this.choferes.sort((a, b) => a.apellido.localeCompare(b.apellido)); // Ordena por el nombre del chofer
    this.clientes = this.storageService.loadInfo('clientes');
    this.clientes = this.clientes.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
    this.proveedores = this.storageService.loadInfo('proveedores');
    this.proveedores = this.proveedores.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
    this.vendedores = this.storageService.loadInfo('vendedores');
    this.vendedores = this.vendedores.sort((a, b) => a.datosPersonales.apellido.localeCompare(b.datosPersonales.apellido)); // Ordena por el nombre del chofer
    this.storageService.getObservable<ConId<ResumenVenta>>("resumenVenta")
    .pipe(takeUntil(this.destroy$))
    .subscribe(data => {
      this.resumenVentas = data;
      if (this.resumenVentas) {
        console.log("resumenVentas: ", this.resumenVentas);
          // 👉 REARMAR LOS GRUPOS
      } else {
        this.mensajesError("error: resumenVentas", "error");
      }
    });

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  changeVendedor(e: any) {
    //////////console.log()(e.target.value)    
    this.resumenVentas = [];
    let vendedorFiltrado = this.vendedores.find(v => { 
       return v.idVendedor === Number(e.target.value)
    });
    //////////console.log()(chofer);    
    if(vendedorFiltrado)this.vendSeleccionado = vendedorFiltrado;     
    console.log("vendSeleccionado: ", this.vendSeleccionado);
    
  } 

  consultarTarifasEventuales(){
    this.storageService.getAllSortedIdLimit<ResumenVenta>("resumenVenta", "idVendedor", this.vendSeleccionado.idVendedor, "idResumen", "desc", this.limite,"resumenVenta");          
  }

  mensajesError(msj:string, resultado:string){
    Swal.fire({
      icon: resultado === 'error' ? "error" : "success",
      //title: "Oops...",
      text: `${msj}`
      //footer: `${msj}`
    });
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



}
