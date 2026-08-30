import { Injectable, inject } from '@angular/core';
import { Tarifa, CategoriaTarifa, Seccion, ModoTarifacion, KmDistancia, MetadataAumento } from 'src/app/interfaces/tarifa';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';

export interface TarifaFormData {
  nivel: 'general' | 'personalizada';
  idEntidadDueño: string | null;   // null en general
  nombre: string;
  modoTarifacion: ModoTarifacion;
  kmDistancia: KmDistancia | null;
  secciones: Seccion<CategoriaTarifa>[];
  acompanianteACobrar: number;
  acompanianteAPagar: number;
  acompanianteAPagarProveedor?: number;
  usaValoresProveedor: boolean;
  metadataAumento?: MetadataAumento;
}

@Injectable({ providedIn: 'root' })
export class TarifaFactoryService {
  private usuarioSesion = inject(UsuarioSesionService);

  /** idTarifa se completa recién al persistir (TarifarioService conoce el id real);
   *  acá va vacío como placeholder, el caller (TarifarioService) lo pisa. */
  crearTarifa(data: TarifaFormData, versionAnteriorId: string | null = null): Omit<Tarifa, 'idTarifa'> {
    const fechaStr = toISODateString(new Date());
    const usuario = this.usuarioSesion.getUsuarioActual();

    const secciones: Seccion<CategoriaTarifa>[] = data.secciones.map(seccion => ({
      ...seccion,
      categorias: seccion.categorias.map(cat => {
        if (data.usaValoresProveedor) return cat;
        const { aPagarProveedor, adicionalKmAPagarProveedor, ...resto } = cat;
        return resto;
      }),
    }));

    return {
      nivel: data.nivel,
      idEntidadDueño: data.idEntidadDueño,
      nombre: data.nombre,
      modoTarifacion: data.modoTarifacion,
      kmDistancia: data.kmDistancia,
      secciones,
      acompanianteACobrar: data.acompanianteACobrar,
      acompanianteAPagar: data.acompanianteAPagar,
      ...(data.usaValoresProveedor && data.acompanianteAPagarProveedor !== undefined
        ? { acompanianteAPagarProveedor: data.acompanianteAPagarProveedor }
        : {}),
      usaValoresProveedor: data.usaValoresProveedor,
      activo: true,
      vigenciaDesde: fechaStr,
      versionAnteriorId,
      fechaActualizacion: fechaStr,
      actualizadoPor: usuario?.email || 'Desconocido',
      ...(data.metadataAumento ? { metadataAumento: data.metadataAumento } : {}),
    };
  }

  /** Nueva versión: mismos datos de identidad (nivel/idEntidadDueño) que la anterior,
   *  valores nuevos del form, fecha de vigencia hoy. versionAnteriorId apunta al id
   *  de la tarifa que reemplaza, para reconstruir el linaje en el historial. */
  nuevaVersion(anterior: Tarifa, data: TarifaFormData): Omit<Tarifa, 'idTarifa'> {
    return this.crearTarifa(
      { ...data, nivel: anterior.nivel, idEntidadDueño: anterior.idEntidadDueño, modoTarifacion: anterior.modoTarifacion },
      anterior.idTarifa,
    );
  }
}
