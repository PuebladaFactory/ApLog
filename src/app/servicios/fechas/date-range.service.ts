// date-range.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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

  private buildSemanaActual(): DateRange {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - day + (day === 0 ? -6 : 1));

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return { desde: monday, hasta: sunday, tipo: 'semana' };
  }



}

export function toISODateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');

  return `${y}-${m}-${day}`;
}