import { Component, HostListener } from '@angular/core';
import Swal from 'sweetalert2';
import {
  GeneradorCobrosService, PARAMETROS_COBROS_POR_DEFECTO, ParametrosCobros, PlanCobros, ResultadoCobros,
} from 'src/app/servicios/desarrollo/generador-cobros.service';
import { igualesPorContenido } from 'src/app/shared/utils/igualdad.util';

/** Sección "Generador de cobros y pagos" de /migracion (solo demo, rol
 *  dev) — Frente Finanzas G2. Sobre los InformeLiq facturados con saldo:
 *  registra cobros, pagos y anticipos con MovimientoFinService.registrar.
 *  Mismo patrón que GeneradorCircuitoComponent: "Simular" arma el plan (no
 *  escribe); "Generar" ejecuta ESE plan y se habilita solo si los
 *  parámetros no cambiaron desde la simulación. */
@Component({
  selector: 'app-generador-cobros',
  standalone: false,
  templateUrl: './generador-cobros.component.html',
})
export class GeneradorCobrosComponent {

  readonly esDemo: boolean;

  parametros: ParametrosCobros;
  plan: PlanCobros | null = null;
  simulando = false;
  ejecutando = false;
  progreso = '';
  resultado: ResultadoCobros | null = null;
  error = '';

  readonly MAX_ERRORES_VISIBLES = 30;
  readonly MAX_MOVIMIENTOS_VISIBLES = 15;

  /** Inputs de porcentajes (clave, etiqueta, paso). */
  readonly campos: { clave: keyof Omit<ParametrosCobros, 'semilla'>; etiqueta: string; paso: number }[] = [
    { clave: 'pctMorosos', etiqueta: 'Clientes: facturas que no se cobran', paso: 0.01 },
    { clave: 'pctAtrasados', etiqueta: 'Clientes: cobro atrasado (61–120 días)', paso: 0.05 },
    { clave: 'pctParciales', etiqueta: 'Clientes: cobro en dos partes', paso: 0.05 },
    { clave: 'pctRetencion', etiqueta: 'Cobros con retención IIBB', paso: 0.05 },
    { clave: 'pctSaldoAFavor', etiqueta: 'Cobros que pagan de más', paso: 0.01 },
    { clave: 'pctPagosPendientes', etiqueta: 'Choferes/proveedores: pago pendiente', paso: 0.01 },
    { clave: 'pctAnticipos', etiqueta: 'Choferes/proveedores con anticipo (mes en curso)', paso: 0.05 },
  ];

  constructor(private generador: GeneradorCobrosService) {
    this.esDemo = generador.esEntornoDemo();
    this.parametros = { ...PARAMETROS_COBROS_POR_DEFECTO, semilla: this.semillaNueva() };
  }

  get parametrosCambiaron(): boolean {
    return !!this.plan && !igualesPorContenido(this.parametros, this.plan.parametros);
  }

  get puedeEjecutar(): boolean {
    return !!this.plan && this.plan.movimientos.length > 0 && !this.simulando && !this.ejecutando && !this.parametrosCambiaron;
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
    const r0 = this.plan.resumen;

    const r = await Swal.fire({
      title: `¿Registrar ${this.plan.movimientos.length} movimientos?`,
      html:
        `<p>${r0.cobros} cobros, ${r0.pagos} pagos y ${r0.anticipos} anticipos, con la función real de Finanzas. ` +
        `Tarda varios minutos: <b>no cierres ni recargues esta pestaña</b>.</p>` +
        `<p>No es repetible: una segunda corrida cobra lo que quedó abierto. Para rehacer: Limpieza de demo y regenerar.</p>`,
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
