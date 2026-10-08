import { Component, OnInit, inject } from '@angular/core';
import Swal from 'sweetalert2';
import { CondicionIvaEmpresa, DatosEmpresa } from 'src/app/interfaces/configuracion-empresa';
import { ConfiguracionEmpresaService } from 'src/app/servicios/configuracion/configuracion-empresa.service';
import { PermisosService } from 'src/app/servicios/permisos/permisos.service';
import {
  ETIQUETA_CONDICION_IVA, datosEmpresaVacios, lineasEncabezadoEmpresa, normalizarDatosEmpresa, validarDatosEmpresa,
} from 'src/app/shared/utils/datos-empresa.util';

/** Ajustes → Datos de la empresa (F8b): formulario del documento
 *  `configuracion/empresa`. dev / admin editan (permiso
 *  'configuracion.editar'); demo lo ve en solo lectura. Muestra cómo salen
 *  los datos en el encabezado de los comprobantes. */
@Component({
  selector: 'app-datos-empresa',
  standalone: false,
  templateUrl: './datos-empresa.component.html',
  styleUrl: './datos-empresa.component.scss',
})
export class DatosEmpresaComponent implements OnInit {

  private servicio = inject(ConfiguracionEmpresaService);
  private permisos = inject(PermisosService);

  readonly condiciones = Object.entries(ETIQUETA_CONDICION_IVA) as [CondicionIvaEmpresa, string][];

  datos: DatosEmpresa = datosEmpresaVacios();
  /** Texto del input de CUIT (con o sin guiones). */
  cuitTexto = '';
  existe = false;
  cargando = true;
  guardando = false;
  error = '';

  get puedeEditar(): boolean {
    return this.permisos.puede('configuracion', 'editar');
  }

  /** Datos como quedarían al guardar (para validar y previsualizar). */
  private get normalizados(): DatosEmpresa {
    const digitos = this.cuitTexto.replace(/\D/g, '');
    return normalizarDatosEmpresa({ ...this.datos, cuit: digitos ? Number(digitos) : null });
  }

  get errorValidacion(): string | null {
    return validarDatosEmpresa(this.normalizados);
  }

  get vistaPrevia(): string[] {
    return lineasEncabezadoEmpresa(this.normalizados);
  }

  async ngOnInit(): Promise<void> {
    try {
      const d = await this.servicio.obtener(true);
      this.existe = d !== null;
      this.datos = d ? { ...datosEmpresaVacios(), ...d } : datosEmpresaVacios();
      this.cuitTexto = this.datos.cuit !== null ? String(this.datos.cuit) : '';
    } catch (e: any) {
      this.error = `No se pudieron leer los datos: ${e?.message ?? e}`;
    } finally {
      this.cargando = false;
    }
  }

  async guardar(): Promise<void> {
    if (!this.puedeEditar || this.guardando || this.errorValidacion) return;
    this.error = '';
    this.guardando = true;
    try {
      const res = await this.servicio.guardar(this.normalizados);
      if (!res.exito) {
        this.error = res.mensaje;
        return;
      }
      const d = await this.servicio.obtener();
      if (d) this.datos = { ...d };
      this.existe = true;
      Swal.fire({ icon: 'success', text: res.mensaje, timer: 2000 });
    } finally {
      this.guardando = false;
    }
  }

  fechaHora(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString('es-AR');
  }
}
