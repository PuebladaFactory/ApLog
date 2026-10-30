import { Injectable } from '@angular/core';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { NoDisponibilidad, SujetoNoDisponibilidad } from 'src/app/interfaces/no-disponibilidad';
import { esFechaNegocio } from 'src/app/shared/utils/fecha.util';

/** Datos del período que carga el usuario (alta y edición). */
export interface PeriodoNoDisponibilidad {
  desde: string;
  hasta: string | null;   // null = sin fecha de fin prevista. Nunca obligatorio.
  motivo: string;
}

/** Construcción pura de `NoDisponibilidad` y del snapshot del sujeto. No toca
 *  la base ni inyecta otros services: recibe las entidades ya resueltas. */
@Injectable({ providedIn: 'root' })
export class NoDisponibilidadFactoryService {

  // ── Snapshot del sujeto (congelado al crear) ────────────────────

  sujetoChofer(chofer: Chofer): SujetoNoDisponibilidad {
    return {
      tipo: 'chofer',
      idChofer: chofer.idChofer,
      nombre: chofer.datosPersonales.nombre,
      apellido: chofer.datosPersonales.apellido,
    };
  }

  sujetoVehiculo(vehiculo: Vehiculo): SujetoNoDisponibilidad {
    return { tipo: 'vehiculo', idVehiculo: vehiculo.idVehiculo, dominio: vehiculo.dominio };
  }

  sujetoProveedor(proveedor: Proveedor): SujetoNoDisponibilidad {
    return { tipo: 'proveedor', idProveedor: proveedor.idProveedor, razonSocial: proveedor.razonSocial };
  }

  // ── Validación y construcción ───────────────────────────────────

  /** Reglas del período. Devuelve el mensaje de error o null.
   *  El solapamiento con otra no disponibilidad NO es un error (avisa, no
   *  rechaza): lo resuelve el service, que conoce el resto de los registros. */
  validar(periodo: PeriodoNoDisponibilidad): string | null {
    if (!periodo.desde) return 'La fecha desde es obligatoria.';
    if (!esFechaNegocio(periodo.desde)) return `La fecha desde no es válida (${periodo.desde}).`;
    // '' (input de fecha vacío) cuenta como null: sin fecha de fin prevista.
    if (periodo.hasta) {
      if (!esFechaNegocio(periodo.hasta)) return `La fecha hasta no es válida (${periodo.hasta}).`;
      if (periodo.hasta < periodo.desde) return 'La fecha hasta no puede ser anterior a la fecha desde.';
    }
    if (!periodo.motivo?.trim()) return 'El motivo es obligatorio.';
    return null;
  }

  /** Registro nuevo, activo. No valida: el caller llama a `validar` antes. */
  crearNoDisponibilidad(
    sujeto: SujetoNoDisponibilidad,
    periodo: PeriodoNoDisponibilidad,
  ): Omit<NoDisponibilidad, 'idNoDisponibilidad'> {
    return {
      sujeto,
      ...this.normalizarPeriodo(periodo),
      activa: true,
      timestamp: Date.now(),
    };
  }

  /** Campos que cambia una edición (escritura parcial). El sujeto no se edita. */
  edicionPeriodo(periodo: PeriodoNoDisponibilidad): Pick<NoDisponibilidad, 'desde' | 'hasta' | 'motivo' | 'timestamp'> {
    return { ...this.normalizarPeriodo(periodo), timestamp: Date.now() };
  }

  private normalizarPeriodo(periodo: PeriodoNoDisponibilidad): Pick<NoDisponibilidad, 'desde' | 'hasta' | 'motivo'> {
    return {
      desde: periodo.desde,
      hasta: periodo.hasta || null,
      motivo: periodo.motivo.trim(),
    };
  }
}
