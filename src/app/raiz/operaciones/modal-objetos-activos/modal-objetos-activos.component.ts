import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { ConIdType } from 'src/app/interfaces/conId';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';

@Component({
  selector: 'app-modal-objetos-activos',
  standalone: false,
  templateUrl: './modal-objetos-activos.component.html',
  styleUrl: './modal-objetos-activos.component.scss'
})
export class ModalObjetosActivosComponent implements OnInit, OnDestroy {

  @Input() modo: 'choferes' | 'clientes' | 'proveedores' = 'choferes';

  objetos: ConIdType<any>[] = [];
  isLoading = false;

  private destroy$ = new Subject<void>();

  constructor(
    public activeModal: NgbActiveModal,
    private choferService: ChoferService,
    private clienteService: ClienteService,
    private proveedorService: ProveedorService,
    private db: DbFirestoreService,
  ) {}

  ngOnInit(): void {
    // ConIdType<any>: el modal es genérico sobre choferes/clientes/proveedores y solo
    // usa campos comunes (id, activo) + getNombre con dispatch por modo.
    const fuente$: Observable<ConIdType<any>[]> =
      this.modo === 'choferes'   ? this.choferService.choferes$    :
      this.modo === 'clientes'   ? this.clienteService.clientes$   :
                                   this.proveedorService.proveedores$;

    fuente$.pipe(takeUntil(this.destroy$)).subscribe(datos => {
      this.objetos = [...datos].sort((a, b) =>
        this.getNombre(a).localeCompare(this.getNombre(b))
      );
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get inactivos(): ConIdType<any>[] {
    return this.objetos.filter(o => !o.activo);
  }

  getNombre(obj: any): string {
    if (this.modo === 'clientes' || this.modo === 'proveedores') return obj.razonSocial;
    // choferes: modelo nuevo con datosPersonales agrupados
    return `${obj.datosPersonales.apellido}, ${obj.datosPersonales.nombre}`;
  }

  async toggleActivo(obj: ConIdType<any>): Promise<void> {
    this.isLoading = true;
    const nuevoValor = !obj.activo;
    const r = await this.db.updateConResultado(this.modo, obj.id, { activo: nuevoValor });
    // TODO: refactor Log — loguear según r.exito (accion 'INTERNA', coleccion=this.modo,
    //       id=obj.id, mensaje r.mensaje). El log centralizado no aplica acá todavía.
    if (!r.exito) {
      Swal.fire({ icon: 'error', title: 'Error', text: r.mensaje });
    }
    this.isLoading = false;
    // La fuente de verdad es el observable: si la escritura tuvo éxito, el listener
    // re-emite con el valor actualizado. No se muta obj.activo a mano.
  }
}
