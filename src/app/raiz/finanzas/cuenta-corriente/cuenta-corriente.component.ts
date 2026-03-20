import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { Subject, takeUntil } from "rxjs";
import { CuentaCorrienteResumen } from "src/app/interfaces/cuenta-corriente-resumen";
import { CuentaCorrienteService } from "src/app/servicios/cuenta-corriente/cuenta-corriente.service";
import { StorageService } from "src/app/servicios/storage/storage.service";

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

  private destroy$ = new Subject<void>();

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
        this.cuentasFiltradas = data;
      });
  }

  aplicarFiltros() {
    let data = [...this.cuentas];

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
    data.sort((a, b) => b.saldoPendiente - a.saldoPendiente);

    this.cuentasFiltradas = data;
  }

  onFiltroChange() {
    this.reload();
  }

  reload() {
    this.cuentaCorrienteService
      .getCuentaCorriente$(this.filtrosNormalizados)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.cuentasFiltradas = data;
      });
  }

  verDetalle(cuenta: CuentaCorrienteResumen) {
    this.router.navigate(["finanzas/cuenta-corriente", cuenta.entidadId]);
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
}
