import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, merge } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
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
import { Resultado } from 'src/app/interfaces/resultado';

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
    private formNumServ:      FormatoNumericoService,
    private numeradorService: NumeradorService,
    private asignacionService: AsignacionService,
    private logRegistro:      LogRegistroService,
    private papeleraService:  PapeleraService,
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

  /** Baja atómica de una operación NO liquidada (papelera + informes si
   *  corresponde + anulación del item de asignación). Ownership: OperacionService
   *  es el dueño (entidad primaria = Operación), AsignacionService es secundario.
   *  Alcance: SOLO ciclo 'abierta' | 'cerrada'. Liquidadas quedan fuera (revertir
   *  la liquidación es un gesto previo, propio de LiquidacionService). */
  async bajaOperacion(op: ConId<Operacion>, motivo: string): Promise<Resultado<void>> {

    if (op.estado.liquidacion.cliente || op.estado.liquidacion.chofer) {
      return {
        exito: false,
        mensaje: `La operación ${op.idOperacion} tiene liquidación en curso o ` +
                 `completa. Debe revertir la liquidación antes de darla de baja.`,
      };
    }

    const tipo = this.choferService.getTipoContratacion(op.chofer.id);
    if (!tipo) {
      return {
        exito: false,
        mensaje: `No se pudo resolver la contratación del chofer ${op.chofer.id}. ` +
                 `No se dio de baja la operación.`,
      };
    }

    const escrituras: EscrituraBatch[] = [
      { coleccion: 'operaciones', id: op.idOperacion, data: null, modo: 'eliminar' },
    ];

    // Informes: SOLO si 'cerrada'. Ausencia = inconsistencia real, aborta todo.
    if (op.estado.ciclo === 'cerrada') {
      const infoCliente = await this.db.getByField<any>('informesOpClientes', 'idOperacion', op.idOperacion);
      if (infoCliente.length === 0) {
        return {
          exito: false,
          mensaje: `Inconsistencia: la operación ${op.idOperacion} está cerrada ` +
                   `pero no tiene informe en informesOpClientes. Baja abortada.`,
        };
      }
      const coleccionSecundaria = tipo === 'directo' ? 'informesOpChoferes' : 'informesOpProveedores';
      const infoSecundario = await this.db.getByField<any>(coleccionSecundaria, 'idOperacion', op.idOperacion);
      if (infoSecundario.length === 0) {
        return {
          exito: false,
          mensaje: `Inconsistencia: la operación ${op.idOperacion} está cerrada ` +
                   `pero no tiene informe en ${coleccionSecundaria}. Baja abortada.`,
        };
      }
      escrituras.push(
        { coleccion: 'informesOpClientes', id: infoCliente[0].id, data: null, modo: 'eliminar' },
        { coleccion: coleccionSecundaria, id: infoSecundario[0].id, data: null, modo: 'eliminar' },
      );
    }

    const fecha = op.fecha;
    const tablero = await this.asignacionService.getTableroPorFecha(fecha);
    if (!tablero) {
      return {
        exito: false,
        mensaje: `Inconsistencia: no existe tablero de asignaciones para la fecha ` +
                 `${fecha} de la operación ${op.idOperacion}. Baja abortada.`,
      };
    }
    const items = this.asignacionService.anularItemEnLista(tablero.items, op.idOperacion, motivo);

    // Evento de papelera (referencia, ver PapeleraService). Sin secundarios — los
    // informesOpXxx eliminados arriba no se archivan, comportamiento ya documentado
    // y deliberado (ver CLAUDE.md → "Frente Papelera").
    this.papeleraService.prepararBajaEnBatch(escrituras, motivo, [
      { coleccion: 'operaciones', id: op.idOperacion, data: this.opToFirestore(op), principal: true },
    ]);

    escrituras.push({
      coleccion: 'asignaciones', id: fecha,
      data: this.asignacionService.asignacionToFirestore({ ...tablero, items }),
      modo: 'reemplazar',
    });

    await this.logRegistro.agregarAlBatch(
      escrituras, 'BAJA', 'operaciones', op.idOperacion, `Baja de operación ${op.idOperacion}`,
    );

    try {
      await this.db.commitBatch(escrituras);
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'BAJA', 'operaciones', op.idOperacion, `Error en baja de operación ${op.idOperacion}: ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: `Error al dar de baja la operación: ${e?.message ?? e}.` };
    }

    return { exito: true, mensaje: `Operación ${op.idOperacion} dada de baja correctamente.` };
  }

  /** Restaura una operación desde papelera. SIEMPRE queda 'abierta' — los
   *  InformeOp no se reconstruyen (fueron eliminados en la baja, no archivados).
   *  Si la op estaba 'cerrada' antes de la baja, hay que volver a cerrarla
   *  manualmente después de restaurar. */
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

  private opToFirestore(op: Operacion): Omit<Operacion, 'idOperacion'> {
    // Excluimos idOperacion (se almacena solo como ID del documento, no como
    // campo) e id (metadata de ConId, presente cuando el caller pasa
    // ConId<Operacion> — bajaOperacion/restaurarOperacion — ausente cuando pasa
    // Operacion a secas — altaDesdeAsignacion, op recién construida por el
    // factory, sin id). Mismo patrón que Cliente/Chofer/Proveedor.toFirestore().
    const { idOperacion, id, ...resto } = op as any;
    return resto;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cancelarRango$.complete();
  }
}
