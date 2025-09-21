import { Pipe, PipeTransform } from '@angular/core';
import { ConIdType } from 'src/app/interfaces/conId';
import { Legajo } from 'src/app/interfaces/legajo';
import { Chofer } from 'src/app/interfaces/chofer';

@Pipe({
  name: 'buscarPorChofer',
  standalone: false
})
export class BuscarPorChoferPipe implements PipeTransform {
  transform(legajos: ConIdType<Legajo>[], searchText: string, choferes: ConIdType<Chofer>[]): ConIdType<Legajo>[] {
    if (!searchText) return legajos;
    const search = searchText.toLowerCase();

    return legajos.filter(l => {
      const chofer = choferes.find(c => c.idChofer === l.idChofer);
      if (!chofer) return false;
      return `${chofer.apellido} ${chofer.nombre}`.toLowerCase().includes(search);
    });
  }
}