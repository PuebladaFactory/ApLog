import { TemplateRef } from "@angular/core";

export interface ColumnaTabla<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'start' | 'center' | 'end';
  /** Para columnas normales */
  value?: (item: T) => string | number | null;
  // 👉 para columnas de acción o custom
  acciones?: string[]; // 🔥 NUEVO
  // 🔥 NUEVO
  cellClass?: string | ((item: T) => string);
}


export interface AccionTabla<T> {
  id: string;
  label: string;
  icon?: string;
  class?: string;
  visible?: (item: T) => boolean;
  disabled?: (item: T) => boolean;
}

export interface EventoAccionTabla<T> {
  accion: string;
  item: T;
}

export interface OrdenTabla {
  key: string;
  asc: boolean;
}


