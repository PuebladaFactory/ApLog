import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'globalFilter',
  standalone: false
})
export class GlobalFilterPipe implements PipeTransform {

  transform(items: any[], searchText: string, campos?: string[] | string): any[] {
    if (!items || !searchText) {
      return items;
    }

    searchText = searchText.toLowerCase();

    return items.filter(item => {
      if (Array.isArray(campos)) {
        return campos.some(campo => (item[campo] + '').toLowerCase().includes(searchText));
      } else if (typeof campos === 'string') {
        return (item[campos] + '').toLowerCase().includes(searchText);
      } else {
        // Si no se especifican campos, buscar en todas las propiedades
        return Object.values(item).some(value =>
          (value + '').toLowerCase().includes(searchText)
        );
      }
    });
  }
}
