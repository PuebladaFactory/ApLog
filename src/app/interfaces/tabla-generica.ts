export interface ColumnaTablaGenerica {
  field: string;
  header: string;
  visible: boolean;
  sortable?: boolean;
  width?: number;
}

export interface AccionTablaGenerica {
  tipo: 'ver' | 'editar' | 'eliminar' | 'vehiculos';
  handler: (fila: any) => void;
  disabled?: (fila: any) => boolean;
}
