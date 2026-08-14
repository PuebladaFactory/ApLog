import { Injectable } from '@angular/core';
import { calcularEstadoDocumentacion, Documentacion, Legajo } from 'src/app/interfaces/legajo';

@Injectable({ providedIn: 'root' })
export class LegajoFactoryService {

  crearLegajoVacio(idChofer: string): Legajo {
    return {
      idLegajo: '', // placeholder — el caller lo completa con el id real generado por Firestore, mismo patrón que idChofer/idProveedor en ChoferFactoryService/ProveedorFactoryService
      idChofer,
      documentacion: [],
      visible: true,
    };
  }

  crearDocumentacion(
    idCategoria: string,
    titulo: string,
    fechaVto: string | null,
    sinVto: boolean,
    imagenes: { nombre: string; url: string }[],
  ): Documentacion {
    // Si sinVto === true, forzar fechaVto: null (invariante, sin excepciones)
    const fechaVtoFinal = sinVto ? null : fechaVto;
    return {
      idCategoria,
      titulo,
      fechaVto: fechaVtoFinal,
      estado: calcularEstadoDocumentacion(fechaVtoFinal),
      imagenes,
    };
  }
}
