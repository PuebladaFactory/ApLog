import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, filter, takeUntil } from 'rxjs';
import { ConId } from 'src/app/interfaces/conId';
import { InformeOpNuevo } from 'src/app/interfaces/informe-op-nuevo';
import { DateRange, DateRangeService, toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { InformeOpService } from 'src/app/servicios/informes-op/informe-op.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import { nombreEntidadInforme, nombreEntidadRef } from 'src/app/shared/utils/entidad-informe.util';
import { InformeOpDetalleComponent } from 'src/app/shared/modales/informe-op-detalle/informe-op-detalle.component';

type ColumnaOrdenAnulado = 'fecha' | 'entidad' | 'contraparte' | 'total' | 'anulado';

/** InformeOp ANULADOS (baja de su operación cerrada) — solo lectura. Período
 *  del calendario de LiqGral (DateRangeService, provisto por LiqGral a sus
 *  rutas hijas), selector de tipo propio. Acciones: ver el informe
 *  (InformeOpDetalleComponent, muestra la anulación) e ir al evento de
 *  papelera de la operación (deep link ?evento=). */
@Component({
  selector: 'app-informe-op-anulados',
  standalone: false,
  templateUrl: './informe-op-anulados.component.html',
  styleUrl: './informe-op-anulados.component.scss',
})
export class InformeOpAnuladosComponent implements OnInit, OnDestroy {

  tipoConsulta: 'cliente' | 'chofer' | 'proveedor' = 'cliente';
  informes: ConId<InformeOpNuevo>[] = [];
  searchText = '';
  cargando = false;

  // Por defecto: anulados más recientes primero.
  ordenColumna: ColumnaOrdenAnulado = 'anulado';
  ordenAscendente = false;

  private fechaDesde = '';
  private fechaHasta = '';
  private destroy$ = new Subject<void>();
  private cancelarConsulta$ = new Subject<void>();

  constructor(
    private informeOpServ: InformeOpService,
    private dateRangeService: DateRangeService,
    private modalService: NgbModal,
    private router: Router,
    private usuarioSesion: UsuarioSesionService,
  ) {}

  ngOnInit(): void {
    this.dateRangeService.range$
      .pipe(filter((r): r is DateRange => r !== null), takeUntil(this.destroy$))
      .subscribe(r => {
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

  private consultar(): void {
    if (!this.fechaDesde || !this.fechaHasta) return;
    this.cancelarConsulta$.next();
    this.cargando = true;
    this.informeOpServ.observarAnuladosPorPeriodo(this.fechaDesde, this.fechaHasta, this.tipoConsulta)
      .pipe(takeUntil(this.cancelarConsulta$), takeUntil(this.destroy$))
      .subscribe({
        next: data => { this.informes = data; this.cargando = false; },
        error: () => { this.cargando = false; },
      });
  }

  get filtrados(): ConId<InformeOpNuevo>[] {
    const texto = this.searchText.trim().toLowerCase();
    const dir = this.ordenAscendente ? 1 : -1;
    return this.informes
      .filter(inf => !texto
        || this.nombre(inf).toLowerCase().includes(texto)
        || this.contraparte(inf).toLowerCase().includes(texto))
      .sort((a, b) => {
        const va = this.valorOrden(a);
        const vb = this.valorOrden(b);
        const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number);
        return cmp * dir;
      });
  }

  ordenar(columna: ColumnaOrdenAnulado): void {
    if (this.ordenColumna === columna) {
      this.ordenAscendente = !this.ordenAscendente;
    } else {
      this.ordenColumna = columna;
      this.ordenAscendente = true;
    }
  }

  iconoOrden(columna: ColumnaOrdenAnulado): string {
    if (this.ordenColumna !== columna) return '⇅';
    return this.ordenAscendente ? '▲' : '▼';
  }

  private valorOrden(inf: InformeOpNuevo): string | number {
    switch (this.ordenColumna) {
      case 'fecha': return inf.fecha;
      case 'entidad': return this.nombre(inf);
      case 'contraparte': return this.contraparte(inf);
      case 'total': return inf.valores.total;
      case 'anulado': return inf.anulacion?.fecha ?? '';
    }
  }

  nombre(inf: InformeOpNuevo): string {
    return nombreEntidadInforme(inf);
  }

  contraparte(inf: InformeOpNuevo): string {
    return nombreEntidadRef(inf.contraParte.entidad);
  }

  chofer(inf: InformeOpNuevo): string {
    return `${inf.datosOperacion.chofer.apellido} ${inf.datosOperacion.chofer.nombre}`;
  }

  /** La ruta de papelera admite dev/admin/demo (RoleGuard en ajustes-routing). */
  get puedeVerPapelera(): boolean {
    return this.usuarioSesion.esRol('dev', 'admin', 'demo');
  }

  verInforme(inf: ConId<InformeOpNuevo>): void {
    const modalRef = this.modalService.open(InformeOpDetalleComponent, { centered: true, size: 'lg', scrollable: true });
    modalRef.componentInstance.informeOp = inf;
    modalRef.result.catch(() => {});
  }

  verEnPapelera(inf: InformeOpNuevo): void {
    const idEvento = inf.anulacion?.idEventoPapelera;
    if (!idEvento) return;
    this.router.navigate(['ajustes/papelera'], { queryParams: { evento: idEvento } });
  }
}
