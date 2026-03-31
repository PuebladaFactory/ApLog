import { Component, Input, OnInit } from "@angular/core";
import { AgingResumen } from "src/app/interfaces/aging-resumen";

@Component({
  selector: "app-modal-aging-entidad",
  standalone: false,
  templateUrl: "./modal-aging-entidad.component.html",
  styleUrl: "./modal-aging-entidad.component.scss",
})
export class ModalAgingEntidadComponent implements OnInit {
  @Input() aging!: AgingResumen;

  ngOnInit(): void {}

  getLabelEstado(aging: AgingResumen): string {

  const estado = this.getEstadoAging(aging);

  switch (estado) {
    case 'critico-intenso': return 'Crítico';
    case 'critico': return 'Alto riesgo';
    case 'alerta': return 'En riesgo';
    case 'medio': return 'Atención';
    default: return 'Saludable';
  }
}

getEstadoAging(aging: AgingResumen): string {

  const total = aging.total || 1;

  const p90 = aging.bucket90mas / total;
  const pVencido = (aging.bucket61_90 + aging.bucket90mas) / total;

  if (p90 > 0.4) return 'critico-intenso';
  if (p90 > 0.2) return 'critico';

  if (pVencido > 0.5) return 'alerta';
  if (pVencido > 0.3) return 'medio';

  return 'ok';
}
}
