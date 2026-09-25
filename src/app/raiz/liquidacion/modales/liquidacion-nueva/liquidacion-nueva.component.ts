import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { ConId } from 'src/app/interfaces/conId';
import { InformeOpNuevo } from 'src/app/interfaces/informe-op-nuevo';
import { Operacion, RefCliente, RefChofer, RefProveedor } from 'src/app/interfaces/operacion';
import { DescuentoLiq, PeriodoLiq } from 'src/app/interfaces/informe-liq-nuevo';
import { InformeOpService } from 'src/app/servicios/informes-op/informe-op.service';
import { OperacionService } from 'src/app/servicios/operaciones/operacion.service';
import { InformeLiqFactoryService } from 'src/app/servicios/informes-liq/informe-liq-factory.service';
import { DatosLiquidacion, InformeLiqService } from 'src/app/servicios/informes-liq/informe-liq.service';
import { nombreEntidadRef } from 'src/app/shared/utils/entidad-informe.util';
import { DescuentosComponent } from '../descuentos/descuentos.component';

/** Lo que devuelve el modal al cerrarse con una confirmación. El caller
 *  (InformeOpListadoComponent) llama a InformeLiqService según `accion`. */
export interface ResultadoLiquidacionNueva {
  accion: 'emitir' | 'borrador';
  datos: DatosLiquidacion;
}

interface ColumnaLiq {
  nombre: string;
  seleccionada: boolean;
}

/** Armado de una liquidación nueva (InformeLiqNuevo) para UNA entidad:
 *  el usuario elige el período (mes/año + tramo), la app preselecciona los
 *  InformeOp de la ventana (activo, sin bloqueo) y el usuario solo puede
 *  desmarcar. Alertas al inicio (y repetidas en la confirmación).
 *  No persiste: devuelve ResultadoLiquidacionNueva. Camino paralelo a
 *  ResumenOpLiquidadasComponent (modelo viejo, sin tocar). */
@Component({
  selector: 'app-liquidacion-nueva',
  standalone: false,
  templateUrl: './liquidacion-nueva.component.html',
  styleUrl: './liquidacion-nueva.component.scss',
})
export class LiquidacionNuevaComponent implements OnInit {

  @Input() tipo!: 'cliente' | 'chofer' | 'proveedor';
  @Input() entidad!: RefCliente | RefChofer | RefProveedor;
  /** Mes/año por defecto — el del rango del listado. */
  @Input() periodoInicial!: { anio: number; mes: number };

  readonly MAX = InformeLiqService.MAX_INFORMES_OP;
  readonly meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
    'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  anio!: number;
  mes!: number;
  tramo: PeriodoLiq['tramo'] = 'mes';

  cargando = false;
  nombreEntidad = '';

  /** Preseleccionables: activo y sin bloqueo, dentro de la ventana. */
  informes: ConId<InformeOpNuevo>[] = [];
  seleccion = new Set<string>();

  // Alertas (dentro de la ventana, para esta entidad)
  opAbiertas: ConId<Operacion>[] = [];
  bloqueados: ConId<InformeOpNuevo>[] = [];
  enBorrador: ConId<InformeOpNuevo>[] = [];

  descuentos: DescuentoLiq[] = [];
  observaciones = '';

  // Mismos nombres de columna que el camino viejo (se persisten como string[]
  // para la exportación futura).
  columnas: ColumnaLiq[] = [];
  private readonly COLUMNAS_BASE: ColumnaLiq[] = [
    { nombre: 'Fecha', seleccionada: true },
    { nombre: 'Quincena', seleccionada: true },
    { nombre: 'Chofer', seleccionada: true },
    { nombre: 'Cliente', seleccionada: true },
    { nombre: 'Patente', seleccionada: false },
    { nombre: 'Concepto', seleccionada: true },
    { nombre: 'Observaciones', seleccionada: false },
    { nombre: 'Hoja de Ruta', seleccionada: false },
    { nombre: 'Km', seleccionada: true },
    { nombre: 'Jornada', seleccionada: true },
    { nombre: 'Ad Km', seleccionada: true },
    { nombre: 'Ad Acomp', seleccionada: true },
    { nombre: 'Extra', seleccionada: true },
    { nombre: 'A Cobrar', seleccionada: true },
  ];

  constructor(
    public activeModal: NgbActiveModal,
    private modalService: NgbModal,
    private informeOpServ: InformeOpService,
    private operacionServ: OperacionService,
    private factory: InformeLiqFactoryService,
  ) {}

