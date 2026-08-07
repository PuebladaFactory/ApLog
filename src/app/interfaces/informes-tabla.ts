import { TemplateRef } from "@angular/core";
import { AccionPermiso } from "./permiso";

export interface ColumnaInformesTabla<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'start' | 'center' | 'end';
  /** Para columnas normales */
  value?: (item: T) => string | number | null;
  // 👉 para columnas de acción o custom
  acciones?: AccionInformesTabla<T>[];
  // 🔥 NUEVO
  cellClass?: string | ((item: T) => string);
}


export interface AccionInformesTabla<T> {
  id: string;
  label: string;
  icon?: string;
  class?: string;
  visible?: (item: T) => boolean;
  disabled?: (item: T) => boolean;
  // `id` es la identidad de negocio (lo que emite el click, lo que lee el
  // switch de onAccion() del caller) y normalmente coincide con el
  // AccionPermiso real para el chequeo de PermisosService. Cuando no
  // coinciden (ej. 'excel'/'pdf' son dos ids de negocio distintos que
  // comparten una sola AccionPermiso 'reimprimir'), este campo lo
  // desambigua. Fallback: si no se setea, se usa `id` tal cual.
  accionPermiso?: AccionPermiso;
}

export interface EventoInformesTabla<T> {
  accion: string;
  item: T;
}

export interface OrdenInformesTabla {
  key: string;
  asc: boolean;
}

