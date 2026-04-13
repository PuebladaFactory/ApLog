import { Component, Input, OnChanges } from "@angular/core";
import { ResumenOpBase } from "src/app/interfaces/resumen-op-base";
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
export class TablaResumenComponent implements OnChanges {
  @Input() resumenes: ResumenOpBase[] = [];
  @Input() tipo: TipoVistaResumen = "general";

  modo: ModoVista = "totales";

  private columnasMap = new Map<string, ColumnaResumen>();

  columnas: ColumnaResumen[] = [];

  constructor(private config: TablaResumenConfigService) {}

  ngOnChanges() {
    this.columnas = this.config.getColumnas(this.tipo);
    this.columnasMap.clear();
    this.columnas.forEach((c) => this.columnasMap.set(c.key, c));
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
}
