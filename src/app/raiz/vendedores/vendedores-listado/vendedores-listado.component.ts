import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { combineLatest, Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { ConId } from 'src/app/interfaces/conId';
import { VendedorNuevo } from 'src/app/interfaces/vendedor-nuevo';
import { AccionTablaGenerica, ColumnaTablaGenerica } from 'src/app/interfaces/tabla-generica';
import { VendedorService } from 'src/app/servicios/vendedores/vendedor.service';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { VendedorAltaComponent } from '../vendedor-alta/vendedor-alta.component';

type FiltroEstado = 'activos' | 'inactivos' | 'todos';

@Component({
  selector: 'app-vendedores-listado',
  standalone: false,
  templateUrl: './vendedores-listado.component.html',
  styleUrl: './vendedores-listado.component.scss'
})
export class VendedoresListadoComponent implements OnInit, OnDestroy {

  columnas: ColumnaTablaGenerica[] = [];
  filas: any[] = [];
  accionesTabla: AccionTablaGenerica[] = [];
  filtroEstado: FiltroEstado = 'activos';
  isLoading = false;

  private vendedores: ConId<VendedorNuevo>[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private vendedorService: VendedorService,
    private clienteService: ClienteService,
    private modalService: NgbModal,
  ) {}

  ngOnInit(): void {
    this.columnas = [
      { field: 'apellidoNombre', header: 'Vendedor', visible: true, width: 220 },
      { field: 'cuit', header: 'CUIT', visible: true, width: 120 },
      { field: 'celular', header: 'Celular', visible: true, width: 120 },
      { field: 'email', header: 'Email', visible: true, width: 220 },
      { field: 'clientes', header: 'Clientes asignados', visible: true, width: 360 },
      {
        field: 'estado', header: 'Estado', visible: true, width: 100,
        claseCelda: (fila) => (fila._objeto.activo ? 'bg-success' : 'bg-secondary'),
      },
    ];

    this.accionesTabla = [
      { tipo: 'ver', handler: (fila) => this.abrirModal('vista', fila._objeto) },
      {
        tipo: 'editar', handler: (fila) => this.abrirModal('edicion', fila._objeto),
        disabled: (fila) => !fila._objeto.activo,
      },
      {
        tipo: 'eliminar', handler: (fila) => this.desactivar(fila._objeto),
        disabled: (fila) => !fila._objeto.activo,
      },
    ];

    // Se rearma también cuando cambian los clientes (asignaciones).
    combineLatest([this.vendedorService.vendedores$, this.clienteService.clientes$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([vendedores]) => {
        this.vendedores = vendedores;
        this.armarTabla();
      });
  }

  cambiarFiltro(valor: FiltroEstado): void {
    this.filtroEstado = valor;
    this.armarTabla();
  }

  private armarTabla(): void {
    const visibles = this.vendedores.filter(v =>
      this.filtroEstado === 'todos' ? true : this.filtroEstado === 'activos' ? v.activo : !v.activo);

    this.filas = visibles.map(v => ({
      apellidoNombre: this.vendedorService.nombre(v),
      cuit: this.formatCuit(v.datosPersonales.cuit),
      celular: v.datosPersonales.celular,
      email: v.datosPersonales.email,
      clientes: this.textoClientes(v.id),
      estado: v.activo ? 'Activo' : 'Inactivo',
      _objeto: v,
    }));
  }

  private textoClientes(idVendedor: string): string {
    const asignaciones = this.vendedorService.asignacionesDe(idVendedor);
    if (asignaciones.length === 0) return 'Sin clientes asignados';
    return asignaciones
      .map(a => `${this.clienteService.getClientePorId(a.idCliente)?.razonSocial ?? a.idCliente} (${a.porcentaje}%)`)
      .sort((a, b) => a.localeCompare(b))
      .join(', ');
  }

  abrirModal(modo: 'alta' | 'edicion' | 'vista', vendedor?: ConId<VendedorNuevo>): void {
    const modalRef = this.modalService.open(VendedorAltaComponent, {
      windowClass: 'myCustomModalClass',
      centered: true,
      size: 'lg',
    });
    modalRef.componentInstance.fromParent = { modo, item: vendedor ?? null };
  }

  async desactivar(vendedor: ConId<VendedorNuevo>): Promise<void> {
    const res = await Swal.fire({
      title: `¿Desactivar a ${this.vendedorService.nombre(vendedor)}?`,
      text: 'Se quitan sus asignaciones de clientes. Las comisiones ya generadas se conservan. Se puede reactivar desde "Ver".',
      icon: 'warning',
      input: 'text',
      inputPlaceholder: 'Motivo',
      inputValidator: (valor) => (!valor?.trim() ? 'Ingresá el motivo' : null),
      showCancelButton: true,
      confirmButtonText: 'Desactivar',
      cancelButtonText: 'Cancelar',
    });
    if (!res.isConfirmed) return;

    this.isLoading = true;
    try {
      await this.vendedorService.desactivar(vendedor, String(res.value).trim());
      this.isLoading = false;
      Swal.fire('Confirmado', 'El vendedor fue desactivado.', 'success');
    } catch (e: any) {
      this.isLoading = false;
      Swal.fire('Error', `No se pudo desactivar el vendedor: ${e?.message ?? e}`, 'error');
    }
  }

  private formatCuit(cuit: number): string {
    const s = String(cuit ?? '');
    if (!/^\d{11}$/.test(s)) return s || '—';
    return `${s.slice(0, 2)}-${s.slice(2, 10)}-${s.slice(10)}`;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
