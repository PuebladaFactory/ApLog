import { inject, Injectable, Type } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConIdType } from 'src/app/interfaces/conId';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { TipoFicha } from 'src/app/shared/ficha-entidad/ficha-entidad.util';

export type EntidadEditable = ConIdType<Chofer> | ConIdType<Proveedor> | ConIdType<Cliente>;

/**
 * "Editar" desde la ficha de entidad (FI6, F8): abre el MISMO modal de
 * edición que usan los listados (mismo contrato `fromParent = { modo, item }`,
 * mismo guardado).
 *
 * Los modales de alta viven en sus módulos de feature (Clientes, Choferes,
 * Proveedores). Se cargan con import() dinámico recién al editar: un import
 * estático los metería en el chunk compartido de la ficha, que se descarga
 * con cualquiera de los módulos que la usan (ver VisualizadorObjetoService en
 * CLAUDE.md). Servicio aparte de FichaEntidadService para que el componente de
 * la ficha lo inyecte sin un import circular.
 */
@Injectable({ providedIn: 'root' })
export class EdicionEntidadService {
  private modalService = inject(NgbModal);

  async editar(tipo: TipoFicha, entidad: EntidadEditable): Promise<void> {
    let componente: Type<unknown>;
    try {
      componente = await this.cargarModal(tipo);
    } catch (e) {
      console.error('No se pudo cargar el modal de edición', e);
      Swal.fire('Error', 'No se pudo abrir la edición. Revisá la conexión y probá de nuevo.', 'error');
      return;
    }
    const modalRef = this.modalService.open(componente, {
      windowClass: 'myCustomModalClass',
      centered: true,
      size: 'lg',
    });
    modalRef.componentInstance.fromParent = { modo: 'edicion', item: entidad };
    modalRef.result.then(() => {}, () => {});
  }

  /** Clase del modal de alta/edición de cada entidad (import dinámico). */
  cargarModal(tipo: TipoFicha): Promise<Type<unknown>> {
    switch (tipo) {
      case 'chofer':
        return import('src/app/raiz/choferes/choferes-alta/choferes-alta.component').then(m => m.ChoferesAltaComponent);
      case 'proveedor':
        return import('src/app/raiz/proveedores/proveedores-alta/proveedores-alta.component').then(m => m.ProveedoresAltaComponent);
      case 'cliente':
        return import('src/app/raiz/clientes/cliente-alta/cliente-alta.component').then(m => m.ClienteAltaComponent);
    }
  }
}
