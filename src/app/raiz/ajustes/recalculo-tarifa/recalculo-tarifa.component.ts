import { Component, OnDestroy, OnInit } from "@angular/core";
import { Subject, takeUntil } from "rxjs";
import Swal from "sweetalert2";

import { Cliente } from "src/app/interfaces/cliente";
import { ConId } from "src/app/interfaces/conId";
import {
  FilaRecalculo,
  PreviewRecalculo,
  ResultadoRecalculo,
} from "src/app/interfaces/recalculo-tarifa";
import { RecalculoTarifaService } from "src/app/servicios/recalculo-tarifa/recalculo-tarifa.service";
import { StorageService } from "src/app/servicios/storage/storage.service";

@Component({
  selector: "app-recalculo-tarifa",
  templateUrl: "./recalculo-tarifa.component.html",
  styleUrls: ["./recalculo-tarifa.component.scss"],
  standalone: false,
})
export class RecalculoTarifaComponent implements OnInit, OnDestroy {
  clientes: ConId<Cliente>[] = [];

  idClienteSel: number = 0;
  anioSel: number = new Date().getFullYear();
  mesSel: number = new Date().getMonth() + 1;

  anios: number[] = [];
  meses: { valor: number; nombre: string }[] = [
    { valor: 1, nombre: "Enero" },
    { valor: 2, nombre: "Febrero" },
    { valor: 3, nombre: "Marzo" },
    { valor: 4, nombre: "Abril" },
    { valor: 5, nombre: "Mayo" },
    { valor: 6, nombre: "Junio" },
    { valor: 7, nombre: "Julio" },
    { valor: 8, nombre: "Agosto" },
    { valor: 9, nombre: "Septiembre" },
    { valor: 10, nombre: "Octubre" },
    { valor: 11, nombre: "Noviembre" },
    { valor: 12, nombre: "Diciembre" },
  ];

  preview: PreviewRecalculo | null = null;
  cargando: boolean = false;

  resultado: ResultadoRecalculo | null = null;
  procesando: boolean = false;
  progreso: { hechas: number; total: number } = { hechas: 0, total: 0 };

