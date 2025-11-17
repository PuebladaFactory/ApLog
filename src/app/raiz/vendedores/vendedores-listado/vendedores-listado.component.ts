import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { VendedorAltaComponent } from '../vendedor-alta/vendedor-alta.component';
import { Subject, takeUntil } from 'rxjs';
import { Vendedor } from 'src/app/interfaces/vendedor';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { Cliente } from 'src/app/interfaces/cliente';

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
  clientes!: ConId<Cliente>[]

  constructor(
    private storageService: StorageService, 
    private modalService: NgbModal
  ){}

  ngOnInit(): void {   
    this.storageService.listenForChanges<Vendedor>("vendedores");
    /* this.storageService
      .getObservable<ConIdType<Vendedor>>('vendedores')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        console.log("data: ", data);
        this.vendedores = data;
        console.log("this.vendedores", this.vendedores);
        
      }); */
    this.vendedores = this.storageService.loadInfo('vendedores')
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

  }
}


