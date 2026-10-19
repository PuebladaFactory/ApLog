import { Pipe, PipeTransform } from '@angular/core';
import { NivelTarifa } from 'src/app/interfaces/tarifa';
import { etiquetaNivelTarifa } from 'src/app/shared/utils/nivel-tarifa-op.util';

@Pipe({
    name: 'etiquetaNivelTarifa',
    standalone: false
})
export class EtiquetaNivelTarifaPipe implements PipeTransform {
  /** Delega en el util: la etiqueta la necesitan también los documentos
   *  (el Excel del informe de operaciones), que no pueden usar un pipe. */
  transform(nivel: NivelTarifa | null | undefined): string {
    return etiquetaNivelTarifa(nivel);
  }
}
