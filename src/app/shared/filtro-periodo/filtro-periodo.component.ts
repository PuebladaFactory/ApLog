import { Component, EventEmitter, OnInit, Output } from "@angular/core";
import { PeriodoFiltro } from "src/app/interfaces/periodo-filtro";
import { hoyNegocio, partesFecha } from "src/app/shared/utils/fecha.util";
import { ultimos12Meses } from "src/app/shared/utils/periodo.util";

@Component({
  selector: "app-filtro-periodo",
  standalone: false,
  templateUrl: "./filtro-periodo.component.html",
  styleUrl: "./filtro-periodo.component.scss",
})
export class FiltroPeriodoComponent implements OnInit {
  @Output() periodoChange = new EventEmitter<PeriodoFiltro>();

  tipo: "ultimos-12" | "anio" | "rango" = "ultimos-12";

  // Año y mes actuales según el "hoy" de Argentina (frente lazy-fechas, FE3).
  private readonly actual = partesFecha(hoyNegocio());

  anio = this.actual.anio;

  desdeMes = 1;
  desdeAnio = this.anio;

  hastaMes = this.actual.mes;
  hastaAnio = this.anio;

  meses = [
    { valor: 1, nombre: "Ene" },
    { valor: 2, nombre: "Feb" },
    { valor: 3, nombre: "Mar" },
    { valor: 4, nombre: "Abr" },
    { valor: 5, nombre: "May" },
    { valor: 6, nombre: "Jun" },
    { valor: 7, nombre: "Jul" },
    { valor: 8, nombre: "Ago" },
    { valor: 9, nombre: "Sep" },
    { valor: 10, nombre: "Oct" },
    { valor: 11, nombre: "Nov" },
    { valor: 12, nombre: "Dic" },
  ];

  ngOnInit(): void {}

  emitir() {
    let desde, hasta;

    if (this.tipo === "ultimos-12") {
      // Misma cuenta que el período por defecto de Reportes (ultimos12Meses).
      // Antes se restaban 11 meses con setMonth sobre la fecha de hoy: un 31
      // (o un 29/30 hacia febrero) desbordaba al mes siguiente y "desde"
      // quedaba un mes corrido.
      const periodo = ultimos12Meses();
      desde = periodo.desde;
      hasta = periodo.hasta;
    } else if (this.tipo === "anio") {
      desde = { anio: this.anio, mes: 1 };
      hasta = { anio: this.anio, mes: 12 };
    } else {
      desde = { anio: this.desdeAnio, mes: this.normalizarMes(this.desdeMes) };
      hasta = { anio: this.hastaAnio, mes: this.normalizarMes(this.hastaMes) };
    }

    this.periodoChange.emit({
      tipo: this.tipo,
      desde,
      hasta,
      anio: this.anio,
    });
  }

  private normalizarMes(mes: number): number {
    if (mes < 1) return 1;
    if (mes > 12) return 12;
    return mes;
  }
}
