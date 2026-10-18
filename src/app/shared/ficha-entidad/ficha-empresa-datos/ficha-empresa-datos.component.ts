import { Component, Input, OnChanges } from '@angular/core';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { cuitLegible, direccionLegible } from '../ficha-entidad.util';

/** Datos de empresa que comparten Proveedor y Cliente (el cliente usa la
 *  misma pestaña en FI3). */
export type EmpresaFicha = Pick<Proveedor, 'razonSocial' | 'cuit' | 'condFiscal' | 'direccionFiscal' | 'direccionOperativa'>;

interface DatoFicha {
  etiqueta: string;
  valor: string;
}

/** Pestaña "Datos de la empresa" de la ficha (proveedor; cliente en FI3). Solo presentación. */
@Component({
  selector: 'app-ficha-empresa-datos',
  standalone: false,
  templateUrl: './ficha-empresa-datos.component.html',
})
export class FichaEmpresaDatosComponent implements OnChanges {

  @Input({ required: true }) empresa!: EmpresaFicha;

  datos: DatoFicha[] = [];

  ngOnChanges(): void {
    const e = this.empresa;
    const texto = (v: string | null | undefined) => (v ?? '').trim() || '—';
    this.datos = [
      { etiqueta: 'Razón social', valor: texto(e.razonSocial) },
      { etiqueta: 'CUIT', valor: cuitLegible(e.cuit) },
      { etiqueta: 'Condición fiscal', valor: texto(e.condFiscal) },
      { etiqueta: 'Dirección fiscal', valor: direccionLegible(e.direccionFiscal) },
      { etiqueta: 'Dirección operativa', valor: direccionLegible(e.direccionOperativa) },
    ];
  }
}
