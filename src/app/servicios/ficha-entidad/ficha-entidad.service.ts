import { inject, Injectable } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { FichaEntidadComponent } from 'src/app/shared/ficha-entidad/ficha-entidad.component';
import { TipoFicha } from 'src/app/shared/ficha-entidad/ficha-entidad.util';

/**
 * Punto de entrada único de la Ficha de entidad (carpeta de SOLO LECTURA de
 * un chofer, proveedor o cliente). Lo usan Legajos y, más adelante, los
 * listados de entidades. La edición sigue en el modal de alta de cada entidad.
 *
 * Importa solo el componente de Shared: nunca componentes declarados en
 * módulos de feature (eso los arrastraría al chunk común de todos los que
 * usan la ficha — ver VisualizadorObjetoService en CLAUDE.md).
 */
@Injectable({ providedIn: 'root' })
export class FichaEntidadService {
  private modalService = inject(NgbModal);

  abrir(tipo: TipoFicha, id: string): NgbModalRef {
    const modalRef = this.modalService.open(FichaEntidadComponent, {
      windowClass: 'myCustomModalClass',
      centered: true,
      scrollable: true,
      size: 'xl',
    });
    const ficha = modalRef.componentInstance as FichaEntidadComponent;
    ficha.tipo = tipo;
    ficha.id = id;
    modalRef.result.then(() => {}, () => {});
    return modalRef;
  }
}
