import { Injectable, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject, merge } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Firestore, Transaction, writeBatch, doc, collection, query, where, getDocs, getDoc } from '@angular/fire/firestore';
import { Operacion } from 'src/app/interfaces/operacion';
import { ConId } from 'src/app/interfaces/conId';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { Asignacion, AsignacionItem } from 'src/app/interfaces/asignacion';
import { DbFirestoreService, EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { OperacionFactoryService } from 'src/app/servicios/operaciones/operacion-factory.service';
import { AsignacionService } from 'src/app/servicios/operaciones/asignacion.service';
import { ValoresOpService } from 'src/app/servicios/valores-op/valores-op/valores-op.service';
import { ValoresTarifaService } from 'src/app/servicios/tarifario/valores-tarifa.service';
import { FormatoNumericoService } from 'src/app/servicios/formato-numerico/formato-numerico.service';
import { NumeradorService } from 'src/app/servicios/numerador/numerador.service';
import { LogRegistroService } from 'src/app/servicios/log-registro/log-registro.service';
import { PapeleraService } from 'src/app/servicios/papelera/papelera.service';
import { InformeOpService } from 'src/app/servicios/informes-op/informe-op.service';
import { ResumenOpCalculatorService } from 'src/app/servicios/reportes/reportes-op/resumen-op-calculator.service';
import { ReportesOpService } from 'src/app/servicios/reportes/reportes-op/reportes-op.service';
import { Resultado } from 'src/app/interfaces/resultado';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import { AnulacionInformeOp } from 'src/app/interfaces/informe-op-nuevo';

export interface OperacionCreada {
  item:      AsignacionItem;
  operacion: Operacion;
}

export interface ResultadoCreacionOps {
  creadas: OperacionCreada[];
  errores: ErrorCreacionOp[];
}

export interface ErrorCreacionOp {
  idItem:    string;
  idCliente: string;
  motivo:    string;
}

@Injectable({ providedIn: 'root' })
export class OperacionService implements OnDestroy {

  private _operaciones$ = new BehaviorSubject<ConId<Operacion>[]>([]);
  public operaciones$ = this._operaciones$.asObservable();

  private destroy$       = new Subject<void>();
  private cancelarRango$ = new Subject<void>();
  private firestore = inject(Firestore);

  constructor(
    private db:               DbFirestoreService,
    private clienteService:   ClienteService,
    private choferService:    ChoferService,
    private proveedorService: ProveedorService,
    private operacionFactory: OperacionFactoryService,
    private valoresServ:      ValoresOpService,
    private valoresTarifaServ: ValoresTarifaService,
    private formNumServ:      FormatoNumericoService,
    private numeradorService: NumeradorService,
    private asignacionService: AsignacionService,
    private logRegistro:      LogRegistroService,
    private papeleraService:  PapeleraService,
    private informeOpServ:    InformeOpService,
    private resumenOpCalculator: ResumenOpCalculatorService,
    private reportesOp: ReportesOpService,
    private usuarioSesion: UsuarioSesionService,
  ) {}

  /**
   * Carga las operaciones de un rango de fechas. Reemplaza por completo el contenido
   * del observable (no acumula). Cada llamada cancela la suscripción del rango anterior
   * para evitar streams superpuestos.
   * @param desde fecha ISO 'YYYY-MM-DD'
   * @param hasta fecha ISO 'YYYY-MM-DD'
   * @param orden 'asc' | 'desc'
   */
  cargarOperaciones(desde: string, hasta: string, orden: 'asc' | 'desc' = 'desc'): void {
    this.cancelarRango$.next();

    this.db.getAllByDateValue<Operacion>('operaciones', 'fecha', desde, hasta, orden)
      .pipe(takeUntil(merge(this.destroy$, this.cancelarRango$)))
      .subscribe(docs => {
        const ops = docs.map(d => ({ ...d, idOperacion: d.id })) as ConId<Operacion>[];
        this._operaciones$.next(ops);
      });
  }

  getOperacionesActuales(): ConId<Operacion>[] {
    return this._operaciones$.getValue();
  }

  /** Consulta puntual por id — un solo get, no live. Simétrico a
   *  InformeOpService.obtenerPorId(); usado para cargar la Operación
   *  asociada a un InformeOp antes de recalcular valores (modal de
   *  edición de InformeOp, en diseño). */
  async obtenerPorId(idOperacion: string): Promise<ConId<Operacion> | null> {
    const operacion = await this.db.getById<Operacion>('operaciones', idOperacion);
    if (!operacion) return null;
    return { id: idOperacion, ...operacion, idOperacion };
  }

  /** Operaciones abiertas de un período — usado para advertir en los
   *  listados de InformeOp si la entidad tiene operaciones sin cerrar
   *  dentro del rango que se está por liquidar. Mismo método genérico de
   *  DbFirestoreService que usaba el modelo viejo (getAllByDateValueField),
   *  con el campo/valor del modelo nuevo ('estado.ciclo' === 'abierta' en
   *  vez de 'estado.abierta' === true). Pese al tipo Observable, es un
   *  one-shot (getDocs, no onSnapshot) — mismo criterio que el resto de
   *  getAllByDateValueField; el caller lo consume con take(1). */
  observarAbiertasPorPeriodo(desde: string, hasta: string): Observable<ConId<Operacion>[]> {
    return this.db.getAllByDateValueField<Operacion>(
      'operaciones', 'fecha', desde, hasta, 'estado.ciclo', 'abierta',
    );
  }

  /**
   * Construye las operaciones base a partir de una lista de items de asignación.
   * Resuelve cliente/chofer/proveedor/vehículo por ID contra los services en memoria
   * y delega la construcción al factory. NO persiste. Devuelve las operaciones creadas
   * y la lista de items que no se pudieron resolver (para que el componente avise).
   */
  crearOperacionesDesdeAsignacion(items: AsignacionItem[], fecha: string): ResultadoCreacionOps {
    const creadas: OperacionCreada[] = [];
    const errores: ErrorCreacionOp[] = [];

    const clientes    = this.clienteService.getClientesActuales();
    const choferes    = this.choferService.getChoferesActuales();
    const proveedores = this.proveedorService.getProveedoresActuales();
    const vehiculos   = this.choferService.getVehiculosActuales();

    for (const item of items) {
      const cliente = clientes.find(c => c.id === item.idCliente);
      if (!cliente) {
        errores.push({ idItem: item.idItem, idCliente: item.idCliente, motivo: `Cliente ${item.idCliente} no encontrado` });
        continue;
      }

      // Extraer sujeto como const para que TypeScript estreche la union discriminada en el switch.
      const sujeto = item.sujeto;

      // Resolver vehículo (común a ambos tipos de sujeto).
      let vehiculo: ConId<Vehiculo> | null = null;
      if (sujeto.idVehiculo !== null) {
        const v = vehiculos.find(v => v.id === sujeto.idVehiculo);
        if (!v) {
          errores.push({ idItem: item.idItem, idCliente: item.idCliente, motivo: `Vehículo ${sujeto.idVehiculo} no encontrado` });
          continue;
        }
        vehiculo = v;
      }

      let chofer: ConId<Chofer> | null = null;
      let proveedor: ConId<Proveedor> | null = null;

      switch (sujeto.tipo) {
        case 'directo': {
          const c = choferes.find(c => c.id === sujeto.idChofer);
          if (!c) {
            errores.push({ idItem: item.idItem, idCliente: item.idCliente, motivo: `Chofer ${sujeto.idChofer} no encontrado` });
            continue;
          }
          chofer = c;
          break;
        }
        case 'proveedor': {
          const p = proveedores.find(p => p.id === sujeto.idProveedor);
          if (!p) {
            errores.push({ idItem: item.idItem, idCliente: item.idCliente, motivo: `Proveedor ${sujeto.idProveedor} no encontrado` });
            continue;
          }
          proveedor = p;
          if (sujeto.idChofer !== null) {
            const c = choferes.find(c => c.id === sujeto.idChofer);
            if (!c) {
              errores.push({ idItem: item.idItem, idCliente: item.idCliente, motivo: `Chofer ${sujeto.idChofer} del proveedor no encontrado` });
              continue;
            }
            chofer = c;
          }
          break;
        }
      }

      const op = this.operacionFactory.crearOperacionBase({
        cliente,
        chofer,
        vehiculo,
        proveedor,
        fecha,
        observacion: item.observacion,
        hojaDeRuta:  item.hojaDeRuta,
      });

      creadas.push({ item, operacion: op });
    }

    return { creadas, errores };
  }

  /** Copia op.valoresNuevos (calculado por ValoresTarifaService.calcularAlta,
   *  que corre ANTES en el loop de altaDesdeAsignacion) a la estructura vieja
   *  op.valores — única fuente de valores desde Bloque 7 Paso 2. Si
   *  valoresNuevos quedó en null (algún lado no se pudo resolver — ya
   *  registrado en el log de actividad por altaDesdeAsignacion) op.valores
   *  queda en los ceros que trae crearOperacionBase. */
  calcularValoresIniciales(op: Operacion): Operacion {
    if (op.valoresNuevos) {
      op.valores = {
        cliente: { ...op.valoresNuevos.cliente },
        chofer: { ...op.valoresNuevos.chofer },
      };
    }
    return op;
  }

  /** Alta atómica de N operaciones + el tablero de la fecha, desde OperacionCreada[].
   *  Recibe las ops FINALES (completadas en operaciones-table). Calcula valores,
   *  reconstruye el sujeto y el ref del item desde la op y persiste atómicamente.
   *  NOTA anti-duplicado: el bloqueo del botón durante la llamada es responsabilidad
   *  del COMPONENTE (no acá). */
  async altaDesdeAsignacion(
    fecha: string,
    creadas: OperacionCreada[],
    siExisteBorrador: 'reemplazar' | 'bloquear' = 'reemplazar',
  ): Promise<Resultado<{ creadas: OperacionCreada[]; errores: ErrorCreacionOp[] }>> {

    // 3. CALCULAR VALORES + RECONSTRUIR SUJETO/REF DESDE OP FINAL (un solo recorrido, antes de tocar red)
    for (const c of creadas) {
      // Sistema nuevo de Tarifas: resuelve jerarquía y calcula valoresNuevos.
      // Corre ANTES de calcularValoresIniciales — desde Bloque 7 Paso 2,
      // valoresNuevos es la única fuente de op.valores (ver ese método). No
      // bloquea el alta si no puede resolver: deja tarifaAplicada*/valoresNuevos
      // en null para ese lado y lo registra en el log de actividad.
      const resultadoTarifaNueva = this.valoresTarifaServ.calcularAlta(c.operacion);
      c.operacion = resultadoTarifaNueva.op;
      if (resultadoTarifaNueva.errores.length > 0) {
        await this.logRegistro.registrarError(
          'ALTA', 'operaciones', fecha,
          `Tarifa nueva no resuelta al alta (cliente ${c.operacion.cliente.id}, chofer ${c.operacion.chofer.id}): ` +
          resultadoTarifaNueva.errores.join(' | '),
        );
      }

      c.operacion = this.calcularValoresIniciales(c.operacion);

      const op   = c.operacion;
      const tipo = this.choferService.getTipoContratacion(op.chofer.id);

      if (!tipo) {
        return {
          exito: false,
          mensaje: `No se pudo resolver la contratación del chofer ${op.chofer.id}. ` +
                   `No se guardó ninguna operación.`,
          objeto: { creadas, errores: [] },
        };
      }

      if (tipo === 'proveedor') {
        if (!op.proveedor) {
          return {
            exito: false,
            mensaje: `La operación de un chofer de proveedor no tiene proveedor ` +
                     `asignado. No se guardó ninguna operación.`,
            objeto: { creadas, errores: [] },
          };
        }
        c.item.sujeto = {
          tipo: 'proveedor',
          idProveedor: op.proveedor.id,
          idChofer:    op.chofer.id,
          idVehiculo:  op.vehiculo.id,
        };
      } else {
        c.item.sujeto = {
          tipo: 'directo',
          idChofer:   op.chofer.id,
          idVehiculo: op.vehiculo.id,
        };
      }

      // Reconstruye el ref con los datos reales de la op final. Para tablero-asignaciones
      // es idempotente (ya viene correcto desde el pool). Para carga-multiple (o cualquier
      // caller que no conozca el vehículo específico al armar el item), corrige el
      // placeholder inicial (dominio:'', categoria:{catOrden:0,nombre:''}) con los datos
      // reales una vez que operaciones-editor resolvió el vehículo pendiente. Único punto
      // de verdad para "cómo se ve un AsignacionItem persistido".
      c.item.ref = {
        dominio:   op.vehiculo.dominio,
        categoria: op.vehiculo.categoria,
        asignadoA: tipo === 'proveedor'
          ? { tipo: 'proveedor', idProveedor: op.proveedor!.id, razonSocial: op.proveedor!.razonSocial }
          : { tipo: 'chofer', idChofer: op.chofer.id, nombre: op.chofer.nombre, apellido: op.chofer.apellido },
      };
    }

    // 3.5. TABLERO EXISTENTE — leer para decidir si hay que bloquear por borrador sin confirmar
    const existente = await this.asignacionService.getTableroPorFecha(fecha);
    if (existente !== null && existente.asignado === false && siExisteBorrador === 'bloquear') {
      return {
        exito: false,
        mensaje: `Existe un borrador de tablero sin confirmar para el ${fecha}. ` +
                 `Para dar de alta estas operaciones primero debe resolver ese borrador ` +
                 `desde el Tablero de Asignaciones (guardarlo, confirmarlo o eliminarlo).`,
        objeto: { creadas, errores: [] },
      };
    }

    // 4. VALIDAR PENDIENTES — al alta, chofer y vehículo deben estar resueltos SIEMPRE
    const pendientes = creadas.filter(c => !c.operacion.chofer.id || !c.operacion.vehiculo.id);
    if (pendientes.length > 0) {
      return {
        exito: false,
        mensaje: `Hay ${pendientes.length} operación(es) sin chofer o vehículo asignado. ` +
                 `Complete la selección antes de dar de alta.`,
        objeto: { creadas, errores: [] },
      };
    }

    try {
      // 5. IDS + NÚMEROS (toca red: 1 transacción para los números)
      const numeros = await this.numeradorService.reservarRangoOperaciones(creadas.length);

      creadas.forEach((c, i) => {
        c.operacion.idOperacion     = this.db.generarId('operaciones'); // doc id real, sin escribir
        c.operacion.numeroOperacion = numeros[i];                       // posicional: rango ordenado
        c.item.idOperacion          = c.operacion.idOperacion;          // liga item↔op (item por referencia)
      });

      // 6. ARMAR TABLERO — items ya tienen idOperacion y sujeto reconstruido
      const itemsPrevios = (existente && existente.asignado === true) ? existente.items : [];
      const asignacion = this.asignacionService.confirmarTablero(
        fecha, [...itemsPrevios, ...creadas.map(c => c.item)]);

      // 7. ESCRIBIR (batch atómico): ops 'crear', tablero 'reemplazar'
      const escrituras: EscrituraBatch[] = [
        ...creadas.map(c => ({
          coleccion: 'operaciones',
          id: c.operacion.idOperacion,
          data: this.opToFirestore(c.operacion),
          modo: 'crear' as const,
        })),
        {
          coleccion: 'asignaciones',
          id: fecha,
          data: this.asignacionService.asignacionToFirestore(asignacion),
          modo: 'reemplazar' as const,
        },
      ];

      // 8. LOG — un registro por el alta (acción principal), agregado AL MISMO
      // batch antes de commitear (mecanismo LogRegistroService, ver interfaces/registro-log.ts)
      await this.logRegistro.agregarAlBatch(
        escrituras, 'ALTA', 'operaciones',
        fecha, `Alta de ${creadas.length} operación(es) — tablero ${fecha}`,
      );

      await this.db.commitBatch(escrituras);

      // 9. RESULTADO
      return {
        exito: true,
        mensaje: `${creadas.length} operación(es) dada(s) de alta correctamente.`,
        objeto: { creadas, errores: [] },
      };

    } catch (e: any) {
      await this.logRegistro.registrarError(
        'ALTA', 'operaciones', fecha,
        `Error en alta de operaciones — tablero ${fecha}: ${e?.message ?? e}`,
      );
      return {
        exito: false,
        mensaje: `Error al guardar las operaciones: ${e?.message ?? e}. No se guardó ninguna.`,
        objeto: { creadas, errores: [] },
      };
    }
  }

  // ---- Baja — piezas encapsuladas ----

  /** Reglas de baja de una operación. `cicloEsperado`: 'abierta' (baja
   *  desde Operaciones) o 'cerrada' (baja desde Liquidación, vía un
   *  InformeOp). Devuelve el motivo del rechazo, o null si se puede. */
  validarBaja(op: Operacion, cicloEsperado: 'abierta' | 'cerrada'): string | null {
    const num = op.numeroOperacion ?? op.idOperacion;
    if (op.estado.liquidacion.cliente || op.estado.liquidacion.chofer) {
      return `La operación ${num} está liquidada (total o parcialmente). No se puede dar de baja.`;
    }
    if (op.estado.proforma.cliente || op.estado.proforma.chofer) {
      return `La operación ${num} está en un borrador de liquidación. Eliminá el borrador antes de darla de baja.`;
    }
    if (op.estado.ciclo !== cicloEsperado) {
      return op.estado.ciclo === 'cerrada'
        ? `La operación ${num} está cerrada: se da de baja desde Liquidación.`
        : `La operación ${num} está en ciclo '${op.estado.ciclo}' (se esperaba '${cicloEsperado}').`;
    }
    return null;
  }

  /** Relee la operación dentro de la transacción (patrón ConId). Aborta si
   *  no existe. */
  private async leerOperacionEnTransaccion(tx: Transaction, idOperacion: string): Promise<ConId<Operacion>> {
    const data = await this.db.leerEnTransaccion<Operacion>(tx, 'operaciones', idOperacion);
    if (!data) throw new Error(`La operación ${idOperacion} no existe.`);
    return { ...data, idOperacion, id: idOperacion };
  }

  /** Escrituras comunes a toda baja de operación: delete de la operación +
   *  evento de papelera (la operación tal como estaba, objeto principal) +
   *  item del tablero anulado con el motivo. No commitea, no loguea: cada
   *  orquestador (bajaOperacion / bajaOperacionCerrada) suma lo suyo y un
   *  único log. Devuelve el id del evento de papelera. */
  agregarEscriturasBaja(
    escrituras: EscrituraBatch[],
    op: ConId<Operacion>,
    tablero: Asignacion,
    motivo: string,
  ): string {
    escrituras.push({ coleccion: 'operaciones', id: op.idOperacion, data: null, modo: 'eliminar' });
    const idEvento = this.papeleraService.prepararBajaEnBatch(escrituras, motivo, [
      { coleccion: 'operaciones', id: op.idOperacion, data: this.opToFirestore(op), principal: true },
    ]);
    this.asignacionService.agregarEscrituraAnularItem(escrituras, tablero, op.idOperacion, motivo);
    return idEvento;
  }

  /** Baja de una operación ABIERTA (caller: tablero-op). Transacción: relee
   *  la operación y el tablero, valida (validarBaja 'abierta') y arma
   *  agregarEscriturasBaja + un log BAJA. Una operación cerrada se rechaza:
   *  se da de baja desde Liquidación (bajaOperacionCerrada). */
  async bajaOperacion(op: ConId<Operacion>, motivo: string): Promise<Resultado<void>> {
    try {
      await this.db.commitEnTransaccion<void>(async (tx) => {
        const escrituras: EscrituraBatch[] = [];

        const actual = await this.leerOperacionEnTransaccion(tx, op.idOperacion);
        const rechazo = this.validarBaja(actual, 'abierta');
        if (rechazo) throw new Error(rechazo);
        const tablero = await this.asignacionService.leerTableroEnTransaccion(tx, actual.fecha);
        if (!tablero) {
          throw new Error(
            `Inconsistencia: no existe tablero de asignaciones para la fecha ${actual.fecha} ` +
            `de la operación ${actual.numeroOperacion}. Baja abortada.`,
          );
        }
        // — fin de lecturas —

        this.agregarEscriturasBaja(escrituras, actual, tablero, motivo);
        await this.logRegistro.agregarAlBatch(
          escrituras, 'BAJA', 'operaciones', actual.idOperacion,
          `Baja de operación ${actual.numeroOperacion} (abierta) — motivo: ${motivo}`,
        );

        return { escrituras, resultado: undefined };
      });
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'BAJA', 'operaciones', op.idOperacion, `Error en baja de operación ${op.idOperacion}: ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: e?.message ?? String(e) };
    }

    return { exito: true, mensaje: `Operación ${op.numeroOperacion} dada de baja correctamente.` };
  }

  /** Baja de una operación CERRADA desde Liquidación, a partir de uno de sus
   *  InformeOp (caller: InformeOpListado). Transacción: relee el InformeOp,
   *  su contraparte, la operación, el tablero y los resúmenes; valida;
   *  arma agregarEscriturasBaja + anulación de los dos InformeOp +
   *  reversión de resúmenes + un único log BAJA. Los InformeOp NO se borran:
   *  quedan 'anulado' (InformeOpListado solo consulta activo/proforma).
   *  TODO: InformeVenta del cierre (comisiones) quedan sin tocar. */
  async bajaOperacionCerrada(idInfOp: string, motivo: string): Promise<Resultado<void>> {
    try {
      const numero = await this.db.commitEnTransaccion<number>(async (tx) => {
        const escrituras: EscrituraBatch[] = [];

        const informe = await this.informeOpServ.leerEnTransaccion(tx, idInfOp);
        if (!informe) throw new Error(`No existe el InformeOp ${idInfOp}.`);
        const idContra = informe.contraParte?.idInfOp;
        const contraparte = idContra ? await this.informeOpServ.leerEnTransaccion(tx, idContra) : null;
        if (!contraparte) {
          throw new Error(
            `Inconsistencia: no existe el InformeOp de la contraparte (${idContra ?? 'sin id'}). Baja abortada.`,
          );
        }
        const op = await this.leerOperacionEnTransaccion(tx, informe.idOperacion);
        if (contraparte.idOperacion !== op.idOperacion) {
          throw new Error(
            `Inconsistencia: la contraparte ${contraparte.idInfOp} pertenece a otra operación. Baja abortada.`,
          );
        }
        const rechazo = this.validarBaja(op, 'cerrada');
        if (rechazo) throw new Error(rechazo);
        for (const inf of [informe, contraparte]) {
          if (inf.estado !== 'activo' || inf.idInfLiq) {
            throw new Error(
              `El informe ${inf.idInfOp} (${inf.tipo}) está en estado '${inf.estado}'. ` +
              `No se puede dar de baja la operación ${op.numeroOperacion}.`,
            );
          }
        }
        const tablero = await this.asignacionService.leerTableroEnTransaccion(tx, op.fecha);
        if (!tablero) {
          throw new Error(
            `Inconsistencia: no existe tablero de asignaciones para la fecha ${op.fecha} ` +
            `de la operación ${op.numeroOperacion}. Baja abortada.`,
          );
        }
        const omitidos = op.resumenProcesado
          ? await this.reportesOp.agregarEscriturasResumenReversion(
              tx, escrituras, this.resumenOpCalculator.generarUpdatesEliminacion(op))
          : [];
        // — fin de lecturas —

        const idEvento = this.agregarEscriturasBaja(escrituras, op, tablero, motivo);
        const anulacion: AnulacionInformeOp = {
          motivo,
          usuario: this.usuarioSesion.getUsuarioActual()?.email ?? 'Desconocido',
          fecha: new Date().toISOString(),
          idEventoPapelera: idEvento,
        };
        this.informeOpServ.agregarAnulacionInformeOp(escrituras, informe.idInfOp, anulacion);
        this.informeOpServ.agregarAnulacionInformeOp(escrituras, contraparte.idInfOp, anulacion);

        let detalle =
          `Baja de operación ${op.numeroOperacion} (cerrada) desde Liquidación — motivo: ${motivo} — ` +
          `InformeOp anulados: ${informe.idInfOp}, ${contraparte.idInfOp}`;
        if (!op.resumenProcesado) detalle += ' — sin reversión de resúmenes (no procesada)';
        if (omitidos.length > 0) detalle += ` — resúmenes inexistentes omitidos: ${omitidos.join(', ')}`;
        await this.logRegistro.agregarAlBatch(escrituras, 'BAJA', 'operaciones', op.idOperacion, detalle);

        return { escrituras, resultado: op.numeroOperacion };
      });

      return { exito: true, mensaje: `Operación ${numero} dada de baja correctamente.` };
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'BAJA', 'operaciones', idInfOp,
        `Error en baja de operación cerrada (InformeOp ${idInfOp}): ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: e?.message ?? String(e) };
    }
  }

  /** Restaura una operación desde papelera. SIEMPRE queda 'abierta'. Si la
   *  op estaba 'cerrada' antes de la baja, sus InformeOp quedaron
   *  'anulados' (no se reconstruyen, ver bajaOperacionCerrada) — hay que
   *  volver a cerrarla manualmente después de restaurar, lo que genera un
   *  par de InformeOp nuevo. */
  async restaurarOperacion(idEvento: string): Promise<Resultado<void>> {

    const escrituras: EscrituraBatch[] = [];
    const { evento, objetos } = await this.papeleraService.prepararRestauracionEnBatch(escrituras, idEvento);
    if (evento.coleccionPrincipal !== 'operaciones') {
      return {
        exito: false,
        mensaje: `El evento de papelera ${idEvento} no corresponde a una Operación ` +
                 `(coleccionPrincipal: ${evento.coleccionPrincipal}).`,
      };
    }
    const principal = objetos.find(o => o.principal)!;

    const op: ConId<Operacion> = { ...principal.data, idOperacion: principal.idOriginal, id: principal.idOriginal };
    op.estado = this.operacionFactory.estadoInicial();
    op.km = 0;
    // Una op que estaba cerrada vuelve sin rastro del cierre anterior: sin
    // esto, cerrarOperacion la rechaza por resumenProcesado y los ids de
    // InformeOp apuntan a informes anulados.
    op.resumenProcesado = false;
    op.informeOpCliente = '';
    op.informeOpChofer = '';

    const tablero = await this.asignacionService.getTableroPorFecha(op.fecha);
    if (!tablero) {
      return {
        exito: false,
        mensaje: `Inconsistencia: no existe tablero de asignaciones para la fecha ` +
                 `${op.fecha} de la operación ${op.idOperacion}. Restauración abortada.`,
      };
    }
    const items = this.asignacionService.reactivarItemEnLista(tablero.items, op.idOperacion);

    escrituras.push(
      { coleccion: 'operaciones', id: op.idOperacion, data: this.opToFirestore(op), modo: 'crear' },
      {
        coleccion: 'asignaciones', id: op.fecha,
        data: this.asignacionService.asignacionToFirestore({ ...tablero, items }),
        modo: 'reemplazar',
      },
    );

    await this.logRegistro.agregarAlBatch(
      escrituras, 'RESTAURAR', 'operaciones', op.idOperacion, `Operación ${op.idOperacion} restaurada desde papelera`,
    );

    try {
      await this.db.commitBatch(escrituras);
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'RESTAURAR', 'operaciones', op.idOperacion, `Error al restaurar operación ${op.idOperacion}: ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: `Error al restaurar la operación: ${e?.message ?? e}.` };
    }

    return { exito: true, mensaje: `Operación ${op.idOperacion} restaurada correctamente.` };
  }

  /** Edita una operación de forma atómica: doc de la operación + su log EDITAR +
   *  sincronización de observaciones/hoja de ruta en el tablero de asignaciones
   *  (item por idOperacion) + el log EDITAR de esa sincronización — un solo
   *  commitBatch. Reemplaza al viejo StorageService.updateItem +
   *  TableroService.actualizarAsignacionDesdeOperacion (dos escrituras separadas,
   *  no atómicas). */
  async editarOperacion(op: ConId<Operacion>, msj: string = 'Edición de Operación'): Promise<Resultado<void>> {
    const escrituras: EscrituraBatch[] = [
      { coleccion: 'operaciones', id: op.idOperacion, data: this.opToFirestore(op), modo: 'reemplazar' },
    ];
    await this.logRegistro.agregarAlBatch(escrituras, 'EDITAR', 'operaciones', op.idOperacion, msj);
    await this.asignacionService.agregarEscrituraActualizarItem(
      escrituras, op.fecha, op.idOperacion, op.observaciones ?? '', op.hojaRuta ?? '',
    );

    try {
      await this.db.commitBatch(escrituras);
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'EDITAR', 'operaciones', op.idOperacion, `Error al editar operación ${op.idOperacion}: ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: `Error al guardar la edición: ${e?.message ?? e}.` };
    }

    return { exito: true, mensaje: `Operación ${op.idOperacion} editada correctamente.` };
  }

  /** Cierra una operación: calcula los valores del motor nuevo de Tarifas,
   *  arma el par de InformeOpNuevo (InformeOpService.crearPar) y persiste
   *  todo atómicamente en un único writeBatch — Operación (estado.ciclo →
   *  'cerrada', informeOpCliente/informeOpChofer, resumenProcesado), los 2
   *  InformeOpNuevo, los InformeVenta de comisión (si corresponde), el log
   *  y los resúmenes de Reportes (DbFirestoreService.aplicarUpdatesResumen).
   *  Reemplaza a ValoresOpService.facturarOperacion →
   *  DbFirestoreService.guardarFacturasOp (esa cadena queda eliminada).
   *  Guardas previas al batch: anti-duplicado de InformeOp
   *  (InformeOpService.existeParaOperacion) y resumenProcesado — mismo
   *  criterio que tenía guardarFacturasOp. Registrar la tarifa eventual (si
   *  corresponde) queda deliberadamente FUERA del batch — best-effort ya
   *  existente en ValoresTarifaService, mismo criterio que el resto de esa
   *  clase (ver registrarEventualSiCorresponde). */
  async cerrarOperacion(op: ConId<Operacion>, msj: string = 'Cierre de Operación'): Promise<Resultado<void>> {
    try {
      if (await this.informeOpServ.existeParaOperacion(op.idOperacion)) {
        return { exito: false, mensaje: `Ya existe un InformeOp para la operación ${op.idOperacion}.` };
      }

      const docOpRef = doc(this.firestore, `/Vantruck/datos/operaciones/${op.idOperacion}`);
      const opDocSnap = await getDoc(docOpRef);
      if (!opDocSnap.exists()) {
        return { exito: false, mensaje: `No se encontró la operación ${op.idOperacion}.` };
      }
      if ((opDocSnap.data() as Operacion).resumenProcesado) {
        return { exito: false, mensaje: `La operación ${op.idOperacion} ya fue procesada en resúmenes.` };
      }

      const { valoresCliente, valoresOtro, tipoOtro, informesVenta } = this.valoresServ.calcularValoresCierre(op);
      const { informeCliente, informeOtro } = this.informeOpServ.crearPar(op, valoresCliente, valoresOtro, tipoOtro);

      op.estado = {
        ciclo: 'cerrada',
        liquidacion: { cliente: false, chofer: false },
        proforma: { cliente: false, chofer: false },
      };
      op.informeOpCliente = informeCliente.idInfOp;
      op.informeOpChofer = informeOtro.idInfOp;

      const batch = writeBatch(this.firestore);

      if (informesVenta.length > 0) {
        const colVenta = collection(this.firestore, `/Vantruck/datos/informesVenta`);
        for (const infVenta of informesVenta) {
          const qVenta = query(colVenta, where('idInfVenta', '==', infVenta.idInfVenta));
          const snapVenta = await getDocs(qVenta);
          if (!snapVenta.empty) {
            throw new Error(`Ya existe InformeVenta ${infVenta.idInfVenta}`);
          }
          batch.set(doc(colVenta), infVenta);
        }
      }

      // idInfOp NO se persiste en el body (patrón ConId — informe-op-nuevo.ts):
      // es el id del documento y se agrega al leer.
      const { idInfOp: idInfOpCliente, ...bodyCliente } = informeCliente;
      const { idInfOp: idInfOpOtro, ...bodyOtro } = informeOtro;
      batch.set(doc(this.firestore, `/Vantruck/datos/informesOp/${idInfOpCliente}`), bodyCliente);
      batch.set(doc(this.firestore, `/Vantruck/datos/informesOp/${idInfOpOtro}`), bodyOtro);

      const entradaLog = this.logRegistro.construirEntradaSuelta('CERRAR', 'operaciones', op.idOperacion, msj);
      if (entradaLog) {
        batch.set(doc(this.firestore, `/Vantruck/datos/registroLog/${entradaLog.id}`), entradaLog.entrada);
      }

      batch.update(docOpRef, { ...this.opToFirestore(op), resumenProcesado: true });

      const updates = this.resumenOpCalculator.generarUpdates(op);
      if (!updates || updates.length === 0) {
        throw new Error('No se generaron updates de resumen.');
      }
      await this.db.aplicarUpdatesResumen(batch, updates);

      await batch.commit();

      if (op.datosTarifaEventual !== null) {
        await this.valoresTarifaServ.registrarEventualSiCorresponde(op);
      }

      return { exito: true, mensaje: `Operación ${op.idOperacion} cerrada correctamente.` };
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'CERRAR', 'operaciones', op.idOperacion, `Error al cerrar operación ${op.idOperacion}: ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: `Error al cerrar la operación: ${e?.message ?? e}.` };
    }
  }

  /** Delegado a OperacionFactoryService.opToFirestore — misma lógica exacta,
   *  ahora con una sola fuente de verdad (la necesita también InformeOpService,
   *  que no puede inyectar OperacionService por el ciclo con InformeOpService).
   *  Se deja este wrapper privado para no tocar ninguno de los call sites
   *  existentes en esta clase. */
  private opToFirestore(op: Operacion): Omit<Operacion, 'idOperacion'> {
    return this.operacionFactory.opToFirestore(op);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cancelarRango$.complete();
  }
}
