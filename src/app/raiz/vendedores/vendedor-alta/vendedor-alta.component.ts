import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { DatosPersonalesVendedor, VendedorNuevo } from 'src/app/interfaces/vendedor-nuevo';
import { ValidarService } from 'src/app/servicios/validar/validar.service';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { PermisosService } from 'src/app/servicios/permisos/permisos.service';
import { AsignacionCliente, VendedorService } from 'src/app/servicios/vendedores/vendedor.service';

/** Fila de la tabla de clientes asignados del modal. */
interface FilaAsignacion {
  idCliente: string;
  razonSocial: string;
  porcentaje: number | null;
  otros: number;        // % que tienen en ese cliente los otros vendedores
}

@Component({
  selector: 'app-vendedor-alta',
  standalone: false,
  templateUrl: './vendedor-alta.component.html',
  styleUrl: './vendedor-alta.component.scss'
})
export class VendedorAltaComponent implements OnInit {

  @Input() fromParent!: { modo: 'alta' | 'edicion' | 'vista'; item: ConId<VendedorNuevo> | null };

  modo: 'alta' | 'edicion' | 'vista' = 'alta';
  vendedor: ConId<VendedorNuevo> | null = null;
  soloVista = false;
  guardando = false;

  form: FormGroup;
  asignaciones: FilaAsignacion[] = [];
  clientesDisponibles: ConIdType<Cliente>[] = [];
  clienteNuevo = '';
  porcentajeNuevo: number | null = null;

