import { Injectable, inject } from '@angular/core';
import * as FileSaver from 'file-saver';
import { ConIdType } from 'src/app/interfaces/conId';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { LibroTabular } from 'src/app/interfaces/documento-tabular';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ExcelTabularService } from 'src/app/servicios/exportacion/excel-tabular.service';
import { VendedorService } from 'src/app/servicios/vendedores/vendedor.service';
import {
  FiltroListado, agruparVehiculosPorDuenio, armarLibroChoferes, armarLibroClientes,
  armarLibroProveedores,
} from 'src/app/shared/utils/documento-entidades.util';

/** Excel de los listados de entidades (Clientes, Choferes, Proveedores) — la
 *  ÚNICA puerta que usan esas tres pantallas.
 *
 *  QUÉ dice cada documento: las funciones puras de documento-entidades.util.
 *  CÓMO se ve: el renderer genérico ExcelTabularService.generarLibro, que carga
 *  exceljs con import() (se descarga recién al exportar). QUIÉN resuelve los
 *  datos que las funciones puras no pueden ir a buscar (vehículos, choferes de
 *  un proveedor, nombres de vendedor): esta fachada.
 *
 *  Solo Excel, sin log: 12-14 columnas no entran legibles en un PDF y una
 *  descarga de consulta no se registra (decisiones D2 y D7 del frente). */
@Injectable({ providedIn: 'root' })
export class EntidadesExportService {

  private excel = inject(ExcelTabularService);
  private choferService = inject(ChoferService);
  private vendedorService = inject(VendedorService);

  async descargarClientes(clientes: ConIdType<Cliente>[], filtro: FiltroListado): Promise<void> {
    await this.descargar(armarLibroClientes({
      clientes, filtro, nombresVendedor: await this.nombresVendedor(),
    }));
  }

  async descargarChoferes(choferes: ConIdType<Chofer>[], filtro: FiltroListado): Promise<void> {
    await this.descargar(armarLibroChoferes({
      choferes, filtro, vehiculosPorChofer: this.vehiculos('chofer'),
    }));
  }

  async descargarProveedores(proveedores: ConIdType<Proveedor>[], filtro: FiltroListado): Promise<void> {
    const choferesPorProveedor: Record<string, Chofer[]> = {};
    for (const p of proveedores) {
      choferesPorProveedor[p.id] = this.choferService.getChoferesPorProveedor(p.id);
    }
    await this.descargar(armarLibroProveedores({
      proveedores, filtro, choferesPorProveedor,
      vehiculosPorProveedor: this.vehiculos('proveedor'),
    }));
  }

  private async descargar(libro: LibroTabular): Promise<void> {
    const blob = await this.excel.generarLibro(libro);
    FileSaver.saveAs(blob, `${libro.nombreArchivo}.xlsx`);
  }

  /** Los vehículos que ya están en memoria, agrupados por dueño. El agrupado
   *  es puro y vive en el util (agruparVehiculosPorDuenio); acá solo se
   *  resuelve de dónde salen los datos. */
  private vehiculos(tipo: 'chofer' | 'proveedor'): Record<string, Vehiculo[]> {
    return agruparVehiculosPorDuenio(this.choferService.getVehiculosActuales(), tipo);
  }

  /** idVendedor → 'Apellido, Nombre' (el mismo formato que usa la app, de
   *  VendedorService.nombre). Si el módulo Vendedores no se abrió en esta
   *  sesión su listener está cerrado y el BehaviorSubject vacío, así que se
   *  hace una lectura puntual. Solo llegan acá roles con lectura de
   *  `vendedores` (ver el permiso de descarga: dev/admin). */
  private async nombresVendedor(): Promise<Record<string, string>> {
    const enMemoria = this.vendedorService.getVendedoresActuales();
    const lista = enMemoria.length > 0
      ? enMemoria
      : await this.vendedorService.obtenerTodosUnaVez();
    const mapa: Record<string, string> = {};
    for (const v of lista) {
      mapa[v.id] = this.vendedorService.nombre(v);
    }
    return mapa;
  }
}