  // Solo se habilita la escritura real después de un simulacro sobre ESTE
  // preview. Regenerar el preview lo invalida.
  simulacroOk: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private storageService: StorageService,
    private recalculoServ: RecalculoTarifaService,
  ) {}

  ngOnInit(): void {
    const anioActual = new Date().getFullYear();
    this.anios = [anioActual, anioActual - 1, anioActual - 2];

    this.storageService.clientes$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: ConId<Cliente>[]) => {
        this.clientes = (data || [])
          .filter((c) => c.activo !== false)
          .sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async generar(): Promise<void> {
    if (!this.idClienteSel) {
      this.error("Seleccioná un cliente");
      return;
    }

    this.cargando = true;
    this.preview = null;
    this.resultado = null;
    this.simulacroOk = false;

    try {
      this.preview = await this.recalculoServ.generarPreview(
        Number(this.idClienteSel),
        Number(this.anioSel),
        Number(this.mesSel),
      );
    } catch (e: any) {
      this.error(e?.message || "Error al generar el preview");
    } finally {
      this.cargando = false;
    }
  }

  limpiar(): void {
    this.preview = null;
    this.resultado = null;
    this.simulacroOk = false;
  }

  // También cuenta las filas con contraparte liquidada aunque su diferencia
  // sea 0: si una corrida anterior se cortó antes de ajustar los InformeLiq,
  // volver a aplicar es lo que los repara.
  get hayCambios(): boolean {
    if (!this.preview) return false;
    return this.preview.filas.some(
      (f) =>
        f.recalculable &&
        (f.diferencia !== 0 || f.contraParte?.liquidada === true),
    );
  }

  async simular(): Promise<void> {
    if (!this.preview) return;
    await this.ejecutar(true);
  }

  async aplicarReal(): Promise<void> {
    if (!this.preview || !this.simulacroOk || !this.resultado) return;

    const ops = this.resultado.aplicadas;
    const dif = this.resultado.diferenciaAplicada;
    const liqs = this.resultado.ajustesInformeLiq.filter(
      (a) => a.delta !== 0,
    ).length;

    const confirmacion = await Swal.fire({
      title: "¿Aplicar el recálculo?",
      html:
        `Se van a modificar <strong>${ops}</strong> operaciones ` +
        `por un total de <strong>${dif.toLocaleString("es-AR")}</strong>, ` +
        `y se van a ajustar <strong>${liqs}</strong> informes de liquidación ` +
        `de chofer/proveedor.<br><br>` +
        `Esta acción escribe en producción y no tiene deshacer automático.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Sí, aplicar",
      cancelButtonText: "Cancelar",
    });

    if (!confirmacion.isConfirmed) return;

    await this.ejecutar(false);

    // Regenerar el preview para que la tabla refleje el estado real nuevo
    // (todas las diferencias deberían quedar en cero). generar() limpia el
    // resultado, así que se conserva el reporte de la corrida real.
    if (this.resultado && this.resultado.fallidas.length === 0) {
      const reporte = this.resultado;
      await this.generar();
      this.resultado = reporte;
    }
  }

  private async ejecutar(dryRun: boolean): Promise<void> {
    if (!this.preview) return;

    const previewUsado = this.preview;

    this.procesando = true;
    this.resultado = null;
    this.progreso = { hechas: 0, total: 0 };

    try {
      this.resultado = await this.recalculoServ.aplicar(previewUsado, {
        dryRun,
        onProgreso: (hechas, total) => {
          this.progreso = { hechas, total };
        },
      });

      // El simulacro solo vale para el preview sobre el que corrió.
      this.simulacroOk =
        dryRun &&
        this.resultado.fallidas.length === 0 &&
        this.preview === previewUsado;

      if (dryRun && this.resultado.fallidas.length > 0) {
        Swal.fire({
          icon: "warning",
          title: "El simulacro encontró problemas",
          text: "Revisá el detalle antes de aplicar. La aplicación real queda deshabilitada.",
        });
      }
    } catch (e: any) {
      this.simulacroOk = false;
      this.error(e?.message || "Error al ejecutar el recálculo");
    } finally {
      this.procesando = false;
    }
  }

  get porcentajeProgreso(): number {
    if (!this.progreso.total) return 0;
    return Math.round((this.progreso.hechas / this.progreso.total) * 100);
  }

  // op.fecha viene como 'YYYY-MM-DD'. El pipe date de Angular lo interpreta
  // como UTC y en UTC-3 muestra un día menos: se formatea a mano.
  formatearFecha(fecha: string): string {
    if (!fecha) return "";
    const partes = String(fecha).split("-");
    if (partes.length !== 3) return String(fecha);
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  textoEstado(fila: FilaRecalculo): string {
    switch (fila.estadoDetalle) {
      case "abierta":
        return "abierta";
      case "cerrada":
        return "cerrada";
      case "liquidada-contraparte":
        return "liq. contraparte";
      case "liquidada-cliente":
        return "liq. cliente";
      case "facturada":
        return "facturada";
      default:
        return fila.estadoDetalle;
    }
  }

  claseEstado(fila: FilaRecalculo): string {
    switch (fila.estadoDetalle) {
      case "abierta":
        return "bg-success";
      case "cerrada":
        return "bg-dark";
      case "liquidada-contraparte":
        return "bg-info text-dark";
      default:
        return "bg-danger";
    }
  }

  textoTarifa(fila: FilaRecalculo): string {
    const actual = fila.idTarifaActual ? String(fila.idTarifaActual) : "—";
    return `${actual} → ${fila.idTarifaNueva}`;
  }

  textoAdvertencias(fila: FilaRecalculo): string {
    return fila.advertencias.join(" · ");
  }

  claseFila(fila: FilaRecalculo): string {
    if (!fila.recalculable) return "table-warning";
    if (fila.advertencias.length > 0) return "table-light";
    return "";
  }

  claseDiferencia(valor: number): string {
    if (valor > 0) return "text-success";
    if (valor < 0) return "text-danger";
    return "";
  }

  nombreMes(valor: number): string {
    return this.meses.find((m) => m.valor === valor)?.nombre ?? "";
  }

  private error(msj: string): void {
    Swal.fire({ icon: "error", text: msj });
  }
}
