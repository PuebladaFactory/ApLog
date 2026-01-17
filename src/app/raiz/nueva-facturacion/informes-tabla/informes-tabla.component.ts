import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ConId } from 'src/app/interfaces/conId';
import { InformeLiq } from 'src/app/interfaces/informe-liq';
import { AccionTabla, ColumnaTabla, EventoAccionTabla, OrdenTabla } from 'src/app/interfaces/tablas';

@Component({
  selector: 'app-informes-tabla',
  standalone: false,
  templateUrl: './informes-tabla.component.html',
  styleUrl: './informes-tabla.component.scss'
})
export class InformesTablaComponent implements OnInit{

  @Input() items: ConId<InformeLiq>[] = [];
  @Input() columnas: ColumnaTabla<InformeLiq>[] = [];
  @Input() acciones: AccionTabla<InformeLiq>[] = [];
  @Input() loading = false;

  @Output() accionClick = new EventEmitter<{
    accion: string;
    item: any;
  }>();
  @Output() ordenar = new EventEmitter<OrdenTabla>();

  ordenColumna: string | null = null;
  ordenAsc = true;
  
  constructor(){}
  
  ngOnInit(): void {
    
  }

  onOrdenar(col: ColumnaTabla<any>) {
    if (!col.sortable) return;

    if (this.ordenColumna === col.key) {
      this.ordenAsc = !this.ordenAsc;
    } else {
      this.ordenColumna = col.key;
      this.ordenAsc = true;
    }

    this.ordenar.emit({
      key: col.key,
      asc: this.ordenAsc
    });
  }

  obtenerValor(item: any, key: string) {
    return item?.[key] ?? '';
  }


  ejecutarAccion(accion: AccionTabla<InformeLiq>, item: ConId<InformeLiq>) {
    if (accion.disabled?.(item)) return;

    this.accionClick.emit({
      accion: accion.id,
      item
    });
  }

  mostrarAccion(accion: AccionTabla<InformeLiq>, item: ConId<InformeLiq>): boolean {
    return accion.visible ? accion.visible(item) : true;
  }

  accionDeshabilitada(accion: AccionTabla<InformeLiq>, item: ConId<InformeLiq>): boolean {
    return accion.disabled ? accion.disabled(item) : false;
  }

  getValor(col: ColumnaTabla<any>, item: any): string | number | null {
    if (col.value) {
      return col.value(item);
    }

    if (!col.key) {
      return null;
    }

    return item[col.key as keyof typeof item] ?? null;
  }



}
