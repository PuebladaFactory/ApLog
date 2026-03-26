import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { Subject, takeUntil } from "rxjs";
import { CuentaCorrienteResumen } from "src/app/interfaces/cuenta-corriente-resumen";
import { CuentaCorrienteService } from "src/app/servicios/cuenta-corriente/cuenta-corriente.service";
import { StorageService } from "src/app/servicios/storage/storage.service";

type EstadoCuenta = "saldado" | "con_deuda";

@Component({
  selector: "app-cuenta-corriente",
  standalone: false,
  templateUrl: "./cuenta-corriente.component.html",
  styleUrl: "./cuenta-corriente.component.scss",
})
export class CuentaCorrienteComponent implements OnInit {
  cuentas: CuentaCorrienteResumen[] = [];
  cuentasFiltradas: CuentaCorrienteResumen[] = [];

  loading = false;

  filtros = {
    tipoEntidad: "" as "" | "cliente" | "chofer" | "proveedor",
    soloConDeuda: false,
    search: "",
  };

  resumen = {
    nosDeben: 0,
    debemos: 0,
    saldoNeto: 0,
    cantidadClientesDeudores: 0,
    cantidadProveedoresDeuda: 0,
  };

  private destroy$ = new Subject<void>();

  sort = {
    campo: "",
    direccion: "asc" as "asc" | "desc",
  };

  constructor(
    private cuentaCorrienteService: CuentaCorrienteService,
    private router: Router,
    private storageService: StorageService,
  ) {}

  ngOnInit() {
    this.storageService.listenForChanges("resumenFinanzas");

    this.cuentaCorrienteService
      .getCuentaCorriente$(this.filtrosNormalizados)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.cuentas = data;
        this.cuentas = this.cuentas.sort((a, b) =>
          a.razonSocial.localeCompare(b.razonSocial),
        );
        this.aplicarFiltros();
      });
  }

  aplicarFiltros() {
    let data = [...this.cuentas];

    // 🔎 tipo entidad
    if (this.filtros.tipoEntidad) {
      if (this.filtros.tipoEntidad === "cliente")
        data = data.filter((c) => c.tipoEntidad === "cliente");
      if (this.filtros.tipoEntidad === "chofer")
        data = data.filter((c) => c.tipoEntidad === "chofer");
      if (this.filtros.tipoEntidad === "proveedor")
        data = data.filter((c) => c.tipoEntidad === "proveedor");
    }

    // 🔎 búsqueda
    if (this.filtros.search) {
      const search = this.filtros.search.toLowerCase();

      data = data.filter(
        (c) =>
          c.razonSocial.toLowerCase().includes(search) ||
          (c.cuit && c.cuit.includes(search)),
      );
    }

    // 🔴 solo con deuda (refuerzo en frontend)
    if (this.filtros.soloConDeuda) {
      data = data.filter((c) => c.saldoPendiente > 0);
    }

    // 📊 orden por deuda DESC
    //data.sort((a, b) => b.saldoPendiente - a.saldoPendiente);

    this.cuentasFiltradas = data;
    this.aplicarOrden();
    this.calcularResumen();
  }

  onFiltroChange() {
    //this.reload();
    this.aplicarFiltros();
  }

  verDetalle(cuenta: CuentaCorrienteResumen) {   
     const url = this.router.serializeUrl(
      this.router.createUrlTree(
        ['/raiz/finanzas/cuenta-corriente', cuenta.entidadId]
      )
    );

    window.open(url, '_blank');
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case "con_deuda":
        return "estado-deuda";
      case "sin_deuda":
        return "estado-ok";
      case "al_dia":
        return "estado-favor";
      default:
        return "";
    }
  }

  get filtrosNormalizados() {
    return {
      tipoEntidad: this.filtros.tipoEntidad || undefined,
      soloConDeuda: this.filtros.soloConDeuda,
      search: this.filtros.search || undefined,
    };
  }

  getDescripcionSaldo(cuenta: CuentaCorrienteResumen): string {
    /*     if (cuenta.saldoPendiente === 0) return "Saldado";

    if (cuenta.tipoEntidad === "cliente") {
      return cuenta.saldoPendiente > 0 ? "Nos deben" : "A favor del cliente";
    }

    return cuenta.saldoPendiente > 0 ? "Debemos" : "A favor nuestro"; */
    if (cuenta.saldoPendiente === 0) {
      return "Saldado";
    } else {
      if (cuenta.tipoEntidad === "cliente") {
        return "Deuda a favor";
      } else {
        return "Deuda en contra";
      }
    }
  }

  getBadgeClasesSaldo(cuenta: CuentaCorrienteResumen) {
    if (cuenta.saldoPendiente === 0) {
      return "bg-success";
    } else {
      if (cuenta.tipoEntidad === "cliente") {
        return "bg-info";
      } else {
        return "bg-danger";
      }
    }
  }

  getClasesSaldo(cuenta: CuentaCorrienteResumen) {
    if (cuenta.saldoPendiente === 0) {
      return "text-success";
    } else {
      if (cuenta.tipoEntidad === "cliente") {
        return "text-info";
      } else {
        return "text-danger";
      }
    }
  }

  getEstado(cuenta: CuentaCorrienteResumen): "saldado" | "con_deuda" {
    return cuenta.saldoPendiente === 0 ? "saldado" : "con_deuda";
  }

  calcularResumen() {
    let nosDeben = 0;
    let debemos = 0;

    let clientesDeudores = 0;
    let proveedoresDeuda = 0;

    this.cuentasFiltradas.forEach((c) => {
      if (c.tipoEntidad === "cliente") {
        if (c.saldoPendiente > 0) {
          nosDeben += c.saldoPendiente;
          clientesDeudores++;
        }
      }

      if (c.tipoEntidad === "proveedor" || c.tipoEntidad === "chofer") {
        if (c.saldoPendiente > 0) {
          debemos += c.saldoPendiente;
          proveedoresDeuda++;
        }
      }
    });

    this.resumen = {
      nosDeben,
      debemos,
      saldoNeto: nosDeben - debemos,
      cantidadClientesDeudores: clientesDeudores,
      cantidadProveedoresDeuda: proveedoresDeuda,
    };
  }

  /* ORDEN COLUMNAS */

  onSort(event: { campo: string; direccion: "asc" | "desc" }) {
    this.sort = event;
    this.aplicarOrden();
  }

  aplicarOrden() {
    const { campo, direccion } = this.sort;

    if (!campo) return;

    this.cuentasFiltradas.sort((a: any, b: any) => {
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
