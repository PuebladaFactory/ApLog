import { Usuario } from '../../interfaces/usuario';
import {
  CoordinadorReconciliacion,
  LecturaUsuario,
  ResultadoReconciliacion,
  clasificarDocumento,
  decidirAuthDesconocido,
  decidirReconciliacion,
  esSesionRehidratable,
} from './reconciliacion-sesion.util';

function usuario(uid: string, role: Usuario['role'] = 'user'): Usuario {
  return { uid, email: `${uid}@x.com`, displayName: '', photoURL: '', emailVerified: true, role, name: uid };
}

const X = usuario('X');
const Y = usuario('Y');
const docX = usuario('X', 'admin');
const ok: LecturaUsuario = { tipo: 'ok', usuario: docX };
const error = (codigo: string): LecturaUsuario => ({ tipo: 'error', codigo });

describe('decidirReconciliacion — tabla de reconciliación', () => {
  it('fila 1: Auth sin usuario → sin-auth, limpiar (con o sin sesión en memoria)', () => {
    expect(decidirReconciliacion(null, null, null)).toEqual({ resultado: 'sin-auth', usuario: null });
    expect(decidirReconciliacion(null, X, null)).toEqual({ resultado: 'sin-auth', usuario: null });
  });

  it('fila 2: lectura ok, sin sesión en memoria → establecida con el documento', () => {
    expect(decidirReconciliacion('X', null, ok)).toEqual({ resultado: 'establecida', usuario: docX });
  });

  it('fila 3: lectura ok, misma identidad → establecida; el rol en memoria se corrige', () => {
    expect(decidirReconciliacion('X', X, ok)).toEqual({ resultado: 'establecida', usuario: docX });
  });

  it('fila 4: lectura ok, otra identidad en memoria → establecida; manda Auth', () => {
    expect(decidirReconciliacion('X', Y, ok)).toEqual({ resultado: 'establecida', usuario: docX });
  });

  it('fila 5: sin documento → sin-documento, limpiar', () => {
    for (const enMemoria of [null, X, Y]) {
      expect(decidirReconciliacion('X', enMemoria, { tipo: 'sin-documento' }))
        .toEqual({ resultado: 'sin-documento', usuario: null });
    }
  });

  it('filas 6 y 11: sin rol → sin-rol, limpiar', () => {
    for (const enMemoria of [null, X, Y]) {
      expect(decidirReconciliacion('X', enMemoria, { tipo: 'sin-rol' }))
        .toEqual({ resultado: 'sin-rol', usuario: null });
    }
  });

  it('fila 7: error de conexión o timeout, misma identidad → conservada con la sesión en memoria', () => {
    for (const codigo of ['unavailable', 'deadline-exceeded', 'timeout']) {
      expect(decidirReconciliacion('X', X, error(codigo))).toEqual({ resultado: 'conservada', usuario: X });
    }
  });

  it('fila 8: error de conexión, otra identidad o ninguna → fallo, limpiar', () => {
    for (const enMemoria of [null, Y]) {
      expect(decidirReconciliacion('X', enMemoria, error('unavailable'))).toEqual({ resultado: 'fallo', usuario: null });
      expect(decidirReconciliacion('X', enMemoria, error('timeout'))).toEqual({ resultado: 'fallo', usuario: null });
    }
  });

  it('fila 9: permission-denied / unauthenticated, misma identidad → fallo (C2)', () => {
    for (const codigo of ['permission-denied', 'unauthenticated']) {
      expect(decidirReconciliacion('X', X, error(codigo))).toEqual({ resultado: 'fallo', usuario: null });
    }
  });

  it('fila 10: permission-denied / unauthenticated, otra identidad o ninguna → fallo', () => {
    for (const codigo of ['permission-denied', 'unauthenticated']) {
      for (const enMemoria of [null, Y]) {
        expect(decidirReconciliacion('X', enMemoria, error(codigo))).toEqual({ resultado: 'fallo', usuario: null });
      }
    }
  });

  it('fila 12: código que no es de conexión ni de permisos → fallo con cualquier sesión, el mismo uid incluido', () => {
    for (const codigo of ['internal', 'cancelled', 'resource-exhausted', 'failed-precondition', 'desconocido']) {
      for (const enMemoria of [X, Y, null]) {
        expect(decidirReconciliacion('X', enMemoria, error(codigo))).toEqual({ resultado: 'fallo', usuario: null });
      }
    }
  });

  it('filas 2 a 4: el uid de la sesión lo pone Auth, no el campo del documento', () => {
    const sinUid = { ...docX, uid: undefined } as unknown as Usuario;
    const malCopiado = { ...docX, uid: 'Z' };
    for (const doc of [sinUid, malCopiado]) {
      for (const enMemoria of [null, X, Y]) {
        const salida = decidirReconciliacion('X', enMemoria, { tipo: 'ok', usuario: doc });
        expect(salida.resultado).toBe('establecida');
        expect(salida.usuario?.uid).toBe('X');
        expect(salida.usuario?.role).toBe('admin');
      }
    }
  });

  it('invariante: toda salida ordena setUsuario (usuario) o limpiar (null), y conserva sólo con usuario', () => {
    const lecturas: (LecturaUsuario | null)[] = [
      null, ok, { tipo: 'sin-documento' }, { tipo: 'sin-rol' },
      error('unavailable'), error('timeout'), error('permission-denied'), error('internal'),
    ];
    const conUsuario: ResultadoReconciliacion[] = ['establecida', 'conservada'];
    for (const authUid of [null, 'X']) {
      for (const enMemoria of [null, X, Y]) {
        for (const lectura of lecturas) {
          const salida = decidirReconciliacion(authUid, enMemoria, authUid === null ? null : lectura);
          expect(conUsuario.includes(salida.resultado)).toBe(salida.usuario !== null);
        }
      }
    }
  });
});

