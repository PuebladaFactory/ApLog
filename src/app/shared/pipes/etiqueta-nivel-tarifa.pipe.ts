import { Pipe, PipeTransform } from '@angular/core';
import { NivelTarifa } from 'src/app/interfaces/tarifa';

@Pipe({
    name: 'etiquetaNivelTarifa',
    standalone: false
})
export class EtiquetaNivelTarifaPipe implements PipeTransform {
  transform(nivel: NivelTarifa | null | undefined): string {
    switch (nivel) {
      case 'eventual': return 'Eventual';
      case 'personalizada': return 'Personalizada';
      case 'especial': return 'Especial';
      case 'general': return 'General';
      default: return 'Sin resolver';
    }
  }
}
