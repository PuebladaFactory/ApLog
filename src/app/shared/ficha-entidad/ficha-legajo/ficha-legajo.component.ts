import { Component, Input, OnChanges } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CategoriaDocumentacion, Legajo, estadoGeneralDeLegajo } from 'src/app/interfaces/legajo';
import { CarruselComponent } from 'src/app/shared/carrusel/carrusel.component';
import { fechaLegible } from 'src/app/shared/utils/fecha.util';
import {
  CLASE_ESTADO_LEGAJO, ETIQUETA_ESTADO_LEGAJO, EstadoRenglonLegajo, RenglonLegajo, renglonesLegajo,
} from '../ficha-entidad.util';

/**
 * Pestaña "Legajo" de la ficha de un chofer: documentos cargados con su
 * vencimiento y estado, más las categorías activas sin cargar. Solo lectura;
 * el historial de reemplazos y la descarga ZIP siguen en Legajos → Consultar.
 */
@Component({
  selector: 'app-ficha-legajo',
  standalone: false,
  templateUrl: './ficha-legajo.component.html',
})
export class FichaLegajoComponent implements OnChanges {

  @Input() legajo: Legajo | null = null;
  @Input() categoriasActivas: CategoriaDocumentacion[] = [];

  renglones: RenglonLegajo[] = [];
  estadoGeneral: EstadoRenglonLegajo | null = null;

  readonly etiquetaEstado = ETIQUETA_ESTADO_LEGAJO;
  readonly claseEstado = CLASE_ESTADO_LEGAJO;
  readonly fechaLegible = fechaLegible;

  constructor(private modalService: NgbModal) {}

  ngOnChanges(): void {
    this.renglones = this.legajo ? renglonesLegajo(this.legajo.documentacion, this.categoriasActivas) : [];
    this.estadoGeneral = this.legajo ? estadoGeneralDeLegajo(this.legajo) : null;
  }

  estadoDe(r: RenglonLegajo): EstadoRenglonLegajo {
    return r.documento ? r.documento.estado : 'faltante';
  }

  verArchivos(r: RenglonLegajo): void {
    const imagenes = r.documento?.imagenes ?? [];
    if (imagenes.length === 0) return;
    const modalRef = this.modalService.open(CarruselComponent, {
      windowClass: 'myCustomModalClass',
      centered: true,
      size: 'lg',
    });
    modalRef.componentInstance.fromParent = { item: imagenes };
    modalRef.result.then(() => {}, () => {});
  }
}
