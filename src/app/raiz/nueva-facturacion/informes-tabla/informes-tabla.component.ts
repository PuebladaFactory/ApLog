import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { ConId } from "src/app/interfaces/conId";
import { InformeLiq } from "src/app/interfaces/informe-liq";
import {
  ColumnaInformesTabla,
  OrdenInformesTabla,
} from "src/app/interfaces/informes-tabla";
import { ModuloPermiso } from "src/app/interfaces/permiso";

@Component({
  selector: "app-informes-tabla",
  standalone: false,
  templateUrl: "./informes-tabla.component.html",
  styleUrl: "./informes-tabla.component.scss",
})
export class InformesTablaComponent implements OnInit {
  @Input() items: ConId<InformeLiq>[] = [];
  @Input() columnas: ColumnaInformesTabla<InformeLiq>[] = [];
  @Input() loading = false;
  @Input() modulo?: ModuloPermiso;

  @Output() accionClick = new EventEmitter<{
    accion: string;
    item: any;
  }>();
  @Output() ordenar = new EventEmitter<OrdenInformesTabla>();

  ordenColumna: string | null = null;
  ordenAsc = true;

  ngOnInit(): void {}

  onOrdenar(col: ColumnaInformesTabla<any>) {
    if (!col.sortable) return;

    if (this.ordenColumna === col.key) {
      this.ordenAsc = !this.ordenAsc;
    } else {
      this.ordenColumna = col.key;
      this.ordenAsc = true;
    }

    this.ordenar.emit({
      key: col.key,
      asc: this.ordenAsc,
    });
  }

  obtenerValor(item: any, key: string) {
    return item?.[key] ?? "";
  }

  getValor(col: ColumnaInformesTabla<any>, item: any): string | number | null {
    if (col.value) {
      return col.value(item);
    }

    if (!col.key) {
      return null;
    }

    return item[col.key as keyof typeof item] ?? null;
  }

  getCellClasses(col: ColumnaInformesTabla<InformeLiq>, item: InformeLiq): string[] {
    const classes: string[] = [];

    // alineación
    if (col.align === "end") classes.push("text-end");
    if (col.align === "center") classes.push("text-center");

    // clases dinámicas
    if (col.cellClass) {
      if (typeof col.cellClass === "function") {
        const cls = col.cellClass(item);
        if (cls) classes.push(cls);
      } else {
        classes.push(col.cellClass);
      }
    }

    return classes;
  }
}
