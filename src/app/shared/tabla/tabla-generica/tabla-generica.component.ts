import { Component, Input, OnChanges } from '@angular/core';
import { AccionTabla, ColumnaTabla } from 'src/app/interfaces/tabla';

interface FilaFiltrada {
  [key: string]: any;
}

@Component({
  selector: 'app-tabla-generica',
  templateUrl: './tabla-generica.component.html',
  styleUrls: ['./tabla-generica.component.scss'],
  standalone: false,
})
export class TablaGenericaComponent implements OnChanges {

  @Input() columnas: ColumnaTabla[] = [];
  @Input() filas: any[] = [];
  @Input() acciones: AccionTabla[] = [];

  columnasVisibles: ColumnaTabla[] = [];
  filasFiltradas: FilaFiltrada[] = [];
  filtros: { [field: string]: string } = {};
  ordenField: string | null = null;
  ordenDir: 'asc' | 'desc' | null = null;
  mostrarPanelColumnas: boolean = false;
  filtroKey: number = 0;

  // Drag & drop
  dragIndex: number | null = null;

  // Resize
  resizingCol: number | null = null;
  resizeStartX: number = 0;
  resizeStartWidth: number = 0;

  ngOnChanges(): void {
    this.columnasVisibles = this.columnas
      .filter(c => c.visible)
      .map(c => ({ ...c, width: c.width ?? 150 }));
    this.filtros = {};
    this.aplicarFiltrosYOrden();
  }

  // --- Filtros ---

  onFiltroChange(field: string, valor: string): void {
    this.filtros[field] = valor.toLowerCase();
    this.aplicarFiltrosYOrden();
  }

  aplicarFiltrosYOrden(): void {
    let resultado = [...this.filas];

    // Aplicar filtros por columna
    for (const field of Object.keys(this.filtros)) {
      const valor = this.filtros[field];
      if (valor) {
        resultado = resultado.filter(fila =>
          String(fila[field] ?? '').toLowerCase().includes(valor)
        );
      }
    }

    // Aplicar orden
    if (this.ordenField && this.ordenDir) {
      const dir = this.ordenDir === 'asc' ? 1 : -1;
      resultado.sort((a, b) => {
        const va = String(a[this.ordenField!] ?? '').toLowerCase();
        const vb = String(b[this.ordenField!] ?? '').toLowerCase();
        return va < vb ? -dir : va > vb ? dir : 0;
      });
    }

    this.filasFiltradas = resultado;
  }

  limpiarFiltros(): void {
    this.filtros = {};
    this.ordenField = null;
    this.ordenDir = null;
    this.filtroKey++;
    this.aplicarFiltrosYOrden();
  }

  // --- Ordenamiento ---

  ordenarPor(field: string): void {
    if (this.ordenField !== field) {
      this.ordenField = field;
      this.ordenDir = 'asc';
    } else if (this.ordenDir === 'asc') {
      this.ordenDir = 'desc';
    } else if (this.ordenDir === 'desc') {
      this.ordenField = null;
      this.ordenDir = null;
    }
    this.aplicarFiltrosYOrden();
  }

  iconoOrden(field: string): string {
    if (this.ordenField !== field) return '↕';
    return this.ordenDir === 'asc' ? '↑' : '↓';
  }

  // --- Columnas visibles ---

  toggleColumna(col: ColumnaTabla): void {
    col.visible = !col.visible;
    this.columnasVisibles = this.columnas
      .filter(c => c.visible)
      .map(c => ({ ...c, width: c.width ?? 150 }));
    this.aplicarFiltrosYOrden();
  }

  // --- Drag & drop de columnas ---

  onDragStart(index: number): void {
    this.dragIndex = index;
  }

  onDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
  }

  onDrop(index: number): void {
    if (this.dragIndex === null || this.dragIndex === index) return;
    const cols = [...this.columnasVisibles];
    const [moved] = cols.splice(this.dragIndex, 1);
    cols.splice(index, 0, moved);
    this.columnasVisibles = cols;
    this.dragIndex = null;
  }

  onDragEnd(): void {
    this.dragIndex = null;
  }

  // --- Resize de columnas ---

  onResizeStart(event: MouseEvent, index: number): void {
    event.preventDefault();
    event.stopPropagation();
    this.resizingCol = index;
    this.resizeStartX = event.clientX;
    this.resizeStartWidth = this.columnasVisibles[index].width ?? 150;

    const onMove = (e: MouseEvent) => {
      if (this.resizingCol === null) return;
      const delta = e.clientX - this.resizeStartX;
      const newWidth = Math.max(60, this.resizeStartWidth + delta);
      this.columnasVisibles[this.resizingCol] = {
        ...this.columnasVisibles[this.resizingCol],
        width: newWidth,
      };
    };

    const onUp = () => {
      this.resizingCol = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }
}
