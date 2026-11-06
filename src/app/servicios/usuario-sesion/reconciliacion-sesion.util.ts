import { Usuario, RolUsuario } from '../../interfaces/usuario';

/* Eje de sesión, bloque 2 — reconciliación de Firebase Auth con la sesión de
 * la app. Todo lo de este archivo es puro: sin Firebase y sin inyección.
 * Contrato: docs/disenos/eje-de-sesion.md, "Tabla de reconciliación" y
 * "El escritor único de la sesión". */

/** Cuánto se espera la lectura de /users/{uid}. Es también cuánto dura, como
 *  máximo, la pantalla en blanco de un F5 sin conexión antes de entrar con la
 *  sesión conservada (fila 7). */
export const TIMEOUT_RECONCILIACION_MS = 5000;

/** Resguardo de la espera del login (`resultadoPara`). Una reconciliación puede
 *  esperar detrás de otra en curso (las dos con su timeout de lectura), más un
 *  margen. Vencido, el login sale como 'fallo': nunca hay espera infinita. */
export const TIMEOUT_RESGUARDO_MS = 2 * TIMEOUT_RECONCILIACION_MS + 1000;

/** Errores de la lectura que se consideran de conexión: los únicos que pueden
 *  conservar la sesión (fila 7). 'unavailable' incluye el "client is offline"
 *  de getDoc; 'timeout' es el propio. Cualquier otro código nunca conserva. */
export const CODIGOS_CONEXION: ReadonlyArray<string> = ['unavailable', 'deadline-exceeded', 'timeout'];

// Record exhaustivo: si RolUsuario gana o pierde un rol, esto no compila.
const ROLES: Record<RolUsuario, true> = { dev: true, admin: true, manager: true, user: true, demo: true };

export function esRolUsuario(valor: unknown): valor is RolUsuario {
  return typeof valor === 'string' && Object.prototype.hasOwnProperty.call(ROLES, valor);
}

/** Validación mínima de la sesión rehidratada de localStorage: uid no vacío y
 *  rol de los cinco. No es una validación de forma completa. */
export function esSesionRehidratable(valor: unknown): valor is Usuario {
  if (typeof valor !== 'object' || valor === null) return false;
  const v = valor as { uid?: unknown; role?: unknown };
  return typeof v.uid === 'string' && v.uid !== '' && esRolUsuario(v.role);
}

export type LecturaUsuario =
  | { tipo: 'ok'; usuario: Usuario }
  | { tipo: 'sin-documento' }
  | { tipo: 'sin-rol' }
  | { tipo: 'error'; codigo: string };   // código de FirestoreError, o 'timeout'

export type ResultadoReconciliacion =
  | 'establecida'      // setUsuario con lo leído
  | 'conservada'       // lectura fallida de conexión, mismo uid: setUsuario(sesión en memoria)
  | 'sin-documento'    // limpiar
  | 'sin-rol'          // limpiar
  | 'sin-auth'         // limpiar
  | 'fallo';           // lectura fallida sin conservar: limpiar

/** Clasifica el documento de /users/{uid} ya leído. Sin `role` (fila 6) y con
 *  un `role` fuera de RolUsuario (fila 11) son los dos 'sin-rol'. El documento
 *  se toma tal cual, como hacía AuthService.obtenerDatosUsuario. */
export function clasificarDocumento(existe: boolean, data: Record<string, unknown> | undefined): LecturaUsuario {
  if (!existe || !data) return { tipo: 'sin-documento' };
  if (!data['role'] || !esRolUsuario(data['role'])) return { tipo: 'sin-rol' };
  return { tipo: 'ok', usuario: data as unknown as Usuario };
}

/** La tabla de reconciliación. `usuario !== null` → setUsuario(usuario); si no,
 *  limpiar(). Toda salida trae una de las dos órdenes, nunca ninguna. */
