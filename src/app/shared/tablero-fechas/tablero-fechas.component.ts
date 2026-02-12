import { Component, Input, OnInit } from '@angular/core';
import { NgbDateStruct, NgbDate, NgbCalendar } from '@ng-bootstrap/ng-bootstrap';
import { DateRange, DateRangeService, PeriodoTipo } from 'src/app/servicios/fechas/date-range.service';

@Component({
  selector: 'app-tablero-fechas',
  standalone: false,
  templateUrl: './tablero-fechas.component.html',
  styleUrl: './tablero-fechas.component.scss'
})
export class TableroFechasComponent implements OnInit {

 @Input() defaultTipo: PeriodoTipo = 'semana';

  // calendario manual
  fromDate: NgbDate | null = null;
  toDate: NgbDate | null = null;
  hoveredDate: NgbDate | null = null;

  periodoActual!: PeriodoTipo;
  rangoActual?: DateRange;

  showManualPicker = false;

  constructor(
    private dateRangeService: DateRangeService,
    private calendar: NgbCalendar
  ) {}

  ngOnInit(): void {

    const actual = this.dateRangeService.current;

    if (actual) {
      this.periodoActual = actual.tipo;
      this.rangoActual = actual;
    } else {
      this.selectPeriodo(this.defaultTipo);
    }

    this.dateRangeService.range$
      .subscribe(r => {
        if (r) this.rangoActual = r;
      });
  }

  // =====================
  // SELECT PERIODO
  // =====================

  selectPeriodo(tipo: PeriodoTipo) {

    this.periodoActual = tipo;

    // limpiar selección manual SIEMPRE
    this.fromDate = null;
    this.toDate = null;
    this.hoveredDate = null;

    if (tipo === 'manual') {
      this.showManualPicker = true;
      return;
    }

    this.showManualPicker = false;

    const base = new Date();
    const range = this.buildRange(tipo, base);

    if (range) {
      this.dateRangeService.setRange(range);
    }
  }


  toggleManualPicker() {
    this.periodoActual = 'manual';
    this.showManualPicker = !this.showManualPicker;
  }

  // =====================
  // NAVIGAR
  // =====================

  moverPeriodo(next: boolean) {

    if (this.periodoActual === 'manual') return;

    this.fromDate = null;
    this.toDate = null;
    this.hoveredDate = null;

    const current = this.dateRangeService.current;
    const factor = next ? 1 : -1;
    if(current){
      const base = new Date(current.desde);

      switch (current.tipo) {
        case 'semana':
          base.setDate(base.getDate() + 7 * factor);
          break;

        case 'quincena':
          base.setDate(base.getDate() + 15 * factor);
          break;

        case 'mes':
          base.setMonth(base.getMonth() + factor);
          break;

        case 'trimestre':
          base.setMonth(base.getMonth() + 3 * factor);
          break;

        case 'semestre':
          base.setMonth(base.getMonth() + 6 * factor);
          break;

        case 'anio':
          base.setFullYear(base.getFullYear() + factor);
          break;

        case 'dia':
          base.setDate(base.getDate() + factor);
          break;

        case 'manual':
          return;
      }

      const nuevo = this.buildRange(current.tipo, base);
      if (nuevo) this.dateRangeService.setRange(nuevo);
      }

  }

  // =====================
  // BUILDERS
  // =====================

  private buildRange(tipo: PeriodoTipo, base: Date): DateRange | null {

    switch (tipo) {
      case 'dia':
        return {
          desde: this.startOfDay(base),
          hasta: this.endOfDay(base),
          tipo
        };

      case 'semana':
        return this.buildSemana(base);

      case 'quincena':
        return this.buildQuincena(base);

      case 'mes':
        return this.buildMes(base);

      case 'trimestre':
        return this.buildTrimestre(base);

      case 'semestre':
        return this.buildSemestre(base);

      case 'anio':
        return this.buildAnio(base);

      default:
        return null;
    }
  }

