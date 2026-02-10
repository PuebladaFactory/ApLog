import { Component, inject, Input, OnInit, Optional } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { doc, Firestore, getDoc } from 'firebase/firestore';
import { ConId } from 'src/app/interfaces/conId';
import { MovimientoFinanciero } from 'src/app/interfaces/movimiento-financiero';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-movimiento-detalle',
  standalone: false,
  templateUrl: './movimiento-detalle.component.html',
  styleUrl: './movimiento-detalle.component.scss'
})
export class MovimientoDetalleComponent implements OnInit {

  private route = inject(ActivatedRoute);

  @Input() movimientoId!:string

  movimiento?: any;

  loading = true;

  modoModal = false;

  constructor(
    private dbService: DbFirestoreService,
    private storageService: StorageService,
    @Optional() private activeModal?: NgbActiveModal
   
  ){}

  async ngOnInit() {

    const id = this.movimientoId ?? this.route.snapshot.paramMap.get('id');

    console.log("id: ", id);

    if (!id) return;    
    

    this.movimiento = await this.dbService.getMovimientoPorId(id);

    this.loading = false;
  }

  imprimir(): void {
    window.print();
  }

  get titulo(): string {
    if (!this.movimiento) return '';

    return this.movimiento.tipo === 'cobro'
      ? 'Recibo de Cobro'
      : 'Orden de Pago';
  }

  cerrar() {
    this.activeModal?.close();
  }
}
