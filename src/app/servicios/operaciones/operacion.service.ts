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
import { FormatoNumericoService } from 'src/app/servicios/formato-numerico/formato-numerico.service';
import { NumeradorService } from 'src/app/servicios/numerador/numerador.service';
import { LogService } from 'src/app/servicios/log/log.service';
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
    private formNumServ:      FormatoNumericoService,
    private numeradorService: NumeradorService,
    private asignacionService: AsignacionService,
    private logService:       LogService,
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

  /** Calcula los valores iniciales (aCobrar/aPagar y derivados) de una op según su
   *  tipo de tarifa. Centraliza lo que antes estaba partido entre el componente de
   *  carga y ValoresOpService.
   *  TODO: refactor Tarifas — esta operatoria de ramas debe mudarse por completo a
   *  ValoresOpService, dejando este método como orquestador delgado (op, tarifa) →
   *  op con valores. Hoy replica el flujo actual del componente. */
  calcularValoresIniciales(op: Operacion): Operacion {
    if (op.tarifaTipo.general || op.tarifaTipo.especial) {
      op = this.valoresServ.valoresIniciales(op);
    }
    if (op.tarifaTipo.personalizada) {
      // TODO: refactor Tarifas — invariante: personalizada ⟺ datosTarifaPersonalizada !== null
      op.valores.cliente.aCobrar = op.datosTarifaPersonalizada!.aCobrar;
      op.valores.chofer.aPagar   = op.datosTarifaPersonalizada!.aPagar;
    }
    if (op.tarifaTipo.eventual) {
      // TODO: refactor Tarifas — invariante: eventual ⟺ datosTarifaEventual !== null
      op.datosTarifaEventual!.cliente.valor = this.formNumServ.convertirAValorNumerico(op.datosTarifaEventual!.cliente.valor);
      op.datosTarifaEventual!.chofer.valor  = this.formNumServ.convertirAValorNumerico(op.datosTarifaEventual!.chofer.valor);
      op.valores.cliente.aCobrar = op.datosTarifaEventual!.cliente.valor;
      op.valores.chofer.aPagar   = op.datosTarifaEventual!.chofer.valor;
    }
    op.valores.cliente.tarifaBase = op.valores.cliente.aCobrar;
    op.valores.chofer.tarifaBase  = op.valores.chofer.aPagar;

    if (op.acompaniante) {
      op = this.valoresServ.valoresOpAcompaniante(op);
    }
    op = this.valoresServ.recalcularValores(op);
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

      await this.db.commitBatch(escrituras);

      // 8. LOG — un registro por el alta (acción principal)
      // TODO: refactor Roles — exclusión de 'god' del log pendiente (igual que AsignacionService)
      this.logService.logEvent(
        'ALTA', 'operaciones',
        `Alta de ${creadas.length} operación(es) — tablero ${fecha}`,
        fecha, true,
      );

      // 9. RESULTADO
      return {
        exito: true,
        mensaje: `${creadas.length} operación(es) dada(s) de alta correctamente.`,
        objeto: { creadas, errores: [] },
      };

    } catch (e: any) {
      this.logService.logEvent(
        'ALTA', 'operaciones',
        `Error en alta de operaciones — tablero ${fecha}: ${e?.message ?? e}`,
        fecha, false,
      );
      return {
        exito: false,
        mensaje: `Error al guardar las operaciones: ${e?.message ?? e}. No se guardó ninguna.`,
        objeto: { creadas, errores: [] },
      };
    }
  }

  private opToFirestore(op: Operacion): Omit<Operacion, 'idOperacion'> {
    const { idOperacion, ...resto } = op;
    return resto;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cancelarRango$.complete();
  }
}
