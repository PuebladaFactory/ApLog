import { Component, Input, OnChanges, OnInit } from "@angular/core";
import { ResumenOpBase } from "src/app/interfaces/resumen-op-base";
import { ExcelService } from "src/app/servicios/informes/excel/excel.service";
import {
  ColumnaResumen,
  ModoVista,
  TablaResumenConfigService,
  TipoVistaResumen,
} from "src/app/servicios/reportes/reportes-op/tabla-resumen-config.service";

@Component({
  standalone: false,
  selector: "app-tabla-resumen",
  styleUrl: "./tabla-resumen.component.scss",
  templateUrl: "./tabla-resumen.component.html",
})
export class TablaResumenComponent implements OnChanges, OnInit {
  @Input() resumenes: ResumenOpBase[] = [];
  @Input() tipo: 'general' | 'entidad' = "general";
  @Input() tituloPeriodo: string = "";
  @Input() razonSocial: string = "";
  @Input() tipoEntidad?: 'cliente' | 'chofer' | 'proveedor'; 

  modo: ModoVista = "totales";

  private columnasMap = new Map<string, ColumnaResumen>();

  columnas: ColumnaResumen[] = [];

  constructor(
    private config: TablaResumenConfigService,
    private excelService: ExcelService,
  ) {}
  ngOnInit(): void {
    console.log("tipo: ", this.tipo);
  }

  ngOnChanges() {
    let columnasServicio = this.config.getColumnas(this.tipo, this.tipoEntidad);
    if(columnasServicio) this.columnas = columnasServicio
    console.log("this.columnas:  ", this.columnas);

    /*     this.columnasMap.clear();
    this.columnas.forEach((c) => this.columnasMap.set(c.key, c));
    this.columnas.forEach((c) => console.log("key: ", c.key));
    
     */
  }

  toggleModo() {
    const order: ModoVista[] = ["totales", "promedios", "porcentajes"];
    const index = order.indexOf(this.modo);
    this.modo = order[(index + 1) % order.length];
  }

  format(valor: number | null, tipo: string): string {
    return this.config.formatValue(valor, tipo, this.modo);
  }

  get esGeneral(): boolean {
    return this.tipo === "general";
  }

  get columnasCliente(): ColumnaResumen[] {
    return this.columnas.filter((c) => c.key.includes("_cliente"));
  }

  get columnasChofer(): ColumnaResumen[] {
    return this.columnas.filter((c) => c.key.includes("_chofer"));
  }

  get columnasBase(): ColumnaResumen[] {
    return this.columnas.filter((c) => !c.key.includes("_"));
  }

  formatearPeriodo(r: ResumenOpBase): string {
    return `${r.mes.toString().padStart(2, "0")}-${r.anio}`;
  }

  getTooltip(key: string): string {
    const col = this.columnasMap.get(key);

    if (!col || !col.tooltip) return "";

    return col.tooltip(this.modo);
  }

  getCellClasses(col: ColumnaResumen, r: ResumenOpBase): any {
    const value = col.valueFn(r, this.modo);

    if (value === null) return {};

    // GANANCIA

    if (col.key === "ganancia") {
      return {
        "bg-success-soft text-success fw-semibold": value > 0,
        "bg-danger-soft text-danger fw-semibold": value < 0,
      };
    }

    // MARGEN (ganancia en %)
    if (col.key === "ganancia" && this.modo === "porcentajes") {
      return {
        "bg-success-soft text-success fw-semibold": value > 0.25,
        "bg-warning-soft text-warning fw-semibold":
          value > 0.1 && value <= 0.25,
        "bg-danger-soft text-danger fw-semibold": value <= 0.1,
      };
    }

    return {};
  }

  getSylesCeldas(col: ColumnaResumen): string {
    if (col.key.includes("_cliente") || col.key === "facturado") {
      return "background-color: #e7f1ff;";
    }
    if (col.key.includes("_chofer") || col.key === "costo") {
      return "background-color: #f1f3f5;";
    }   
    return "";
  }

  exportarExcel() {    

    this.excelService.exportarResumenOperaciones(
      this.resumenes,
      this.columnas,
      this.tituloPeriodo,
      this.razonSocial,
      this.tipo,
      this.tipoEntidad,

    );
  }

}