export function decidirReconciliacion(
  authUid: string | null,
  enMemoria: Usuario | null,
  lectura: LecturaUsuario | null,   // null cuando authUid es null (no se lee)
): { resultado: ResultadoReconciliacion; usuario: Usuario | null } {
  // Fila 1.
  if (authUid === null || lectura === null) return { resultado: 'sin-auth', usuario: null };

  switch (lectura.tipo) {
    // Filas 2, 3 y 4: la identidad es la de Auth y el rol el de /users. El
    // uid lo pone Auth, no el campo del documento (puede faltar o estar mal
    // copiado): el uid es la identidad y su fuente es Auth / la ruta del doc.
    case 'ok': return { resultado: 'establecida', usuario: { ...lectura.usuario, uid: authUid } };
    // Fila 5.
    case 'sin-documento': return { resultado: 'sin-documento', usuario: null };
    // Filas 6 y 11.
    case 'sin-rol': return { resultado: 'sin-rol', usuario: null };
    case 'error': {
      // Fila 7: sólo un error de conexión con la misma identidad conserva.
      if (CODIGOS_CONEXION.includes(lectura.codigo) && enMemoria !== null && enMemoria.uid === authUid) {
        return { resultado: 'conservada', usuario: enMemoria };
      }
      // Filas 8, 9, 10 y 12 (código que no es de conexión ni de permisos,
      // con cualquier sesión, el mismo uid incluido).
      return { resultado: 'fallo', usuario: null };
    }
  }
}

/** El primer evento de onAuthStateChanged no llegó en TIMEOUT_RECONCILIACION_MS:
 *  estado de Auth desconocido. Se decide como las filas 7 y 8: conserva la
 *  sesión rehidratada válida si la hay, 'fallo' si no. Nunca manda a /login
 *  por sí sola: sin conexión el primer evento puede tardar de forma legítima.
 *  Si el evento llega tarde, dispara su propia reconciliación y converge. */
export function decidirAuthDesconocido(
  enMemoria: Usuario | null,
): { resultado: ResultadoReconciliacion; usuario: Usuario | null } {
  return enMemoria !== null
    ? { resultado: 'conservada', usuario: enMemoria }
    : { resultado: 'fallo', usuario: null };
}

/** Una reconciliación en marcha: el uid se fija al arrancar (el de Auth en
 *  ese momento), el resultado llega después. */
export interface TrabajoReconciliacion {
  uid: string | null;
  resultado: Promise<ResultadoReconciliacion>;
}

interface Registro {
  id: number;
  /** true mientras espera turno en la cola: todavía no leyó Auth. */
  enCola: boolean;
  /** El uid de Auth que leyó al arrancar (null: sin usuario). */
  uid: string | null;
  /** Reconciliación con Auth desconocido (venció el primer evento): no es de
   *  ningún uid, así que ni un evento ni un login se suman a ella. */
  authDesconocido: boolean;
  resultado: Promise<ResultadoReconciliacion>;
}

/** Coordina las reconciliaciones: un solo escritor, sin lecturas de más y sin
 *  espera infinita.
 *
 *  - Cada trabajo reconcilia el estado de Auth del momento en que arranca (no
 *    el del evento que lo pidió), y corren en serie. Así el último trabajo
 *    aplicado siempre refleja el último estado de Auth: cada cambio de Auth
 *    trae su evento y su trabajo, que corre después.
 *  - Un evento no encola nada si el último trabajo todavía no arrancó (va a
 *    leer el estado actual) o si ya es de ese mismo uid (en curso o terminado:
 *    nada cambió desde entonces, porque un cambio habría dejado otro trabajo
 *    detrás). Es lo que evita el segundo getDoc del login.
 *  - `resultadoPara(uid, marca)` usa el último trabajo si se pidió después de
 *    la marca y es (o va a ser) de ese uid; si no, encola uno. Cubre los tres
 *    órdenes: evento antes del signIn, evento después, y sin evento (C3).
 *  - Si el primer evento de Auth no llega a tiempo, se encola una
 *    reconciliación con Auth desconocido: `resuelta()` siempre resuelve. */
