import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'acortarNombreArchivo',
  standalone: false,
})
export class AcortarNombreArchivoPipe implements PipeTransform {
  transform(fileName: string, maxLength: number = 30): string {
    if (fileName.length <= maxLength) {
      return fileName;
    }
    return '...' + fileName.slice(-maxLength);
  }
}
