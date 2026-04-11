import { Component, OnInit } from "@angular/core";
import { AgingResumen } from "src/app/interfaces/aging-resumen";
import { CuentaCorrienteService } from "src/app/servicios/cuenta-corriente/cuenta-corriente.service";

@Component({
  selector: "app-aging-listado",
  standalone: false,
  templateUrl: "./aging-listado.component.html",
  styleUrl: "./aging-listado.component.scss",
})
export class AgingListadoComponent implements OnInit {
  aging: AgingResumen[] = [];
  agingFiltrado: AgingResumen[] = [];
  cargando: boolean = false;

  sort = {
    campo: "",
    direccion: "asc" as "asc" | "desc",
  };

  filtros = {
    tipoEntidad: "" as "" | "cliente" | "chofer" | "proveedor",
    search: "",
  };

  constructor(private cuentaCorrienteService: CuentaCorrienteService) {}

  ngOnInit() {
    this.consultarDatos();
  }

  async consultarDatos() {
    this.cargando = true;
    this.aging = await this.cuentaCorrienteService.obtenerAgingGlobal();
    this.aging = this.aging.sort((a,b)=> a.razonSocial.localeCompare(b.razonSocial));
    console.log(this.aging);
    this.agingFiltrado = [...this.aging];
    this.cargando = false;
  }

  capitalizarPrimeraLetra(palabra: string): string {
    return palabra.charAt(0).toUpperCase() + palabra.slice(1);
  }

  /* ORDEN COLUMNAS */

  onSort(event: { campo: string; direccion: "asc" | "desc" }) {
    this.sort = event;
    this.aplicarOrden();
  }

  aplicarOrden() {
    const { campo, direccion } = this.sort;

    if (!campo) return;

    this.agingFiltrado.sort((a: any, b: any) => {
      const valorA = a[campo];
      const valorB = b[campo];

      if (typeof valorA === "string" && typeof valorB === "string") {
        return direccion === "asc"
          ? valorA.localeCompare(valorB)
          : valorB.localeCompare(valorA);
      }

      if (typeof valorA === "number" && typeof valorB === "number") {
        return direccion === "asc" ? valorA - valorB : valorB - valorA;
      }

      return 0;
    });
  }

  onFiltroChange() {
    //this.reload();
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    let data = [...this.aging];

    // 🔎 tipo entidad
    if (this.filtros.tipoEntidad) {
      if (this.filtros.tipoEntidad === "cliente")
        data = data.filter((a) => a.tipo === "cliente");
      if (this.filtros.tipoEntidad === "chofer")
        data = data.filter((a) => a.tipo === "chofer");
      if (this.filtros.tipoEntidad === "proveedor")
        data = data.filter((a) => a.tipo === "proveedor");
    }

    // 🔎 búsqueda
    if (this.filtros.search) {
      const search = this.filtros.search.toLowerCase();

      data = data.filter(
        (a) =>
          a.razonSocial.toLowerCase().includes(search) ||
          a.tipo.toString().includes(search) ||
          a.total.toString().includes(search) ||
          a.bucket0_30.toString().includes(search) ||
          a.bucket31_60.toString().includes(search) ||
          a.bucket61_90.toString().includes(search) ||
          a.bucket90mas.toString().includes(search),
      );
    }

    // 📊 orden por deuda DESC
    //data.sort((a, b) => b.saldoPendiente - a.saldoPendiente);

    this.agingFiltrado = data;
    this.aplicarOrden();
  }

   getDescripcionSaldo(aging: AgingResumen): string {
     
      if (aging.total === 0) {
        return "Saldado";
      } else {
        if (aging.tipo === "cliente") {
          return "A favor";
        } else {
          return "En contra";
        }
      }
    }
  
    getBadgeClasesSaldo(aging: AgingResumen) {
      if (aging.total === 0) {
        return "bg-success";
      } else {
        if (aging.tipo === "cliente") {
          return "bg-info";
        } else {
          return "bg-danger";
        }
      }
    }

    getLabelEstado(aging: AgingResumen): string {

  const estado = this.getEstadoAging(aging);

  switch (estado) {
    case 'critico-intenso': return 'Crítico';
    case 'critico': return 'Alto riesgo';
    case 'alerta': return 'En riesgo';
    case 'medio': return 'Atención';
    default: return 'Ok';
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
