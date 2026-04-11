import { Component, Input, OnInit } from "@angular/core";
import { AgingGlobal, AgingResumen } from "src/app/interfaces/aging-resumen";
import { CuentaCorrienteService } from "src/app/servicios/cuenta-corriente/cuenta-corriente.service";

@Component({
  selector: "app-aging-global",
  standalone: false,
  templateUrl: "./aging-global.component.html",
  styleUrl: "./aging-global.component.scss",
})
export class AgingGlobalComponent implements OnInit {

  @Input() aging!:AgingGlobal;


  constructor(
    private cuentaCorrienteService: CuentaCorrienteService
  ){}

  async ngOnInit() {        
    
  }

  getEstadoGlobal(aging: AgingGlobal): string {
    const total = aging.total || 1;

    const p90 = aging.bucket90mas / total;
    const pVencido = (aging.bucket61_90 + aging.bucket90mas) / total;

    if (p90 > 0.4) return "critico-intenso";
    if (p90 > 0.2) return "critico";
    if (pVencido > 0.5) return "alerta";
    if (pVencido > 0.3) return "medio";

    return "ok";
  }

  getTextoEstado(estado: string): string {
    switch (estado) {
      case "critico-intenso":
        return "Crítico";
      case "critico":
        return "Alto riesgo";
      case "alerta":
        return "Atención";
      case "medio":
        return "Normal";
      default:
        return "Saludable";
    }
  }
}
