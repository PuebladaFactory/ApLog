import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { ConId } from 'src/app/interfaces/conId';
import { MovimientoFin } from 'src/app/interfaces/movimiento-fin';
import { MovimientoFinService } from 'src/app/servicios/finanzas-nueva/movimiento-fin.service';
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import { ETIQUETA_TIPO_MOVIMIENTO } from 'src/app/shared/utils/movimiento-fin.util';
import { DetalleMovimientoComponent } from './modales/detalle-movimiento/detalle-movimiento.component';
import { ImputarSaldoComponent } from './modales/imputar-saldo/imputar-saldo.component';

/** Gestos de UI sobre un movimiento de Finanzas, compartidos por la pestaña
 *  Movimientos y la Cuenta de la entidad (F5): ver el detalle, imputar el
 *  saldo y anular con motivo. Solo abre modales / confirmaciones y delega en
 *  MovimientoFinService (que revalida todo en su transacción). Sin refresco
 *  manual: las pantallas escuchan en vivo. Vive en el módulo finanzas-nueva
 *  porque abre sus modales. */
@Injectable({ providedIn: 'root' })
export class AccionesMovimientoService {

  constructor(
    private modalService: NgbModal,
    private movimientoServ: MovimientoFinService,
  ) {}

  /** Detalle en modal. Si se cierra con 'anular' o 'imputar', sigue ese
   *  flujo. `alProcesar` avisa mientras corre una anulación. */
  verDetalle(m: ConId<MovimientoFin>, alProcesar?: (procesando: boolean) => void): void {
    const modalRef = this.modalService.open(DetalleMovimientoComponent, {
      size: 'xl', centered: true, scrollable: true,
    });
    modalRef.componentInstance.movimiento = m;
    modalRef.result
      .then(resultado => {
        if (resultado === 'anular') this.anular(m, alProcesar);
        else if (resultado === 'imputar') this.imputar(m);
      })
      .catch(() => {});
  }

  /** Imputar el saldo sin imputar a comprobantes de la entidad. */
  imputar(m: ConId<MovimientoFin>): void {
    const modalRef = this.modalService.open(ImputarSaldoComponent, {
      size: 'xl', centered: true, scrollable: true, backdrop: 'static', keyboard: false,
    });
    modalRef.componentInstance.movimiento = m;
    modalRef.result.catch(() => {});
  }

  /** Pide el motivo (obligatorio) y delega en MovimientoFinService.anular. */
  async anular(m: ConId<MovimientoFin>, alProcesar?: (procesando: boolean) => void): Promise<void> {
    const tipo = ETIQUETA_TIPO_MOVIMIENTO[m.tipo].toLowerCase();
    const comprobantes = new Set(m.imputaciones.map(i => i.documento.id)).size;
    const r = await Swal.fire({
      title: `¿Anular el ${tipo} ${m.numero}?`,
      html:
        `<p><b>${m.entidad.razonSocial}</b> — $ ${this.importe(m.total)} — ${fechaComprobanteLegible(m.fecha)}</p>` +
        (comprobantes > 0
          ? `<p>Los ${comprobantes} comprobante(s) imputados recuperan el saldo que canceló este ${tipo}.</p>`
          : '') +
        (m.sinImputar > 0
          ? `<p>Los $ ${this.importe(m.sinImputar)} sin imputar dejan de estar disponibles.</p>`
          : '') +
        `<p>El movimiento queda <b>anulado</b> con su número. No se puede deshacer.</p>`,
      input: 'textarea',
      inputLabel: 'Motivo de la anulación',
      inputPlaceholder: 'Obligatorio',
      inputValidator: (v: string) => (!v || !v.trim() ? 'El motivo es obligatorio.' : null),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Anular',
      cancelButtonText: 'Cancelar',
    });
    if (!r.isConfirmed) return;

    alProcesar?.(true);
    try {
      const res = await this.movimientoServ.anular(m.idMovimiento, r.value as string);
      Swal.fire({ icon: res.exito ? 'success' : 'error', text: res.mensaje });
    } finally {
      alProcesar?.(false);
    }
  }

  private importe(valor: number): string {
    return valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
