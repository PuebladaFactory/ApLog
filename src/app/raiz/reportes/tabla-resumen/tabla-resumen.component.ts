import { Component, Input, OnChanges } from "@angular/core";
import { ExcelService } from "src/app/servicios/informes/excel/excel.service";
import {
  ColumnaResumen,
  FilaResumen,
  ModoVista,
  TablaResumenConfigService,
} from "src/app/servicios/reportes/reportes-op/tabla-resumen-config.service";

/** Tabla de resumen de operaciones (totales / promedios / porcentajes con
 *  la botonera) + fila de totales del período. Las filas las arma
 *  ResumenOpConsultaService.armarTabla. */
@Component({
  standalone: false,
  selector: "app-tabla-resumen",
  styleUrl: "./tabla-resumen.component.scss",
  templateUrl: "./tabla-resumen.component.html",
})
export class TablaResumenComponent implements OnChanges {
  @Input() filas: FilaResumen[] = [];
  @Input() total: FilaResumen | null = null;
  @Input() tipo: "general" | "entidad" = "general";
  @Input() tituloPeriodo: string = "";
  @Input() razonSocial: string = "";
  @Input() tipoEntidad?: "cliente" | "chofer" | "proveedor";

  private static contador = 0;

  /** Sufijo único por instancia para name/id de los radios del modo. */
  readonly idGrupoModo = `modo-resumen-${++TablaResumenComponent.contador}`;

  readonly modos: { valor: ModoVista; etiqueta: string }[] = [
    { valor: "totales", etiqueta: "Totales" },
    { valor: "promedios", etiqueta: "Promedios" },
    { valor: "porcentajes", etiqueta: "Porcentajes" },
  ];

  modo: ModoVista = "totales";
  columnas: ColumnaResumen[] = [];

  constructor(
    private config: TablaResumenConfigService,
    private excelService: ExcelService,
  ) {}

  ngOnChanges(): void {
    this.columnas = this.config.getColumnas(this.tipo, this.tipoEntidad) ?? [];
  }

  seleccionarModo(modo: ModoVista): void {
    this.modo = modo;
  }

  format(valor: number | null, tipo: string): string {
    return this.config.formatValue(valor, tipo, this.modo);
  }

  get esGeneral(): boolean {
    return this.tipo === "general";
  }

  /** Coloreo de la ganancia: en porcentajes por margen (>25% verde,
   *  10–25% amarillo, ≤10% rojo); en totales/promedios por signo. */
  getCellClasses(col: ColumnaResumen, r: FilaResumen): Record<string, boolean> {
    if (col.key !== "ganancia") return {};
    const value = col.valueFn(r, this.modo);
    if (value === null) return {};
    if (this.modo === "porcentajes") {
      return {
        "bg-success-soft text-success fw-semibold": value > 0.25,
        "bg-warning-soft text-warning fw-semibold": value > 0.1 && value <= 0.25,
        "bg-danger-soft text-danger fw-semibold": value <= 0.1,
      };
    }
    return {
      "bg-success-soft text-success fw-semibold": value > 0,
      "bg-danger-soft text-danger fw-semibold": value < 0,
    };
  }

  getStylesCeldas(col: ColumnaResumen): string {
    if (col.key.includes("_cliente") || col.key === "facturado") {
      return "background-color: #e7f1ff;";
    }
    if (col.key.includes("_chofer") || col.key === "costo") {
      return "background-color: #f1f3f5;";
    }
    return "";
  }

  exportarExcel(): void {
    this.excelService.exportarResumenOperaciones(
      this.filas,
      this.columnas,
      this.tituloPeriodo,
      this.razonSocial,
      this.tipo,
      this.tipoEntidad,
    );
  }
}
