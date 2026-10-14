import { Component, Input, OnChanges } from '@angular/core';
import { Chofer } from 'src/app/interfaces/chofer';
import { fechaLegible } from 'src/app/shared/utils/fecha.util';
import { normalizarFechaNacimiento } from 'src/app/shared/utils/fecha-nacimiento.util';
import { cuitLegible, direccionLegible } from '../ficha-entidad.util';

interface DatoFicha {
  etiqueta: string;
  valor: string;
}

/** Pestaña "Datos personales" de la ficha de un chofer. Solo presentación. */
@Component({
  selector: 'app-ficha-chofer-datos',
  standalone: false,
  templateUrl: './ficha-chofer-datos.component.html',
})
export class FichaChoferDatosComponent implements OnChanges {

  @Input({ required: true }) chofer!: Chofer;

  datos: DatoFicha[] = [];

  ngOnChanges(): void {
    const d = this.chofer.datosPersonales;
    const texto = (v: string | number | null | undefined) =>
      v === null || v === undefined || String(v).trim() === '' ? '—' : String(v);
    const emergencia = [d.contactoEmergencia, d.celularEmergencia]
      .map(v => (v === null || v === undefined ? '' : String(v).trim()))
      .filter(v => v !== '')
      .join(' · ');
    this.datos = [
      { etiqueta: 'Apellido y nombre', valor: `${d.apellido} ${d.nombre}` },
      { etiqueta: 'CUIT', valor: cuitLegible(d.cuit) },
      { etiqueta: 'Fecha de nacimiento', valor: fechaLegible(normalizarFechaNacimiento(d.fechaNac).fecha) },
      { etiqueta: 'Condición fiscal', valor: texto(this.chofer.condFiscal) },
      { etiqueta: 'Email', valor: texto(d.email) },
      { etiqueta: 'Celular', valor: texto(d.celularContacto) },
      { etiqueta: 'Contacto de emergencia', valor: emergencia || '—' },
      { etiqueta: 'Domicilio', valor: direccionLegible(d.direccion) },
    ];
  }
}
