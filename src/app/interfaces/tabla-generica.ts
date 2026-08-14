export interface ColumnaTablaGenerica {
  field: string;
  header: string;
  visible: boolean;
  sortable?: boolean;
  width?: number;
  claseCelda?: (fila: any) => string; // clase(s) Bootstrap para un <span class="badge"> dentro de la celda (no pinta el <td>). Primer consumidor: Vencimientos.
}

export interface AccionTablaGenerica {
  tipo: 'ver' | 'editar' | 'eliminar' | 'vehiculos';
  handler: (fila: any) => void;
  disabled?: (fila: any) => boolean;
}