  ngOnInit(): void {
    this.anio = this.periodoInicial.anio;
    this.mes = this.periodoInicial.mes;
    this.nombreEntidad = nombreEntidadRef(this.entidad);
    // Mismo criterio que ResumenOpLiquidadasComponent: sin la columna de la
    // propia entidad.
    this.columnas = this.COLUMNAS_BASE
      .filter(c => !(this.tipo === 'cliente' && c.nombre === 'Cliente'))
      .filter(c => !(this.tipo === 'chofer' && c.nombre === 'Chofer'))
      .map(c => ({ ...c }));
    this.cargar();
  }

  get periodo(): PeriodoLiq {
    return { anio: Number(this.anio), mes: Number(this.mes), tramo: this.tramo };
  }

  get textoPeriodo(): string {
    return this.factory.textoPeriodo(this.periodo);
  }

  /** Columnas tildadas — definen tanto lo que se persiste en el InformeLiq
   *  como las columnas de la tabla de preselección. */
  get columnasVisibles(): ColumnaLiq[] {
    return this.columnas.filter(c => c.seleccionada);
  }

  /** Relee la ventana del período y rearma preselección + alertas. Se llama
   *  al abrir y cada vez que cambia mes/año/tramo (resetea la selección). */
  async cargar(): Promise<void> {
    this.cargando = true;
    try {
      const { desde, hasta } = this.factory.ventanaPeriodo(this.periodo);
      const idEntidad = this.entidad.id;

      // observarPorPeriodo trae 'activo' + 'proforma' (índice existente
      // tipo+estado+fecha); se toma una sola emisión y se filtra la entidad
      // en memoria.
      const todos = (await firstValueFrom(
        this.informeOpServ.observarPorPeriodo(desde, hasta, this.tipo),
      )).filter(inf => inf.entidad.id === idEntidad);

      this.informes = todos
        .filter(inf => inf.estado === 'activo' && !inf.bloqueadoPorContraparte)
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
      this.bloqueados = todos.filter(inf => inf.estado === 'activo' && inf.bloqueadoPorContraparte);
      this.enBorrador = todos.filter(inf => inf.estado === 'proforma');
      this.seleccion = new Set(this.informes.map(inf => inf.idInfOp));

      const abiertas = await firstValueFrom(this.operacionServ.observarAbiertasPorPeriodo(desde, hasta));
      this.opAbiertas = abiertas.filter(op => this.idEntidadDeOperacion(op) === idEntidad);
    } catch (e: any) {
      Swal.fire({ icon: 'error', text: `No se pudieron cargar los informes: ${e?.message ?? e}` });
    } finally {
      this.cargando = false;
    }
  }

  private idEntidadDeOperacion(op: Operacion): string | undefined {
    if (this.tipo === 'cliente') return op.cliente?.id;
    if (this.tipo === 'chofer') return op.chofer?.id;
    return op.proveedor?.id;
  }

  toggle(inf: ConId<InformeOpNuevo>): void {
    if (this.seleccion.has(inf.idInfOp)) this.seleccion.delete(inf.idInfOp);
    else this.seleccion.add(inf.idInfOp);
  }

  get seleccionados(): ConId<InformeOpNuevo>[] {
    return this.informes.filter(inf => this.seleccion.has(inf.idInfOp));
  }

  get subtotal(): number {
    return this.factory.calcularValores(this.seleccionados, []).total;
  }

  get descuentoTotal(): number {
    return this.descuentos.reduce((acc, d) => acc + (d.valor ?? 0), 0);
  }

  get total(): number {
    return this.factory.calcularValores(this.seleccionados, this.descuentos).total;
  }

  get hayAlertas(): boolean {
    return this.opAbiertas.length > 0 || this.bloqueados.length > 0 || this.enBorrador.length > 0;
  }

  get puedeConfirmar(): boolean {
    return !this.cargando && this.seleccion.size > 0 && this.seleccion.size <= this.MAX;
  }

  nombreContraparte(inf: ConId<InformeOpNuevo>): string {
    return nombreEntidadRef(inf.contraParte.entidad);
  }

  nombreChofer(inf: ConId<InformeOpNuevo>): string {
    return `${inf.datosOperacion.chofer.apellido} ${inf.datosOperacion.chofer.nombre}`;
  }

  quincena(fecha: string): string {
    return Number(fecha.split('-')[2]) <= 15 ? '1°' : '2°';
  }

