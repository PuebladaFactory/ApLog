import { inject, Injectable } from "@angular/core";
import {
  collection,
  doc,
  Firestore,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "@angular/fire/firestore";

import { Cliente } from "src/app/interfaces/cliente";
import { ConId } from "src/app/interfaces/conId";
import { InformeLiq } from "src/app/interfaces/informe-liq";
import { InformeOp } from "src/app/interfaces/informe-op";
import { Operacion } from "src/app/interfaces/operacion";
import { Vehiculo } from "src/app/interfaces/chofer";
import {
  CategoriaTarifa,
  TarifaGralCliente,
} from "src/app/interfaces/tarifa-gral-cliente";
import { TarifaPersonalizadaCliente } from "src/app/interfaces/tarifa-personalizada-cliente";
import {
  AjusteInformeLiq,
  ContraParteRecalculo,
  EstadoDetalleRecalculo,
  FilaRecalculo,
  NivelTarifa,
  PreviewRecalculo,
  ResultadoFila,
  ResultadoRecalculo,
  TarifaVigenteResumen,
  ValoresLadoCliente,
} from "src/app/interfaces/recalculo-tarifa";

import { DbFirestoreService } from "../database/db-firestore.service";
import { StorageService } from "../storage/storage.service";
import { ValoresOpClienteService } from "../valores-op/valores-op-cliente/valores-op-cliente.service";

type ContraParteEncontrada = {
  informe: ConId<InformeOp>;
  coleccion: string;
};

@Injectable({
  providedIn: "root",
})
export class RecalculoTarifaService {
  private firestore = inject(Firestore);
  private basePath: string = "/Vantruck/datos";

  // Orden de prioridad: primero las no liquidadas, después las liquidadas.
  private readonly COLECCIONES_CONTRAPARTE = [
    "informesOpChoferes",
    "informesOpProveedores",
    "infOpLiqChoferes",
    "infOpLiqProveedores",
  ];

  constructor(
    private storageService: StorageService,
    private dbFirebase: DbFirestoreService,
    private valoresCliente: ValoresOpClienteService,
  ) {}

  // ===================================================================
  // API PÚBLICA
  // ===================================================================

  async generarPreview(
    idCliente: number,
    anio: number,
    mes: number,
  ): Promise<PreviewRecalculo> {
    const cliente = this.getCliente(idCliente);
    if (!cliente) {
      throw new Error(`No se encontró el cliente con idCliente ${idCliente}`);
    }

    const nivel = this.getNivelTarifa(cliente);
    const tarifa = this.getTarifaVigente(cliente, nivel);
    if (!tarifa) {
      throw new Error(
        `El cliente ${cliente.razonSocial} no tiene una tarifa ${nivel} vigente`,
      );
    }

    const tarifaGral = this.getTarifaGeneral();
    if (!tarifaGral) {
      throw new Error("No se encontró la tarifa general de clientes");
    }

    const { desde, hasta } = this.getRangoMes(anio, mes);

    const operaciones = await this.getOperacionesDelPeriodo(
      idCliente,
      desde,
      hasta,
    );

    // El flag 'cerrada' se apaga en cuanto liquida cualquiera de las dos
    // partes, así que NO sirve para separar. Lo único binario es 'abierta':
    // toda op no abierta ya tiene su InformeOp de cliente generado.
    const abiertas = operaciones.filter((op) => op.estado?.abierta === true);
    const cerradas = operaciones.filter((op) => op.estado?.abierta !== true);

    const filas: FilaRecalculo[] = [];

    for (const op of abiertas) {
      filas.push(this.construirFilaAbierta(op, tarifa, nivel));
    }

    if (cerradas.length > 0) {
      const filasCerradas = await this.construirFilasCerradas(
        cerradas,
        tarifa,
        tarifaGral,
        nivel,
      );
      filas.push(...filasCerradas);
    }

    filas.sort(
      (a, b) => a.fecha.localeCompare(b.fecha) || a.idOperacion - b.idOperacion,
    );

    return {
      idCliente,
      razonSocial: cliente.razonSocial,
      periodo: { anio, mes, desde, hasta },
      tarifaVigente: this.resumirTarifa(tarifa, nivel),
      filas,
      totales: this.calcularTotales(filas),
    };
  }

  // ===================================================================
  // RESOLUCIÓN DE CLIENTE Y TARIFA
  // ===================================================================

  private getCliente(idCliente: number): ConId<Cliente> | undefined {
    const clientes: ConId<Cliente>[] =
      this.storageService.loadInfo("clientes") || [];
    return clientes.find((c) => c.idCliente === idCliente);
  }

  private getNivelTarifa(cliente: Cliente): NivelTarifa {
    if (cliente.tarifaTipo?.personalizada) return "personalizada";
    if (cliente.tarifaTipo?.especial) return "especial";
    return "general";
  }

  private getTarifaVigente(cliente: Cliente, nivel: NivelTarifa): any {
    if (nivel === "personalizada") {
      const tarifas: TarifaPersonalizadaCliente[] =
        this.storageService.loadInfo("tarifasPersCliente") || [];
      return tarifas.find((t) => t.idCliente === cliente.idCliente);
    }

    if (nivel === "especial") {
      const tarifas: TarifaGralCliente[] =
        this.storageService.loadInfo("tarifasEspCliente") || [];
      return tarifas.find((t) => t.idCliente === cliente.idCliente);
    }

    return this.getTarifaGeneral();
  }

  private getTarifaGeneral(): TarifaGralCliente | undefined {
    const tarifas: TarifaGralCliente[] =
      this.storageService.loadInfo("tarifasGralCliente") || [];
    return tarifas[0];
  }

  private resumirTarifa(tarifa: any, nivel: NivelTarifa): TarifaVigenteResumen {
    return {
      idTarifa: tarifa.idTarifa,
      fecha: tarifa.fechaActualizacion ?? tarifa.fecha,
      nivel,
    };
  }

  // ===================================================================
  // ESTADO
  // ===================================================================

  private getEstadoDetalle(op: Operacion): EstadoDetalleRecalculo {
    const e = op.estado;
    if (e?.abierta) return "abierta";
    if (e?.facturada) return "facturada";
    if (e?.facCliente) return "liquidada-cliente";
    if (e?.facChofer) return "liquidada-contraparte";
    return "cerrada";
  }

  // El lado cliente deja de ser recalculable solo cuando liquidó el CLIENTE.
  // Que haya liquidado la contraparte no bloquea nada: su InformeOp vive en
  // infOpLiq*, pero el del cliente sigue intacto en informesOpClientes.
  private bloqueadoPorEstado(detalle: EstadoDetalleRecalculo): boolean {
    return detalle === "liquidada-cliente" || detalle === "facturada";
  }

  // ===================================================================
  // CONSULTA DE OPERACIONES
  // ===================================================================

  private getRangoMes(
    anio: number,
    mes: number,
  ): { desde: string; hasta: string } {
    const ultimoDia = new Date(anio, mes, 0).getDate();
    const mm = String(mes).padStart(2, "0");
    return {
      desde: `${anio}-${mm}-01`,
      hasta: `${anio}-${mm}-${String(ultimoDia).padStart(2, "0")}`,
    };
  }

  // Filtra SOLO por fecha en Firestore (índice de campo único, automático)
  // y por cliente en memoria, para no requerir un índice compuesto nuevo.
  private async getOperacionesDelPeriodo(
    idCliente: number,
    desde: string,
    hasta: string,
  ): Promise<ConId<Operacion>[]> {
    const colRef = collection(this.firestore, `${this.basePath}/operaciones`);
    const q = query(
      colRef,
      where("fecha", ">=", desde),
      where("fecha", "<=", hasta),
    );

    const snap = await getDocs(q);

    const todas: ConId<Operacion>[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Operacion),
    }));

    return todas.filter(
      (op) =>
        op.cliente?.idCliente === idCliente && op.tarifaTipo?.eventual !== true,
    );
  }

  // Precarga en lote las cuatro colecciones de contraparte y devuelve un mapa
  // por idOperacion. Reemplaza dos getDocs por operación en serie.
  private async precargarContraPartes(
    ops: ConId<Operacion>[],
  ): Promise<Map<number, ContraParteEncontrada>> {
    const ids = ops.map((op) => op.idOperacion);
    const mapa = new Map<number, ContraParteEncontrada>();

    const resultados = await Promise.all(
      this.COLECCIONES_CONTRAPARTE.map((col) =>
        this.dbFirebase.obtenerDocsPorIdsOperacion(col, ids),
      ),
    );

    resultados.forEach((res, i) => {
      const coleccion = this.COLECCIONES_CONTRAPARTE[i];
      for (const informe of res.encontrados as ConId<InformeOp>[]) {
        // El orden del array define la prioridad: no liquidadas primero.
        if (!mapa.has(informe.idOperacion)) {
          mapa.set(informe.idOperacion, { informe, coleccion });
        }
      }
    });

    return mapa;
  }

  // ===================================================================
  // VALIDACIONES PREVIAS AL MOTOR
  // ===================================================================

  private getVehiculo(op: Operacion): Vehiculo | undefined {
    return op.chofer?.vehiculo?.find(
      (v: Vehiculo) => v.dominio === op.patenteChofer,
    );
  }

  private validarGral(op: Operacion, tarifa: TarifaGralCliente): string | null {
    const vehiculo = this.getVehiculo(op);
    if (!vehiculo) {
      return `No se encontró el vehículo con patente ${op.patenteChofer} en el chofer de la operación`;
    }

    const categoria = tarifa.cargasGenerales?.find(
      (c: CategoriaTarifa) => c.orden === vehiculo.categoria.catOrden,
    );
    if (!categoria) {
      return `La tarifa vigente no tiene la categoría ${vehiculo.categoria.catOrden} del vehículo ${op.patenteChofer}`;
    }

    return null;
  }

  private validarPers(
    op: Operacion,
    tarifa: TarifaPersonalizadaCliente,
  ): string | null {
    const nroSeccion = Number(op.tarifaPersonalizada?.seccion);
    const nroCategoria = Number(op.tarifaPersonalizada?.categoria);

    const seccion = tarifa.secciones?.find((s) => s.orden === nroSeccion);
    if (!seccion) {
      return `La tarifa personalizada vigente no tiene la sección ${nroSeccion}`;
    }

    const categoria = seccion.categorias?.find(
      (c: any) => c.orden === nroCategoria,
    );
    if (!categoria) {
      return `La sección ${nroSeccion} de la tarifa vigente no tiene la categoría ${nroCategoria}`;
    }

    return null;
  }

  private validar(
    op: Operacion,
    tarifa: any,
    nivel: NivelTarifa,
  ): string | null {
    return nivel === "personalizada"
      ? this.validarPers(op, tarifa as TarifaPersonalizadaCliente)
      : this.validarGral(op, tarifa as TarifaGralCliente);
  }

  // ===================================================================
  // CÁLCULO — OPERACIONES ABIERTAS
  // ===================================================================

  private construirFilaAbierta(
    op: ConId<Operacion>,
    tarifa: any,
    nivel: NivelTarifa,
  ): FilaRecalculo {
    const advertencias: string[] = [];

    const actual: ValoresLadoCliente = this.valoresDesdeOp(op);

    const error = this.validar(op, tarifa, nivel);
    if (error) {
      advertencias.push(error);
      return this.filaNoRecalculable(
        op,
        "abierta",
        "abierta",
        actual,
        null,
        null,
        advertencias,
        tarifa,
      );
    }

    const clon = structuredClone(op) as Operacion;

    // En el alta solo se poblan tarifaBase y aCobrar (iguales entre sí).
    const base =
      nivel === "personalizada"
        ? this.valoresCliente.$calcularCGPersonalizada(
            tarifa as TarifaPersonalizadaCliente,
            clon,
          )
        : this.valoresCliente.valoresInicialesTarifaGral(
            clon,
            tarifa as TarifaGralCliente,
          );

    const nueva: ValoresLadoCliente = {
      tarifaBase: base,
      acompValor: this.calcularAcompaniante(clon, tarifa, nivel),
      kmAdicional: actual.kmAdicional,
      adExtraValor: actual.adExtraValor,
      total: base,
    };

    return {
      idOperacion: op.idOperacion,
      idDocOperacion: op.id,
      fecha: String(op.fecha),
      estado: "abierta",
      estadoDetalle: "abierta",
      hojaRuta: op.hojaRuta,
      patente: op.patenteChofer,
      idTarifaActual: 0,
      idTarifaNueva: tarifa.idTarifa,
      informeClienteId: null,
      informeClienteIdInfOp: null,
      actual,
      nueva,
      diferencia: nueva.total - actual.total,
      contraParte: null,
      advertencias,
      recalculable: true,
    };
  }

  // ===================================================================
  // CÁLCULO — OPERACIONES NO ABIERTAS
  // ===================================================================

  private async construirFilasCerradas(
    ops: ConId<Operacion>[],
    tarifa: any,
    tarifaGral: TarifaGralCliente,
    nivel: NivelTarifa,
  ): Promise<FilaRecalculo[]> {
    const ids = ops.map((op) => op.idOperacion);

    const [resNoLiq, mapaContraPartes] = await Promise.all([
      this.dbFirebase.obtenerDocsPorIdsOperacion("informesOpClientes", ids),
      this.precargarContraPartes(ops),
    ]);

    // Red de seguridad: si el informe del cliente ya fue liquidado aparece en
    // infOpLiqClientes y la fila se marca como NO recalculable.
    const resLiq =
      resNoLiq.idsFaltantes.length > 0
        ? await this.dbFirebase.obtenerDocsPorIdsOperacion(
            "infOpLiqClientes",
            resNoLiq.idsFaltantes,
          )
        : { encontrados: [], idsFaltantes: [] as number[] };

    const mapaNoLiq = new Map<number, ConId<InformeOp>>(
      resNoLiq.encontrados.map((i: ConId<InformeOp>) => [i.idOperacion, i]),
    );
    const mapaLiq = new Map<number, ConId<InformeOp>>(
      resLiq.encontrados.map((i: ConId<InformeOp>) => [i.idOperacion, i]),
    );

    const filas: FilaRecalculo[] = [];

    for (const op of ops) {
      const advertencias: string[] = [];
      const detalle = this.getEstadoDetalle(op);

      const informe = mapaNoLiq.get(op.idOperacion);
      const informeLiquidado = mapaLiq.get(op.idOperacion);
      const informeCualquiera = informe ?? informeLiquidado;

      const actual: ValoresLadoCliente = informeCualquiera
        ? {
            tarifaBase: informeCualquiera.valores?.tarifaBase ?? 0,
            acompValor: informeCualquiera.valores?.acompaniante ?? 0,
            kmAdicional: informeCualquiera.valores?.kmMonto ?? 0,
            adExtraValor: informeCualquiera.valores?.adExtra ?? 0,
            total: informeCualquiera.valores?.total ?? 0,
          }
        : this.valoresDesdeOp(op);

      // --- Bloqueos ---

      if (this.bloqueadoPorEstado(detalle)) {
        advertencias.push(
          "El informe del cliente ya fue liquidado: recalcularlo afectaría un InformeLiq emitido",
        );
        filas.push(
          this.filaNoRecalculable(
            op,
            "cerrada",
            detalle,
            actual,
            informeCualquiera?.id ?? null,
            informeCualquiera?.idInfOp ?? null,
            advertencias,
            tarifa,
          ),
        );
        continue;
      }

      if (!informe) {
        advertencias.push(
          informeLiquidado
            ? "El InformeOp del cliente está en infOpLiqClientes pese a que el estado de la operación no lo indica"
            : "No se encontró el InformeOp del cliente para esta operación",
        );
        filas.push(
          this.filaNoRecalculable(
            op,
            "cerrada",
            detalle,
            actual,
            informeLiquidado?.id ?? null,
            informeLiquidado?.idInfOp ?? null,
            advertencias,
            tarifa,
          ),
        );
        continue;
      }

      if ((op.valores?.cliente?.aCobrar ?? 0) !== actual.total) {
        advertencias.push(
          `La operación (${op.valores?.cliente?.aCobrar ?? 0}) y su InformeOp (${actual.total}) no coinciden`,
        );
      }

      const error = this.validar(op, tarifa, nivel);
      if (error) {
        advertencias.push(error);
        filas.push(
          this.filaNoRecalculable(
            op,
            "cerrada",
            detalle,
            actual,
            informe.id,
            informe.idInfOp,
            advertencias,
            tarifa,
          ),
        );
        continue;
      }

      // --- Cálculo (el motor MUTA la op: siempre sobre un clon) ---

      const clon = structuredClone(op) as Operacion;

      const respuesta =
        nivel === "personalizada"
          ? this.valoresCliente.$facturarOpPersCliente(
              clon,
              tarifa as TarifaPersonalizadaCliente,
              tarifaGral,
            )
          : this.valoresCliente.$facturarOpCliente(
              clon,
              tarifa as TarifaGralCliente,
            );

      const v = respuesta.factura.valores;

      const nueva: ValoresLadoCliente = {
        tarifaBase: v.tarifaBase,
        acompValor: v.acompaniante,
        kmAdicional: v.kmMonto,
        adExtraValor: v.adExtra ?? 0,
        total: v.total,
      };

      const encontrada = mapaContraPartes.get(op.idOperacion);
      const contraParte: ContraParteRecalculo | null = encontrada
        ? {
            coleccion: encontrada.coleccion,
            idInfOp: encontrada.informe.idInfOp,
            idDoc: encontrada.informe.id,
            liquidada: encontrada.coleccion.startsWith("infOpLiq"),
            montoActual: encontrada.informe.contraParteMonto ?? 0,
            montoNuevo: nueva.total,
          }
        : null;

      if (!contraParte) {
        advertencias.push(
          "No se encontró el InformeOp de la contraparte (chofer/proveedor)",
        );
      }

      filas.push({
        idOperacion: op.idOperacion,
        idDocOperacion: op.id,
        fecha: String(op.fecha),
        estado: "cerrada",
        estadoDetalle: detalle,
        hojaRuta: op.hojaRuta,
        patente: op.patenteChofer,
        idTarifaActual: informe.idTarifa,
        idTarifaNueva: tarifa.idTarifa,
        informeClienteId: informe.id,
        informeClienteIdInfOp: informe.idInfOp,
        actual,
        nueva,
        diferencia: nueva.total - actual.total,
        contraParte,
        advertencias,
        recalculable: contraParte !== null,
      });
    }

    return filas;
  }

  // ===================================================================
  // APLICACIÓN
  // ===================================================================

  /**
   * Aplica el recálculo de un preview ya generado.
   *
   * dryRun = true recorre TODO el camino (relee documentos, valida, resuelve
   * los InformeLiq y calcula los deltas) sin escribir una sola vez. El
   * resultado es idéntico al que devolvería la corrida real.
   *
   * La atomicidad es POR OPERACIÓN: si una falla, las anteriores quedan
   * aplicadas y el proceso sigue. El reporte dice cuáles fallaron.
   */
  async aplicar(
    preview: PreviewRecalculo,
    opciones: {
      dryRun: boolean;
      onProgreso?: (hechas: number, total: number) => void;
    },
  ): Promise<ResultadoRecalculo> {
    const filas = preview.filas.filter((f) => f.recalculable && f.diferencia !== 0);

    const fallidas: ResultadoFila[] = [];
    const aplicadasOk: FilaRecalculo[] = [];

    let hechas = 0;

    for (const fila of filas) {
      try {
        if (fila.estado === "abierta") {
          await this.aplicarAbierta(fila, opciones.dryRun);
        } else {
          await this.aplicarCerrada(fila, opciones.dryRun);
        }
        aplicadasOk.push(fila);
      } catch (e: any) {
        fallidas.push({
          idOperacion: fila.idOperacion,
          exito: false,
          motivo: e?.message || "Error desconocido",
        });
      }

      hechas++;
      opciones.onProgreso?.(hechas, filas.length);
    }

    // Los InformeLiq se ajustan al final, agrupados por documento y con el
    // total recalculado como valor ABSOLUTO (idempotente).
    //
    // Se consideran TODAS las filas con contraparte liquidada, incluidas las
    // que ya tienen diferencia 0: así, si una corrida anterior se cortó en
    // este paso, volver a ejecutar Aplicar repara los totales aunque no
    // quede ninguna operación por recalcular.
    const idsFallidas = new Set(fallidas.map((f) => f.idOperacion));

    const filasParaLiq = preview.filas.filter(
      (f) =>
        f.recalculable &&
        f.contraParte?.liquidada === true &&
        !idsFallidas.has(f.idOperacion),
    );

    const { ajustes, sinInformeLiq, errores } =
      await this.resolverAjustesInformeLiq(filasParaLiq, opciones.dryRun);

    fallidas.push(...errores);

    if (!opciones.dryRun) {
      for (const aj of ajustes) {
        if (aj.delta === 0) continue;

        try {
          await updateDoc(
            doc(this.firestore, `${this.basePath}/resumenLiq/${aj.idDoc}`),
            { "valores.totalContraParte": aj.totalNuevo },
          );
        } catch (e: any) {
          fallidas.push({
            idOperacion: 0,
            exito: false,
            motivo: `No se pudo ajustar el InformeLiq ${aj.numeroInterno} (debería quedar en ${aj.totalNuevo}): ${e?.message}`,
          });
        }
      }
    }

    return {
      dryRun: opciones.dryRun,
      aplicadas: aplicadasOk.length,
      diferenciaAplicada: aplicadasOk.reduce((acc, f) => acc + f.diferencia, 0),
      fallidas,
      ajustesInformeLiq: ajustes,
      opsSinInformeLiq: sinInformeLiq,
    };
  }

  // --- Operación abierta: un solo documento, sin informes ni resúmenes ---

  private async aplicarAbierta(
    fila: FilaRecalculo,
    dryRun: boolean,
  ): Promise<void> {
    const opRef = doc(
      this.firestore,
      `${this.basePath}/operaciones/${fila.idDocOperacion}`,
    );

    const snap = await getDoc(opRef);
    if (!snap.exists()) {
      throw new Error("La operación ya no existe");
    }

    const op = snap.data() as Operacion;

    if (op.estado?.abierta !== true) {
      throw new Error(
        "La operación dejó de estar abierta desde que se generó el preview",
      );
    }

    if ((op.valores?.cliente?.aCobrar ?? 0) !== fila.actual.total) {
      throw new Error(
        `El valor cambió desde el preview (esperaba ${fila.actual.total}, hay ${op.valores?.cliente?.aCobrar})`,
      );
    }

    if (dryRun) return;

    await updateDoc(opRef, {
      "valores.cliente.tarifaBase": fila.nueva.tarifaBase,
      "valores.cliente.aCobrar": fila.nueva.total,
      "valores.cliente.acompValor": fila.nueva.acompValor,
    });
  }

  // --- Operación no abierta: batch atómico vía el método existente ---

  private async aplicarCerrada(
    fila: FilaRecalculo,
    dryRun: boolean,
  ): Promise<void> {
    if (!fila.informeClienteId || !fila.contraParte) {
      throw new Error("Faltan referencias del informe o de la contraparte");
    }

    // 1) Operación fresca
    const opRef = doc(
      this.firestore,
      `${this.basePath}/operaciones/${fila.idDocOperacion}`,
    );
    const opSnap = await getDoc(opRef);
    if (!opSnap.exists()) throw new Error("La operación ya no existe");

    const op = opSnap.data() as Operacion;

    if (op.estado?.proformaCl || op.estado?.proformaCh) {
      throw new Error(
        "La operación tiene una proforma emitida: recalcularla la dejaría desfasada",
      );
    }

    const detalle = this.getEstadoDetalle(op);
    if (this.bloqueadoPorEstado(detalle)) {
      throw new Error(
        "El informe del cliente fue liquidado desde que se generó el preview",
      );
    }

    // 2) InformeOp del cliente fresco + guarda de concurrencia
    const infRef = doc(
      this.firestore,
      `${this.basePath}/informesOpClientes/${fila.informeClienteId}`,
    );
    const infSnap = await getDoc(infRef);
    if (!infSnap.exists()) {
      throw new Error("El InformeOp del cliente ya no está en informesOpClientes");
    }

    const informe = { id: infSnap.id, ...(infSnap.data() as InformeOp) };

    if ((informe.valores?.total ?? 0) !== fila.actual.total) {
      throw new Error(
        `El InformeOp cambió desde el preview (esperaba ${fila.actual.total}, hay ${informe.valores?.total})`,
      );
    }

    // 3) Contraparte fresca + guarda de concurrencia
    const cpRef = doc(
      this.firestore,
      `${this.basePath}/${fila.contraParte.coleccion}/${fila.contraParte.idDoc}`,
    );
    const cpSnap = await getDoc(cpRef);
    if (!cpSnap.exists()) {
      throw new Error(
        `El InformeOp de la contraparte ya no está en ${fila.contraParte.coleccion}`,
      );
    }

    const contraParte = { id: cpSnap.id, ...(cpSnap.data() as InformeOp) };

    if ((contraParte.contraParteMonto ?? 0) !== fila.contraParte.montoActual) {
      throw new Error(
        `La contraparte cambió desde el preview (esperaba ${fila.contraParte.montoActual}, hay ${contraParte.contraParteMonto})`,
      );
    }

    // 4) Construir los objetos actualizados
    const opActualizada: Operacion = {
      ...op,
      valores: {
        ...op.valores,
        cliente: {
          ...op.valores.cliente,
          tarifaBase: fila.nueva.tarifaBase,
          acompValor: fila.nueva.acompValor,
          kmAdicional: fila.nueva.kmAdicional,
          aCobrar: fila.nueva.total,
        },
      },
    };

    const informeActualizado: ConId<InformeOp> = {
      ...informe,
      idTarifa: fila.idTarifaNueva,
      valores: {
        ...informe.valores,
        tarifaBase: fila.nueva.tarifaBase,
        acompaniante: fila.nueva.acompValor,
        kmMonto: fila.nueva.kmAdicional,
        adExtra: fila.nueva.adExtraValor,
        total: fila.nueva.total,
      },
    };

    const contraParteActualizada: ConId<InformeOp> = {
      ...contraParte,
      contraParteMonto: fila.nueva.total,
    };

    if (dryRun) return;

    // 5) Escritura atómica: op + informe + contraparte + delta de resúmenes.
    //    modo "liquidacion" => el método NO espera un InformeLiq.
    const resultado = await this.dbFirebase.actualizarOperacionInformeOpYFactura(
      opActualizada,
      informeActualizado,
      "informesOpClientes",
      "liquidacion",
      contraParteActualizada,
      fila.contraParte.coleccion,
    );

    if (!resultado.exito) {
      throw new Error(resultado.mensaje);
    }
  }

  // --- InformeLiq de la contraparte: total absoluto recalculado ---

  private getColLiqPorTipo(tipo: string): string | null {
    if (tipo === "chofer") return "infOpLiqChoferes";
    if (tipo === "proveedor") return "infOpLiqProveedores";
    return null;
  }

  private async resolverAjustesInformeLiq(
    filas: FilaRecalculo[],
    dryRun: boolean,
  ): Promise<{
    ajustes: AjusteInformeLiq[];
    sinInformeLiq: number[];
    errores: ResultadoFila[];
  }> {
    const sinInformeLiq: number[] = [];
    const errores: ResultadoFila[] = [];

    // 1) Agrupar las filas por InformeLiq.
    //    Caché: una liquidación agrupa muchas ops, así que bastan pocas
    //    consultas para cubrirlas a todas.
    const grupos = new Map<
      string,
      { idDoc: string; data: InformeLiq; filas: FilaRecalculo[] }
    >();
    const cache: { idDoc: string; operaciones: number[] }[] = [];

    for (const fila of filas) {
      if (!fila.contraParte?.liquidada) continue;

      let encontrado = cache.find((c) =>
        c.operaciones.includes(fila.idOperacion),
      );

      if (!encontrado) {
        const colRef = collection(this.firestore, `${this.basePath}/resumenLiq`);
        const q = query(
          colRef,
          where("operaciones", "array-contains", fila.idOperacion),
        );
        const snap = await getDocs(q);

        const docSnap = snap.docs.find((d) => {
          const il = d.data() as InformeLiq;
          return il.estado !== "anulado" && il.tipo !== "cliente";
        });

        if (!docSnap) {
          sinInformeLiq.push(fila.idOperacion);
          continue;
        }

        const data = docSnap.data() as InformeLiq;

        encontrado = { idDoc: docSnap.id, operaciones: data.operaciones ?? [] };
        cache.push(encontrado);

        if (!grupos.has(docSnap.id)) {
          grupos.set(docSnap.id, { idDoc: docSnap.id, data, filas: [] });
        }
      }

      grupos.get(encontrado.idDoc)?.filas.push(fila);
    }

    // 2) Por cada InformeLiq, recalcular el total desde los informes reales.
    const ajustes: AjusteInformeLiq[] = [];

    for (const g of grupos.values()) {
      const coleccion = this.getColLiqPorTipo(g.data.tipo);

      if (!coleccion) {
        errores.push({
          idOperacion: 0,
          exito: false,
          motivo: `InformeLiq ${g.data.numeroInterno}: tipo "${g.data.tipo}" inesperado, no se ajusta`,
        });
        continue;
      }

      const idsOps = g.data.operaciones ?? [];

      const res = await this.dbFirebase.obtenerDocsPorIdsOperacion(
        coleccion,
        idsOps,
      );

      // Guarda de integridad: si falta algún informe, la suma quedaría
      // incompleta y escribiríamos un total MENOR al real. No se escribe.
      if (res.idsFaltantes.length > 0) {
        errores.push({
          idOperacion: 0,
          exito: false,
          motivo: `InformeLiq ${g.data.numeroInterno}: faltan ${res.idsFaltantes.length} de ${idsOps.length} informes en ${coleccion}. No se ajusta para no escribir un total incompleto.`,
        });
        continue;
      }

      const informes = res.encontrados as ConId<InformeOp>[];

      const sumaLeida = informes.reduce(
        (acc, i) => acc + (i.contraParteMonto ?? 0),
        0,
      );

      const sumaDeltas = g.filas.reduce(
        (acc, f) =>
          acc + (f.contraParte!.montoNuevo - f.contraParte!.montoActual),
        0,
      );

      // En simulacro los montos nuevos todavía no están en disco, así que el
      // total nuevo se proyecta. En la corrida real ya están escritos cuando
      // se llega hasta acá, así que la suma leída ES el total nuevo.
      // El total actual es el que está GUARDADO en el InformeLiq: si se
      // derivara de la suma, en una corrida de reparación (deltas en 0) daría
      // igual al nuevo y nunca se escribiría.
      const totalActual = g.data.valores?.totalContraParte ?? 0;
      const totalNuevo = dryRun ? sumaLeida + sumaDeltas : sumaLeida;

      ajustes.push({
        idDoc: g.idDoc,
        numeroInterno: g.data.numeroInterno,
        tipo: g.data.tipo,
        totalActual,
        totalNuevo,
        delta: totalNuevo - totalActual,
        cantidadOps: g.filas.length,
        cantidadOpsTotal: idsOps.length,
      });
    }

    return { ajustes, sinInformeLiq, errores };
  }

  // ===================================================================
  // HELPERS
  // ===================================================================

  // En una op abierta, acompValor puede haber quedado grabado en el alta con
  // la tarifa vieja (lo hace la carga múltiple). No suma al total hasta el
  // cierre, pero se recalcula igual para no dejar un valor desfasado visible
  // en el tablero y en el modal de cierre.
  // Para tarifa personalizada el acompañante sale de la tarifa GENERAL, igual
  // que en $facturarOpPersCliente.
  private calcularAcompaniante(
    op: Operacion,
    tarifa: any,
    nivel: NivelTarifa,
  ): number {
    if (!op.acompaniante) return 0;

    const valorUnitario =
      nivel === "personalizada"
        ? (this.getTarifaGeneral()?.adicionales?.acompaniante ?? 0)
        : ((tarifa as TarifaGralCliente).adicionales?.acompaniante ?? 0);

    return valorUnitario * (op.acompanienteCant ?? 1);
  }

  private valoresDesdeOp(op: Operacion): ValoresLadoCliente {
    return {
      tarifaBase: op.valores?.cliente?.tarifaBase ?? 0,
      acompValor: op.valores?.cliente?.acompValor ?? 0,
      kmAdicional: op.valores?.cliente?.kmAdicional ?? 0,
      adExtraValor: op.valores?.cliente?.adExtraValor ?? 0,
      total: op.valores?.cliente?.aCobrar ?? 0,
    };
  }

  private filaNoRecalculable(
    op: ConId<Operacion>,
    estado: "abierta" | "cerrada",
    estadoDetalle: EstadoDetalleRecalculo,
    actual: ValoresLadoCliente,
    informeClienteId: string | null,
    informeClienteIdInfOp: number | null,
    advertencias: string[],
    tarifa: any,
  ): FilaRecalculo {
    return {
      idOperacion: op.idOperacion,
      idDocOperacion: op.id,
      fecha: String(op.fecha),
      estado,
      estadoDetalle,
      hojaRuta: op.hojaRuta,
      patente: op.patenteChofer,
      idTarifaActual: 0,
      idTarifaNueva: tarifa?.idTarifa ?? 0,
      informeClienteId,
      informeClienteIdInfOp,
      actual,
      nueva: { ...actual },
      diferencia: 0,
      contraParte: null,
      advertencias,
      recalculable: false,
    };
  }

  private calcularTotales(filas: FilaRecalculo[]) {
    return {
      cantidadAbiertas: filas.filter(
        (f) => f.estado === "abierta" && f.recalculable,
      ).length,
      cantidadCerradas: filas.filter(
        (f) => f.estado === "cerrada" && f.recalculable,
      ).length,
      cantidadNoRecalculables: filas.filter((f) => !f.recalculable).length,
      diferenciaTotal: filas
        .filter((f) => f.recalculable)
        .reduce((acc, f) => acc + f.diferencia, 0),
    };
  }
}
