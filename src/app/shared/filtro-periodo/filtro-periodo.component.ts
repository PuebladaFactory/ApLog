import { Component, EventEmitter, OnInit, Output } from "@angular/core";
import { PeriodoFiltro } from "src/app/interfaces/periodo-filtro";

@Component({
  selector: "app-filtro-periodo",
  standalone: false,
  templateUrl: "./filtro-periodo.component.html",
  styleUrl: "./filtro-periodo.component.scss",
})
export class FiltroPeriodoComponent implements OnInit {
  @Output() periodoChange = new EventEmitter<PeriodoFiltro>();

  tipo: "ultimos-12" | "anio" | "rango" = "ultimos-12";

  anio = new Date().getFullYear();

  desdeMes = 1;
  desdeAnio = this.anio;

  hastaMes = new Date().getMonth() + 1;
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
      const hoy = new Date();

      hasta = {
        anio: hoy.getFullYear(),
        mes: hoy.getMonth() + 1,
      };

      const desdeDate = new Date(hoy);
      desdeDate.setMonth(desdeDate.getMonth() - 11);

      desde = {
        anio: desdeDate.getFullYear(),
        mes: desdeDate.getMonth() + 1,
      };
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
