import { Injectable } from '@angular/core';
import { AsignacionItem } from 'src/app/interfaces/asignacion';
import { Vehiculo } from 'src/app/interfaces/chofer';
import { ConIdType } from 'src/app/interfaces/conId';
import {
  ConsultaSujeto, EntidadConVehiculos, MotivoNoDisponible, ResultadoDisponibilidad, VehiculosDisponibles,
} from 'src/app/interfaces/no-disponibilidad';
import { Operacion } from 'src/app/interfaces/operacion';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { NoDisponibilidadService } from './no-disponibilidad.service';
import {
  consultasDeAsignacion, consultasDeOperacion, DatosDisponibilidad, disponibilidadDe,
  unirMotivos, vehiculosDisponiblesDe,
} from 'src/app/shared/utils/no-disponibilidad.util';

/** Un ítem del tablero que no se puede usar en la fecha, con los registros que
 *  lo impiden. */
export interface ItemNoDisponible {
  item: AsignacionItem;
  motivos: MotivoNoDisponible[];
}

/** Punto único de la pregunta "¿está disponible X en la fecha F?" (diseño:
 *  docs/disenos/no-disponibilidad.md, "Servicio de resolución").
 *
 *  Capa fina: arma `DatosDisponibilidad` con el estado vivo y delega en las
 *  funciones puras de no-disponibilidad.util.ts, que tienen toda la
 *  lógica (y los tests). Es la costura: mañana puede sumar documentación
 *  vencida o el flag `activo` sin que los consumidores se enteren.
 *
 *  No abre listeners: quien lo use se asegura de que NoDisponibilidadService
 *  y ChoferService estén iniciados, y consulta `datosCargados()` para
 *  distinguir "no se pudo verificar" de "está disponible". */
@Injectable({ providedIn: 'root' })
export class DisponibilidadService {

  constructor(
    private noDisponibilidadService: NoDisponibilidadService,
    private choferService: ChoferService,
  ) {}

  /** ¿Hay con qué responder? Sin esto, un resultado "disponible" puede ser
   *  sólo falta de datos.
   *  - No disponibilidades: flag real del listener (la colección puede estar
   *    vacía de verdad).
   *  - Choferes y vehículos: ChoferService no expone si ya cargó; se toma
   *    "lista no vacía" como señal (una empresa sin choferes ni vehículos no
   *    asigna nada). */
  datosCargados(): boolean {
    return this.noDisponibilidadService.estaCargado()
      && this.choferService.getChoferesActuales().length > 0
      && this.choferService.getVehiculosActuales().length > 0;
  }

  disponibilidadDe(sujeto: ConsultaSujeto, fecha: string): ResultadoDisponibilidad {
    return disponibilidadDe(this.datos(), sujeto, fecha);
  }

  /** Para carga-asignacion: qué vehículos de una entidad están disponibles en la fecha. */
  vehiculosDisponiblesDe(entidad: EntidadConVehiculos, fecha: string): VehiculosDisponibles<ConIdType<Vehiculo>> {
    return vehiculosDisponiblesDe(this.datos(), entidad, fecha);
  }

  /** Para las guardas sobre el tablero: los ítems ACTIVOS (los anulados no
   *  cuentan) que no están disponibles en la fecha. `null` = no se pudo
   *  verificar (datos sin cargar): el que llama RECHAZA, nunca lo toma como
   *  "todo disponible". Lista vacía = todos disponibles. */
  itemsNoDisponibles(items: AsignacionItem[], fecha: string): ItemNoDisponible[] | null {
    if (!this.datosCargados()) return null;
    const datos = this.datos();
    const resultado: ItemNoDisponible[] = [];
    for (const item of items) {
      if (item.estado.estado === 'anulada') continue;
      const motivos = this.motivosDeConsultas(datos, consultasDeAsignacion(item.sujeto), fecha);
      if (motivos.length > 0) resultado.push({ item, motivos });
    }
    return resultado;
  }

  /** Para las guardas sobre operaciones: motivos de su chofer, vehículo y
   *  proveedor en la fecha de la op. `null` = no se pudo verificar. Vacío =
   *  disponible. `soloConsultas` acota a qué sujetos preguntar (editar sólo
   *  verifica lo que cambia). */
  motivosDeOperacion(
    op: Pick<Operacion, 'chofer' | 'vehiculo' | 'proveedor' | 'fecha'>,
    soloConsultas?: (c: ConsultaSujeto) => boolean,
  ): MotivoNoDisponible[] | null {
    if (!this.datosCargados()) return null;
    const consultas = consultasDeOperacion(op).filter(c => !soloConsultas || soloConsultas(c));
    return this.motivosDeConsultas(this.datos(), consultas, op.fecha);
  }

  /** Motivos de una lista de sujetos en la fecha, sin repetir registros (ej.
   *  `consultasDeAsignacion` de un vehículo de la flota, para el informe).
   *  `null` = no se pudo verificar. */
  motivosDe(consultas: ConsultaSujeto[], fecha: string): MotivoNoDisponible[] | null {
    if (!this.datosCargados()) return null;
    return this.motivosDeConsultas(this.datos(), consultas, fecha);
  }

  private motivosDeConsultas(datos: DatosDisponibilidad, consultas: ConsultaSujeto[], fecha: string): MotivoNoDisponible[] {
    return unirMotivos(...consultas.map(c => {
      const r = disponibilidadDe(datos, c, fecha);
      return r.disponible ? [] : r.motivos;
    }));
  }

  private datos(): DatosDisponibilidad & { vehiculos: ConIdType<Vehiculo>[] } {
    return {
      noDisponibilidades: this.noDisponibilidadService.getNoDisponibilidadesActuales(),
      choferes: this.choferService.getChoferesActuales(),
      vehiculos: this.choferService.getVehiculosActuales(),
    };
  }
}
