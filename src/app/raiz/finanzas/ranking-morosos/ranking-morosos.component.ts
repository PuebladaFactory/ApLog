import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { AgingResumen } from "src/app/interfaces/aging-resumen";
import {
  RankingMoroso,
  ResumenDashboard,
} from "src/app/interfaces/ranking-moroso";
import { CuentaCorrienteService } from "src/app/servicios/cuenta-corriente/cuenta-corriente.service";
import { SortEvent } from "src/app/shared/directives/sortable.directive";

interface TablaState<T> {
  data: T[];
  filtrados: T[];

  sort: {
    campo: string;
    direccion: "asc" | "desc";
  };

  filtro: string;
}

@Component({
  selector: "app-ranking-morosos",
  standalone: false,
  templateUrl: "./ranking-morosos.component.html",
  styleUrl: "./ranking-morosos.component.scss",
})
export class RankingMorososComponent implements OnInit {
  ranking!: RankingMoroso[];
  cargando: boolean = false;
  filtroCriticos = false;  
  rankingClientes!: RankingMoroso[];
  rankingChoferes!: RankingMoroso[];
  tablaClientes: TablaState<RankingMoroso> = {
    data: [],
    filtrados: [],
    sort: { campo: "", direccion: "asc" },
    filtro: "",
  };

  tablaProveedores: TablaState<RankingMoroso> = {
    data: [],
    filtrados: [],
    sort: { campo: "", direccion: "asc" },
    filtro: "",
  };

  columnas = [
    { width: '30%' }, // entidad
    { width: '10%' }, // total
    { width: '6%' }, // score
    { width: '7%' }, // % vencido
/*     { width: '10%' }, // 0-30
    { width: '10%' }, // 31-60 */
    { width: '10%' }, // situación
    { width: '10%' }, // 61-90
    { width: '10%' }, // 90+
    { width: '5%' }, // detalle
  ];

  constructor(
    private cuentaCorrienteService: CuentaCorrienteService,
    private router: Router,
  ) {}

  async ngOnInit() {
    this.cargando = true;
    this.ranking = await this.cuentaCorrienteService.obtenerRankingMorosos();
    this.rankingClientes = this.ranking.filter(
      (r) => r.tipoEntidad === "cliente",
    );
    this.rankingChoferes = this.ranking.filter(
      (r) => r.tipoEntidad === "chofer" || r.tipoEntidad === "proveedor",
    );
    //console.log("this.ranking: ", this.ranking );
    this.cargando = false;
    this.tablaClientes.data = this.rankingClientes;
    this.tablaProveedores.data = this.rankingChoferes;
    this.procesarTabla(this.tablaClientes);
    this.procesarTabla(this.tablaProveedores);
    
  }

  getClaseScore(score: number): string {
    if (score >= 75) return "critico-intenso";
    if (score >= 55) return "critico";
    if (score >= 35) return "alerta";
    if (score >= 20) return "medio";
    return "ok";
  }

  calcularResumenPorTipo(
    agingGlobal: AgingResumen[],
    tipo: "cliente" | "chofer" | "proveedor",
  ): ResumenDashboard {
    const filtrados = agingGlobal.filter((a) => a.tipo === tipo);

    const total = filtrados.reduce((acc, a) => acc + a.total, 0);

    const vencido = filtrados.reduce(
      (acc, a) => acc + a.bucket61_90 + a.bucket90mas,
      0,
    );

    const vencidoPorc = total > 0 ? vencido / total : 0;

    return {
      total,
      vencido,
      vencidoPorc,
    };
  }

  calcularResumenAgrupado(agingList: AgingResumen[]): ResumenDashboard {
    const total = agingList.reduce((acc, a) => acc + a.total, 0);

    const vencido = agingList.reduce(
      (acc, a) => acc + a.bucket61_90 + a.bucket90mas,
      0,
    );

    const vencidoPorc = total > 0 ? vencido / total : 0;

    return {
      total,
      vencido,
      vencidoPorc,
    };
  }

  /* ORDEN COLUMNAS */

  procesarTabla<T>(tabla: TablaState<T>): void {
    let resultado = [...tabla.data];

    // 🔎 FILTRO GLOBAL (todos los campos)
    if (tabla.filtro) {
      const filtro = tabla.filtro.toLowerCase();

      resultado = resultado.filter((item) =>
        Object.values(item as any).some((val) =>
          val?.toString().toLowerCase().includes(filtro),
        ),
      );
    }

    // 🔽 ORDEN
    const { campo, direccion } = tabla.sort;

    if (campo) {
      resultado.sort((a, b) => {
        const valA = this.getValor(a, campo);
        const valB = this.getValor(b, campo);

        if (valA < valB) return direccion === "asc" ? -1 : 1;
        if (valA > valB) return direccion === "asc" ? 1 : -1;
        return 0;
      });
    }

    tabla.filtrados = resultado;
  }

  getValor(obj: any, campo: string): any {
    return campo.split(".").reduce((o, i) => o?.[i], obj);
  }

  onSort(tabla: TablaState<RankingMoroso>, event: SortEvent) {
    tabla.sort = event;
    this.procesarTabla(tabla);
  }

  onFiltro(tabla: TablaState<RankingMoroso>, valor: string) {
    tabla.filtro = valor;
    this.procesarTabla(tabla);
  }

  verDetalle(item: RankingMoroso) {
    const url = this.router.serializeUrl(
      this.router.createUrlTree([
        "/raiz/finanzas/cuenta-corriente",
        item.entidadId,
      ]),
    );

    window.open(url, "_blank");
  }
}
