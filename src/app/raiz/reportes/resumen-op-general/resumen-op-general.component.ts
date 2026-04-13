import { Component, OnInit } from "@angular/core";
import { Observable } from "rxjs";
import {
  PeriodoFiltro,
  ResumenOpGeneralMensual,
} from "src/app/interfaces/resumen-op-base";
import { ReportesOpService } from "src/app/servicios/reportes/reportes-op/reportes-op.service";

@Component({
  selector: "app-resumen-op-general",
  standalone: false,
  templateUrl: "./resumen-op-general.component.html",
  styleUrl: "./resumen-op-general.component.scss",
})
export class ResumenOpGeneralComponent implements OnInit {
  periodoActual!: PeriodoFiltro;
  resumenes$!: Observable<ResumenOpGeneralMensual[]>;

  constructor(private reportesOp: ReportesOpService){}

  ngOnInit() {
    this.periodoActual = this.getUltimos12Meses();
    this.cargarDatos();
  }

  onPeriodoChange(p: PeriodoFiltro) {
    this.periodoActual = p;
    this.cargarDatos();
  }

  private cargarDatos() {
    this.resumenes$ = this.reportesOp.getResumenGeneral(
      this.periodoActual,
    );
    
  }

  private getUltimos12Meses(): PeriodoFiltro {

  const hoy = new Date();

  const hasta = {
    anio: hoy.getFullYear(),
    mes: hoy.getMonth() + 1
  };

  const desdeDate = new Date(hoy);
  desdeDate.setMonth(desdeDate.getMonth() - 11);

  const desde = {
    anio: desdeDate.getFullYear(),
    mes: desdeDate.getMonth() + 1
  };

  return { desde, hasta };
}
}
