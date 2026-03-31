import { Component, inject, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { AgingResumen } from "src/app/interfaces/aging-resumen";
import { DetalleVistaCuentaCorriente } from "src/app/interfaces/cuenta-corriente-resumen";
import { InformeLiq } from "src/app/interfaces/informe-liq";
import { CuentaCorrienteService } from "src/app/servicios/cuenta-corriente/cuenta-corriente.service";

@Component({
  selector: "app-detalle-cuenta-corriente",
  standalone: false,
  templateUrl: "./detalle-cuenta-corriente.component.html",
  styleUrl: "./detalle-cuenta-corriente.component.scss",
})
export class DetalleCuentaCorrienteComponent implements OnInit {
  private route = inject(ActivatedRoute);

  informes: DetalleVistaCuentaCorriente[] = [];
  informesFiltrados: DetalleVistaCuentaCorriente[] = [];

  resumen = {
    total: 0,
    pagado: 0,
    saldo: 0,
  };

  cantInformes = {
    total: 0,
    cancelados: 0,
    conDeuda: 0,
  };

  soloConDeuda: boolean = false;
  cargando: boolean = false;
  sort = {
    campo: "",
    direccion: "asc" as "asc" | "desc",
  };

  aging!: AgingResumen;

  constructor(
    private ccService: CuentaCorrienteService,
    private router: Router,
  ) {}

  async ngOnInit() {
    this.cargando = true;
    let id = this.route.snapshot.paramMap.get("id");
    let entidadId = Number(id);

    let consulta = await this.ccService.obtenerDetalleEntidad(entidadId);
    this.informes = consulta.detalle;
    this.aging = consulta.aging;
    console.log("informes: ", this.informes);
    console.log("aging: ", this.aging);
    this.informesFiltrados = this.informes.sort((a, b) =>
      a.numero.localeCompare(b.numero),
    );
    console.log("informesFiltrados: ", this.informesFiltrados);

    this.aplicarFiltros();
    this.cargando = false;
  }

  calcularResumen() {
    let total = 0;
    let pagado = 0;
    let saldo = 0;
    console.log("2))))informesFiltrados: ", this.informesFiltrados);

    this.informesFiltrados.forEach((d) => {
      total += d.total;
      pagado += d.cancelado;
      saldo += d.saldo;

      if (d.cancelado === d.total) this.cantInformes.cancelados += 1;
      if (d.saldo > 0) this.cantInformes.conDeuda += 1;
    });

    this.cantInformes.total = this.informesFiltrados.length;

    this.resumen = { total, pagado, saldo };
  }

  verInforme(id: string) {
    const url = this.router.serializeUrl(
      this.router.createUrlTree(["/raiz/finanzas/informe", id]),
    );

    window.open(url, "_blank");
  }

  getClasesSaldo(estadoFinanciero: any) {
    let clase = "";
    if (estadoFinanciero === "cobrado")
      clase = "badge rounded-pill text bg-success";
    if (estadoFinanciero === "parcial")
      clase = "badge rounded-pill text-bg-warning";
    if (estadoFinanciero === "pendiente")
      clase = "badge rounded-pill text bg-danger";

    return clase;
  }

  aplicarFiltros() {
    let data = [...this.informes];

    // 🔎 tipo entidad
    if (this.soloConDeuda) {
      data = data.filter((c) => c.saldo > 0);
    }
    this.informesFiltrados = data;
    this.aplicarOrden();
    this.calcularResumen();
  }
  /* ORDEN COLUMNAS */

  onSort(event: { campo: string; direccion: "asc" | "desc" }) {
    this.sort = event;
    this.aplicarOrden();
  }

  aplicarOrden() {
    const { campo, direccion } = this.sort;

    if (!campo) return;

    this.informesFiltrados.sort((a: any, b: any) => {
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

  getEstadoAging(aging: AgingResumen): string {
    const total = aging.total || 1;

    const porcentajeCritico = aging.bucket90mas / total;

    if (porcentajeCritico > 0.4) return "badge rounded-pill text-bg-danger";
    if (porcentajeCritico > 0.2) return "badge rounded-pill text-bg-warning";
    return "badge rounded-pill text-bg-success";
  }
}
