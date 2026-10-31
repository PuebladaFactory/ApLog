import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, merge } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Transaction } from '@angular/fire/firestore';
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
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
import { NumeradorService } from 'src/app/servicios/numerador/numerador.service';
import { LogRegistroService } from 'src/app/servicios/log-registro/log-registro.service';
import { PapeleraService } from 'src/app/servicios/papelera/papelera.service';
import { InformeOpService } from 'src/app/servicios/informes-op/informe-op.service';
import { ResumenOpFactoryService } from 'src/app/servicios/reportes/resumenes-op/resumen-op-factory.service';
import { ComisionVentaFactoryService } from 'src/app/servicios/vendedores/comision-venta-factory.service';
import { Resultado } from 'src/app/interfaces/resultado';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import { AnulacionInformeOp } from 'src/app/interfaces/informe-op-nuevo';
import { ConsultaSujeto } from 'src/app/interfaces/no-disponibilidad';
import { DisponibilidadService } from 'src/app/servicios/no-disponibilidad/disponibilidad.service';
import { resumirMotivos } from 'src/app/shared/utils/vigencia-no-disponibilidad.util';

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

  constructor(
    private db:               DbFirestoreService,
    private clienteService:   ClienteService,
    private choferService:    ChoferService,
    private proveedorService: ProveedorService,
    private operacionFactory: OperacionFactoryService,
    private valoresServ:      ValoresOpService,
    private valoresTarifaServ: ValoresTarifaService,
    private numeradorService: NumeradorService,
    private asignacionService: AsignacionService,
    private logRegistro:      LogRegistroService,
    private papeleraService:  PapeleraService,
    private informeOpServ:    InformeOpService,
    private usuarioSesion: UsuarioSesionService,
    private resumenOpFactory: ResumenOpFactoryService,
    private comisionVentaFactory: ComisionVentaFactoryService,
    private tarifario:        TarifarioService,
    private disponibilidad:   DisponibilidadService,
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

    // 2. GUARDA DE DISPONIBILIDAD (bloque 6) — antes de tocar la red, como TC2:
    //    si una sola op usa un chofer, vehículo o proveedor no disponible en su
    //    fecha, se aborta el alta COMPLETA nombrando cuáles y por qué. Sin
    //    datos cargados también se aborta: "no se pudo verificar" no es
    //    "disponible". Entidad y vehículo por separado (consultasDeOperacion).
    const noDisponibles: string[] = [];
    for (const c of creadas) {
      const motivos = this.disponibilidad.motivosDeOperacion(c.operacion);
      if (motivos === null) {
        return {
          exito: false,
          mensaje: 'No se pudo verificar la disponibilidad de choferes, vehículos y proveedores: ' +
                   'todavía se están cargando los datos. No se guardó ninguna operación; ' +
                   'probá de nuevo en unos segundos.',
          objeto: { creadas, errores: [] },
        };
      }
      if (motivos.length > 0) {
        noDisponibles.push(`• ${this.describirOp(c.operacion)}: ${resumirMotivos(motivos)}`);
      }
    }
    if (noDisponibles.length > 0) {
      return {
        exito: false,
        mensaje: `No se dio de alta ninguna operación: hay ${noDisponibles.length} con un chofer, ` +
                 `vehículo o proveedor no disponible el ${fecha}:\n${noDisponibles.join('\n')}`,
        objeto: { creadas, errores: [] },
      };
    }

    // 3. CALCULAR VALORES + RECONSTRUIR SUJETO/REF DESDE OP FINAL (un solo recorrido, antes de tocar red)
    for (const c of creadas) {
      // Tarifas: calcula valoresNuevos con las referencias YA elegidas
      // (operaciones-editor / generador). TC2: si falta una referencia o no se pueden
      // calcular los valores, se ABORTA el alta completa (nada tocó la red
      // todavía) — antes quedaba la op con valoresNuevos en null y fallaba
      // recién al cerrarla.
      const resultadoTarifaNueva = this.valoresTarifaServ.calcularAlta(c.operacion);
      c.operacion = resultadoTarifaNueva.op;
      if (resultadoTarifaNueva.errores.length > 0) {
        const detalle = resultadoTarifaNueva.errores.join(' | ');
        await this.logRegistro.registrarError(
          'ALTA', 'operaciones', fecha,
          `Tarifa no resuelta al alta (cliente ${c.operacion.cliente.id}, chofer ${c.operacion.chofer.id}): ${detalle}`,
        );
        return {
          exito: false,
          mensaje: `No se pudo calcular la tarifa de una operación de ${c.operacion.cliente.razonSocial}: ` +
                   `${detalle}. No se guardó ninguna operación.`,
          objeto: { creadas, errores: [] },
        };
      }

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
   *  su contraparte, la operación y el tablero; valida; arma
   *  agregarEscriturasBaja + anulación de los dos InformeOp + reversión de
   *  resúmenes (ResumenOpFactoryService.escriturasSuma(op, -1), colección
   *  resumenesOp, sin lecturas; solo si resumenProcesado) + un único log
   *  BAJA. Los InformeOp NO se borran:
   *  quedan 'anulado' (InformeOpListado solo consulta activo/proforma).
   *  Comisiones de venta: ComisionVentaFactoryService.escriturasBaja (monto a
   *  0 + anulada, 'fusionar' sin lecturas; si ya estaban liquidadas, el saldo
   *  queda negativo = ajuste en la próxima liquidación).
   *  Operación eventual: sus RegistroOpEventual no anulados quedan 'anulado'
   *  con la misma anulación que los InformeOp (TC4). Se buscan por query
   *  FUERA de la transacción (el SDK web no permite queries adentro): antes
   *  se lee el InformeOp para saber la operación; adentro se valida que siga
   *  siendo la misma y se relee cada registro. */
  async bajaOperacionCerrada(idInfOp: string, motivo: string): Promise<Resultado<void>> {
    try {
      // — Pre-lecturas (query, fuera de la transacción) —
      const informePrevio = await this.informeOpServ.obtenerPorId(idInfOp);
      const idsRegistrosEventuales = informePrevio
        ? await this.tarifario.buscarIdsRegistrosEventualesActivos(informePrevio.idOperacion)
        : [];

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
        if (informePrevio && informePrevio.idOperacion !== op.idOperacion) {
          throw new Error(`El InformeOp ${idInfOp} cambió de operación mientras se procesaba la baja. Reintentá.`);
        }
        const idsRegistrosAAnular: string[] = [];
        for (const idRegistro of idsRegistrosEventuales) {
          const registro = await this.tarifario.leerRegistroEventualEnTransaccion(tx, idRegistro);
          if (registro && registro.estado !== 'anulado' && registro.idOperacion === op.idOperacion) {
            idsRegistrosAAnular.push(idRegistro);
          }
        }
        // — fin de lecturas —

        // Reversión de resúmenes (resumenesOp): sin lecturas, modo 'fusionar'.
        if (op.resumenProcesado) {
          escrituras.push(...this.resumenOpFactory.escriturasSuma(op, -1));
        }

        // Comisiones de venta (comisionesVenta): sin lecturas, modo 'fusionar'.
        // Una op sin snapshot de comisiones no genera escrituras.
        const escriturasComision = this.comisionVentaFactory.escriturasBaja(op);
        escrituras.push(...escriturasComision);

        const idEvento = this.agregarEscriturasBaja(escrituras, op, tablero, motivo);
        const anulacion: AnulacionInformeOp = {
          motivo,
          usuario: this.usuarioSesion.getUsuarioActual()?.email ?? 'Desconocido',
          fecha: new Date().toISOString(),
          idEventoPapelera: idEvento,
        };
        this.informeOpServ.agregarAnulacionInformeOp(escrituras, informe.idInfOp, anulacion);
        this.informeOpServ.agregarAnulacionInformeOp(escrituras, contraparte.idInfOp, anulacion);
        for (const idRegistro of idsRegistrosAAnular) {
          this.tarifario.agregarAnulacionRegistroEventual(escrituras, idRegistro, anulacion);
        }

        let detalle =
          `Baja de operación ${op.numeroOperacion} (cerrada) desde Liquidación — motivo: ${motivo} — ` +
          `InformeOp anulados: ${informe.idInfOp}, ${contraparte.idInfOp}`;
        if (!op.resumenProcesado) detalle += ' — sin reversión de resúmenes (no procesada)';
        if (escriturasComision.length > 0) {
          detalle += ` — comisiones de venta anuladas: ${escriturasComision.length}`;
        }
        if (idsRegistrosAAnular.length > 0) {
          detalle += ` — registros de operación eventual anulados: ${idsRegistrosAAnular.join(', ')}`;
        }
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
   *  par de InformeOp nuevo.
   *  Vuelve al estado del ALTA: se descarta todo lo cargado al cerrar o al
   *  editar el InformeOp (km, acompañantes, multiplicadores, adicional extra,
   *  tarifa base manual) y se recalcula valoresNuevos con la
   *  tarifa congelada del alta (calcularCierre: sin resolver jerarquía). Se
   *  conservan tarifaAplicada*, datosTarifaEventual y el snapshot de
   *  comisiones (cliente.comisiones). */
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

    // Datos que se cargan al cerrar o al editar el InformeOp: vuelven al
    // valor del alta (mismos defaults que OperacionFactoryService). Sin esto,
    // el próximo cierre repetía la tarifa manual, los acompañantes, el
    // multiplicador y el adicional extra de antes de la baja.
    op.acompaniante = false;
    op.acompanianteCant = 0;
    op.multiplicadorCliente = 1;
    op.multiplicadorChofer = 1;
    op.tarifaBaseManualCliente = null;
    op.tarifaBaseManualChofer = null;
    op.adExtra = null;
    // Valores del alta con la tarifa congelada (sin volver a resolver la
    // jerarquía).
    const recalculo = this.valoresTarifaServ.calcularCierre(op);

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
      escrituras, 'RESTAURAR', 'operaciones', op.idOperacion,
      `Operación ${op.idOperacion} restaurada desde papelera (valores del alta)` +
        (recalculo.errores.length > 0 ? ` — recálculo: ${recalculo.errores.join(' | ')}` : ''),
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
    const guarda = await this.guardaDisponibilidadEdicion(op);
    if (guarda) return guarda;

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

  /** GUARDA DE DISPONIBILIDAD de editarOperacion (bloque 6). Bloquea sólo
   *  si se MUEVE la op hacia un sujeto no disponible: verifica el chofer, el
   *  vehículo y el proveedor que se están escribiendo y son DISTINTOS de los
   *  guardados (comparando ids contra la op tal como está persistida). Si
   *  ninguno cambió, no verifica nada: una op cuyo chofer quedó no disponible
   *  después del alta tiene que poder seguir editándose (km, observaciones,
   *  hoja de ruta). Devuelve el Resultado de rechazo, o null si pasa. */
  private async guardaDisponibilidadEdicion(op: ConId<Operacion>): Promise<Resultado<void> | null> {
    let anterior: Operacion | null | undefined =
      this._operaciones$.getValue().find(o => o.idOperacion === op.idOperacion);
    if (!anterior) {
      try {
        anterior = await this.db.getById<Operacion>('operaciones', op.idOperacion);
      } catch (e: any) {
        return { exito: false, mensaje: `No se pudo leer la operación guardada para verificar el cambio: ${e?.message ?? e}` };
      }
    }
    if (!anterior) return { exito: false, mensaje: `La operación ${op.idOperacion} ya no existe.` };

    const cambiaChofer    = op.chofer.id !== anterior.chofer.id;
    const cambiaVehiculo  = op.vehiculo.id !== anterior.vehiculo.id;
    const cambiaProveedor = (op.proveedor?.id ?? null) !== (anterior.proveedor?.id ?? null);
    if (!cambiaChofer && !cambiaVehiculo && !cambiaProveedor) return null;

    const cambia = (c: ConsultaSujeto) =>
      (c.tipo === 'chofer' && cambiaChofer)
      || (c.tipo === 'vehiculo' && cambiaVehiculo)
      || (c.tipo === 'proveedor' && cambiaProveedor);
    const motivos = this.disponibilidad.motivosDeOperacion(op, cambia);
    if (motivos === null) {
      return { exito: false, mensaje:
        'No se pudo verificar la disponibilidad del chofer o vehículo nuevo: todavía se están ' +
        'cargando los datos. No se guardó la edición; probá de nuevo en unos segundos.' };
    }
    if (motivos.length > 0) {
      return { exito: false, mensaje:
        `No se guardó la edición: el chofer o vehículo nuevo no está disponible el ${op.fecha}. ` +
        resumirMotivos(motivos) };
    }
    return null;
  }

  /** 'Cliente — Apellido, Nombre — AB123CD' para los mensajes de las guardas. */
  private describirOp(op: Operacion): string {
    const chofer = op.chofer.id ? `${op.chofer.apellido}, ${op.chofer.nombre}` : (op.proveedor?.razonSocial ?? '');
    return [op.cliente.razonSocial, chofer, op.vehiculo.dominio].filter(Boolean).join(' — ');
  }

  /** Cierra una operación — orquestador atómico con commitEnTransaccion
   *  (Frente Reportes, R2). Calcula los valores del motor nuevo de Tarifas
   *  (ValoresOpService.calcularValoresCierre),
   *  arma el par de InformeOpNuevo (InformeOpService.crearPar) y persiste
   *  todo junto: Operación (estado.ciclo → 'cerrada', informeOpCliente/
   *  informeOpChofer, resumenProcesado), los 2 InformeOp, las comisiones de
   *  venta (ComisionVentaFactoryService.escriturasCierre → colección
   *  comisionesVenta, 'fusionar', id {idOperacion}_{idVendedor}; solo si el
   *  snapshot op.cliente.comisiones tiene vendedores), los resúmenes de Reportes
   *  (ResumenOpFactoryService.escriturasSuma → colección resumenesOp, modo
   *  'fusionar', sin lecturas) y el log CERRAR.
   *  - Pre-chequeos por query FUERA de la transacción (el SDK web no permite
   *    queries adentro): InformeOp existente (existeParaOperacion). Las
   *    comisiones no necesitan pre-chequeo: su id determinista no se puede
   *    duplicar.
   *  - Cálculo y armado ANTES de la transacción: `armar` puede reejecutarse
   *    y tiene que ser puro; adentro solo se relee la op, se valida y se
   *    suma el log a una copia del array.
   *  - Guarda real contra doble cierre: la op releída en la transacción
   *    tiene que seguir 'abierta' y sin resumenProcesado.
   *  Operación eventual: su RegistroOpEventual
   *  (ValoresTarifaService.armarRegistroEventual) se crea en la MISMA
   *  transacción (TarifarioService.agregarEscrituraRegistroEventual) — si
   *  falla, no se cierra nada. */
  async cerrarOperacion(op: ConId<Operacion>, msj: string = 'Cierre de Operación'): Promise<Resultado<void>> {
    try {
      // — Pre-chequeos (queries, fuera de la transacción) —
      if (await this.informeOpServ.existeParaOperacion(op.idOperacion)) {
        return { exito: false, mensaje: `Ya existe un InformeOp para la operación ${op.idOperacion}.` };
      }

      // — Cálculo —
      const { valoresCliente, valoresOtro, tipoOtro } = this.valoresServ.calcularValoresCierre(op);
      const { informeCliente, informeOtro } = this.informeOpServ.crearPar(op, valoresCliente, valoresOtro, tipoOtro);

      op.estado = {
        ciclo: 'cerrada',
        liquidacion: { cliente: false, chofer: false },
        proforma: { cliente: false, chofer: false },
      };
      op.informeOpCliente = informeCliente.idInfOp;
      op.informeOpChofer = informeOtro.idInfOp;

      // — Escrituras de negocio (se arman una sola vez) —
      const escriturasNegocio: EscrituraBatch[] = [
        {
          coleccion: 'operaciones',
          id: op.idOperacion,
          data: { ...this.opToFirestore(op), resumenProcesado: true },
          modo: 'actualizar',
        },
      ];
      this.informeOpServ.agregarEscriturasCreacionPar(escriturasNegocio, informeCliente, informeOtro);
      escriturasNegocio.push(...this.comisionVentaFactory.escriturasCierre(op));
      escriturasNegocio.push(...this.resumenOpFactory.escriturasSuma(op, 1));
      const registroEventual = this.valoresTarifaServ.armarRegistroEventual(op);
      const idRegistroEventual = registroEventual
        ? this.tarifario.agregarEscrituraRegistroEventual(escriturasNegocio, registroEventual)
        : null;
      const detalleLog = idRegistroEventual
        ? `${msj} — registro de operación eventual ${idRegistroEventual}`
        : msj;

      // — Transacción: relectura + validación + log —
      await this.db.commitEnTransaccion<void>(async (tx) => {
        const actual = await this.leerOperacionEnTransaccion(tx, op.idOperacion);
        if (actual.estado?.ciclo !== 'abierta') {
          throw new Error(
            `La operación ${actual.numeroOperacion} ya no está abierta (ciclo '${actual.estado?.ciclo}').`,
          );
        }
        if (actual.resumenProcesado) {
          throw new Error(`La operación ${actual.numeroOperacion} ya fue procesada en resúmenes.`);
        }
        // — fin de lecturas —

        const escrituras = [...escriturasNegocio];
        await this.logRegistro.agregarAlBatch(escrituras, 'CERRAR', 'operaciones', op.idOperacion, detalleLog);
        return { escrituras, resultado: undefined };
      });

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
