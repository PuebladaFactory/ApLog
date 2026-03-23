import { Component, inject, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
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

  constructor(private ccService: CuentaCorrienteService) {}

  async ngOnInit() {
    this.cargando = true;
    let id = this.route.snapshot.paramMap.get("id");
    let entidadId = Number(id);

    this.informes = await this.ccService.obtenerDetalleEntidad(entidadId);
    console.log("informes: ", this.informes);
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

  verInforme(id: string) {}

  getClasesSaldo(estadoFinanciero: any) {
    let clase = "";
    if (estadoFinanciero === "cobrado") clase = "bg-success";
    if (estadoFinanciero === "parcial") clase = "bg-warning";
    if (estadoFinanciero === "pendiente") clase = "bg-danger";

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
  
}
