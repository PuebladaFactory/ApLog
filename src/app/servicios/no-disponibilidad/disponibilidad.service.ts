import { Injectable } from '@angular/core';
import { Vehiculo } from 'src/app/interfaces/chofer';
import { ConIdType } from 'src/app/interfaces/conId';
import {
  ConsultaSujeto, EntidadConVehiculos, ResultadoDisponibilidad, VehiculosDisponibles,
} from 'src/app/interfaces/no-disponibilidad';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { NoDisponibilidadService } from './no-disponibilidad.service';
import {
  DatosDisponibilidad, disponibilidadDe, vehiculosDisponiblesDe,
} from 'src/app/shared/utils/vigencia-no-disponibilidad.util';

/** Punto único de la pregunta "¿está disponible X en la fecha F?" (diseño:
 *  docs/disenos/no-disponibilidad.md, "Servicio de resolución").
 *
 *  Capa fina: arma `DatosDisponibilidad` con el estado vivo y delega en las
 *  funciones puras de vigencia-no-disponibilidad.util.ts, que tienen toda la
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

  private datos(): DatosDisponibilidad & { vehiculos: ConIdType<Vehiculo>[] } {
    return {
      noDisponibilidades: this.noDisponibilidadService.getNoDisponibilidadesActuales(),
      choferes: this.choferService.getChoferesActuales(),
      vehiculos: this.choferService.getVehiculosActuales(),
    };
  }
}
