import { Injectable, inject } from '@angular/core';
import { TarifaEspecial, CategoriaEspecial, AlcanceTarifa } from 'src/app/interfaces/tarifa-especial';
import { EntidadTipo, ModoTarifacion, KmDistancia, Seccion, MetadataAumento } from 'src/app/interfaces/tarifa';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';

export interface TarifaEspecialFormData {
  entidadTipo: EntidadTipo;
  idEntidadDueño: string;
  alcance: AlcanceTarifa;
  nombre: string;
  modoTarifacion: ModoTarifacion;
  kmDistancia: KmDistancia | null;
  secciones: Seccion<CategoriaEspecial>[];
  adicionalAcompaniante: number;
  metadataAumento?: MetadataAumento;
}

@Injectable({ providedIn: 'root' })
export class TarifaEspecialFactoryService {
  private usuarioSesion = inject(UsuarioSesionService);

  crearTarifaEspecial(data: TarifaEspecialFormData, versionAnteriorId: string | null = null): Omit<TarifaEspecial, 'idTarifa'> {
    const fechaStr = toISODateString(new Date());
    const usuario = this.usuarioSesion.getUsuarioActual();
    return {
      nivel: 'especial',
      entidadTipo: data.entidadTipo,
      idEntidadDueño: data.idEntidadDueño,
      alcance: data.alcance,
      nombre: data.nombre,
      modoTarifacion: data.modoTarifacion,
      kmDistancia: data.kmDistancia,
      secciones: data.secciones,
      adicionalAcompaniante: data.adicionalAcompaniante,
      activo: true,
      vigenciaDesde: fechaStr,
      versionAnteriorId,
      fechaActualizacion: fechaStr,
      actualizadoPor: usuario?.email || 'Desconocido',
      ...(data.metadataAumento ? { metadataAumento: data.metadataAumento } : {}),
    };
  }

  nuevaVersion(anterior: TarifaEspecial, data: TarifaEspecialFormData): Omit<TarifaEspecial, 'idTarifa'> {
    return this.crearTarifaEspecial({
      ...data,
      entidadTipo: anterior.entidadTipo,
      idEntidadDueño: anterior.idEntidadDueño,
      alcance: anterior.alcance,
    }, anterior.idTarifa);
  }
}