  /** Valor de una celda según la columna — mismos criterios que
   *  ResumenOpLiquidadasComponent.obtenerDatoColumna (camino viejo), sobre
   *  InformeOpNuevo. */
  valorColumna(inf: ConId<InformeOpNuevo>, columna: string): string {
    switch (columna) {
      case 'Fecha': return inf.fecha;
      case 'Quincena': return this.quincena(inf.fecha);
      case 'Chofer': return this.nombreChofer(inf);
      case 'Cliente': return this.nombreContraparte(inf);
      case 'Patente': return inf.datosOperacion.vehiculo.dominio;
      case 'Concepto': return inf.datosOperacion.vehiculo.categoria.nombre;
      case 'Observaciones': return inf.datosOperacion.observaciones ?? '';
      case 'Hoja de Ruta': return inf.datosOperacion.hojaRuta ?? '';
      case 'Km': return String(inf.datosOperacion.km ?? 0);
      case 'Jornada': return this.moneda(inf.valores.tarifaBase);
      case 'Ad Km': return this.moneda(inf.valores.kmMonto);
      case 'Ad Acomp': return this.moneda(inf.valores.acompaniante);
      case 'Extra': return this.moneda(inf.valores.adExtra ?? 0);
      case 'A Cobrar': return this.moneda(inf.valores.total);
      default: return '';
    }
  }

  /** Columnas de importe — se alinean a la derecha. */
  esColumnaMonto(columna: string): boolean {
    return ['Jornada', 'Ad Km', 'Ad Acomp', 'Extra', 'A Cobrar'].includes(columna);
  }

  private moneda(valor: number): string {
    return `$ ${(valor ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  async abrirDescuentos(): Promise<void> {
    const modalRef = this.modalService.open(DescuentosComponent, {
      windowClass: 'myCustomModalClass', centered: true, size: 'md',
    });
    // Copia: DescuentosComponent muta el array que recibe.
    modalRef.componentInstance.fromParent = { descuentos: this.descuentos.map(d => ({ ...d })) };
    try {
      const r = await modalRef.result;
      if (r?.descuentos) this.descuentos = r.descuentos.map((d: DescuentoLiq) => ({ concepto: d.concepto, valor: d.valor }));
    } catch {
      // dismiss — sin cambios
    }
  }

  quitarDescuento(i: number): void {
    this.descuentos = this.descuentos.filter((_, idx) => idx !== i);
  }

  /** Confirmación con resumen + alertas repetidas; si confirma, cierra el
   *  modal devolviendo los datos (no persiste). */
  async confirmar(accion: 'emitir' | 'borrador'): Promise<void> {
    if (!this.puedeConfirmar) return;

    const alertas: string[] = [];
    if (this.opAbiertas.length) alertas.push(`${this.opAbiertas.length} operación(es) abierta(s) en el período.`);
    if (this.bloqueados.length) alertas.push(`${this.bloqueados.length} informe(s) bloqueado(s) por proforma de la contraparte (no incluidos).`);
    if (this.enBorrador.length) alertas.push(`${this.enBorrador.length} informe(s) del período ya están en un borrador (no incluidos).`);
    const excluidos = this.informes.length - this.seleccion.size;
    if (excluidos > 0) alertas.push(`${excluidos} informe(s) desmarcado(s) quedan fuera de esta liquidación.`);

    const titulo = accion === 'emitir' ? '¿Emitir la liquidación?' : '¿Guardar como borrador?';
    const html =
      `<p><b>${this.nombreEntidad}</b> — ${this.textoPeriodo}</p>` +
      `<p>${this.seleccion.size} informe(s) — Total: $ ${this.total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>` +
      (alertas.length ? `<div class="alert alert-warning text-start mb-0"><ul class="mb-0">${alertas.map(a => `<li>${a}</li>`).join('')}</ul></div>` : '') +
      (accion === 'emitir' ? '<p class="mt-2 mb-0"><small>Se asigna número interno. Esta acción no se puede deshacer desde Liquidación.</small></p>' : '');

    const r = await Swal.fire({
      title: titulo,
      html,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: accion === 'emitir' ? 'Emitir' : 'Guardar borrador',
      cancelButtonText: 'Volver',
    });
    if (!r.isConfirmed) return;

    const resultado: ResultadoLiquidacionNueva = {
      accion,
      datos: {
        tipo: this.tipo,
        idsInformesOp: this.seleccionados.map(inf => inf.idInfOp),
        periodo: this.periodo,
        descuentos: this.descuentos,
        columnas: this.columnas.filter(c => c.seleccionada).map(c => c.nombre),
        observaciones: this.observaciones.trim(),
      },
    };
    this.activeModal.close(resultado);
  }
}
