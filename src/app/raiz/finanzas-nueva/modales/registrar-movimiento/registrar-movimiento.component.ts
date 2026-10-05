import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { ConId } from 'src/app/interfaces/conId';
import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import {
  ConceptoMovimientoFin, EntidadMovimientoFin, ImpuestoRetencionFin, TipoMedioFin,
} from 'src/app/interfaces/movimiento-fin';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { FinanzasConsultaService } from 'src/app/servicios/finanzas-nueva/finanzas-consulta.service';
import { MovimientoFinService } from 'src/app/servicios/finanzas-nueva/movimiento-fin.service';
import { InformeLiqFactoryService } from 'src/app/servicios/informes-liq/informe-liq-factory.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { CuentaEntidadFin, LadoCuenta, fechaBaseAntiguedad } from 'src/app/shared/utils/cuentas-finanzas.util';
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import {
  diasEntre, distribuirFifo, esCero, normalizarValoresFinancieros, redondear2, TOLERANCIA_IMPORTE,
} from 'src/app/shared/utils/finanzas.util';
import {
  DatosMovimientoFin, ETIQUETA_MEDIO, normalizarDatosMovimiento, tipoMovimientoPara, validarDatosMovimiento,
} from 'src/app/shared/utils/movimiento-fin.util';

/** Comprobante abierto de la entidad (InformeLiq facturado con saldo). */
interface FilaComprobante {
  liq: ConId<InformeLiqNuevo>;
  periodo: string;
  fechaFactura: string;     // legible
  dias: number | null;
  total: number;
  saldo: number;
  importe: number;          // a imputar en este movimiento
}

/** Medio en edición (todos los campos presentes; se normaliza al guardar). */
interface MedioForm {
  tipo: TipoMedioFin;
  importe: number | null;
  referencia: string;
  banco: string;
  fechaCobro: string;
  impuesto: ImpuestoRetencionFin;
  jurisdiccion: string;
  certificado: string;
}

interface OpcionEntidad {
  clave: string;
  entidad: EntidadMovimientoFin;
}

/** Finanzas — registrar un cobro (cliente) o un pago (chofer/proveedor).
 *  Entrada: `cuenta` (desde la fila de Cuentas) o, si es null, se elige la
 *  entidad del lado `lado` (sirve para un anticipo a quien todavía no tiene
 *  comprobantes abiertos). Arma DatosMovimientoFin, valida con el mismo util
 *  que el servicio (validarDatosMovimiento) y llama a
 *  MovimientoFinService.registrar, que revalida todo en su transacción.
 *  Cierra con el resultado si registró; si falla, queda abierto. */
@Component({
  selector: 'app-registrar-movimiento',
  standalone: false,
  templateUrl: './registrar-movimiento.component.html',
  styleUrl: './registrar-movimiento.component.scss',
})
export class RegistrarMovimientoComponent implements OnInit {

  @Input() cuenta: CuentaEntidadFin | null = null;
  @Input() lado: LadoCuenta = 'cobrar';

  readonly hoy = toISODateString(new Date());
  readonly etiquetaMedio = ETIQUETA_MEDIO;
  readonly tiposMedio: TipoMedioFin[] = ['transferencia', 'efectivo', 'cheque', 'echeq', 'retencion', 'otro'];
  readonly impuestos: { valor: ImpuestoRetencionFin; etiqueta: string }[] = [
    { valor: 'ganancias', etiqueta: 'Ganancias' },
    { valor: 'iibb', etiqueta: 'Ingresos Brutos' },
    { valor: 'iva', etiqueta: 'IVA' },
    { valor: 'suss', etiqueta: 'SUSS' },
  ];

  opciones: OpcionEntidad[] = [];
  claveElegida = '';
  entidad: EntidadMovimientoFin | null = null;

  fecha = this.hoy;
  concepto: ConceptoMovimientoFin = 'normal';
  filas: FilaComprobante[] = [];
  medios: MedioForm[] = [this.medioNuevo()];
  observaciones = '';

  cargando = false;
  guardando = false;
  error = '';

  constructor(
    public activeModal: NgbActiveModal,
    private consulta: FinanzasConsultaService,
    private movimientos: MovimientoFinService,
    private factory: InformeLiqFactoryService,
    private clienteService: ClienteService,
    private choferService: ChoferService,
    private proveedorService: ProveedorService,
  ) {}

