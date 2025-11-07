import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { VendedorAltaComponent } from '../vendedor-alta/vendedor-alta.component';
import { Subject, takeUntil } from 'rxjs';
import { Vendedor } from 'src/app/interfaces/vendedor';
import { ConId } from 'src/app/interfaces/conId';

@Component({
  selector: 'app-vendedores-listado',
  standalone: false,
  templateUrl: './vendedores-listado.component.html',
  styleUrl: './vendedores-listado.component.scss'
})
export class VendedoresListadoComponent implements OnInit {

  private destroy$ = new Subject<void>();
  vendedores: ConId<Vendedor>[] = [];

  constructor(
    private storageService: StorageService, 
    private modalService: NgbModal
  ){}

  ngOnInit(): void {    
    this.storageService
      .getObservable<ConId<Vendedor>>('vendedores')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.vendedores = data
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  openModal(modo: string) {
    const modalRef = this.modalService.open(VendedorAltaComponent, {
      windowClass: 'myCustomModalClass',
      centered: true,
      size: 'md',
    });

   /*  modalRef.componentInstance.fromParent = {
      modo,
      item: this.clienteEditar,
    }; */
  }
}