  private buildSemana(base: Date): DateRange {
    const day = base.getDay();
    const monday = new Date(base);
    monday.setDate(base.getDate() - day + (day === 0 ? -6 : 1));

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
      desde: this.startOfDay(monday),
      hasta: this.endOfDay(sunday),
      tipo: 'semana'
    };
  }

  private buildQuincena(base: Date): DateRange {
    const y = base.getFullYear();
    const m = base.getMonth();

    if (base.getDate() <= 15) {
      return {
        desde: new Date(y, m, 1),
        hasta: this.endOfDay(new Date(y, m, 15)),
        tipo: 'quincena'
      };
    }

    return {
      desde: new Date(y, m, 16),
      hasta: this.endOfDay(new Date(y, m + 1, 0)),
      tipo: 'quincena'
    };
  }

  private buildMes(base: Date): DateRange {
    return {
      desde: new Date(base.getFullYear(), base.getMonth(), 1),
      hasta: this.endOfDay(new Date(base.getFullYear(), base.getMonth() + 1, 0)),
      tipo: 'mes'
    };
  }


  private buildTrimestre(base: Date): DateRange {

    const y = base.getFullYear();
    const m = base.getMonth(); // 0-11

    const quarterStartMonth = Math.floor(m / 3) * 3;

    const desde = new Date(y, quarterStartMonth, 1);
    const hasta = new Date(y, quarterStartMonth + 3, 0);

    return {
      desde: this.startOfDay(desde),
      hasta: this.endOfDay(hasta),
      tipo: 'trimestre'
    };
  }

  private buildSemestre(base: Date): DateRange {

    const y = base.getFullYear();
    const m = base.getMonth();

    const semestreStart = m < 6 ? 0 : 6;

    const desde = new Date(y, semestreStart, 1);
    const hasta = new Date(y, semestreStart + 6, 0);

    return {
      desde: this.startOfDay(desde),
      hasta: this.endOfDay(hasta),
      tipo: 'semestre'
    };
  }


  private buildAnio(base: Date): DateRange {
    return {
      desde: new Date(base.getFullYear(), 0, 1),
      hasta: this.endOfDay(new Date(base.getFullYear(), 11, 31)),
      tipo: 'anio'
    };
  }

  // =====================
  // MANUAL RANGE
  // =====================

  onDateSelection(date: NgbDate) {

    if (!this.fromDate && !this.toDate) {
      this.fromDate = date;
    }

    else if (this.fromDate && !this.toDate && date.after(this.fromDate)) {
      this.toDate = date;
      this.emitManualRange();
      this.showManualPicker = false;
    }

    else {
      this.toDate = null;
      this.fromDate = date;
    }
  }

  isHovered(date: NgbDate) {
    return (
      this.fromDate &&
      !this.toDate &&
      this.hoveredDate &&
      date.after(this.fromDate) &&
      date.before(this.hoveredDate)
    );
  }

  isInside(date: NgbDate) {
    return (
      this.toDate &&
      date.after(this.fromDate!) &&
      date.before(this.toDate)
    );
  }

  isRange(date: NgbDate) {
    return (
      date.equals(this.fromDate) ||
      (this.toDate && date.equals(this.toDate)) ||
      this.isInside(date) ||
      this.isHovered(date)
    );
  }

  private emitManualRange() {
    if (!this.fromDate || !this.toDate) return;

    const desde = new Date(
      this.fromDate.year,
      this.fromDate.month - 1,
      this.fromDate.day
    );

    const hasta = new Date(
      this.toDate.year,
      this.toDate.month - 1,
      this.toDate.day
    );

    this.dateRangeService.setRange({
      desde: this.startOfDay(desde),
      hasta: this.endOfDay(hasta),
      tipo: 'manual'
    });
  }

  // =====================
  // TEMPLATE HELPERS (PUBLIC)
  // =====================

  public after(a: NgbDateStruct, b: NgbDateStruct) {
    return this.toTime(a) > this.toTime(b);
  }

  // =====================
  // FORMATOS PARA MOSTRAR
  // =====================

  formatDate(d?: Date) {
    if (!d) return '';
    return d.toLocaleDateString('es-AR');
  }

  get rangoLabel() {
    if (!this.rangoActual) return '';
    return `${this.formatDate(this.rangoActual.desde)} → ${this.formatDate(this.rangoActual.hasta)}`;
  }

  // =====================
  // HELPERS PRIVADOS
  // =====================

  private startOfDay(d: Date) {
    const x = new Date(d);
    x.setHours(0,0,0,0);
    return x;
  }

  private endOfDay(d: Date) {
    const x = new Date(d);
    x.setHours(23,59,59,999);
    return x;
  }

  private toTime(d: NgbDateStruct) {
    return new Date(d.year, d.month-1, d.day).getTime();
  }


}
