import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConId } from 'src/app/interfaces/conId';
import { MovimientoFinanciero } from 'src/app/interfaces/movimiento-financiero';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { MovimientoDetalleComponent } from '../movimiento-detalle/movimiento-detalle.component';

@Component({
  selector: 'app-historial-movimientos',
  standalone: false,
  templateUrl: './historial-movimientos.component.html',
  styleUrl: './historial-movimientos.component.scss'
})
export class HistorialMovimientosComponent implements OnInit {
  
  // 🔹 filtros
  tipoEntidad: 'cliente' | 'chofer' | 'proveedor' | '' = '';
  entidadSeleccionada: any = null;
  entidadIdSeleccionada: string | null = null;
  
  // 🔹 datos
  movimientos!: ConId<MovimientoFinanciero>[];
  cargando:boolean = false;
  error: string | null = null;
  clientes: ConId<Cliente>[] = [];
  choferes: ConId<Chofer>[] = [];
  proveedores: ConId<Proveedor>[] = [];
  entidadesFiltradas: any[] = [];
  tipoMovimientoFiltro: 'cobro' | 'pago' | '' = '';
  fechaDesde?: string;
  fechaHasta?: string;
  expandedIds = new Set<string>();

  constructor(
    private dbService: DbFirestoreService,
    private storageService: StorageService,
    private router: Router,
    private modalService: NgbModal
  ){}
  
  ngOnInit(): void {
    this.clientes = this.storageService.loadInfo('clientes');
    this.clientes = this.clientes.sort((a,b)=> a.razonSocial.localeCompare(b.razonSocial));
    this.choferes = this.storageService.loadInfo('choferes');
    this.choferes = this.choferes.sort((a,b)=> a.apellido.localeCompare(b.apellido));
    this.proveedores = this.storageService.loadInfo('proveedores');
    this.proveedores = this.proveedores.sort((a,b)=> a.razonSocial.localeCompare(b.razonSocial));
  }

  onTipoEntidadChange(): void {
    this.entidadSeleccionada = null;
    this.entidadIdSeleccionada = null;


    if (this.tipoEntidad === 'cliente') {
    this.entidadesFiltradas = this.clientes;
    } else if (this.tipoEntidad === 'chofer') {
    this.entidadesFiltradas = this.choferes;
    } else if (this.tipoEntidad === 'proveedor') {
    this.entidadesFiltradas = this.proveedores;
    } else {
    this.entidadesFiltradas = [];
    }
  }


  onEntidadSeleccionada(e: any): void {
    if (!e || !this.tipoEntidad) {
    this.entidadIdSeleccionada = null;
    return;
    }


    // 🔹 resolver id según tipo (tu modelo actual)
    if (this.tipoEntidad === 'cliente') {
    this.entidadIdSeleccionada = String(e.idCliente);
    }


    if (this.tipoEntidad === 'chofer') {
    this.entidadIdSeleccionada = String(e.idChofer);
    }


    if (this.tipoEntidad === 'proveedor') {
    this.entidadIdSeleccionada = String(e.idProveedor);
    }
  }


  getLabelEntidad(e: any): string {
    if (this.tipoEntidad === 'chofer') {
    return `${e.apellido}, ${e.nombre}`;
    }
    return e.razonSocial;
  }

  

  async buscar(): Promise<void> {
    if (!this.tipoEntidad || !this.entidadIdSeleccionada) return;
    this.cargando = true;
    this.movimientos =
      await this.dbService.getMovimientosFiltrados({
        tipoEntidad: this.tipoEntidad,
        entidadId: this.entidadIdSeleccionada,
        tipoMovimiento:
          this.tipoMovimientoFiltro || undefined,
        fechaDesde: this.fechaDesde,
        fechaHasta: this.fechaHasta
      });

    this.expandedIds.clear();
    this.cargando = false;
  }

  get totalMovimientos(): number {
    return this.movimientos.reduce((acc, m) => acc + (m.totalMovimiento || 0), 0);
  }

  toggleDetalle(id: string) {
    if (this.expandedIds.has(id)) {
      this.expandedIds.delete(id);
    } else {
      this.expandedIds.add(id);
    }
  }

  estaExpandido(id: string): boolean {
    return this.expandedIds.has(id);
  }

  imprimirDetalle(mov: ConId<MovimientoFinanciero>) {
    this.router.navigate(['/finanzas/movimiento', mov.id]);
  }
  
  verDetalle(mov: ConId<MovimientoFinanciero>){
    const ref = this.modalService.open(MovimientoDetalleComponent, {
      size: 'lg',
      scrollable: true
    });

    ref.componentInstance.modoModal = true;
    ref.componentInstance.movimientoId = mov.id;
  }


  

}
