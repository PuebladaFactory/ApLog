import { Component, OnDestroy, OnInit } from '@angular/core';
import { merge, Subject, takeUntil } from 'rxjs';
import { ConIdType } from 'src/app/interfaces/conId';
import { Cliente } from 'src/app/interfaces/cliente';
import { Chofer } from 'src/app/interfaces/chofer';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { EntidadTipo } from 'src/app/interfaces/tarifa';
import { RegistroOpEventual } from 'src/app/interfaces/registro-op-eventual';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
import { VisualizadorObjetoService } from 'src/app/servicios/visualizador-objeto/visualizador-objeto.service';

interface EntidadOpcion {
  id: string;
  nombre: string;
}

@Component({
  selector: 'app-tarifas-eventual',
  templateUrl: './tarifas-eventual.component.html',
  styleUrls: ['./tarifas-eventual.component.scss'],
  standalone: false,
})
export class TarifasEventualComponent implements OnInit, OnDestroy {

  entidadTipo: EntidadTipo = 'cliente';
  clientes: ConIdType<Cliente>[] = [];
  choferes: ConIdType<Chofer>[] = [];
  proveedores: ConIdType<Proveedor>[] = [];

  entidadSeleccionada: EntidadOpcion | null = null;
  registros: ConIdType<RegistroOpEventual>[] = [];

  private destroy$ = new Subject<void>();
  private cambioEntidad$ = new Subject<void>();

  constructor(
    private clienteService: ClienteService,
    private choferService: ChoferService,
    private proveedorService: ProveedorService,
    private tarifarioService: TarifarioService,
    private visualizadorObjeto: VisualizadorObjetoService,
  ) {}

  ngOnInit(): void {
    this.clienteService.getActivos()
      .pipe(takeUntil(this.destroy$))
      .subscribe(clientes => { this.clientes = clientes; });

    this.choferService.getActivos()
      .pipe(takeUntil(this.destroy$))
      .subscribe(choferes => { this.choferes = choferes; });

    this.proveedorService.getActivos()
      .pipe(takeUntil(this.destroy$))
      .subscribe(proveedores => { this.proveedores = proveedores; });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cambioEntidad$.complete();
  }

  /** Sin filtrar por tarifasHabilitadas — cualquier entidad puede tener
   *  operaciones eventuales en su historial, sin importar su configuración
   *  de tarifa vigente actual. */
  get opcionesEntidad(): EntidadOpcion[] {
    if (this.entidadTipo === 'cliente') {
      return [...this.clientes]
        .sort((a, b) => a.razonSocial.localeCompare(b.razonSocial, 'es', { sensitivity: 'base' }))
        .map(c => ({ id: c.idCliente, nombre: c.razonSocial }));
    }
    if (this.entidadTipo === 'chofer') {
      return [...this.choferes]
        .sort((a, b) => {
          const porApellido = a.datosPersonales.apellido.localeCompare(b.datosPersonales.apellido, 'es', { sensitivity: 'base' });
          if (porApellido !== 0) return porApellido;
          return a.datosPersonales.nombre.localeCompare(b.datosPersonales.nombre, 'es', { sensitivity: 'base' });
        })
        .map(c => ({ id: c.idChofer, nombre: `${c.datosPersonales.apellido}, ${c.datosPersonales.nombre}` }));
    }
    return [...this.proveedores]
      .sort((a, b) => a.razonSocial.localeCompare(b.razonSocial, 'es', { sensitivity: 'base' }))
      .map(p => ({ id: p.idProveedor, nombre: p.razonSocial }));
  }

  onCambioEntidadTipo(e: any): void {
    this.entidadTipo = e.target.value as EntidadTipo;
    this.entidadSeleccionada = null;
    this.cambioEntidad$.next();
    this.registros = [];
  }

  seleccionarEntidad(e: any): void {
    const id: string = e.target.value;
    const entidad = this.opcionesEntidad.find(o => o.id === id) ?? null;
    this.entidadSeleccionada = entidad;
    this.cambioEntidad$.next();

    if (!entidad) {
      this.registros = [];
      return;
    }

    this.tarifarioService.registrosEventuales$
      .pipe(takeUntil(merge(this.destroy$, this.cambioEntidad$)))
      .subscribe(() => {
        this.registros = this.tarifarioService.getRegistrosEventualesDe(this.entidadTipo, entidad.id);
      });
  }

  verDetalle(registro: ConIdType<RegistroOpEventual>): void {
    this.visualizadorObjeto.verObjeto('operaciones', registro.idOperacion);
  }
}
