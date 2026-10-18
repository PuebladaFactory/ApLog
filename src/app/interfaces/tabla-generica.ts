export interface ColumnaTablaGenerica {
  field: string;
  header: string;
  visible: boolean;
  sortable?: boolean;
  width?: number;
  claseCelda?: (fila: any) => string; // clase(s) Bootstrap para un <span class="badge"> dentro de la celda (no pinta el <td>). Primer consumidor: Vencimientos.
  accionCelda?: (fila: any) => void; // el texto de la celda pasa a ser un enlace que ejecuta esto (ej. abrir la ficha). Primer consumidor: Vencimientos (frente Ficha de entidad).
}

export interface AccionTablaGenerica {
  tipo: 'ver' | 'editar' | 'eliminar' | 'vehiculos';
  handler: (fila: any) => void;
  disabled?: (fila: any) => boolean;
}