describe('decidirAuthDesconocido — el primer evento de Auth no llegó a tiempo', () => {
  it('con sesión rehidratada válida → conservada (como la fila 7)', () => {
    expect(decidirAuthDesconocido(X)).toEqual({ resultado: 'conservada', usuario: X });
  });

  it('sin sesión rehidratada → fallo (como la fila 8)', () => {
    expect(decidirAuthDesconocido(null)).toEqual({ resultado: 'fallo', usuario: null });
  });
});

describe('clasificarDocumento — lectura de /users/{uid}', () => {
  it('sin documento → sin-documento', () => {
    expect(clasificarDocumento(false, undefined)).toEqual({ tipo: 'sin-documento' });
  });

  it('fila 6: sin role → sin-rol', () => {
    expect(clasificarDocumento(true, { uid: 'X', email: 'x' })).toEqual({ tipo: 'sin-rol' });
    expect(clasificarDocumento(true, { uid: 'X', role: '' })).toEqual({ tipo: 'sin-rol' });
  });

  it('fila 11: role fuera de RolUsuario → sin-rol', () => {
    expect(clasificarDocumento(true, { uid: 'X', role: 'god' })).toEqual({ tipo: 'sin-rol' });
    expect(clasificarDocumento(true, { uid: 'X', role: 1 })).toEqual({ tipo: 'sin-rol' });
  });

  it('role válido → ok con el documento tal cual', () => {
    const data = { ...docX } as unknown as Record<string, unknown>;
    expect(clasificarDocumento(true, data)).toEqual({ tipo: 'ok', usuario: docX });
  });
});

describe('esSesionRehidratable', () => {
  it('acepta uid no vacío y rol de los cinco', () => {
    expect(esSesionRehidratable(X)).toBeTrue();
  });

  it('rechaza uid vacío o ausente, rol inválido y no-objetos', () => {
    expect(esSesionRehidratable({ ...X, uid: '' })).toBeFalse();
    expect(esSesionRehidratable({ role: 'user' })).toBeFalse();
    expect(esSesionRehidratable({ ...X, role: 'god' })).toBeFalse();
    expect(esSesionRehidratable(null)).toBeFalse();
    expect(esSesionRehidratable('X')).toBeFalse();
  });
});