export class CoordinadorReconciliacion {
  private registros: Registro[] = [];
  private siguienteId = 1;
  private cola: Promise<unknown> = Promise.resolve();
  private pendientes = 0;
  private huboPrimerEvento = false;
  private avisarPrimerEvento!: () => void;
  private readonly primerEvento = new Promise<void>(r => (this.avisarPrimerEvento = r));

  private timerPrimerEvento: ReturnType<typeof setTimeout>;

  constructor(
    private readonly reconciliar: () => TrabajoReconciliacion,
    private readonly reconciliarAuthDesconocido: () => Promise<ResultadoReconciliacion>,
    private readonly timeoutResguardoMs: number = TIMEOUT_RESGUARDO_MS,
    timeoutPrimerEventoMs: number = TIMEOUT_RECONCILIACION_MS,
  ) {
    this.timerPrimerEvento = setTimeout(() => {
      if (this.huboPrimerEvento) return;
      this.encolar(true);
      this.avisarPrimerEvento();
    }, timeoutPrimerEventoMs);
  }

  /** Lo llama el listener de Auth con el uid del evento. */
  alCambiarAuth(uid: string | null): void {
    const ultimo = this.ultimo();
    const yaCubierto = ultimo !== undefined && !ultimo.authDesconocido
      && (ultimo.enCola || ultimo.uid === uid);
    if (!yaCubierto) this.encolar(false);
    if (!this.huboPrimerEvento) {
      this.huboPrimerEvento = true;
      clearTimeout(this.timerPrimerEvento);
      this.avisarPrimerEvento();
    }
  }

  /** Contador de trabajos pedidos hasta ahora. Se toma antes del signIn. */
  marca(): number {
    return this.siguienteId - 1;
  }

  /** Resuelve cuando llegó el primer evento de Auth y no queda ningún trabajo
   *  pendiente. Después de eso, sin trabajos en curso, resuelve enseguida. */
  async resuelta(): Promise<void> {
    await this.primerEvento;
    while (this.pendientes > 0) await this.cola;
  }

  /** El resultado de la reconciliación del uid recién autenticado. */
  resultadoPara(uid: string, marca: number): Promise<ResultadoReconciliacion> {
    const ultimo = this.ultimo();
    const sirve = ultimo !== undefined && !ultimo.authDesconocido && ultimo.id > marca
      && (ultimo.enCola || ultimo.uid === uid);
    const registro = sirve ? ultimo! : this.encolar(false);

    const espera = registro.resultado.then(resultado => {
      if (!registro.authDesconocido && registro.uid === uid) return resultado;
      // Auth dejó de ser el usuario que se autenticó antes de que se lo pudiera
      // reconciliar (otra pestaña cerró sesión o entró con otro usuario): para
      // el login es lo mismo que 'sin-auth'. No es un caso de la tabla, es de
      // la coordinación.
      return 'sin-auth' as const;
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const vencida = new Promise<ResultadoReconciliacion>(resolve => {
      timer = setTimeout(() => resolve('fallo'), this.timeoutResguardoMs);
    });
    return Promise.race([espera, vencida]).finally(() => clearTimeout(timer));
  }

  private ultimo(): Registro | undefined {
    return this.registros[this.registros.length - 1];
  }

  private encolar(authDesconocido: boolean): Registro {
    const registro: Registro = {
      id: this.siguienteId++,
      enCola: true,
      uid: null,
      authDesconocido,
      resultado: undefined as unknown as Promise<ResultadoReconciliacion>,
    };
    this.pendientes++;
    registro.resultado = this.cola.then(() => {
      registro.enCola = false;
      if (authDesconocido) return this.reconciliarAuthDesconocido();
      const trabajo = this.reconciliar();
      registro.uid = trabajo.uid;
      return trabajo.resultado;
    }).catch((): ResultadoReconciliacion => 'fallo')
      .finally(() => {
        this.pendientes--;
      });
    this.cola = registro.resultado;
    // Sólo hace falta el último: los anteriores ya no se consultan.
    this.registros = [registro];
    return registro;
  }
}