  constructor(
    private fb: FormBuilder,
    public activeModal: NgbActiveModal,
    private vendedorService: VendedorService,
    private clienteService: ClienteService,
    private permisos: PermisosService,
  ) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(30)]],
      apellido: ['', [Validators.required, Validators.maxLength(30)]],
      cuit: ['', [Validators.required, ValidarService.cuitValido]],
      email: ['', [Validators.required, Validators.email]],
      celular: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10)]],
    });
  }

  ngOnInit(): void {
    this.modo = this.fromParent?.modo ?? 'alta';
    this.vendedor = this.fromParent?.item ?? null;
    this.soloVista = this.modo === 'vista';

    if (this.vendedor) {
      const dp = this.vendedor.datosPersonales;
      this.form.patchValue({
        nombre: dp.nombre,
        apellido: dp.apellido,
        cuit: this.formatCuit(dp.cuit),
        email: dp.email,
        celular: dp.celular,
      });
      this.asignaciones = this.vendedorService.asignacionesDe(this.vendedor.id).map(a => ({
        idCliente: a.idCliente,
        razonSocial: this.clienteService.getClientePorId(a.idCliente)?.razonSocial ?? a.idCliente,
        porcentaje: a.porcentaje,
        otros: this.vendedorService.porcentajeOtros(a.idCliente, this.vendedor!.id),
      })).sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));
    }
    if (this.soloVista) this.form.disable();
    this.actualizarDisponibles();
  }

  get titulo(): string {
    return this.modo === 'alta' ? 'Alta de Vendedor' : this.modo === 'edicion' ? 'Edición de Vendedor' : 'Vendedor';
  }

  get puedeReactivar(): boolean {
    return this.soloVista && !!this.vendedor && !this.vendedor.activo
      && this.permisos.puede('vendedores', 'editar');
  }

  hasError(control: string, error: string): boolean {
    const c = this.form.get(control);
    return !!c && c.hasError(error) && (c.touched || c.dirty);
  }

  // ── Asignaciones ────────────────────────────────────────────────

  disponible(fila: FilaAsignacion): number {
    return Math.max(0, 100 - fila.otros);
  }

  filaInvalida(fila: FilaAsignacion): boolean {
    const p = fila.porcentaje;
    return p === null || !Number.isFinite(p) || p <= 0 || p > this.disponible(fila);
  }

  get disponibleNuevo(): number {
    return this.clienteNuevo ? Math.max(0, 100 - this.vendedorService.porcentajeOtros(this.clienteNuevo, this.vendedor?.id ?? null)) : 100;
  }

  agregarAsignacion(): void {
    const cliente = this.clienteService.getClientePorId(this.clienteNuevo);
    const p = this.porcentajeNuevo;
    if (!cliente) return this.error('Seleccioná un cliente.');
    if (p === null || !Number.isFinite(p) || p <= 0 || p > this.disponibleNuevo) {
      return this.error(`El porcentaje tiene que ser mayor que 0 y hasta ${this.disponibleNuevo}% (lo disponible en ese cliente).`);
    }
    this.asignaciones = [...this.asignaciones, {
      idCliente: cliente.id,
      razonSocial: cliente.razonSocial,
      porcentaje: p,
      otros: this.vendedorService.porcentajeOtros(cliente.id, this.vendedor?.id ?? null),
    }].sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));
    this.clienteNuevo = '';
    this.porcentajeNuevo = null;
    this.actualizarDisponibles();
  }

  quitarAsignacion(idCliente: string): void {
    this.asignaciones = this.asignaciones.filter(a => a.idCliente !== idCliente);
    this.actualizarDisponibles();
  }

  private actualizarDisponibles(): void {
    const asignados = new Set(this.asignaciones.map(a => a.idCliente));
    this.clientesDisponibles = this.clienteService.getClientesActuales()
      .filter(c => c.activo && !asignados.has(c.id))
      .sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));
  }

  // ── Guardar / reactivar ─────────────────────────────────────────

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return this.error('Revisá los datos personales.');
    }
    const invalida = this.asignaciones.find(a => this.filaInvalida(a));
    if (invalida) return this.error(`Revisá el porcentaje de ${invalida.razonSocial}.`);

    const confirmacion = await Swal.fire({
      title: `¿Confirmás ${this.modo === 'alta' ? 'el alta' : 'la edición'} del vendedor?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
    });
    if (!confirmacion.isConfirmed) return;

    const v = this.form.getRawValue();
    const datos: DatosPersonalesVendedor = {
      nombre: String(v.nombre).trim(),
      apellido: String(v.apellido).trim(),
      cuit: Number(String(v.cuit).replace(/\D/g, '')),
      celular: String(v.celular).trim(),
      email: String(v.email).trim(),
    };
    const asignaciones: AsignacionCliente[] = this.asignaciones.map(a => ({
      idCliente: a.idCliente,
      porcentaje: a.porcentaje as number,
    }));

    this.guardando = true;
    try {
      await this.vendedorService.guardarVendedor(
        this.modo === 'alta' ? 'alta' : 'edicion', datos, asignaciones, this.vendedor ?? undefined,
      );
      this.guardando = false;
      await Swal.fire('Confirmado', `${this.modo === 'alta' ? 'Alta' : 'Edición'} del vendedor registrada.`, 'success');
      this.activeModal.close(true);
    } catch (e: any) {
      this.guardando = false;
      this.error(e?.message ?? String(e));
    }
  }

  async reactivar(): Promise<void> {
    if (!this.vendedor) return;
    const res = await Swal.fire({
      title: `¿Reactivar a ${this.vendedorService.nombre(this.vendedor)}?`,
      text: 'Sus clientes no se reasignan: se cargan de nuevo editándolo.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Reactivar',
      cancelButtonText: 'Cancelar',
    });
    if (!res.isConfirmed) return;
    this.guardando = true;
    try {
      await this.vendedorService.reactivar(this.vendedor);
      this.guardando = false;
      await Swal.fire('Confirmado', 'El vendedor fue reactivado.', 'success');
      this.activeModal.close(true);
    } catch (e: any) {
      this.guardando = false;
      this.error(e?.message ?? String(e));
    }
  }

  private error(msj: string): void {
    Swal.fire({ icon: 'error', text: msj });
  }

  private formatCuit(cuit: number): string {
    const s = String(cuit ?? '');
    if (!/^\d{11}$/.test(s)) return s;
    return `${s.slice(0, 2)}-${s.slice(2, 10)}-${s.slice(10)}`;
  }
}
