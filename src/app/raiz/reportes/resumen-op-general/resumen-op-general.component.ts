import { Component, OnInit } from "@angular/core";
import { Observable, of } from "rxjs";
import { PeriodoFiltro } from "src/app/interfaces/periodo-filtro";
import { ResumenOpGeneralMensual } from "src/app/interfaces/resumen-op-base";
import { ReportesOpService } from "src/app/servicios/reportes/reportes-op/reportes-op.service";
import Swal from "sweetalert2";

@Component({
  selector: "app-resumen-op-general",
  standalone: false,
  templateUrl: "./resumen-op-general.component.html",
  styleUrl: "./resumen-op-general.component.scss",
})
export class ResumenOpGeneralComponent implements OnInit {
  resumenes$!: Observable<ResumenOpGeneralMensual[]>;
  periodo!: PeriodoFiltro;

  tituloPeriodo: string = "";

  constructor(private reportesOp: ReportesOpService) {}

  ngOnInit() {
    this.periodo = this.getUltimos12Meses();
    this.tituloPeriodo = this.armarTitulo(this.periodo);
    this.cargarDatos();
  }

  onPeriodoChange(p: PeriodoFiltro) {
    this.periodo = p;
    console.log("this.periodo", p);

    this.tituloPeriodo = this.armarTitulo(p);

    if (!this.periodoValido(this.periodo)) {
      this.resumenes$ = of([]); // 👈 devolvés vacío
      this.mensajesError(
        'El período "desde" no puede ser mayor a "hasta"',
        false,
      );
      return;
    }

    this.resumenes$ = this.reportesOp.getResumenGeneral(this.periodo);

    //this.cargarDatos();
  }

  private cargarDatos() {
    this.resumenes$ = this.reportesOp.getResumenGeneral(this.periodo);
  }

  private getUltimos12Meses(): PeriodoFiltro {
    const hoy = new Date();

    const hasta = {
      anio: hoy.getFullYear(),
      mes: hoy.getMonth() + 1,
    };

    const desdeDate = new Date(hoy);
    desdeDate.setMonth(desdeDate.getMonth() - 11);

    const desde = {
      anio: desdeDate.getFullYear(),
      mes: desdeDate.getMonth() + 1,
    };

    return {
      tipo: "ultimos-12",
      desde,
      hasta,
    };
  }

  armarTitulo(p: PeriodoFiltro): string {
    if (p.tipo === "ultimos-12") {
      return "Últimos 12 meses";
    }

    if (p.tipo === "anio") {
      return `Año ${p.anio}`;
    }

    if (p.tipo === "rango" && p.desde && p.hasta) {
      const desde = `${p.desde.mes.toString().padStart(2, "0")}-${p.desde.anio}`;
      const hasta = `${p.hasta.mes.toString().padStart(2, "0")}-${p.hasta.anio}`;

      return `${desde} → ${hasta}`;
    }

    return "";
  }

  private periodoValido(p: PeriodoFiltro): boolean {
    return p.desde.anio * 100 + p.desde.mes <= p.hasta.anio * 100 + p.hasta.mes;
  }

  mensajesError(msj: string, resultado: boolean) {
    Swal.fire({
      icon: !resultado ? "error" : "success",
      //title: "Oops...",
      text: `${msj}`,
      //footer: `${msj}`
    });
  }
  
}
