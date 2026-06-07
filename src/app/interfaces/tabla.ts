export interface ColumnaTabla {
  field: string;
  header: string;
  visible: boolean;
  sortable?: boolean;
  width?: number;
}

export interface AccionTabla {
  tipo: 'ver' | 'editar' | 'eliminar' | 'vehiculos';
  handler: (fila: any) => void;
}
