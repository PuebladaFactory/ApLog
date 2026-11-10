import {
  AVISO_PREVIO_MS,
  ESCRITURA_MINIMA_MS,
  INACTIVIDAD_MAXIMA_MS,
  MARCA_ULTIMA_ACTIVIDAD,
  debeEscribirMarca,
  escribirUltimaActividad,
  estadoInactividad,
  leerUltimaActividad,
  marcaVencida,
  msHastaVencer,
} from './inactividad.util';

const MIN = 60 * 1000;

describe('inactividad — constantes del bloque 4', () => {
  it('30 minutos de límite y 1 minuto de aviso previo', () => {
    expect(INACTIVIDAD_MAXIMA_MS).toBe(30 * MIN);
    expect(AVISO_PREVIO_MS).toBe(1 * MIN);
  });
});

describe('estadoInactividad — seguir, avisar o vencer, por marca de tiempo', () => {
  const T0 = 1_000_000_000_000;   // última actividad

  const casos: [string, number, string][] = [
    ['recién hubo actividad', 0, 'seguir'],
    ['a mitad del límite', 15 * MIN, 'seguir'],
    ['justo en el borde del aviso (todavía no avisa)', 29 * MIN, 'seguir'],
    ['un instante dentro de la ventana de aviso', 29 * MIN + 1, 'avisar'],
    ['dentro de la ventana de aviso', 29 * MIN + 30 * 1000, 'avisar'],
    ['justo en el límite (todavía avisa: vence pasado el límite)', 30 * MIN, 'avisar'],
    ['pasado el límite', 30 * MIN + 1, 'vencer'],
    ['mucho después (navegador cerrado de un día para el otro)', 14 * 60 * MIN, 'vencer'],
    ['marca en el futuro (relojes): cuenta como recién', -5 * MIN, 'seguir'],
  ];

  for (const [descripcion, quieto, esperado] of casos) {
    it(`${descripcion} → ${esperado}`, () => {
      expect(estadoInactividad(T0, T0 + quieto)).toBe(esperado as 'seguir' | 'avisar' | 'vencer');
    });
  }

  it('la actividad reinicia la cuenta: con la marca nueva vuelve a seguir', () => {
    const ahora = T0 + 29 * MIN + 30 * 1000;
    expect(estadoInactividad(T0, ahora)).toBe('avisar');
    expect(estadoInactividad(ahora, ahora)).toBe('seguir');           // "Seguir conectado"
    expect(estadoInactividad(ahora, ahora + 29 * MIN)).toBe('seguir');
  });

  it('decide por la marca más reciente de cualquier pestaña, no por tics de ésta', () => {
    // Esta pestaña quedó quieta 40 min, pero otra escribió la marca hace 2 min.
    const ahora = T0 + 40 * MIN;
    expect(estadoInactividad(ahora - 2 * MIN, ahora)).toBe('seguir');
  });

  it('msHastaVencer: la cuenta regresiva del aviso, nunca negativa', () => {
    expect(msHastaVencer(T0, T0 + 29 * MIN + 30 * 1000)).toBe(30 * 1000);
    expect(msHastaVencer(T0, T0 + 31 * MIN)).toBe(0);
  });
});

describe('marcaVencida — /login no ofrece continuar una sesión vencida', () => {
  const T0 = 1_000_000_000_000;
  it('sin marca, no: no hay con qué decidirlo', () => {
    expect(marcaVencida(null, T0)).toBeFalse();
  });
  it('dentro del límite (aun en la ventana de aviso), no', () => {
    expect(marcaVencida(T0, T0 + 29 * MIN + 30 * 1000)).toBeFalse();
  });
  it('pasado el límite, sí', () => {
    expect(marcaVencida(T0, T0 + 30 * MIN + 1)).toBeTrue();
  });
});

describe('debeEscribirMarca — una escritura cada pocos segundos', () => {
  it('la primera siempre; después, sólo pasado el mínimo', () => {
    expect(debeEscribirMarca(null, 1000)).toBeTrue();
    expect(debeEscribirMarca(1000, 1000 + ESCRITURA_MINIMA_MS - 1)).toBeFalse();
    expect(debeEscribirMarca(1000, 1000 + ESCRITURA_MINIMA_MS)).toBeTrue();
  });
});

describe('marca de última actividad en storage', () => {
  function storageFalso() {
    const datos = new Map<string, string>();
    return {
      datos,
      getItem: (k: string) => datos.get(k) ?? null,
      setItem: (k: string, v: string) => { datos.set(k, v); },
    };
  }

  it('se escribe y se lee como número', () => {
    const s = storageFalso();
    escribirUltimaActividad(s, 1234567);
    expect(s.datos.get(MARCA_ULTIMA_ACTIVIDAD)).toBe('1234567');
    expect(leerUltimaActividad(s)).toBe(1234567);
  });

  it('sin marca, basura o storage roto: null', () => {
    const s = storageFalso();
    expect(leerUltimaActividad(s)).toBeNull();
    s.setItem(MARCA_ULTIMA_ACTIVIDAD, 'abc');
    expect(leerUltimaActividad(s)).toBeNull();
    const roto = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
    expect(leerUltimaActividad(roto)).toBeNull();
    expect(() => escribirUltimaActividad(roto, 1)).not.toThrow();
  });
});
