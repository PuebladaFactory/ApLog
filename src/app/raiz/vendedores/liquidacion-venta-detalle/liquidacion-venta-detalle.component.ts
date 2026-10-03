import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { ComisionesExportService } from 'src/app/servicios/vendedores/comisiones-export.service';
import { ConId } from 'src/app/interfaces/conId';
import { EstadoLiquidacionVenta, LineaLiquidacionVenta, LiquidacionVenta } from 'src/app/interfaces/liquidacion-venta';
import { redondear2 } from 'src/app/shared/utils/tablero-comisiones.util';
import {
  claseEstadoLiquidacion,
  etiquetaEstadoLiquidacion,
  fechaDMY,
  formatoCuit,
  mesCorteLiquidacion,
  nombreVendedorLiquidacion,
} from 'src/app/shared/utils/liquidacion-venta-vista.util';

interface GrupoClienteDetalle {
  idCliente: string;
  razonSocial: string;
  lineas: LineaLiquidacionVenta[];
  monto: number;
  importe: number;
}

/** Detalle de una liquidación de comisiones (solo lectura): cabecera con el
 *  snapshot del vendedor, estado, pago/anulación y líneas agrupadas por
 *  cliente con subtotales. Excel/PDF en V7. */
@Component({
  selector: 'app-liquidacion-venta-detalle',
  standalone: false,
  templateUrl: './liquidacion-venta-detalle.component.html',
  styleUrl: './liquidacion-venta-detalle.component.scss',
})
export class LiquidacionVentaDetalleComponent implements OnInit {

  @Input() liquidacion!: ConId<LiquidacionVenta>;

  grupos: GrupoClienteDetalle[] = [];
  cantidadAjustes = 0;

  descargando = false;

  constructor(
    public activeModal: NgbActiveModal,
    private exportServ: ComisionesExportService,
  ) {}

  ngOnInit(): void {
    const lineas = this.liquidacion?.lineas ?? [];
    const porCliente = new Map<string, GrupoClienteDetalle>();
    for (const l of lineas) {
      let g = porCliente.get(l.idCliente);
      if (!g) {
        g = { idCliente: l.idCliente, razonSocial: l.razonSocial, lineas: [], monto: 0, importe: 0 };
        porCliente.set(l.idCliente, g);
      }
      g.lineas.push(l);
      g.monto += l.monto ?? 0;
      g.importe += l.importe ?? 0;
    }
    this.grupos = [...porCliente.values()]
      .map(g => ({
        ...g,
        monto: redondear2(g.monto),
        importe: redondear2(g.importe),
        lineas: [...g.lineas].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.numeroOperacion - b.numeroOperacion),
      }))
      .sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));
    this.cantidadAjustes = lineas.filter(l => l.ajuste).length;
  }

  get nombreVendedor(): string { return nombreVendedorLiquidacion(this.liquidacion); }
  get cuit(): string { return formatoCuit(this.liquidacion.vendedor?.cuit); }
  get mesCorte(): string { return mesCorteLiquidacion(this.liquidacion); }

  async descargar(formato: 'excel' | 'pdf'): Promise<void> {
    this.descargando = true;
    try {
      await this.exportServ.descargarLiquidacion(this.liquidacion, formato);
    } catch (e: any) {
      Swal.fire('No se pudo generar el archivo', e?.message ?? String(e), 'error');
    } finally {
      this.descargando = false;
    }
  }

  fecha(f: string | null | undefined): string { return fechaDMY(f); }
  claseEstado(e: EstadoLiquidacionVenta): string { return claseEstadoLiquidacion(e); }
  etiquetaEstado(e: EstadoLiquidacionVenta): string { return etiquetaEstadoLiquidacion(e); }
}
