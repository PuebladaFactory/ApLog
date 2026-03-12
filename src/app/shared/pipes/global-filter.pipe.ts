import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'globalFilter',
  standalone: false
})
export class GlobalFilterPipe implements PipeTransform {

  transform(items: any[], searchText: string, campos?: string[] | string): any[] {
    if (!items || !searchText) return items;

    const search = searchText.toLowerCase();

    return items.filter(item => {

      if (Array.isArray(campos)) {
        return campos.some(campo => {
          const value = this.getValue(item, campo);
          return this.contains(value, search);
        });
      }

      if (typeof campos === 'string') {
        const value = this.getValue(item, campos);
        return this.contains(value, search);
      }

      return this.contains(item, search);
    });
  }

  private getValue(obj: any, path: string): any {
    if (!obj || !path) return null;

    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {

      if (current === null || current === undefined) return null;

      // soporta arrays
      if (Array.isArray(current)) {
        current = current.map(x => x?.[part]);
      } else {
        current = current[part];
      }
    }

    return current;
  }

  private contains(value: any, search: string): boolean {

    if (value === null || value === undefined) return false;

    // si es array, buscar dentro
    if (Array.isArray(value)) {
      return value.some(v => this.contains(v, search));
    }

    // si es objeto, buscar en sus valores
    if (typeof value === 'object') {
      return Object.values(value).some(v => this.contains(v, search));
    }

    return String(value).toLowerCase().includes(search);
  }
}