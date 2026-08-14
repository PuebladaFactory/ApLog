import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import { Vencimiento } from 'src/app/interfaces/legajo';
import { ConIdType } from 'src/app/interfaces/conId';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { LegajoService } from 'src/app/servicios/legajos/legajo.service';
import { ColumnaTablaGenerica, AccionTablaGenerica } from 'src/app/interfaces/tabla-generica';
import { CarruselComponent } from 'src/app/shared/carrusel/carrusel.component';

const ORDEN_ESTADO: Record<string, number> = { vencido: 0, porVencer: 1 };

@Component({
  selector: 'app-vencimientos',
  templateUrl: './vencimientos.component.html',
  styleUrls: ['./vencimientos.component.scss'],
  standalone: false,
})
export class VencimientosComponent implements OnInit, OnDestroy {

  columnas: ColumnaTablaGenerica[] = [
    { field: 'chofer', header: 'Chofer', visible: true, width: 180 },
    { field: 'categoria', header: 'Categoría', visible: true, width: 160 },
    { field: 'fechaVto', header: 'Fecha de Vencimiento', visible: true, width: 140 },
    {
      field: 'estadoLabel', header: 'Estado', visible: true, width: 100,
      claseCelda: (fila) => fila._objeto.estado === 'vencido' ? 'text-bg-danger' : 'text-bg-warning',
    },
  ];
  filas: any[] = [];
  accionesTabla: AccionTablaGenerica[] = [];

  private vencimientos: ConIdType<Vencimiento>[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private db: DbFirestoreService,
    private choferService: ChoferService,
    private legajoService: LegajoService,
    private modalService: NgbModal,
  ) {}

  ngOnInit(): void {
    this.accionesTabla = [
      {
        tipo: 'ver',
        handler: (fila) => this.verDocumento(fila._objeto),
        disabled: (fila) => !this.resolverDocumento(fila._objeto),
      },
    ];

    // Listener LOCAL a esta pantalla — a diferencia de Choferes/Clientes/Legajos
    // (BehaviorSubject + init() desde HomeComponent, calentados en el arranque de
    // toda la app), `vencimientos` no lo consume nadie más que esta pantalla.
    // Abre acá, cierra en ngOnDestroy. Acumula added/modified/removed, mismo
    // criterio que LegajoService.init().
    this.db.getAllStateChanges<Vencimiento>('vencimientos')
      .pipe(takeUntil(this.destroy$))
      .subscribe(changes => {
        let current = this.vencimientos;
        changes.forEach(change => {
          if (change.type === 'added' && !current.some(v => v.id === change.id)) {
            current = [...current, change];
          } else if (change.type === 'modified') {
            current = current.map(v => v.id === change.id ? change : v);
          } else if (change.type === 'removed') {
            current = current.filter(v => v.id !== change.id);
          }
        });
        this.vencimientos = current;
        this.armarFilas();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private armarFilas(): void {
    this.filas = [...this.vencimientos]
      .sort((a, b) => {
        const ordenA = ORDEN_ESTADO[a.estado] ?? 2;
        const ordenB = ORDEN_ESTADO[b.estado] ?? 2;
        if (ordenA !== ordenB) return ordenA - ordenB;
        return (a.fechaVto ?? '').localeCompare(b.fechaVto ?? '');
      })
      .map(v => ({
        chofer: this.getChofer(v.idChofer),
        categoria: v.titulo,
        fechaVto: this.formatearFecha(v.fechaVto),
        estadoLabel: v.estado === 'vencido' ? 'Vencido' : 'Por vencer',
        _objeto: v,
      }));
  }

  private getChofer(idChofer: string): string {
    const chofer = this.choferService.getChoferPorId(idChofer);
    return chofer ? `${chofer.datosPersonales.apellido} ${chofer.datosPersonales.nombre}` : '—';
  }

  private formatearFecha(fechaVto: string | null): string {
    if (!fechaVto) return '—';
    const [anio, mes, dia] = fechaVto.split('-');
    return `${dia}/${mes}/${anio}`;
  }

  /**
   * Resuelve el Documentacion real detrás de una alerta contra LegajoService
   * (ya en memoria desde el arranque de la app — sin query nueva a Firestore).
   * undefined si el legajo o el documento puntual ya no existen (chofer dado de
   * baja, documento reemplazado desde que se generó la alerta) — la acción 'ver'
   * se deshabilita para esa fila, mismo criterio de fallback ya establecido.
   */
  private resolverDocumento(vencimiento: Vencimiento) {
    const legajo = this.legajoService.getLegajoPorChofer(vencimiento.idChofer);
    return legajo?.documentacion.find(d => d.idCategoria === vencimiento.idCategoria);
  }

  private verDocumento(vencimiento: Vencimiento): void {
    const documento = this.resolverDocumento(vencimiento);
    if (!documento) return;
    const modalRef = this.modalService.open(CarruselComponent, {
      windowClass: 'myCustomModalClass',
      centered: true,
      size: 'lg',
    });
    modalRef.componentInstance.fromParent = { item: documento.imagenes };
    modalRef.result.then(() => {}, () => {});
  }
}
