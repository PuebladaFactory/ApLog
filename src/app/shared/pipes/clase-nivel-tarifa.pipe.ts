import { Pipe, PipeTransform } from '@angular/core';
import { NivelTarifa } from 'src/app/interfaces/tarifa';

@Pipe({
    name: 'claseNivelTarifa',
    standalone: false
})
export class ClaseNivelTarifaPipe implements PipeTransform {
  transform(nivel: NivelTarifa | null | undefined): string {
    switch (nivel) {
      case 'eventual': return 'bg-warning';
      case 'personalizada': return 'bg-success';
      case 'especial': return 'bg-info';
      case 'general': return 'bg-primary';
      default: return 'bg-secondary';
    }
  }
}
