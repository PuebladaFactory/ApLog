import { Component, HostListener } from '@angular/core';
import Swal from 'sweetalert2';
import {
  GeneradorCircuitoService, PARAMETROS_CIRCUITO_POR_DEFECTO, ParametrosCircuito, PlanCircuito, ResultadoCircuito,
} from 'src/app/servicios/desarrollo/generador-circuito.service';
import { formatearCuit } from 'src/app/shared/utils/datos-empresa.util';
import { igualesPorContenido } from 'src/app/shared/utils/igualdad.util';

/** Sección "Generador de circuito" de /migracion (solo demo, rol dev) —
 *  Frente Finanzas G1. Sobre los InformeOp activos de un rango de meses:
 *  liquida (emite o deja en borrador) y vincula facturas de prueba, con las
 *  funciones reales. Mismo patrón que GeneradorOperacionesComponent:
 *  "Simular" arma el plan (no escribe); "Generar" ejecuta ESE plan y se
 *  habilita solo si los parámetros no cambiaron desde la simulación. */
@Component({
  selector: 'app-generador-circuito',
  standalone: false,
  templateUrl: './generador-circuito.component.html',
})
export class GeneradorCircuitoComponent {

  readonly esDemo: boolean;

  parametros: ParametrosCircuito;
  plan: PlanCircuito | null = null;
  simulando = false;
  ejecutando = false;
  progreso = '';
  resultado: ResultadoCircuito | null = null;
  error = '';

  readonly MAX_ERRORES_VISIBLES = 30;
  readonly MAX_LIQUIDACIONES_VISIBLES = 15;
  readonly formatearCuit = formatearCuit;

  constructor(private generador: GeneradorCircuitoService) {
    this.esDemo = generador.esEntornoDemo();
    // Por defecto: el mes anterior.
    const hoy = new Date();
    const anterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const mes = `${anterior.getFullYear()}-${String(anterior.getMonth() + 1).padStart(2, '0')}`;
    this.parametros = {
      ...PARAMETROS_CIRCUITO_POR_DEFECTO,
      desde: mes,
      hasta: mes,
      semilla: this.semillaNueva(),
    };
  }

  get parametrosCambiaron(): boolean {
    return !!this.plan && !igualesPorContenido(this.parametros, this.plan.parametros);
  }

  get puedeEjecutar(): boolean {
    return !!this.plan && this.plan.resumen.liquidaciones > 0 && !this.simulando && !this.ejecutando && !this.parametrosCambiaron;
  }

  get totalEmitidas(): number {
    return this.plan?.resumen.porTipo.reduce((acc, t) => acc + t.emitidas, 0) ?? 0;
  }

  get totalBorradores(): number {
    return this.plan?.resumen.porTipo.reduce((acc, t) => acc + t.borradores, 0) ?? 0;
  }

  get totalAFacturar(): number {
    return this.plan?.resumen.porTipo.reduce((acc, t) => acc + t.aFacturar, 0) ?? 0;
  }

  get totalCompensadas(): number {
    return this.plan?.resumen.porTipo.reduce((acc, t) => acc + t.compensadas, 0) ?? 0;
  }

  get totalFacturasPorNeto(): number {
    return this.plan?.resumen.porTipo.reduce((acc, t) => acc + t.facturasPorNeto, 0) ?? 0;
  }

  @HostListener('window:beforeunload', ['$event'])
  avisarSiEjecutando(evento: BeforeUnloadEvent): void {
    if (this.ejecutando) {
      evento.preventDefault();
      evento.returnValue = '';
    }
  }

  nuevaSemilla(): void {
    this.parametros.semilla = this.semillaNueva();
  }

  async simular(): Promise<void> {
    this.error = '';
    this.plan = null;
    this.resultado = null;
    this.simulando = true;
    try {
      this.plan = await this.generador.planificar({ ...this.parametros });
    } catch (e: any) {
      this.error = e?.message ?? String(e);
    } finally {
      this.simulando = false;
    }
  }

  async ejecutar(): Promise<void> {
    if (!this.plan || !this.puedeEjecutar) return;
    this.error = '';

    const r = await Swal.fire({
      title: `¿Generar ${this.plan.resumen.liquidaciones} liquidaciones?`,
      html:
        `<p>${this.totalEmitidas} emitidas (${this.totalAFacturar} con factura de prueba) y ` +
        `${this.totalBorradores} en borrador, con las funciones reales de Liquidación y Facturación. ` +
        (this.totalCompensadas > 0
          ? `${this.totalCompensadas} con compensaciones (${this.totalFacturasPorNeto} facturadas por el neto). `
          : '') +
        `Tarda varios minutos: <b>no cierres ni recargues esta pestaña</b>.</p>` +
        `<p>Para deshacer: Limpieza de demo (los PDF de prueba quedan en Storage).</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Generar',
      cancelButtonText: 'Cancelar',
    });
    if (!r.isConfirmed) return;

    this.ejecutando = true;
    this.resultado = null;
    try {
      this.resultado = await this.generador.ejecutar({ ...this.plan.parametros }, msg => (this.progreso = msg));
      this.plan = null;
    } catch (e: any) {
      this.error = e?.message ?? String(e);
    } finally {
      this.ejecutando = false;
      this.progreso = '';
    }
  }

  private semillaNueva(): number {
    return Math.floor(Math.random() * 1_000_000);
  }
}
