import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { filter, merge, Subject, take, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { ConId } from 'src/app/interfaces/conId';
import { InformeOpNuevo } from 'src/app/interfaces/informe-op-nuevo';
import { Operacion, RefCliente, RefChofer, RefProveedor } from 'src/app/interfaces/operacion';
import { DateRange, DateRangeService, toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { InformeOpService } from 'src/app/servicios/informes-op/informe-op.service';
import { OperacionService } from 'src/app/servicios/operaciones/operacion.service';
import { claseBadgeEstadoInforme, nombreEntidadInforme } from 'src/app/shared/utils/entidad-informe.util';
import {
  InformeOpEditorComponent,
  ResultadoEdicionInformeOp,
} from 'src/app/shared/modales/informe-op-editor/informe-op-editor.component';
import { InformeLiqService } from 'src/app/servicios/informes-liq/informe-liq.service';
import {
  LiquidacionNuevaComponent,
  ResultadoLiquidacionNueva,
} from '../modales/liquidacion-nueva/liquidacion-nueva.component';

/** Fila-resumen por entidad — agregados sobre 'activo' + 'proforma' (todo lo
 *  que trae InformeOpService.observarPorPeriodo). */
interface FilaEntidadInformeOp {
  id: string;
  entidad: RefCliente | RefChofer | RefProveedor;
  razonSocial: string;
  opAbiertas: number;
  opSinFacturarCantidad: number;
  opSinFacturarTotal: number;
  opFacturadasCantidad: number;
  opFacturadasTotal: number;
  total: number;
  aPagarOCobrar: number;
  ganancia: number;
}

/** Listado de InformeOpNuevo por período + tipoConsulta, agrupado por
 *  entidad con detalle expandible, edición puntual y creación de
 *  liquidaciones por período vía LiquidacionNuevaComponent (InformeLiqNuevo).
 *
 *  Vive en LiquidacionModule, integrado a LiqGralComponent (tab nuevo) —
 *  mismo lugar que LiquidacionesOpComponent (modelo viejo, sin tocar).
 *  DateRangeService NO se provee acá: ya lo provee LiqGralComponent a
 *  todas sus rutas hijas, se inyecta tal cual. tipoConsulta (cliente/
 *  chofer/proveedor) es estado interno con selector propio — a diferencia
 *  del viejo, no viene de la URL/ruta.
 *
 *  Cero lookups en memoria (StorageService.loadInfo): entidad y
 *  contraParte.monto ya vienen desnormalizados en InformeOpNuevo. */
@Component({
  selector: 'app-informe-op-listado',
  standalone: false,
  templateUrl: './informe-op-listado.component.html',
  styleUrl: './informe-op-listado.component.scss',
})
export class InformeOpListadoComponent implements OnInit, OnDestroy {

  tipoConsulta: 'cliente' | 'chofer' | 'proveedor' = 'cliente';
  fechaDesde!: string;
  fechaHasta!: string;
  cargando = false;
  // Flag propio para la espera de editar() — separado de 'cargando' (que
  // ya gobierna el spinner de la carga inicial del período) para que una
  // emisión del listener de observarPorPeriodo durante el guardado no
  // apague el spinner antes de tiempo.
  guardando = false;

  informesOp: ConId<InformeOpNuevo>[] = [];
  opAbiertas: ConId<Operacion>[] = [];
  datosTabla: FilaEntidadInformeOp[] = [];
  informesDetalladoPorObjeto = new Map<string, ConId<InformeOpNuevo>[]>();
  mostrarTabla: boolean[] = [];

  ordenColumna = '';
  ordenAscendente = true;
  searchText = '';
  searchText2 = '';

  private destroy$ = new Subject<void>();
  private cancelarConsulta$ = new Subject<void>();
  private readonly STORAGE_RANGE_KEY = 'informe_op_listado_range_v1';

  constructor(
    private modalService: NgbModal,
    private informeOpServ: InformeOpService,
    private operacionServ: OperacionService,
    private dateRangeService: DateRangeService,
    private informeLiqServ: InformeLiqService,
  ) {}

  ngOnInit(): void {
    this.restaurarRangoPropio();

    this.dateRangeService.range$
      .pipe(
        filter((r): r is DateRange => r !== null),
        takeUntil(this.destroy$),
      )
      .subscribe(r => {
        localStorage.setItem(
          this.STORAGE_RANGE_KEY,
          JSON.stringify({ desde: r.desde.toISOString(), hasta: r.hasta.toISOString(), tipo: r.tipo }),
        );
        this.fechaDesde = toISODateString(r.desde);
        this.fechaHasta = toISODateString(r.hasta);
        this.consultar();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cancelarConsulta$.next();
    this.cancelarConsulta$.complete();
  }

  onTipoConsultaChange(): void {
    this.consultar();
  }

  /** Dispara la consulta del período/tipoConsulta actuales: primero un
   *  one-shot de operaciones abiertas (para la advertencia por fila),
   *  después se suscribe en vivo a los InformeOp — cancela la suscripción
   *  anterior si había una (cambio de período o tipo sin acumular
   *  streams). */
  private consultar(): void {
    if (!this.fechaDesde || !this.fechaHasta) return;

    this.cancelarConsulta$.next();
    this.cargando = true;
    this.mostrarTabla = [];

    this.operacionServ.observarAbiertasPorPeriodo(this.fechaDesde, this.fechaHasta)
      .pipe(take(1))
      .subscribe(opAbiertas => {
        this.opAbiertas = opAbiertas;

        this.informeOpServ.observarPorPeriodo(this.fechaDesde, this.fechaHasta, this.tipoConsulta)
          .pipe(takeUntil(merge(this.destroy$, this.cancelarConsulta$)))
          .subscribe(data => {
            this.informesOp = data;
            this.procesarTabla();
            this.actualizarDetallePorObjeto();
            this.cargando = false;
          });
      });
  }

  private procesarTabla(): void {
    const map = new Map<string, FilaEntidadInformeOp>();

    for (const inf of this.informesOp) {
      const id = inf.entidad.id;
      if (!map.has(id)) {
        map.set(id, {
          id,
          entidad: inf.entidad,
          razonSocial: nombreEntidadInforme(inf),
          opAbiertas: 0,
          opSinFacturarCantidad: 0,
          opSinFacturarTotal: 0,
          opFacturadasCantidad: 0,
          opFacturadasTotal: 0,
          total: 0,
          aPagarOCobrar: 0,
          ganancia: 0,
        });
      }

      const fila = map.get(id)!;
      if (inf.estado === 'activo') {
        fila.opSinFacturarCantidad++;
        fila.opSinFacturarTotal += inf.valores.total;
      } else {
        fila.opFacturadasCantidad++;
        fila.opFacturadasTotal += inf.valores.total;
      }
      fila.total += inf.valores.total;
      fila.aPagarOCobrar += inf.contraParte.monto;
    }

    for (const fila of map.values()) {
      fila.ganancia = this.tipoConsulta === 'cliente'
        ? 100 - (fila.aPagarOCobrar * 100) / fila.total
        : 100 - (fila.total * 100) / fila.aPagarOCobrar;
      fila.opAbiertas = this.contarOpAbiertas(fila.id);
    }

    this.datosTabla = Array.from(map.values()).sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));
  }

  /** Cuenta directo por op.cliente.id/op.chofer.id/op.proveedor?.id — en el
   *  modelo nuevo Operacion.proveedor ya es un campo propio, no hace falta
   *  resolver la contratación del chofer como en el viejo. */
  private contarOpAbiertas(idEntidad: string): number {
    return this.opAbiertas.filter(op => {
      const id = this.tipoConsulta === 'cliente' ? op.cliente.id
        : this.tipoConsulta === 'chofer' ? op.chofer.id
        : op.proveedor?.id;
      return id === idEntidad;
    }).length;
  }

  mostrarMasDatos(index: number): void {
    this.mostrarTabla[index] = !this.mostrarTabla[index];
    const idEntidad = this.datosTabla[index].id;
    this.informesDetalladoPorObjeto.set(idEntidad, this.informesDeEntidad(idEntidad));
  }

  private informesDeEntidad(idEntidad: string): ConId<InformeOpNuevo>[] {
    return this.informesOp.filter(inf => inf.entidad.id === idEntidad);
  }

  /** Recalcula informesDetalladoPorObjeto para toda entidad que ya se
   *  expandió alguna vez (esté o no colapsada ahora) — barato (informesOp
   *  es chico) y evita llevar un registro aparte de qué filas están
   *  expandidas en este momento. Se llama en cada emisión del listener de
   *  observarPorPeriodo: sin esto, la tabla de detalle quedaba mostrando
   *  los InformeOp de ANTES de editar, aunque la fila resumen sí se
   *  actualizaba sola (procesarTabla() sí usa informesOp fresco —
   *  informesDetalladoPorObjeto era una foto tomada una sola vez al
   *  expandir, y nada la volvía a tocar). */
  private actualizarDetallePorObjeto(): void {
    for (const idEntidad of this.informesDetalladoPorObjeto.keys()) {
      this.informesDetalladoPorObjeto.set(idEntidad, this.informesDeEntidad(idEntidad));
    }
  }

  cerrarTabla(index: number): void {
    this.mostrarTabla[index] = !this.mostrarTabla[index];
  }

  getQuincena(fecha: string): string {
    const dia = Number(fecha.split('-')[2]);
    return dia <= 15 ? '1<sup> ra</sup>' : '2<sup> da</sup>';
  }

  /** Clase de badge por estado — util compartido con InformeOpDetalle /
   *  InformeOpEditor (verde activo, amarillo proforma). */
  claseBadgeEstado(estado: InformeOpNuevo['estado']): string {
    return claseBadgeEstadoInforme(estado);
  }

  /** Nombre de la contraparte de un InformeOp puntual — a diferencia de
   *  nombreEntidadInforme (que resuelve la entidad PROPIA del informe,
   *  donde tipo y entidad siempre son consistentes), acá no conocemos el
   *  tipo del otro lado de forma confiable, así que se distingue por
   *  estructura (RefChofer es el único Ref con apellido/nombre) — mismo
   *  criterio que LiquidacionesOpComponent.nombreEntidad. */
  nombreContraparte(entidad: RefCliente | RefChofer | RefProveedor): string {
    return 'apellido' in entidad ? `${entidad.apellido} ${entidad.nombre}` : entidad.razonSocial;
  }

  ordenar(columna: string): void {
    if (this.ordenColumna === columna) {
      this.ordenAscendente = !this.ordenAscendente;
    } else {
      this.ordenColumna = columna;
      this.ordenAscendente = true;
    }
    this.datosTabla.sort((a: any, b: any) => {
      const valorA = a[columna];
      const valorB = b[columna];
      if (typeof valorA === 'string') {
        return this.ordenAscendente ? valorA.localeCompare(valorB) : valorB.localeCompare(valorA);
      }
      return this.ordenAscendente ? valorA - valorB : valorB - valorA;
    });
  }

  /** Abre InformeOpEditorComponent, que resuelve Operación y contraparte
   *  solo y devuelve el resultado ya recalculado — acá no se recalcula
   *  nada, solo se pasa a InformeOpService.editar() y se verifica el
   *  Resultado. No hace falta refrescar manualmente: observarPorPeriodo
   *  es un listener y trae el cambio solo, para ambos lados del par. */
  async editar(informe: ConId<InformeOpNuevo>): Promise<void> {
    const modalRef = this.modalService.open(InformeOpEditorComponent, { size: 'lg', centered: true });
    modalRef.componentInstance.informeOp = informe;

    let resultado: ResultadoEdicionInformeOp;
    try {
      resultado = await modalRef.result;
    } catch {
      // modal cancelado/dismiss — no-op
      return;
    }

    this.guardando = true;
    try {
      const res = await this.informeOpServ.editar(resultado);
      if (res.exito) {
        Swal.fire({ icon: 'success', text: 'El informe se editó correctamente.' });
      } else {
        Swal.fire({ icon: 'error', text: res.mensaje });
      }
    } finally {
      this.guardando = false;
    }
  }

  /** Abre el armado de una liquidación nueva para la entidad de la fila y,
   *  si el usuario confirma, la crea (borrador o emitida) vía
   *  InformeLiqService. No hace falta refrescar: observarPorPeriodo es un
   *  listener y refleja solo los InformeOp que pasan a proforma/liquidado. */
  async liquidar(fila: FilaEntidadInformeOp): Promise<void> {
    const [anio, mes] = this.fechaDesde.split('-').map(Number);
    const modalRef = this.modalService.open(LiquidacionNuevaComponent, {
      size: 'xl', centered: true, scrollable: true, backdrop: 'static',
    });
    modalRef.componentInstance.tipo = this.tipoConsulta;
    modalRef.componentInstance.entidad = fila.entidad;
    modalRef.componentInstance.periodoInicial = { anio, mes };

    let resultado: ResultadoLiquidacionNueva;
    try {
      resultado = await modalRef.result;
    } catch {
      return; // cancelado
    }

    this.guardando = true;
    try {
      const res = resultado.accion === 'emitir'
        ? await this.informeLiqServ.emitir(resultado.datos)
        : await this.informeLiqServ.crearBorrador(resultado.datos);
      Swal.fire({ icon: res.exito ? 'success' : 'error', text: res.mensaje });
    } finally {
      this.guardando = false;
    }
  }

  private restaurarRangoPropio(): void {
    const s = localStorage.getItem(this.STORAGE_RANGE_KEY);
    if (!s) return;
    const r = JSON.parse(s);
    this.dateRangeService.setRange({
      desde: new Date(r.desde),
      hasta: new Date(r.hasta),
      tipo: r.tipo,
    });
  }
}
