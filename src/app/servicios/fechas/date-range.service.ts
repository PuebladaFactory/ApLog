// date-range.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { fechaNegocioDe } from 'src/app/shared/utils/fecha.util';

export type PeriodoTipo =
  | 'dia'
  | 'semana'
  | 'quincena'
  | 'mes'
  | 'trimestre'
  | 'semestre'
  | 'anio'
  | 'manual';

export interface DateRange {
  desde: Date;
  hasta: Date;
  tipo: PeriodoTipo;
}

@Injectable()
export class DateRangeService {

  constructor(){
    console.log('DateRangeService instance created');
  }

  private subject = new BehaviorSubject<DateRange | null>(null);

  range$ = this.subject.asObservable();

  setRange(r: DateRange) {
    this.subject.next(r);
  }

  get current(): DateRange | null {
    return this.subject.value;
  }



}

/** Date → 'YYYY-MM-DD' con la fecha local. Delega en fecha.util (FE1); se
 *  conserva por sus llamadas existentes (decisión D3). */
export function toISODateString(d: Date): string {
  return fechaNegocioDe(d);
}