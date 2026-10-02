import { Injectable, inject } from '@angular/core';
import { combineLatest, firstValueFrom, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConId } from 'src/app/interfaces/conId';
import { ComisionVenta } from 'src/app/interfaces/comision-venta';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { ComisionVentaFactoryService } from 'src/app/servicios/vendedores/comision-venta-factory.service';
import {
  armarTableroComisiones,
  esCero,
  redondear2,
  TableroComisiones,
} from 'src/app/shared/utils/tablero-comisiones.util';

/** Consultas de solo lectura sobre `comisionesVenta` (Frente Vendedores).
 *  Solo dos queries, ambas con índice simple:
 *   - comisiones de un mes: periodo == P;
 *   - pendientes: saldo != 0 (conjunto chico; residuos de redondeo fuera). */
@Injectable({ providedIn: 'root' })
export class ComisionVentaConsultaService {

  private db = inject(DbFirestoreService);

  observarDelMes(periodo: number): Observable<ConId<ComisionVenta>[]> {
    return this.db.observarPorCampo<ComisionVenta>(ComisionVentaFactoryService.COLECCION, 'periodo', periodo);
  }

  observarPendientes(): Observable<ConId<ComisionVenta>[]> {
    return this.db.observarDistintoDe<ComisionVenta>(ComisionVentaFactoryService.COLECCION, 'saldo', 0)
      .pipe(map(lista => lista.filter(c => !esCero(c.saldo))));
  }

  /** Tablero del mes en vivo (se actualiza solo al cerrar, editar, liquidar…). */
  observarTablero(periodo: number): Observable<TableroComisiones> {
    return combineLatest([this.observarDelMes(periodo), this.observarPendientes()]).pipe(
      map(([delMes, pendientes]) => armarTableroComisiones(delMes, pendientes, periodo)),
    );
  }

  /** Saldo pendiente total de un vendedor (todos los meses). One-shot. */
  async saldoPendienteDe(idVendedor: string): Promise<number> {
    const pendientes = await firstValueFrom(this.observarPendientes());
    return redondear2(
      pendientes.filter(c => c.idVendedor === idVendedor).reduce((acc, c) => acc + (c.saldo ?? 0), 0),
    );
  }
}
