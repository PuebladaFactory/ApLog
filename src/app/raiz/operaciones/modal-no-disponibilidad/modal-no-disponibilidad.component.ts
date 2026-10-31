import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { combineLatest, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { ConId } from 'src/app/interfaces/conId';
import {
  ConsultaSujeto, NoDisponibilidad, SujetoNoDisponibilidad,
} from 'src/app/interfaces/no-disponibilidad';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { Resultado } from 'src/app/interfaces/resultado';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { NoDisponibilidadService } from 'src/app/servicios/no-disponibilidad/no-disponibilidad.service';
import {
  NoDisponibilidadFactoryService, PeriodoNoDisponibilidad,
} from 'src/app/servicios/no-disponibilidad/no-disponibilidad-factory.service';
import { esFechaNegocio, fechaLegible, hoyNegocio, instanteLegible, sumarDias } from 'src/app/shared/utils/fecha.util';
import { cubreFecha, idDeSujeto, nombreSujeto } from 'src/app/shared/utils/vigencia-no-disponibilidad.util';

type TipoSujeto = SujetoNoDisponibilidad['tipo'];

interface OpcionSujeto {
  id: string;
  etiqueta: string;
}

type EstadoNoDisponibilidad = 'Vigente' | 'Programada' | 'Terminada' | 'Anulada';

const ORDEN_TIPO: Record<TipoSujeto, number> = { chofer: 0, vehiculo: 1, proveedor: 2 };

/** Alta, edición, cierre y anulación de no disponibilidades de choferes,
 *  vehículos y proveedores (diseño: docs/disenos/no-disponibilidad.md).
 *
 *  No escribe: todo pasa por NoDisponibilidadService, que devuelve
 *  Resultado. Los avisos de éxito se muestran recién cuando el Resultado
 *  vuelve con éxito. Las dos listas (vigentes e historial) salen del mismo
 *  stream del listener. */
@Component({
  selector: 'app-modal-no-disponibilidad',
  standalone: false,
  templateUrl: './modal-no-disponibilidad.component.html',
  styleUrl: './modal-no-disponibilidad.component.scss',
})
export class ModalNoDisponibilidadComponent implements OnInit, OnDestroy {

  readonly hoy = hoyNegocio();
  readonly tipos: TipoSujeto[] = ['chofer', 'vehiculo', 'proveedor'];
  readonly etiquetaTipo: Record<TipoSujeto, string> = {
    chofer: 'Chofer', vehiculo: 'Vehículo', proveedor: 'Proveedor',
  };
  readonly fechaLegible = fechaLegible;
  readonly nombreSujeto = nombreSujeto;

  form = this.fb.group({
    tipo: this.fb.nonNullable.control<TipoSujeto>('chofer'),
    idSujeto: this.fb.nonNullable.control('', Validators.required),
    desde: this.fb.nonNullable.control(this.hoy, Validators.required),
    hasta: this.fb.control<string | null>(null),
    motivo: this.fb.nonNullable.control('', Validators.required),
  });

  /** La que se está editando; null = alta. */
  enEdicion: ConId<NoDisponibilidad> | null = null;

  vista: 'vigentes' | 'historial' = 'vigentes';
  vigentes: ConId<NoDisponibilidad>[] = [];
  historial: ConId<NoDisponibilidad>[] = [];

  opciones: Record<TipoSujeto, OpcionSujeto[]> = { chofer: [], vehiculo: [], proveedor: [] };

  guardando = false;

  private destroy$ = new Subject<void>();

  constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder,
    private noDisponibilidadService: NoDisponibilidadService,
    private factory: NoDisponibilidadFactoryService,
    private choferService: ChoferService,
    private proveedorService: ProveedorService,
  ) {}

  ngOnInit(): void {
    // Idempotente: normalmente ya lo arrancó HomeComponent.
    this.noDisponibilidadService.init();

    this.noDisponibilidadService.noDisponibilidades$
      .pipe(takeUntil(this.destroy$))
      .subscribe(todas => {
        // El service ya las entrega de la más nueva a la más vieja por `desde`.
        this.historial = todas;
        this.vigentes = todas
          .filter(nd => cubreFecha(nd, this.hoy))
          .sort((a, b) =>
            ORDEN_TIPO[a.sujeto.tipo] - ORDEN_TIPO[b.sujeto.tipo]
            || nombreSujeto(a.sujeto).localeCompare(nombreSujeto(b.sujeto)));
      });

    combineLatest([
      this.choferService.choferes$,
      this.choferService.vehiculos$,
      this.proveedorService.proveedores$,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([choferes, vehiculos, proveedores]) => {
        this.opciones = this.armarOpciones(choferes, vehiculos, proveedores);
      });

    this.form.controls.tipo.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.enEdicion) this.form.controls.idSujeto.setValue('');
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get tipoActual(): TipoSujeto {
    return this.form.controls.tipo.value;
  }

  // ── Estado de un registro (sólo exhibición) ─────────────────────

  estado(nd: NoDisponibilidad): EstadoNoDisponibilidad {
    if (!nd.activa) return 'Anulada';
    if (cubreFecha(nd, this.hoy)) return 'Vigente';
    return nd.desde > this.hoy ? 'Programada' : 'Terminada';
  }

  claseEstado(nd: NoDisponibilidad): string {
    switch (this.estado(nd)) {
      case 'Vigente':    return 'bg-danger';
      case 'Programada': return 'bg-warning text-dark';
      case 'Terminada':  return 'bg-secondary';
      case 'Anulada':    return 'bg-light text-dark border';
    }
  }

  /** Se puede cerrar lo que todavía no terminó: vigente o programada. */
  puedeCerrar(nd: NoDisponibilidad): boolean {
    return nd.activa && (nd.hasta === null || nd.hasta >= this.hoy);
  }

  detalleAnulacion(nd: NoDisponibilidad): string {
    if (!nd.anulacion) return '';
    return `Anulada por ${nd.anulacion.usuario} el ${instanteLegible(nd.anulacion.fecha)}: ${nd.anulacion.motivo}`;
  }

  // ── Formulario: alta y edición ──────────────────────────────────

  nueva(): void {
    this.enEdicion = null;
    this.form.reset({ tipo: this.tipoActual, idSujeto: '', desde: this.hoy, hasta: null, motivo: '' });
    this.form.controls.tipo.enable();
    this.form.controls.idSujeto.enable();
  }

  /** Carga el registro en el formulario. El sujeto queda fijo: si está mal,
   *  se anula y se carga otra. */
  editar(nd: ConId<NoDisponibilidad>): void {
    this.enEdicion = nd;
    this.form.reset({
      tipo: nd.sujeto.tipo,
      idSujeto: idDeSujeto(nd.sujeto),
      desde: nd.desde,
      hasta: nd.hasta,
      motivo: nd.motivo,
    });
    this.form.controls.tipo.disable();
    this.form.controls.idSujeto.disable();
  }

  async guardar(): Promise<void> {
    if (this.guardando) return;
    const v = this.form.getRawValue();
    const periodo: PeriodoNoDisponibilidad = { desde: v.desde, hasta: v.hasta || null, motivo: v.motivo };

    if (!this.enEdicion && !v.idSujeto) {
      await Swal.fire({ icon: 'warning', title: 'Falta el sujeto', text: `Elegí el ${this.etiquetaTipo[v.tipo].toLowerCase()}.` });
      return;
    }
    const error = this.factory.validar(periodo);
    if (error) {
      await Swal.fire({ icon: 'warning', title: 'Revisá los datos', text: error });
      return;
    }

    const consulta: ConsultaSujeto = this.enEdicion
      ? consultaDe(this.enEdicion.sujeto)
      : consultaPorTipo(v.tipo, v.idSujeto);

    const solapadas = this.noDisponibilidadService.solapadasCon(consulta, periodo, this.enEdicion?.id);
    if (solapadas.length > 0) {
      const decision = await this.avisarSolapamiento(solapadas);
      if (decision === 'editarExistente') { this.editar(solapadas[0]); return; }
      if (decision === 'cancelar') return;
    }

    const r = this.enEdicion
      ? await this.ejecutar(() => this.noDisponibilidadService.editar(this.enEdicion!.id, periodo))
      : await this.ejecutar(() => this.noDisponibilidadService.alta(consulta, periodo));
    if (r?.exito) this.nueva();
  }

  // ── Cerrar: escribe `hasta` desde la fecha de regreso ───────────

  /** Pide la fecha de REGRESO (primer día disponible, hoy por defecto) y
   *  guarda `hasta` = el día anterior, que es el último día no disponible.
   *  Por debajo es una edición. */
  async cerrar(nd: ConId<NoDisponibilidad>): Promise<void> {
    if (this.guardando) return;
    const { value: regreso } = await Swal.fire<string>({
      title: 'Cerrar no disponibilidad',
      html: `${escapar(nombreSujeto(nd.sujeto))}<br><small>Desde ${fechaLegible(nd.desde)}`
        + `${nd.hasta ? ` · prevista hasta ${fechaLegible(nd.hasta)}` : ' · sin fecha de fin prevista'}</small>`,
      input: 'date',
      inputLabel: 'Fecha de regreso (primer día disponible)',
      inputValue: this.hoy,
      showCancelButton: true,
      confirmButtonText: 'Cerrar',
      cancelButtonText: 'Volver',
      inputValidator: (valor: string) => {
        if (!esFechaNegocio(valor)) return 'Elegí una fecha válida.';
        if (sumarDias(valor, -1) < nd.desde) {
          return `El regreso tiene que ser posterior al inicio (${fechaLegible(nd.desde)}). `
            + 'Si en realidad nunca estuvo fuera, anulala.';
        }
        return null;
      },
    });
    if (!regreso) return;

    const periodo: PeriodoNoDisponibilidad = { desde: nd.desde, hasta: sumarDias(regreso, -1), motivo: nd.motivo };
    const r = await this.ejecutar(() => this.noDisponibilidadService.editar(nd.id, periodo), 'No disponibilidad cerrada.');
    if (r?.exito && this.enEdicion?.id === nd.id) this.nueva();
  }

  // ── Anular ──────────────────────────────────────────────────────

  async anular(nd: ConId<NoDisponibilidad>): Promise<void> {
    if (this.guardando) return;
    const { value: motivo } = await Swal.fire<string>({
      icon: 'warning',
      title: 'Anular no disponibilidad',
      html: `${escapar(nombreSujeto(nd.sujeto))} · ${this.periodoTexto(nd)}<br>`
        + '<small>Anular es para lo que se cargó por error: queda en el historial como anulada. '
        + 'Si la no disponibilidad terminó, usá <b>Cerrar</b>.</small>',
      input: 'textarea',
      inputLabel: 'Motivo de la anulación',
      showCancelButton: true,
      confirmButtonText: 'Anular',
      cancelButtonText: 'Volver',
      inputValidator: (valor: string) => (valor?.trim() ? null : 'El motivo es obligatorio.'),
    });
    if (!motivo) return;

    const r = await this.ejecutar(() => this.noDisponibilidadService.anular(nd.id, motivo));
    if (r?.exito && this.enEdicion?.id === nd.id) this.nueva();
  }

  periodoTexto(nd: NoDisponibilidad): string {
    return `${fechaLegible(nd.desde)} → ${nd.hasta ? fechaLegible(nd.hasta) : 'sin fecha de fin'}`;
  }

  // ── Privados ────────────────────────────────────────────────────

  /** Corre una escritura del service y avisa DESPUÉS de que vuelve el
   *  Resultado: éxito sólo si de verdad se escribió. */
  private async ejecutar<T>(escritura: () => Promise<Resultado<T>>, textoExito?: string): Promise<Resultado<T> | null> {
    this.guardando = true;
    let r: Resultado<T>;
    try {
      r = await escritura();
    } catch (e: any) {
      r = { exito: false, mensaje: e?.message ?? String(e) };
    } finally {
      this.guardando = false;
    }
    if (r.exito) {
      await Swal.fire({ icon: 'success', title: textoExito ?? r.mensaje, timer: 1500, showConfirmButton: false });
    } else {
      await Swal.fire({ icon: 'error', title: 'No se pudo guardar', text: r.mensaje });
    }
    return r;
  }

  /** Aviso, no rechazo: muestra las existentes y deja elegir. */
  private async avisarSolapamiento(
    solapadas: ConId<NoDisponibilidad>[],
  ): Promise<'guardar' | 'editarExistente' | 'cancelar'> {
    const lista = solapadas
      .map(nd => `<li>${this.periodoTexto(nd)} — ${escapar(nd.motivo)}</li>`)
      .join('');
    const unaSola = solapadas.length === 1;
    const r = await Swal.fire({
      icon: 'info',
      title: 'Ya hay una no disponibilidad en ese período',
      html: `${escapar(nombreSujeto(solapadas[0].sujeto))} ya tiene `
        + `${unaSola ? 'una no disponibilidad' : `${solapadas.length} no disponibilidades`} que se superpone${unaSola ? '' : 'n'}:`
        + `<ul class="text-start mt-2">${lista}</ul>`
        + '<small>Si es la misma, conviene editarla. Si es otra causa (por ejemplo, vacaciones y '
        + 'después enfermedad), se puede guardar igual.</small>',
      showConfirmButton: true,
      confirmButtonText: 'Guardar igual',
      showDenyButton: unaSola,
      denyButtonText: 'Editar la existente',
      showCancelButton: true,
      cancelButtonText: 'Volver',
    });
    if (r.isConfirmed) return 'guardar';
    if (r.isDenied) return 'editarExistente';
    return 'cancelar';
  }

  private armarOpciones(
    choferes: Chofer[],
    vehiculos: Vehiculo[],
    proveedores: Proveedor[],
  ): Record<TipoSujeto, OpcionSujeto[]> {
    const razonSocial = (id: string) => proveedores.find(p => p.idProveedor === id)?.razonSocial ?? '(proveedor no encontrado)';
    const nombreChofer = (c: Chofer) => `${c.datosPersonales.apellido}, ${c.datosPersonales.nombre}`;
    const inactivo = (activo: boolean | undefined) => (activo === false ? ' (inactivo)' : '');
    const porEtiqueta = (a: OpcionSujeto, b: OpcionSujeto) => a.etiqueta.localeCompare(b.etiqueta);

    const chofer: OpcionSujeto[] = choferes.map(c => ({
      id: c.idChofer,
      etiqueta: `${nombreChofer(c)} — ${c.contratacion.tipo === 'directo'
        ? 'Directo'
        : `de ${razonSocial(c.contratacion.idProveedor)}`}${inactivo(c.activo)}`,
    })).sort(porEtiqueta);

    const vehiculo: OpcionSujeto[] = vehiculos.map(v => {
      const a = v.asignadoA;
      const duenio = a.tipo === 'chofer'
        ? (() => { const c = choferes.find(x => x.idChofer === a.idChofer); return c ? nombreChofer(c) : '(chofer no encontrado)'; })()
        : razonSocial(a.idProveedor);
      return { id: v.idVehiculo, etiqueta: `${v.dominio} — ${v.categoria?.nombre ?? 'sin categoría'} — de ${duenio}` };
    }).sort(porEtiqueta);

    const proveedor: OpcionSujeto[] = proveedores
      .map(p => ({ id: p.idProveedor, etiqueta: `${p.razonSocial}${inactivo(p.activo)}` }))
      .sort(porEtiqueta);

    return { chofer, vehiculo, proveedor };
  }
}

function consultaDe(s: SujetoNoDisponibilidad): ConsultaSujeto {
  return consultaPorTipo(s.tipo, idDeSujeto(s));
}

function consultaPorTipo(tipo: TipoSujeto, id: string): ConsultaSujeto {
  switch (tipo) {
    case 'chofer':    return { tipo, idChofer: id };
    case 'vehiculo':  return { tipo, idVehiculo: id };
    case 'proveedor': return { tipo, idProveedor: id };
  }
}

/** El motivo y los nombres los escribe el usuario: van al html del Swal. */
function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!
  ));
}
