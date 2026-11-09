import { FirestoreError } from '@angular/fire/firestore';
import {
  CODIGOS_DE_SESION, CODIGOS_QUE_NUNCA_ACTUAN, MARCA_AVISO_SESION, TEXTO_AVISO_SESION,
  codigoDeError, dejarMarcaAvisoSesion, esErrorDeSesion, esperarConLimite, hayAlgoQueCerrar,
  tomarMarcaAvisoSesion,
} from './sesion-invalida.util';

describe('codigoDeError — el código por la forma del error, no por la clase', () => {
  it('un objeto plano con name FirebaseError y code string da el código (no es instancia de nada)', () => {
    const plano = Object.create(null) as Record<string, unknown>;
    plano['name'] = 'FirebaseError';
    plano['code'] = 'permission-denied';
    expect(codigoDeError(plano)).toBe('permission-denied');
    expect(codigoDeError({ name: 'FirebaseError', code: 'unauthenticated', message: 'x' })).toBe('unauthenticated');
  });

  it('un FirestoreError real da su código', () => {
    // El constructor es privado en los tipos públicos; en runtime es el que usa el SDK.
    const Clase = FirestoreError as unknown as new (code: string, message: string) => Error;
    expect(codigoDeError(new Clase('permission-denied', 'Missing or insufficient permissions.')))
      .toBe('permission-denied');
  });

  it('un error de Auth da su código tal cual, que no está en ninguna lista', () => {
    const codigo = codigoDeError({ name: 'FirebaseError', code: 'auth/network-request-failed' });
    expect(codigo).toBe('auth/network-request-failed');
    expect(esErrorDeSesion(codigo, null, 'X', true)).toBeFalse();
  });

  it('un error sin esa forma da null', () => {
    const conCodigo = new Error('x') as Error & { code?: string };
    conCodigo.code = 'permission-denied';                              // name 'Error', no 'FirebaseError'
    for (const e of [
      new Error('Missing or insufficient permissions.'),
      conCodigo,
      { name: 'FirebaseError' },                                       // sin code
      { name: 'FirebaseError', code: 403 },                            // code no string
      { code: 'permission-denied' },                                   // sin name
      'permission-denied', null, undefined, 42,
    ]) {
      expect(codigoDeError(e)).toBeNull();
    }
  });
});

describe('marca del aviso en sessionStorage (bloque 2c, cuarta pieza)', () => {
  function storageFalso() {
    const datos = new Map<string, string>();
    return {
      datos,
      getItem: (k: string) => datos.get(k) ?? null,
      setItem: (k: string, v: string) => { datos.set(k, v); },
      removeItem: (k: string) => { datos.delete(k); },
    };
  }

  it('la marca que deja la red la toma el login una sola vez: se borra al leerla', () => {
    const s = storageFalso();
    dejarMarcaAvisoSesion(s);
    expect(s.datos.has(MARCA_AVISO_SESION)).toBeTrue();
    expect(tomarMarcaAvisoSesion(s)).toBeTrue();
    expect(s.datos.has(MARCA_AVISO_SESION)).toBeFalse();
    expect(tomarMarcaAvisoSesion(s)).toBeFalse();       // una recarga posterior no repite el aviso
  });

  it('sin marca no hay aviso', () => {
    expect(tomarMarcaAvisoSesion(storageFalso())).toBeFalse();
  });

  it('un storage que lanza no rompe ni la red ni el login', () => {
    const roto = {
      getItem: () => { throw new Error('x'); },
      setItem: () => { throw new Error('x'); },
      removeItem: () => { throw new Error('x'); },
    };
    expect(() => dejarMarcaAvisoSesion(roto)).not.toThrow();
    expect(tomarMarcaAvisoSesion(roto)).toBeFalse();
  });

  it('el texto del aviso es el de la spec, en usted', () => {
    expect(TEXTO_AVISO_SESION).toBe('Su sesión se cerró o venció. Vuelva a iniciar sesión.');
  });
});

describe('esperarConLimite — la página no se va con una escritura en vuelo, ni se cuelga', () => {
  it('una promesa que resuelve a tiempo da listo', async () => {
    expect(await esperarConLimite(Promise.resolve('ok'), 50)).toBe('listo');
  });

  it('una promesa que rechaza da listo (ya no está en vuelo) y no lanza', async () => {
    expect(await esperarConLimite(Promise.reject(new Error('x')), 50)).toBe('listo');
  });

  it('una promesa que no resuelve nunca da vencido al límite (ej. setDoc sin conexión)', async () => {
    expect(await esperarConLimite(new Promise(() => {}), 20)).toBe('vencido');
  });
});

describe('hayAlgoQueCerrar', () => {
  it('sesión de la app o sesión perdida', () => {
    expect(hayAlgoQueCerrar('X', false)).toBeTrue();
    expect(hayAlgoQueCerrar(null, true)).toBeTrue();
    expect(hayAlgoQueCerrar('X', true)).toBeTrue();
    expect(hayAlgoQueCerrar(null, false)).toBeFalse();
  });
});