describe('CoordinadorReconciliacion — espera del login y del guard', () => {
  interface Diferido { resolver: (r: ResultadoReconciliacion) => void; promesa: Promise<ResultadoReconciliacion> }
  function diferido(): Diferido {
    let resolver!: (r: ResultadoReconciliacion) => void;
    const promesa = new Promise<ResultadoReconciliacion>(r => (resolver = r));
    return { resolver, promesa };
  }
  const tick = () => new Promise(r => setTimeout(r, 0));

  let authUid: string | null;
  let trabajos: { uid: string | null; d: Diferido }[];
  let coord: CoordinadorReconciliacion;

  beforeEach(() => {
    authUid = null;
    trabajos = [];
    coord = new CoordinadorReconciliacion(() => {
      const d = diferido();
      trabajos.push({ uid: authUid, d });
      return { uid: authUid, resultado: d.promesa };
    }, () => Promise.resolve('fallo'), 50, 60000);
  });

  /** F5 sin usuario: primer evento null, reconciliado. */
  async function arrancarSinUsuario(): Promise<void> {
    coord.alCambiarAuth(null);
    await tick();
    trabajos[0].d.resolver('sin-auth');
    await coord.resuelta();
  }

  it('evento antes de que signIn resuelva: el login se suma al trabajo, una sola lectura', async () => {
    await arrancarSinUsuario();
    const marca = coord.marca();
    authUid = 'X';
    coord.alCambiarAuth('X');                        // dentro del signIn
    const resultado = coord.resultadoPara('X', marca);
    await tick();
    trabajos[1].d.resolver('establecida');
    expect(await resultado).toBe('establecida');
    expect(trabajos.length).toBe(2);
  });

  it('evento antes, con el trabajo ya terminado al llegar al login: lo reutiliza', async () => {
    await arrancarSinUsuario();
    const marca = coord.marca();
    authUid = 'X';
    coord.alCambiarAuth('X');
    await tick();
    trabajos[1].d.resolver('establecida');
    await tick();
    expect(await coord.resultadoPara('X', marca)).toBe('establecida');
    expect(trabajos.length).toBe(2);
  });

  it('evento después de que signIn resuelva: el evento se suma al trabajo del login', async () => {
    await arrancarSinUsuario();
    const marca = coord.marca();
    authUid = 'X';
    const resultado = coord.resultadoPara('X', marca);
    coord.alCambiarAuth('X');                        // todavía sin arrancar
    await tick();
    coord.alCambiarAuth('X');                        // ya en curso para X
    trabajos[1].d.resolver('establecida');
    expect(await resultado).toBe('establecida');
    await tick();
    coord.alCambiarAuth('X');                        // ya terminado para X
    expect(trabajos.length).toBe(2);
  });

  it('sin evento (mismo uid, C3): inicia una reconciliación nueva; no reutiliza una anterior a la marca', async () => {
    authUid = 'X';
    coord.alCambiarAuth('X');                        // F5 con sesión
    await tick();
    trabajos[0].d.resolver('establecida');
    await coord.resuelta();

    const marca = coord.marca();                     // re-login como X: no hay evento
    const resultado = coord.resultadoPara('X', marca);
    await tick();
    expect(trabajos.length).toBe(2);
    trabajos[1].d.resolver('conservada');
    expect(await resultado).toBe('conservada');
  });

  it('el resguardo vencido devuelve fallo: nunca hay espera infinita', async () => {
    await arrancarSinUsuario();
    const marca = coord.marca();
    authUid = 'X';
    expect(await coord.resultadoPara('X', marca)).toBe('fallo');   // el trabajo nunca resuelve
  });

  it('si Auth ya no es el uid autenticado al reconciliar, el login recibe sin-auth', async () => {
    await arrancarSinUsuario();
    const marca = coord.marca();
    authUid = 'Y';                                   // otra pestaña entró como Y
    const resultado = coord.resultadoPara('X', marca);
    await tick();
    trabajos[1].d.resolver('establecida');
    expect(await resultado).toBe('sin-auth');
  });

  it('un trabajo que lanza termina como fallo', async () => {
    const coordRoto = new CoordinadorReconciliacion(
      () => ({ uid: 'X', resultado: Promise.reject(new Error('x')) }), () => Promise.resolve('fallo'), 50, 60000);
    expect(await coordRoto.resultadoPara('X', coordRoto.marca())).toBe('fallo');
  });

  it('resuelta() espera el primer evento y el trabajo en curso', async () => {
    let resuelta = false;
    coord.resuelta().then(() => (resuelta = true));
    await tick();
    expect(resuelta).toBeFalse();                    // sin evento de Auth todavía

    authUid = 'X';
    coord.alCambiarAuth('X');
    await tick();
    expect(resuelta).toBeFalse();                    // lectura en curso

    trabajos[0].d.resolver('establecida');
    await tick();
    expect(resuelta).toBeTrue();
  });

  it('un cambio de Auth con un trabajo en curso encola otro, que corre después', async () => {
    authUid = 'X';
    coord.alCambiarAuth('X');
    await tick();
    authUid = null;
    coord.alCambiarAuth(null);                       // logout en otra pestaña
    await tick();
    expect(trabajos.length).toBe(1);                 // en serie: espera al primero
    trabajos[0].d.resolver('establecida');
    await tick();
    expect(trabajos.length).toBe(2);
    expect(trabajos[1].uid).toBeNull();
  });

  describe('sin primer evento de Auth', () => {
    /** Coordinador con el primer evento vencido a los 20 ms; la reconciliación
     *  con Auth desconocido decide con `enMemoria` como el servicio. */
    function coordinadorConVencimiento(enMemoria: Usuario | null) {
      const aplicados: ResultadoReconciliacion[] = [];
      let reales = 0;
      const c = new CoordinadorReconciliacion(
        () => { reales++; return { uid: 'X', resultado: Promise.resolve('establecida' as const) }; },
        async () => {
          const r = decidirAuthDesconocido(enMemoria).resultado;
          aplicados.push(r);
          return r;
        },
        50, 20,
      );
      return { c, aplicados, reales: () => reales };
    }

    it('resuelta() resuelve al vencer, conservando si hay sesión rehidratada válida', async () => {
      const { c, aplicados } = coordinadorConVencimiento(X);
      await c.resuelta();
      expect(aplicados).toEqual(['conservada']);
    });

    it('resuelta() resuelve al vencer, con fallo si no hay sesión rehidratada', async () => {
      const { c, aplicados } = coordinadorConVencimiento(null);
      await c.resuelta();
      expect(aplicados).toEqual(['fallo']);
    });

    it('el evento que llega tarde dispara su propia reconciliación y converge', async () => {
      const { c, reales } = coordinadorConVencimiento(X);
      await c.resuelta();
      c.alCambiarAuth('X');
      await c.resuelta();
      expect(reales()).toBe(1);
    });

    it('con el evento a tiempo no reconcilia con Auth desconocido', async () => {
      const { c, aplicados } = coordinadorConVencimiento(X);
      c.alCambiarAuth('X');
      await c.resuelta();
      await new Promise(r => setTimeout(r, 40));
      expect(aplicados).toEqual([]);
    });
  });
});
