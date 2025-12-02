import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { VendedorAltaComponent } from '../vendedor-alta/vendedor-alta.component';
import { Subject, takeUntil } from 'rxjs';
import { Vendedor } from 'src/app/interfaces/vendedor';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { Cliente } from 'src/app/interfaces/cliente';
import Swal from 'sweetalert2';
import { BajaObjetoComponent } from 'src/app/shared/modales/baja-objeto/baja-objeto.component';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';

@Component({
  selector: 'app-vendedores-listado',
  standalone: false,
  templateUrl: './vendedores-listado.component.html',
  styleUrl: './vendedores-listado.component.scss'
})
export class VendedoresListadoComponent implements OnInit {

  private destroy$ = new Subject<void>();
  vendedores: ConId<Vendedor>[] = [];
  vendedorEditar!: ConId<Vendedor>;
  clientes!: ConId<Cliente>[];
  componente: string = "vendedores";
  isLoading: boolean = false;
  clientesModificados: ConId<Cliente>[] = [];

  constructor(
    private storageService: StorageService, 
    private modalService: NgbModal,
    private dbFirestore: DbFirestoreService,
  ){}

  ngOnInit(): void {   
    
    this.storageService
      .getObservable<ConIdType<Vendedor>>('vendedores')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        console.log("data: ", data);
        this.vendedores = data;
        console.log("this.vendedores", this.vendedores);
        
      });
    //this.vendedores = this.storageService.loadInfo('vendedores')
    this.clientes = this.storageService.loadInfo('clientes')
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  openModal(modos: string) {
    const modalRef = this.modalService.open(VendedorAltaComponent, {
      windowClass: 'myCustomModalClass',
      centered: true,
      size: 'md',
    });

    modalRef.componentInstance.fromParent = {
      modo: modos,
      item: this.vendedorEditar,
    };


  }

  getCliente(id:number):string{
    let cliente = this.clientes.find(c=> c.idCliente === id);
    return cliente? cliente.razonSocial : 'Sin datos'
  }

  editarVendedor(vendedor: ConId<Vendedor>){
    this.vendedorEditar = vendedor;
    this.openModal('edicion');
  }

  eliminarVendedor(vendedor: ConId<Vendedor>){
    this.vendedorEditar = vendedor;

        Swal.fire({
          title: '¿Dar de baja el vendedor?',
          text: 'No se podrá revertir esta acción',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Confirmar',
          cancelButtonText: 'Cancelar',
        }).then((result) => {
          if (result.isConfirmed) {
            this.openModalBaja();
          }
        });
  }

  async openModalBaja() {
      const modalRef = this.modalService.open(BajaObjetoComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        scrollable: true,
        size: 'sm',
      });
  
      modalRef.componentInstance.fromParent = {
        modo: 'Vendedor',
        item: this.vendedorEditar,
      };
  
      modalRef.result.then((result) => {
        
        if (result !== undefined) {
          this.isLoading = true;
          this.storageService.deleteItemPapelera(
            this.componente,
            this.vendedorEditar,
            this.vendedorEditar.idVendedor,
            'BAJA',
            `Baja de Vendedor ${this.vendedorEditar.datosPersonales.apellido} ${this.vendedorEditar.datosPersonales.nombre}`,
            result
          );
          this.eliminarClientes()
          /* Swal.fire({
            title: 'Confirmado',
            text: 'El Cliente ha sido dado de baja',
            icon: 'success',
          }); */
        }
      });
    }

  async eliminarClientes(){
        
    console.log("EDITAR CLIENTE => vendedorEditar: ",this.vendedorEditar);
    
    this.vendedorEditar.asignaciones.map(a=>{
      let clienteSel = this.clientes.find( c=> { 
        return c.idCliente === a.idCliente
      }); 
      console.log("EDITAR CLIENTE => clienteSel", clienteSel);
                
      if(clienteSel){
        if (!clienteSel.vendedor) {
          clienteSel.vendedor = [];
        }

        // Buscar el indice del idVendedor en el cliente
        const index = clienteSel.vendedor.indexOf(this.vendedorEditar.idVendedor);

        // 3) Si no existe → error
        if (index === -1) {
          throw new Error(`El vendedor con id ${this.vendedorEditar.idVendedor} no se encuentra en el cliente ${clienteSel.razonSocial}`);
        }

        // 4) Eliminar del array
        clienteSel.vendedor.splice(index, 1);
        this.clientesModificados.push(clienteSel);
        
      } else {
        this.isLoading = false;
        this.mensajesError("Error en la modificación de los clientes")
      }
    });
    console.log("EDITAR CLIENTE => this.clientesModificados: ", this.clientesModificados);
    if(this.clientesModificados.length > 0){
      const respuesta = await this.dbFirestore.actualizarMultiple(this.clientesModificados, 'clientes');
      if(respuesta.exito){
        this.isLoading = false;
        Swal.fire({
              title: 'Confirmado',
              text: 'El Cliente ha sido dado de baja',
              icon: 'success',
            });        
        } else {
        this.isLoading = false;
        this.mensajesError(respuesta.mensaje)
        }
    } else {
      this.isLoading = false;
      this.mensajesError("Error en la modificación de los clientes")
    }
    
    
  }

  mensajesError(msj:string){
    Swal.fire({
      icon: "error",
      //title: "Oops...",
      text: `${msj}`
      //footer: `${msj}`
    });
  }
}