describe('esErrorDeSesion — criterio de la red de sesión inválida', () => {
  const nuncaActuan = ['unavailable', 'deadline-exceeded', 'resource-exhausted', 'cancelled', 'internal', 'failed-precondition'];
  const fueraDeLasListas = ['not-found', 'aborted', 'unknown', 'invalid-argument', 'auth/network-request-failed'];

  it('las dos listas de códigos son las de la spec', () => {
    expect([...CODIGOS_QUE_NUNCA_ACTUAN]).toEqual(nuncaActuan);
    expect([...CODIGOS_DE_SESION]).toEqual(['unauthenticated', 'permission-denied']);
  });

  it('cada código de la lista que nunca actúa no actúa, con cualquier sesión y cualquier Auth', () => {
    for (const codigo of nuncaActuan) {
      for (const authUid of [null, 'X', 'Y']) {
        for (const sesionUid of [null, 'X']) {
          for (const sesionPerdida of [false, true]) {
            expect(esErrorDeSesion(codigo, authUid, sesionUid, sesionPerdida))
              .withContext(`${codigo} auth=${authUid} sesion=${sesionUid} perdida=${sesionPerdida}`)
              .toBeFalse();
          }
        }
      }
    }
  });

  it('un código fuera de las dos listas, o un error que no es FirestoreError (null), no actúa', () => {
    for (const codigo of [...fueraDeLasListas, null]) {
      for (const authUid of [null, 'X', 'Y']) {
        for (const sesionUid of [null, 'X']) {
          for (const sesionPerdida of [false, true]) {
            expect(esErrorDeSesion(codigo, authUid, sesionUid, sesionPerdida)).toBeFalse();
          }
        }
      }
    }
  });

  it('unauthenticated actúa siempre que haya algo que cerrar', () => {
    for (const authUid of [null, 'X', 'Y']) {
      expect(esErrorDeSesion('unauthenticated', authUid, 'X', false)).toBeTrue();
      expect(esErrorDeSesion('unauthenticated', authUid, 'X', true)).toBeTrue();
      expect(esErrorDeSesion('unauthenticated', authUid, null, true)).toBeTrue();
    }
  });

  it('permission-denied con Auth en null actúa', () => {
    expect(esErrorDeSesion('permission-denied', null, 'X', false)).toBeTrue();
  });

  it('permission-denied con Auth en otro uid actúa', () => {
    expect(esErrorDeSesion('permission-denied', 'Y', 'X', false)).toBeTrue();
  });

  it('permission-denied con Auth y la app de acuerdo NO actúa (es la matriz, no la sesión: manager)', () => {
    expect(esErrorDeSesion('permission-denied', 'X', 'X', false)).toBeFalse();
  });

  it('sin nada que cerrar (sin sesión y sin sesión perdida) nunca actúa', () => {
    for (const codigo of [...CODIGOS_DE_SESION, ...nuncaActuan, ...fueraDeLasListas, null]) {
      for (const authUid of [null, 'X', 'Y']) {
        expect(esErrorDeSesion(codigo, authUid, null, false)).toBeFalse();
      }
    }
  });

  it('tabla completa: actúa exactamente en las combinaciones enumeradas', () => {
    // [codigo, authUid, sesionUid, sesionPerdida] que actúan. Todo lo demás, no.
    const actuan: [string, string | null, string | null, boolean][] = [
      // unauthenticated, con sesión X (perdida o no) y cualquier Auth
      ['unauthenticated', null, 'X', false], ['unauthenticated', 'X', 'X', false], ['unauthenticated', 'Y', 'X', false],
      ['unauthenticated', null, 'X', true], ['unauthenticated', 'X', 'X', true], ['unauthenticated', 'Y', 'X', true],
      // unauthenticated, sin sesión pero con sesión perdida
      ['unauthenticated', null, null, true], ['unauthenticated', 'X', null, true], ['unauthenticated', 'Y', null, true],
      // permission-denied, con sesión X y Auth que la contradice (null u otro uid)
      ['permission-denied', null, 'X', false], ['permission-denied', 'Y', 'X', false],
      ['permission-denied', null, 'X', true], ['permission-denied', 'Y', 'X', true],
      // permission-denied, sin sesión pero con sesión perdida: Auth contradice siempre
      ['permission-denied', null, null, true], ['permission-denied', 'X', null, true], ['permission-denied', 'Y', null, true],
    ];
    const clave = (c: string | null, a: string | null, s: string | null, p: boolean) => `${c}|${a}|${s}|${p}`;
    const esperadas = new Set(actuan.map(t => clave(...t)));

    let combinaciones = 0;
    for (const codigo of [...CODIGOS_DE_SESION, ...nuncaActuan, ...fueraDeLasListas, null]) {
      for (const authUid of [null, 'X', 'Y']) {
        for (const sesionUid of [null, 'X']) {
          for (const sesionPerdida of [false, true]) {
            combinaciones++;
            expect(esErrorDeSesion(codigo, authUid, sesionUid, sesionPerdida))
              .withContext(clave(codigo, authUid, sesionUid, sesionPerdida))
              .toBe(esperadas.has(clave(codigo, authUid, sesionUid, sesionPerdida)));
          }
        }
      }
    }
    expect(combinaciones).toBe(14 * 3 * 2 * 2);
  });
});