  async ngOnInit(): Promise<void> {
    if (this.cuenta) {
      this.lado = this.cuenta.lado;
      await this.elegirEntidad({
        tipo: this.cuenta.tipo,
        id: this.cuenta.idEntidad,
        razonSocial: this.cuenta.nombre,
        cuit: this.cuenta.cuit,
      });
    } else {
      this.opciones = this.armarOpciones();
    }
  }

  // ---------------------------------------------------------------------------
  // Derivados
  // ---------------------------------------------------------------------------

  get esCobro(): boolean {
    return this.lado === 'cobrar';
  }

  get titulo(): string {
    return this.esCobro ? 'Registrar cobro' : 'Registrar pago';
  }

  get totalMedios(): number {
    return redondear2(this.medios.reduce((acc, m) => acc + (Number(m.importe) || 0), 0));
  }

  get totalImputado(): number {
    if (this.concepto !== 'normal') return 0;
    return redondear2(this.filas.reduce((acc, f) => acc + (Number(f.importe) || 0), 0));
  }

  get sinImputar(): number {
    const v = redondear2(this.totalMedios - this.totalImputado);
    return esCero(v) ? 0 : v;
  }

  get totalSaldos(): number {
    return redondear2(this.filas.reduce((acc, f) => acc + f.saldo, 0));
  }

  /** Error de validación en vivo (mismo util que el servicio + saldo por fila). */
  get errorValidacion(): string | null {
    if (!this.entidad) return 'Elegí la entidad.';
    const excedida = this.concepto === 'normal'
      ? this.filas.find(f => (Number(f.importe) || 0) - f.saldo > TOLERANCIA_IMPORTE)
      : undefined;
    if (excedida) return `El importe del comprobante ${excedida.liq.numeroInterno} supera su saldo.`;
    return validarDatosMovimiento(normalizarDatosMovimiento(this.armarDatos()!), this.hoy);
  }

  get puedeConfirmar(): boolean {
    return !this.cargando && !this.guardando && this.errorValidacion === null;
  }

  // ---------------------------------------------------------------------------
  // Gestos
  // ---------------------------------------------------------------------------

  async onEntidadElegida(clave: string): Promise<void> {
    this.claveElegida = clave;
    const opcion = this.opciones.find(o => o.clave === clave);
    if (opcion) await this.elegirEntidad(opcion.entidad);
  }

  onConcepto(concepto: ConceptoMovimientoFin): void {
    this.concepto = concepto;
    if (concepto !== 'normal') this.filas.forEach(f => (f.importe = 0));
  }

  /** Check de la fila: marcado = saldar el comprobante; desmarcado = 0. */
  alternarFila(fila: FilaComprobante, marcada: boolean): void {
    fila.importe = marcada ? fila.saldo : 0;
  }

  /** Reparte el total de los medios entre los comprobantes, del más antiguo
   *  al más nuevo (distribuirFifo). */
  repartir(): void {
    const importes = distribuirFifo(this.totalMedios, this.filas.map(f => f.saldo));
    this.filas.forEach((f, i) => (f.importe = importes[i]));
  }

  agregarMedio(): void {
    this.medios.push(this.medioNuevo());
  }

  quitarMedio(i: number): void {
    if (this.medios.length > 1) this.medios.splice(i, 1);
  }

