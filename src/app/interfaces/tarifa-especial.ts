import { TarifaBase, AdicionalKmValores, EntidadTipo, Seccion } from './tarifa';

export interface CategoriaEspecial {
  orden: number;
  nombre: string;   // debe calzar (orden/nombre) con la categoría del general
  valor: number;
  adicionalKm?: AdicionalKmValores;
}

export type AlcanceTarifa =
  | { tipo: 'entidad' }
  | { tipo: 'entidadCliente'; idCliente: string };

export interface TarifaEspecial extends TarifaBase {
  nivel: 'especial';
  entidadTipo: EntidadTipo;      // qué columna del general parcha
  idEntidadDueño: string;        // idCliente/idChofer/idProveedor
  alcance: AlcanceTarifa;        // solo relevante si entidadTipo !== 'cliente'
  secciones: Seccion<CategoriaEspecial>[];
  adicionalAcompaniante: number;
}
