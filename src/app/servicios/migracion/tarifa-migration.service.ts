import { Injectable, inject } from '@angular/core';
import { Firestore, collection, getDocs, query, where } from '@angular/fire/firestore';
import { RegistroOpEventual } from 'src/app/interfaces/registro-op-eventual';
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
import { DbFirestoreService, EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';

export interface ResultadoAuditoriaTarifas {
  resultado: { label: string; coleccion: string; cantidad: number }[];
  notas: string[];
}

export interface ItemPreviewEventual {
  idTarifaVieja: number;
  registro: Omit<RegistroOpEventual, 'idTarifa'>;
  resumen: string;
}

export interface ItemNoResueltoEventual {
  idTarifaVieja: number;
  motivo: string;
}

export interface ResultadoPreviewEventual {
  total: number;
  resueltos: ItemPreviewEventual[];
  noResueltos: ItemNoResueltoEventual[];
}

export interface ResultadoConfirmacionEventual {
  creados: number;
  errores: { idTarifaVieja: number; error: string }[];
}

export interface VehiculoCategoriaInvalida {
  idVehiculo: string;
  dominio: string;
  nombreCargado: string;
  entidad: string;
}

export interface ResultadoAuditoriaCategoriasVehiculo {
  totalVehiculos: number;
  categoriasValidas: string[];
  vehiculosInvalidos: VehiculoCategoriaInvalida[];
}

export interface ItemHuerfanoEventual {
  id: string;
  idOperacion: string;
  resumen: string;
}

export interface ResultadoAuditoriaHuerfanosEventual {
  total: number;
  huerfanos: ItemHuerfanoEventual[];
}

export interface ItemHistorialGeneral {
  lado: 'cliente' | 'chofer' | 'proveedor';
  origen: 'vigente' | 'historial';
  id: string;
  fecha: string;
  categorias: { orden: number; nombre: string; valor: number }[];
  acompaniante: number;
  kmDistancia: { primerSector: number; sectoresSiguientes: number };
}

@Injectable({ providedIn: 'root' })
export class TarifaMigrationService {
  private firestore = inject(Firestore);
  private tarifario = inject(TarifarioService);
  private db = inject(DbFirestoreService);

  // Colecciones de backup usadas para resolver ids viejos (numéricos) de
  // Cliente/Chofer/Proveedor a los ids string vigentes hoy — ver
  // previsualizarMigracionEventual(). Las migraciones de estas 3 entidades
  // fueron in-place (mismo docId de siempre desde antes de migrar), así que
  // el docId del backup ES el id vigente hoy; no hace falta ningún otro mapeo.
  private readonly BACKUP_CLIENTES = '_backup_clientes_20260606';
  private readonly BACKUP_CHOFERES = '_backup_choferes_20260531';
  private readonly BACKUP_PROVEEDORES = '_backup_proveedores_20260603';

  /** Auditoría de solo lectura de las colecciones viejas de Tarifas — cuenta
   *  documentos por colección y, para Especial y Personalizada, cuántas
   *  categorías cargadas quedaron en $0 (informativo, el criterio final para
   *  decidir qué hacer con cada caso se define a mano en la migración). No
   *  escribe nada. */
  async auditarTarifasViejas(): Promise<ResultadoAuditoriaTarifas> {
    const resultado: { label: string; coleccion: string; cantidad: number }[] = [];
    const notas: string[] = [];

    const colecciones: { label: string; coleccion: string }[] = [
      { label: 'General — Cliente (vigente)', coleccion: 'tarifasGralCliente' },
      { label: 'General — Cliente (historial)', coleccion: 'historialTarifasGralCliente' },
      { label: 'General — Chofer (vigente)', coleccion: 'tarifasGralChofer' },
      { label: 'General — Chofer (historial)', coleccion: 'historialTarifasGralChofer' },
      { label: 'General — Proveedor (vigente)', coleccion: 'tarifasGralProveedor' },
      { label: 'General — Proveedor (historial)', coleccion: 'historialTarifasGralProveedor' },
      { label: 'Especial — Cliente (vigente)', coleccion: 'tarifasEspCliente' },
      { label: 'Especial — Cliente (historial)', coleccion: 'historialTarifasEspCliente' },
      { label: 'Especial — Chofer (vigente)', coleccion: 'tarifasEspChofer' },
      { label: 'Especial — Chofer (historial)', coleccion: 'historialTarifasEspChofer' },
      { label: 'Especial — Proveedor (vigente)', coleccion: 'tarifasEspProveedor' },
      { label: 'Especial — Proveedor (historial)', coleccion: 'historialTarifasEspProveedor' },
      { label: 'Personalizada — Cliente (vigente)', coleccion: 'tarifasPersCliente' },
      { label: 'Personalizada — Cliente (historial)', coleccion: 'historialTarifasPersCliente' },
      { label: 'Eventual (log histórico)', coleccion: 'tarifasEventuales' },
    ];

    for (const { label, coleccion } of colecciones) {
      const colRef = collection(this.firestore, `/Vantruck/datos/${coleccion}`);
      const snap = await getDocs(colRef);
      resultado.push({ label, coleccion, cantidad: snap.size });
    }

    // $0 en categorías de Especial (cargasGenerales) — los 3 lados juntos, solo vigentes.
    let categoriasEspecial = 0, enCeroEspecial = 0;
    for (const coleccion of ['tarifasEspCliente', 'tarifasEspChofer', 'tarifasEspProveedor']) {
      const colRef = collection(this.firestore, `/Vantruck/datos/${coleccion}`);
      const snap = await getDocs(colRef);
      snap.docs.forEach(d => {
        const cats = (d.data() as any).cargasGenerales ?? [];
        categoriasEspecial += cats.length;
        enCeroEspecial += cats.filter((c: any) => c.valor === 0).length;
      });
    }
    notas.push(`Especial (3 lados, vigentes): ${categoriasEspecial} categorías cargadas, ${enCeroEspecial} en $0.`);

    // $0 en categorías de Personalizada (vigente).
    let categoriasPers = 0, enCeroPers = 0;
    const colRefPers = collection(this.firestore, '/Vantruck/datos/tarifasPersCliente');
    const snapPers = await getDocs(colRefPers);
    snapPers.docs.forEach(d => {
      const secciones = (d.data() as any).secciones ?? [];
      secciones.forEach((s: any) => {
        (s.categorias ?? []).forEach((c: any) => {
          categoriasPers += 1;
          if (c.aCobrar === 0 || c.aPagar === 0) enCeroPers += 1;
        });
      });
    });
    notas.push(`Personalizada (vigente): ${categoriasPers} categorías cargadas, ${enCeroPers} con aCobrar o aPagar en $0.`);

    return { resultado, notas };
  }

  /** Auditoría de solo lectura: valida que `Vehiculo.categoria.nombre` de cada
   *  vehículo coincida EXACTO con el nombre de alguna categoría de la Tarifa
   *  General vigente (nivel 'general', activo=true) — es el mismo matching
   *  exacto por string que usa ValoresTarifaService al resolver una operación,
   *  así que un vehículo fuera de esta lista rompe el cálculo. No escribe
   *  nada. */
  async auditarCategoriasVehiculo(): Promise<ResultadoAuditoriaCategoriasVehiculo> {
    const tarifasRef = collection(this.firestore, '/Vantruck/datos/tarifas');
    const qGeneral = query(tarifasRef, where('nivel', '==', 'general'), where('activo', '==', true));
    const snapGeneral = await getDocs(qGeneral);
    if (snapGeneral.empty) {
      throw new Error('No hay una Tarifa General vigente (nivel "general", activo=true) — no se puede auditar sin categorías de referencia.');
    }
    if (snapGeneral.size > 1) {
      throw new Error(`Hay ${snapGeneral.size} Tarifas Generales vigentes simultáneas — ambigüedad, revisar antes de auditar.`);
    }
    const general = snapGeneral.docs[0].data() as any;
    const categoriasValidas = new Set<string>();
    (general.secciones ?? []).forEach((s: any) => (s.categorias ?? []).forEach((c: any) => categoriasValidas.add(c.nombre)));

    const [snapVehiculos, snapChoferes, snapProveedores] = await Promise.all([
      getDocs(collection(this.firestore, '/Vantruck/datos/vehiculos')),
      getDocs(collection(this.firestore, '/Vantruck/datos/choferes')),
      getDocs(collection(this.firestore, '/Vantruck/datos/proveedores')),
    ]);

    const mapaChoferes = new Map<string, string>();
    snapChoferes.docs.forEach(d => {
      const c = d.data() as any;
      mapaChoferes.set(d.id, c.datosPersonales ? `${c.datosPersonales.apellido} ${c.datosPersonales.nombre}` : d.id);
    });
    const mapaProveedores = new Map<string, string>();
    snapProveedores.docs.forEach(d => {
      const p = d.data() as any;
      mapaProveedores.set(d.id, p.razonSocial ?? d.id);
    });

    const vehiculosInvalidos: VehiculoCategoriaInvalida[] = [];
    snapVehiculos.docs.forEach(d => {
      const v = d.data() as any;
      const nombre: string | undefined = v.categoria?.nombre;
      if (!nombre || !categoriasValidas.has(nombre)) {
        let entidad = '(sin asignar)';
        if (v.asignadoA?.tipo === 'chofer') {
          entidad = `Chofer: ${mapaChoferes.get(v.asignadoA.idChofer) ?? v.asignadoA.idChofer} (id: ${v.asignadoA.idChofer})`;
        } else if (v.asignadoA?.tipo === 'proveedor') {
          entidad = `Proveedor: ${mapaProveedores.get(v.asignadoA.idProveedor) ?? v.asignadoA.idProveedor} (id: ${v.asignadoA.idProveedor})`;
        }
        vehiculosInvalidos.push({
          idVehiculo: d.id,
          dominio: v.dominio ?? '(sin dominio)',
          nombreCargado: nombre ?? '(vacío)',
          entidad,
        });
      }
    });

    return {
      totalVehiculos: snapVehiculos.size,
      categoriasValidas: Array.from(categoriasValidas),
      vehiculosInvalidos,
    };
  }

  // ── Migración de Eventual → RegistroOpEventual (previsualizar + confirmar) ──

  /** Resuelve un id viejo (numérico) de Cliente/Chofer/Proveedor al id string
   *  vigente hoy: lo busca en la colección de backup (que preserva el docId
   *  real y el campo numérico viejo, ya borrado de la colección viva) y
   *  cruza por CUIT contra la colección viva como chequeo de integridad. */
  private resolverEntidadVieja(
    idViejo: number,
    backupPorIdViejo: Map<number, { docId: string; cuit: number }>,
    cuitVivoPorId: Map<string, number>,
  ): { id: string; error?: undefined } | { id?: undefined; error: string } {
    const enBackup = backupPorIdViejo.get(idViejo);
    if (!enBackup) {
      return { error: `no se encontró id ${idViejo} en el backup` };
    }
    const cuitVivo = cuitVivoPorId.get(enBackup.docId);
    if (cuitVivo === undefined) {
      return { error: `el documento ${enBackup.docId} (id viejo ${idViejo}) ya no existe en la colección viva` };
    }
    if (cuitVivo !== enBackup.cuit) {
      return { error: `CUIT no coincide entre backup (${enBackup.cuit}) y colección viva (${cuitVivo}) para ${enBackup.docId}` };
    }
    return { id: enBackup.docId };
  }

  /** Convierte a número un `valor` que puede venir como number o como string
   *  con formato argentino (`"250.000,00"`: `.` de miles, `,` decimal).
   *  Devuelve `NaN` si no se puede interpretar como un número válido —
   *  nunca se adivina, se prefiere dejar el registro sin resolver. */
  private parsearValor(raw: any): number {
    if (typeof raw === 'number') {
      return raw;
    }
    if (typeof raw === 'string') {
      const normalizado = raw.trim().replace(/\./g, '').replace(',', '.');
      return Number(normalizado);
    }
    return NaN;
  }

  /** Arma, sin escribir nada, los `RegistroOpEventual` que se crearían a
   *  partir de `tarifasEventuales`. Resuelve idCliente/idChofer/idProveedor
   *  vía backup + cruce por CUIT (ver resolverEntidadVieja) y deja
   *  `idOperacion` como el id numérico convertido a string tal cual — ese
   *  documento todavía existe hoy en `operaciones` bajo ese id; si en el
   *  futuro la migración de operaciones viejas termina recreándolas con id
   *  nuevo, esta referencia (y cualquier otra en la app) va a necesitar un
   *  remapeo aparte en ese momento. Los casos que no se pueden resolver
   *  quedan afuera de `resueltos`, listados en `noResueltos` para revisar a
   *  mano — no se migra nada con una referencia dudosa. */
  async previsualizarMigracionEventual(): Promise<ResultadoPreviewEventual> {
    const [
      snapEventuales,
      snapBackupClientes, snapClientes,
      snapBackupChoferes, snapChoferes,
      snapBackupProveedores, snapProveedores,
    ] = await Promise.all([
      getDocs(collection(this.firestore, '/Vantruck/datos/tarifasEventuales')),
      getDocs(collection(this.firestore, `/Vantruck/datos/${this.BACKUP_CLIENTES}`)),
      getDocs(collection(this.firestore, '/Vantruck/datos/clientes')),
      getDocs(collection(this.firestore, `/Vantruck/datos/${this.BACKUP_CHOFERES}`)),
      getDocs(collection(this.firestore, '/Vantruck/datos/choferes')),
      getDocs(collection(this.firestore, `/Vantruck/datos/${this.BACKUP_PROVEEDORES}`)),
      getDocs(collection(this.firestore, '/Vantruck/datos/proveedores')),
    ]);

    const backupClientesPorIdViejo = new Map<number, { docId: string; cuit: number }>();
    snapBackupClientes.docs.forEach(d => {
      const datos = d.data() as any;
      if (datos.idCliente !== undefined) {
        backupClientesPorIdViejo.set(Number(datos.idCliente), { docId: d.id, cuit: Number(datos.cuit ?? 0) });
      }
    });
    const backupChoferesPorIdViejo = new Map<number, { docId: string; cuit: number }>();
    snapBackupChoferes.docs.forEach(d => {
      const datos = d.data() as any;
      if (datos.idChofer !== undefined) {
        backupChoferesPorIdViejo.set(Number(datos.idChofer), { docId: d.id, cuit: Number(datos.cuit ?? 0) });
      }
    });
    const backupProveedoresPorIdViejo = new Map<number, { docId: string; cuit: number }>();
    snapBackupProveedores.docs.forEach(d => {
      const datos = d.data() as any;
      if (datos.idProveedor !== undefined) {
        backupProveedoresPorIdViejo.set(Number(datos.idProveedor), { docId: d.id, cuit: Number(datos.cuit ?? 0) });
      }
    });

    const clientesVivosCuitPorId = new Map<string, number>();
    snapClientes.docs.forEach(d => clientesVivosCuitPorId.set(d.id, Number((d.data() as any).cuit ?? 0)));
    const choferesVivosCuitPorId = new Map<string, number>();
    snapChoferes.docs.forEach(d => choferesVivosCuitPorId.set(d.id, Number((d.data() as any).datosPersonales?.cuit ?? 0)));
    const proveedoresVivosCuitPorId = new Map<string, number>();
    snapProveedores.docs.forEach(d => proveedoresVivosCuitPorId.set(d.id, Number((d.data() as any).cuit ?? 0)));

    const resueltos: ItemPreviewEventual[] = [];
    const noResueltos: ItemNoResueltoEventual[] = [];

    snapEventuales.docs.forEach(d => {
      const datos = d.data() as any;
      const idTarifaVieja = Number(datos.idTarifa);

      const resCliente = this.resolverEntidadVieja(Number(datos.idCliente), backupClientesPorIdViejo, clientesVivosCuitPorId);
      if (resCliente.error) {
        noResueltos.push({ idTarifaVieja, motivo: `cliente: ${resCliente.error}` });
        return;
      }

      const resChofer = this.resolverEntidadVieja(Number(datos.idChofer), backupChoferesPorIdViejo, choferesVivosCuitPorId);
      if (resChofer.error) {
        noResueltos.push({ idTarifaVieja, motivo: `chofer: ${resChofer.error}` });
        return;
      }

      const idProveedorViejo = Number(datos.idProveedor ?? 0);
      const esProveedor = idProveedorViejo !== 0;
      let idProveedorResuelto: string | null = null;
      if (esProveedor) {
        const resProveedor = this.resolverEntidadVieja(idProveedorViejo, backupProveedoresPorIdViejo, proveedoresVivosCuitPorId);
        if (resProveedor.error) {
          noResueltos.push({ idTarifaVieja, motivo: `proveedor: ${resProveedor.error}` });
          return;
        }
        idProveedorResuelto = resProveedor.id!;
      }

      const valorCliente = this.parsearValor(datos.cliente?.valor ?? 0);
      if (!Number.isFinite(valorCliente)) {
        noResueltos.push({ idTarifaVieja, motivo: `cliente: valor no numérico ("${datos.cliente?.valor}")` });
        return;
      }
      const valorContraparte = this.parsearValor(datos.chofer?.valor ?? 0);
      if (!Number.isFinite(valorContraparte)) {
        noResueltos.push({ idTarifaVieja, motivo: `${esProveedor ? 'proveedor' : 'chofer'}: valor no numérico ("${datos.chofer?.valor}")` });
        return;
      }

      const fechaRaw = datos.fecha;
      const fechaDate = fechaRaw?.toDate ? fechaRaw.toDate() : new Date(fechaRaw);
      const fecha = toISODateString(fechaDate);

      const registro: Omit<RegistroOpEventual, 'idTarifa'> = {
        idOperacion: String(datos.idOperacion ?? ''),
        fecha,
        idCliente: resCliente.id!,
        idChofer: resChofer.id!,
        idProveedor: idProveedorResuelto,
        cliente: { concepto: datos.cliente?.concepto ?? '', valor: valorCliente },
        chofer: esProveedor ? null : { concepto: datos.chofer?.concepto ?? '', valor: valorContraparte },
        proveedor: esProveedor ? { concepto: datos.chofer?.concepto ?? '', valor: valorContraparte } : null,
      };

      resueltos.push({
        idTarifaVieja,
        registro,
        resumen: `Cliente ${resCliente.id} — ${esProveedor ? `Proveedor ${idProveedorResuelto}` : `Chofer ${resChofer.id}`} — $${valorCliente} (cliente) / $${valorContraparte} (${esProveedor ? 'proveedor' : 'chofer'}) — ${fecha}`,
      });
    });

    return { total: snapEventuales.size, resueltos, noResueltos };
  }

  /** Escribe los `RegistroOpEventual` ya resueltos por
   *  `previsualizarMigracionEventual()` — reutiliza `TarifarioService.
   *  crearRegistroEventual()` (mismo método que usa el cierre de una
   *  operación real hoy) para heredar su logging y su batch. No hay una
   *  clave natural para detectar "ya migrado" en este modelo — correr esto
   *  dos veces con los mismos ítems duplica los registros. */
  async confirmarMigracionEventual(items: ItemPreviewEventual[]): Promise<ResultadoConfirmacionEventual> {
    let creados = 0;
    const errores: { idTarifaVieja: number; error: string }[] = [];
    for (const item of items) {
      try {
        await this.tarifario.crearRegistroEventual(item.registro);
        creados++;
      } catch (e: any) {
        errores.push({ idTarifaVieja: item.idTarifaVieja, error: e?.message ?? String(e) });
      }
    }
    return { creados, errores };
  }

  /** Auditoría de solo lectura de `registrosOpEventuales`. Separa los
   *  registros que vienen de `confirmarMigracionEventual()` (`idOperacion`
   *  numérico — id viejo de `tarifasEventuales`, ver previsualización de
   *  arriba) de cualquier otro que haya quedado de probar el cierre real de
   *  una operación tipo Eventual (`idOperacion` ahí es el id de Firestore
   *  de esa operación — nunca puramente numérico, porque `generarId()` usa
   *  el auto-id de Firestore, no un timestamp). No borra nada. */
  async auditarRegistrosOpEventualesHuerfanos(): Promise<ResultadoAuditoriaHuerfanosEventual> {
    const snap = await getDocs(collection(this.firestore, '/Vantruck/datos/registrosOpEventuales'));
    const huerfanos: ItemHuerfanoEventual[] = [];

    snap.docs.forEach(d => {
      const datos = d.data() as any;
      const idOperacion = String(datos.idOperacion ?? '');
      const esIdMigrado = /^\d+$/.test(idOperacion);
      if (!esIdMigrado) {
        huerfanos.push({
          id: d.id,
          idOperacion,
          resumen: `idOperacion "${idOperacion}" (no viene de la migración) — idCliente ${datos.idCliente ?? '?'} — fecha ${datos.fecha ?? '?'}`,
        });
      }
    });

    return { total: snap.size, huerfanos };
  }

  /** Borra los `registrosOpEventuales` ya identificados como huérfanos por
   *  `auditarRegistrosOpEventualesHuerfanos()`. Recibe la lista exacta de
   *  ids a borrar (nunca decide por su cuenta) para no arriesgar los
   *  registros migrados si algo cambió entre la auditoría y la
   *  confirmación. */
  async borrarRegistrosOpEventualesHuerfanos(ids: string[]): Promise<void> {
    const escrituras: EscrituraBatch[] = ids.map(id => ({
      coleccion: 'registrosOpEventuales',
      id,
      data: null,
      modo: 'eliminar' as const,
    }));
    await this.db.commitBatch(escrituras);
  }

  /** Volcado de solo lectura del historial viejo de Tarifa General — junta
   *  las 6 colecciones (vigente + historial × cliente/chofer/proveedor,
   *  ver tabla en el documento de migración) y las devuelve ordenadas por
   *  `fecha` en una sola lista. NO fusiona ni decide nada: el modelo nuevo
   *  guarda cliente/chofer/proveedor juntos en un solo documento por
   *  versión, mientras que el viejo son 3 líneas de tiempo independientes
   *  — esta lista es la materia prima ordenada para que la fusión (qué
   *  versión nueva corresponde a cada fecha, cómo matchear categorías por
   *  `orden`, qué hacer si `kmDistancia` no coincide entre lados) se arme
   *  a mano, con el mismo criterio manual que el resto de esta migración. */
  async volcarHistorialGeneral(): Promise<ItemHistorialGeneral[]> {
    const fuentes: { lado: 'cliente' | 'chofer' | 'proveedor'; origen: 'vigente' | 'historial'; coleccion: string }[] = [
      { lado: 'cliente', origen: 'vigente', coleccion: 'tarifasGralCliente' },
      { lado: 'cliente', origen: 'historial', coleccion: 'historialTarifasGralCliente' },
      { lado: 'chofer', origen: 'vigente', coleccion: 'tarifasGralChofer' },
      { lado: 'chofer', origen: 'historial', coleccion: 'historialTarifasGralChofer' },
      { lado: 'proveedor', origen: 'vigente', coleccion: 'tarifasGralProveedor' },
      { lado: 'proveedor', origen: 'historial', coleccion: 'historialTarifasGralProveedor' },
    ];

    const items: ItemHistorialGeneral[] = [];
    for (const { lado, origen, coleccion } of fuentes) {
      const snap = await getDocs(collection(this.firestore, `/Vantruck/datos/${coleccion}`));
      snap.docs.forEach(d => {
        const datos = d.data() as any;
        items.push({
          lado,
          origen,
          id: d.id,
          fecha: String(datos.fecha ?? ''),
          categorias: (datos.cargasGenerales ?? []).map((c: any) => ({ orden: c.orden, nombre: c.nombre, valor: c.valor })),
          acompaniante: datos.adicionales?.acompaniante ?? 0,
          kmDistancia: {
            primerSector: datos.adicionales?.KmDistancia?.primerSector ?? 0,
            sectoresSiguientes: datos.adicionales?.KmDistancia?.sectoresSiguientes ?? 0,
          },
        });
      });
    }

    items.sort((a, b) => a.fecha.localeCompare(b.fecha));
    return items;
  }
}
