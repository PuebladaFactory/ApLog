import { Component, OnInit } from "@angular/core";
import { Observable, map, of } from "rxjs";
import { PeriodoFiltro } from "src/app/interfaces/periodo-filtro";
import {
  DatosTablaResumen,
  ResumenOpConsultaService,
} from "src/app/servicios/reportes/resumenes-op/resumen-op-consulta.service";
import { errorPeriodoReporte, tituloPeriodo, ultimos12Meses } from "src/app/shared/utils/periodo.util";

@Component({
  selector: "app-resumen-op-general",
  standalone: false,
  templateUrl: "./resumen-op-general.component.html",
  styleUrl: "./resumen-op-general.component.scss",
})
export class ResumenOpGeneralComponent implements OnInit {
  datos$: Observable<DatosTablaResumen | null> = of(null);
  periodo!: PeriodoFiltro;
  tituloPeriodo = "";
  errorPeriodo = "";

  constructor(private consulta: ResumenOpConsultaService) {}

  ngOnInit(): void {
    this.aplicarPeriodo(ultimos12Meses());
  }

  onPeriodoChange(p: PeriodoFiltro): void {
    this.aplicarPeriodo(p);
  }

  private aplicarPeriodo(p: PeriodoFiltro): void {
    this.periodo = p;
    this.tituloPeriodo = tituloPeriodo(p);
    this.errorPeriodo = errorPeriodoReporte(p, ResumenOpConsultaService.MAX_MESES) ?? "";
    this.datos$ = this.errorPeriodo
      ? of(null)
      : this.consulta.observarGeneral(p).pipe(map(rs => this.consulta.armarTabla(rs)));
  }
}
