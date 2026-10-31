import { Injectable, inject } from '@angular/core';
import * as FileSaver from 'file-saver';
import { AsignacionItem } from 'src/app/interfaces/asignacion';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { DisponibilidadService } from 'src/app/servicios/no-disponibilidad/disponibilidad.service';
import { ExcelTabularService } from 'src/app/servicios/exportacion/excel-tabular.service';
import { PdfTabularService } from 'src/app/servicios/exportacion/pdf-tabular.service';
import {
  ChoferProveedorNoDisponibleInforme, DatosLibroAsignaciones, DisponibilidadInforme,
  VehiculoNoDisponibleInforme, armarLibroAsignaciones,
} from 'src/app/shared/utils/documento-asignaciones.util';
import {
  consultasDeAsignacion, sujetoAsignacionDeVehiculo,
} from 'src/app/shared/utils/no-disponibilidad.util';

/** Lo que el tablero sabe y la fachada no puede adivinar: la fecha, si está en
 *  borrador o confirmado, los items de pantalla y los clientes de las columnas.
 *  Los choferes y la disponibilidad los resuelve la fachada desde memoria. */
export type DatosTableroAsignaciones =
  Omit<DatosLibroAsignaciones, 'choferes' | 'disponibilidad'>;

/** Excel y PDF del informe del tablero de asignaciones — la ÚNICA puerta que
 *  usa el tablero. QUÉ dice el documento: armarLibroAsignaciones (puro). CÓMO
 *  se ve: los renderers genéricos, que cargan exceljs / jsPDF con import() (se
 *  descargan recién al exportar).
 *
 *  La disponibilidad se resuelve ACÁ con DisponibilidadService y
 *  `consultasDeAsignacion`: la misma regla que marca el tablero y que aplican
 *  las guardas, para que el informe no cuente distinto de lo que se ve y de lo
 *  que se bloquea.
 *
 *  Sin log: es una consulta, mismo criterio que Reportes, Vendedores, Finanzas
 *  y los otros informes del frente (decisión D7). */
@Injectable({ providedIn: 'root' })
export class AsignacionesExportService {

  private excel = inject(ExcelTabularService);
  private pdf = inject(PdfTabularService);
  private choferService = inject(ChoferService);
  private proveedorService = inject(ProveedorService);
  private disponibilidadService = inject(DisponibilidadService);

  async descargar(datos: DatosTableroAsignaciones, formato: 'excel' | 'pdf'): Promise<void> {
    const libro = armarLibroAsignaciones({
      ...datos,
      choferes: this.choferService.getChoferesActuales(),
      disponibilidad: this.resolverDisponibilidad(datos.items, datos.fecha),
    });
    const blob = formato === 'excel'
      ? await this.excel.generarLibro(libro)
      : await this.pdf.generarLibro(libro);
    FileSaver.saveAs(blob, `${libro.nombreArchivo}.${formato === 'excel' ? 'xlsx' : 'pdf'}`);
  }

  /** null = no se pudo verificar (datos sin cargar): el informe lo dice. */
  private resolverDisponibilidad(items: AsignacionItem[], fecha: string): DisponibilidadInforme | null {
    if (!this.disponibilidadService.datosCargados()) return null;

    // Ítems del tablero: exactamente la guarda de guardarBorrador / Alta de Op.
    const porItem: Record<string, DisponibilidadInforme['porItem'][string]> = {};
    for (const x of this.disponibilidadService.itemsNoDisponibles(items, fecha) ?? []) {
      porItem[x.item.idItem] = x.motivos;
    }

    const choferes = this.choferService.getChoferesActuales();
    const proveedores = this.proveedorService.getProveedoresActuales();
    const choferPorId = new Map(choferes.map(c => [c.idChofer, c]));
    const proveedorPorId = new Map(proveedores.map(p => [p.idProveedor, p]));

    // Flota: los vehículos del pool del tablero (dueño existente y activo),
    // preguntando lo mismo que por un ítem con ese vehículo.
    const vehiculos: VehiculoNoDisponibleInforme[] = [];
    for (const v of this.choferService.getVehiculosActuales()) {
      const a = v.asignadoA;
      const chofer = a.tipo === 'chofer' ? choferPorId.get(a.idChofer) : undefined;
      const proveedor = a.tipo === 'proveedor' ? proveedorPorId.get(a.idProveedor) : undefined;
      if (!(chofer?.activo || proveedor?.activo)) continue;
      const motivos = this.disponibilidadService.motivosDe(consultasDeAsignacion(sujetoAsignacionDeVehiculo(v)), fecha) ?? [];
      if (motivos.length === 0) continue;
      vehiculos.push({
        duenio: chofer ? `${chofer.datosPersonales.apellido}, ${chofer.datosPersonales.nombre}` : proveedor!.razonSocial,
        tipoDuenio: chofer ? 'Chofer directo' : 'Proveedor',
        dominio: v.dominio ?? '',
        categoria: v.categoria?.nombre ?? '',
        motivos,
      });
    }

    // Choferes de proveedor activos (no tienen vehículo propio, no están en el pool).
    const choferesDeProveedor: ChoferProveedorNoDisponibleInforme[] = [];
    for (const c of choferes) {
      if (!c.activo || c.contratacion.tipo !== 'proveedor') continue;
      const motivos = this.disponibilidadService.motivosDe([{ tipo: 'chofer', idChofer: c.idChofer }], fecha) ?? [];
      if (motivos.length === 0) continue;
      choferesDeProveedor.push({
        chofer: `${c.datosPersonales.apellido}, ${c.datosPersonales.nombre}`,
        proveedor: proveedorPorId.get(c.contratacion.idProveedor)?.razonSocial ?? 'Sin resolver',
        motivos,
      });
    }

    const porNombre = <T extends { duenio?: string; chofer?: string }>(a: T, b: T) =>
      (a.duenio ?? a.chofer ?? '').localeCompare(b.duenio ?? b.chofer ?? '');
    return {
      porItem,
      vehiculos: vehiculos.sort(porNombre),
      choferesDeProveedor: choferesDeProveedor.sort(porNombre),
    };
  }
}