  async confirmar(): Promise<void> {
    if (!this.puedeConfirmar || !this.entidad) return;
    this.error = '';

    const avisoSaldo = this.concepto === 'normal' && this.sinImputar > 0
      ? `<p class="text-warning">Quedan <b>$ ${this.sinImputar.toFixed(2)}</b> sin imputar: se registran como saldo a favor.</p>`
      : '';
    const r = await Swal.fire({
      title: `¿${this.titulo}?`,
      html:
        `<p>${this.entidad.razonSocial} — total <b>$ ${this.totalMedios.toFixed(2)}</b>` +
        (this.concepto === 'normal' ? `, imputado a ${this.filas.filter(f => f.importe > 0).length} comprobante(s).` : ` (${this.concepto}).`) +
        `</p>${avisoSaldo}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Registrar',
      cancelButtonText: 'Volver',
    });
    if (!r.isConfirmed) return;

    this.guardando = true;
    try {
      const res = await this.movimientos.registrar(this.armarDatos()!);
      if (!res.exito) {
        this.error = res.mensaje;
        return;
      }
      await Swal.fire({ icon: 'success', title: res.objeto?.numero ?? '', text: res.mensaje, timer: 2500 });
      this.activeModal.close(res.objeto);
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void {
    this.activeModal.dismiss();
  }

  // ---------------------------------------------------------------------------
  // Auxiliares
  // ---------------------------------------------------------------------------

  private async elegirEntidad(entidad: EntidadMovimientoFin): Promise<void> {
    this.entidad = entidad;
    this.filas = [];
    this.error = '';
    this.cargando = true;
    try {
      const abiertos = await firstValueFrom(this.consulta.observarInformesAbiertos());
      this.filas = abiertos
        .filter(l => l.estado === 'facturado' && l.tipo === entidad.tipo && l.entidad.id === entidad.id)
        .map(l => this.armarFila(l))
        .filter(f => f.saldo > 0)
        .sort((a, b) => fechaBaseAntiguedad(a.liq).localeCompare(fechaBaseAntiguedad(b.liq)));
    } catch (e: any) {
      this.error = `No se pudieron leer los comprobantes: ${e?.message ?? e}`;
    } finally {
      this.cargando = false;
    }
  }

  private armarFila(liq: ConId<InformeLiqNuevo>): FilaComprobante {
    const vf = normalizarValoresFinancieros(liq.valoresFinancieros, liq.valores.total);
    const base = fechaBaseAntiguedad(liq);
    let dias: number | null = null;
    try { dias = diasEntre(base, this.hoy); } catch { dias = null; }
    return {
      liq,
      periodo: this.factory.textoPeriodo(liq.periodo),
      fechaFactura: fechaComprobanteLegible(base),
      dias,
      total: vf.total,
      saldo: vf.saldo,
      importe: 0,
    };
  }

  private armarDatos(): DatosMovimientoFin | null {
    if (!this.entidad) return null;
    return {
      tipo: tipoMovimientoPara(this.entidad.tipo),
      entidad: this.entidad,
      fecha: this.fecha,
      concepto: this.concepto,
      medios: this.medios.map(m => ({
        tipo: m.tipo,
        importe: Number(m.importe) || 0,
        referencia: m.referencia,
        banco: m.banco || null,
        fechaCobro: m.fechaCobro || null,
        retencion: m.tipo === 'retencion'
          ? { impuesto: m.impuesto, jurisdiccion: m.jurisdiccion || null, certificado: m.certificado }
          : null,
      })),
      imputaciones: this.concepto === 'normal'
        ? this.filas
            .filter(f => (Number(f.importe) || 0) > 0)
            .map(f => ({ idInfLiq: f.liq.idInfLiq, importe: Number(f.importe) }))
        : [],
      observaciones: this.observaciones,
    };
  }

  /** Entidades del lado: clientes activos (cobro) o choferes DIRECTOS y
   *  proveedores activos (pago; el chofer de un proveedor se paga vía el
   *  proveedor). Desde los servicios en memoria. */
  private armarOpciones(): OpcionEntidad[] {
    const opciones: OpcionEntidad[] = [];
    if (this.esCobro) {
      for (const c of this.clienteService.getClientesActuales().filter(x => x.activo)) {
        opciones.push({ clave: `cliente_${c.id}`, entidad: { tipo: 'cliente', id: c.id, razonSocial: c.razonSocial, cuit: c.cuit } });
      }
    } else {
      for (const ch of this.choferService.getChoferesActuales().filter(x => x.activo && x.contratacion?.tipo === 'directo')) {
        opciones.push({
          clave: `chofer_${ch.id}`,
          entidad: {
            tipo: 'chofer', id: ch.id,
            razonSocial: `${ch.datosPersonales.apellido} ${ch.datosPersonales.nombre}`,
            cuit: ch.datosPersonales.cuit,
          },
        });
      }
      for (const p of this.proveedorService.getProveedoresActuales().filter(x => x.activo)) {
        opciones.push({ clave: `proveedor_${p.id}`, entidad: { tipo: 'proveedor', id: p.id, razonSocial: p.razonSocial, cuit: p.cuit } });
      }
    }
    return opciones.sort((a, b) => a.entidad.razonSocial.localeCompare(b.entidad.razonSocial));
  }

  private medioNuevo(): MedioForm {
    return {
      tipo: 'transferencia', importe: null, referencia: '', banco: '', fechaCobro: '',
      impuesto: 'ganancias', jurisdiccion: '', certificado: '',
    };
  }
}
