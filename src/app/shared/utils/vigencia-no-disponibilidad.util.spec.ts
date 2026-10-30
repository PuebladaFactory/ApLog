import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { ConId } from 'src/app/interfaces/conId';
import {
  MotivoNoDisponible, NoDisponibilidad, ResultadoDisponibilidad, SujetoNoDisponibilidad,
} from 'src/app/interfaces/no-disponibilidad';
import {
  cubreFecha, DatosDisponibilidad, disponibilidadDe, vehiculosDisponiblesDe,
} from './vigencia-no-disponibilidad.util';

/** Registro de prueba: chofer, del 2026-11-10 al 2026-11-20, activo. */
function nd(cambios: Partial<NoDisponibilidad> = {}): NoDisponibilidad {
  return {
    idNoDisponibilidad: 'nd1',
    sujeto: { tipo: 'chofer', idChofer: 'ch1', nombre: 'Juan', apellido: 'Pérez' },
    desde: '2026-11-10',
    hasta: '2026-11-20',
    motivo: 'Vacaciones',
    activa: true,
    timestamp: 0,
    ...cambios,
  };
}

describe('vigencia-no-disponibilidad.util', () => {

  describe('cubreFecha', () => {

    it('una fecha adentro del rango está cubierta', () => {
      expect(cubreFecha(nd(), '2026-11-15')).toBeTrue();
    });

    it('el primer día del rango está cubierto (borde inclusivo)', () => {
      expect(cubreFecha(nd(), '2026-11-10')).toBeTrue();
    });

    it('el último día del rango está cubierto (borde inclusivo)', () => {
      expect(cubreFecha(nd(), '2026-11-20')).toBeTrue();
    });

    it('el día anterior a desde no está cubierto', () => {
      expect(cubreFecha(nd(), '2026-11-09')).toBeFalse();
    });

    it('el día posterior a hasta no está cubierto', () => {
      expect(cubreFecha(nd(), '2026-11-21')).toBeFalse();
    });

    it('con hasta null cubre cualquier fecha desde desde en adelante, y no antes', () => {
      const abierta = nd({ hasta: null });
      expect(cubreFecha(abierta, '2026-11-10')).toBeTrue();
      expect(cubreFecha(abierta, '2027-06-30')).toBeTrue();
      expect(cubreFecha(abierta, '2099-12-31')).toBeTrue();
      expect(cubreFecha(abierta, '2026-11-09')).toBeFalse();
    });

    it('una anulada (activa: false) no cubre aunque la fecha esté en el rango', () => {
      const anulada = nd({ activa: false });
      expect(cubreFecha(anulada, '2026-11-15')).toBeFalse();
      expect(cubreFecha(anulada, '2026-11-10')).toBeFalse();
      expect(cubreFecha(nd({ activa: false, hasta: null }), '2026-12-01')).toBeFalse();
    });
  });
});

// ── Cascadas ──────────────────────────────────────────────────────
//
// Flota de prueba:
//   D1 chofer directo, vehículos V1 y V2.     D2 chofer directo, vehículo V3.
//   P1 proveedor: choferes P1C1 y P1C2, vehículos VP1 y VP2 (asignadoA proveedor).
//   P2 proveedor: chofer P2C1, que tiene su propio vehículo VP2C (asignadoA chofer).
//   P3 proveedor sin choferes, vehículo VP3.
// Períodos del 2026-11-10 al 2026-11-20; se consulta el 2026-11-15.

const F = '2026-11-15';

function chofer(idChofer: string, idProveedor?: string): Chofer {
  return {
    idChofer,
    datosPersonales: { nombre: idChofer, apellido: idChofer },
    contratacion: idProveedor ? { tipo: 'proveedor', idProveedor } : { tipo: 'directo' },
  } as Chofer;
}

function vehiculo(idVehiculo: string, asignadoA: Vehiculo['asignadoA']): Vehiculo {
  return { idVehiculo, dominio: idVehiculo, asignadoA } as Vehiculo;
}

const choferes: Chofer[] = [
  chofer('D1'), chofer('D2'),
  chofer('P1C1', 'P1'), chofer('P1C2', 'P1'),
  chofer('P2C1', 'P2'),
];

const vehiculos: Vehiculo[] = [
  vehiculo('V1', { tipo: 'chofer', idChofer: 'D1' }),
  vehiculo('V2', { tipo: 'chofer', idChofer: 'D1' }),
  vehiculo('V3', { tipo: 'chofer', idChofer: 'D2' }),
  vehiculo('VP1', { tipo: 'proveedor', idProveedor: 'P1' }),
  vehiculo('VP2', { tipo: 'proveedor', idProveedor: 'P1' }),
  vehiculo('VP2C', { tipo: 'chofer', idChofer: 'P2C1' }),
  vehiculo('VP3', { tipo: 'proveedor', idProveedor: 'P3' }),
];

const sujetoChofer = (id: string): SujetoNoDisponibilidad => ({ tipo: 'chofer', idChofer: id, nombre: id, apellido: id });
const sujetoVehiculo = (id: string): SujetoNoDisponibilidad => ({ tipo: 'vehiculo', idVehiculo: id, dominio: id });
const sujetoProveedor = (id: string): SujetoNoDisponibilidad => ({ tipo: 'proveedor', idProveedor: id, razonSocial: id });

function registro(
  id: string,
  sujeto: SujetoNoDisponibilidad,
  cambios: Partial<NoDisponibilidad> = {},
): ConId<NoDisponibilidad> {
  return {
    id, idNoDisponibilidad: id, sujeto,
    desde: '2026-11-10', hasta: '2026-11-20', motivo: `motivo ${id}`, activa: true, timestamp: 0,
    ...cambios,
  };
}

function datos(...noDisponibilidades: ConId<NoDisponibilidad>[]): DatosDisponibilidad {
  return { noDisponibilidades, choferes, vehiculos };
}

const ch = (idChofer: string) => ({ tipo: 'chofer' as const, idChofer });
const ve = (idVehiculo: string) => ({ tipo: 'vehiculo' as const, idVehiculo });
const pr = (idProveedor: string) => ({ tipo: 'proveedor' as const, idProveedor });

/** Motivos como pares [origen, id del registro], para comparar sin el registro entero. */
function motivos(r: ResultadoDisponibilidad): [MotivoNoDisponible['origen'], string][] {
  return r.disponible ? [] : r.motivos.map(m => [m.origen, m.noDisponibilidad.id]);
}

describe('vigencia-no-disponibilidad.util — cascadas', () => {

  describe('las cuatro filas de la tabla', () => {

    it('vehículo no disponible: cae sólo ese vehículo; su chofer y el otro vehículo siguen', () => {
      const d = datos(registro('nd', sujetoVehiculo('V1')));
      expect(motivos(disponibilidadDe(d, ve('V1'), F))).toEqual([['propia', 'nd']]);
      expect(disponibilidadDe(d, ch('D1'), F).disponible).toBeTrue();
      expect(disponibilidadDe(d, ve('V2'), F).disponible).toBeTrue();
    });

    it('chofer directo no disponible: cae él y sus vehículos (cascadaChofer); nadie más', () => {
      const d = datos(registro('nd', sujetoChofer('D1')));
      expect(motivos(disponibilidadDe(d, ch('D1'), F))).toEqual([['propia', 'nd']]);
      expect(motivos(disponibilidadDe(d, ve('V1'), F))).toEqual([['cascadaChofer', 'nd']]);
      expect(motivos(disponibilidadDe(d, ve('V2'), F))).toEqual([['cascadaChofer', 'nd']]);
      expect(disponibilidadDe(d, ch('D2'), F).disponible).toBeTrue();
      expect(disponibilidadDe(d, ve('V3'), F).disponible).toBeTrue();
    });

    it('chofer de proveedor no disponible: cae sólo él; el proveedor, el otro chofer y los vehículos siguen', () => {
      const d = datos(registro('nd', sujetoChofer('P1C1')));
      expect(motivos(disponibilidadDe(d, ch('P1C1'), F))).toEqual([['propia', 'nd']]);
      expect(disponibilidadDe(d, ch('P1C2'), F).disponible).toBeTrue();
      expect(disponibilidadDe(d, pr('P1'), F).disponible).toBeTrue();
      expect(disponibilidadDe(d, ve('VP1'), F).disponible).toBeTrue();
      expect(disponibilidadDe(d, ve('VP2'), F).disponible).toBeTrue();
    });

    it('proveedor no disponible: caen sus choferes y sus vehículos (cascadaProveedor); nadie más', () => {
      const d = datos(registro('nd', sujetoProveedor('P1')));
      expect(motivos(disponibilidadDe(d, pr('P1'), F))).toEqual([['propia', 'nd']]);
      expect(motivos(disponibilidadDe(d, ch('P1C1'), F))).toEqual([['cascadaProveedor', 'nd']]);
      expect(motivos(disponibilidadDe(d, ch('P1C2'), F))).toEqual([['cascadaProveedor', 'nd']]);
      // Llega por el proveedor y por sus dos choferes: queda UNA vez.
      expect(motivos(disponibilidadDe(d, ve('VP1'), F))).toEqual([['cascadaProveedor', 'nd']]);
      expect(motivos(disponibilidadDe(d, ve('VP2'), F))).toEqual([['cascadaProveedor', 'nd']]);
      expect(disponibilidadDe(d, ch('D1'), F).disponible).toBeTrue();
      expect(disponibilidadDe(d, ve('V1'), F).disponible).toBeTrue();
      expect(disponibilidadDe(d, pr('P2'), F).disponible).toBeTrue();
    });
  });

  describe('asimetría directo / proveedor', () => {

    it('el vehículo de un chofer directo cae con él; el de un proveedor no cae por uno de sus choferes', () => {
      const d = datos(registro('nd1', sujetoChofer('D1')), registro('nd2', sujetoChofer('P1C1')));
      expect(disponibilidadDe(d, ve('V1'), F).disponible).toBeFalse();
      expect(disponibilidadDe(d, ve('VP1'), F).disponible).toBeTrue();
    });

    it('el vehículo de un proveedor cae cuando no le queda NINGÚN chofer disponible', () => {
      const d = datos(registro('nd1', sujetoChofer('P1C1')), registro('nd2', sujetoChofer('P1C2')));
      expect(motivos(disponibilidadDe(d, ve('VP1'), F)))
        .toEqual([['cascadaChofer', 'nd1'], ['cascadaChofer', 'nd2']]);
      // El proveedor como entidad no tiene registro propio: sigue disponible.
      expect(disponibilidadDe(d, pr('P1'), F).disponible).toBeTrue();
    });

    it('un proveedor sin choferes no tumba sus vehículos (no hay registro que citar)', () => {
      expect(disponibilidadDe(datos(), ve('VP3'), F).disponible).toBeTrue();
      const d = datos(registro('nd', sujetoProveedor('P3')));
      expect(motivos(disponibilidadDe(d, ve('VP3'), F))).toEqual([['cascadaProveedor', 'nd']]);
    });
  });

  describe('cadena transitiva', () => {

    it('proveedor → su chofer → el vehículo de ese chofer', () => {
      const d = datos(registro('nd', sujetoProveedor('P2')));
      expect(motivos(disponibilidadDe(d, ch('P2C1'), F))).toEqual([['cascadaProveedor', 'nd']]);
      expect(motivos(disponibilidadDe(d, ve('VP2C'), F))).toEqual([['cascadaProveedor', 'nd']]);
    });

    it('el chofer de proveedor con vehículo propio arrastra su vehículo (cascadaChofer)', () => {
      const d = datos(registro('nd', sujetoChofer('P2C1')));
      expect(motivos(disponibilidadDe(d, ve('VP2C'), F))).toEqual([['cascadaChofer', 'nd']]);
      expect(disponibilidadDe(d, pr('P2'), F).disponible).toBeTrue();
    });
  });

  describe('fechas en la resolución', () => {

    it('hasta null: no disponible desde `desde` en adelante, sin fin, también por cascada', () => {
      const d = datos(registro('nd', sujetoChofer('D1'), { hasta: null }));
      expect(disponibilidadDe(d, ch('D1'), '2026-11-10').disponible).toBeFalse();
      expect(disponibilidadDe(d, ch('D1'), '2030-01-01').disponible).toBeFalse();
      expect(disponibilidadDe(d, ve('V1'), '2030-01-01').disponible).toBeFalse();
      expect(disponibilidadDe(d, ch('D1'), '2026-11-09').disponible).toBeTrue();
    });

    it('bordes: primer y último día adentro, el anterior y el siguiente afuera, también por cascada', () => {
      const d = datos(registro('nd', sujetoProveedor('P1')));
      for (const sujeto of [pr('P1'), ch('P1C1'), ve('VP1')]) {
        expect(disponibilidadDe(d, sujeto, '2026-11-10').disponible).withContext(`${sujeto.tipo} día 10`).toBeFalse();
        expect(disponibilidadDe(d, sujeto, '2026-11-20').disponible).withContext(`${sujeto.tipo} día 20`).toBeFalse();
        expect(disponibilidadDe(d, sujeto, '2026-11-09').disponible).withContext(`${sujeto.tipo} día 9`).toBeTrue();
        expect(disponibilidadDe(d, sujeto, '2026-11-21').disponible).withContext(`${sujeto.tipo} día 21`).toBeTrue();
      }
    });

    it('activa: false no afecta a nadie, ni propia ni por cascada', () => {
      const anulada = { activa: false };
      const d = datos(
        registro('a1', sujetoProveedor('P1'), anulada),
        registro('a2', sujetoChofer('D1'), { ...anulada, hasta: null }),
        registro('a3', sujetoVehiculo('V3'), anulada),
        registro('a4', sujetoChofer('P2C1'), anulada),
      );
      const todos = [
        pr('P1'), pr('P2'), pr('P3'),
        ...choferes.map(c => ch(c.idChofer)),
        ...vehiculos.map(v => ve(v.idVehiculo)),
      ];
      for (const sujeto of todos) {
        expect(disponibilidadDe(d, sujeto, F).disponible).withContext(JSON.stringify(sujeto)).toBeTrue();
      }
    });
  });

  describe('vehiculosDisponiblesDe', () => {

    it('chofer con dos vehículos y uno no disponible: uno en cada lista, y el chofer sigue disponible', () => {
      const d = datos(registro('nd', sujetoVehiculo('V1')));
      const r = vehiculosDisponiblesDe(d, { tipo: 'chofer', idChofer: 'D1' }, F);
      expect(r.disponibles.map(v => v.idVehiculo)).toEqual(['V2']);
      expect(r.noDisponibles.map(x => x.vehiculo.idVehiculo)).toEqual(['V1']);
      expect(r.noDisponibles[0].motivos.map(m => [m.origen, m.noDisponibilidad.id])).toEqual([['propia', 'nd']]);
      expect(disponibilidadDe(d, ch('D1'), F).disponible).toBeTrue();
    });

    it('proveedor: un vehículo propio no disponible se separa; el proveedor no disponible los tumba todos', () => {
      const p1 = { tipo: 'proveedor' as const, idProveedor: 'P1' };
      const r1 = vehiculosDisponiblesDe(datos(registro('nd', sujetoVehiculo('VP1'))), p1, F);
      expect(r1.disponibles.map(v => v.idVehiculo)).toEqual(['VP2']);
      expect(r1.noDisponibles.map(x => x.vehiculo.idVehiculo)).toEqual(['VP1']);

      const r2 = vehiculosDisponiblesDe(datos(registro('nd', sujetoProveedor('P1'))), p1, F);
      expect(r2.disponibles).toEqual([]);
      expect(r2.noDisponibles.map(x => x.vehiculo.idVehiculo)).toEqual(['VP1', 'VP2']);
    });

    it('sólo devuelve los vehículos de la entidad (asignadoA), no los de otros', () => {
      const r = vehiculosDisponiblesDe(datos(), { tipo: 'chofer', idChofer: 'D2' }, F);
      expect(r.disponibles.map(v => v.idVehiculo)).toEqual(['V3']);
      expect(r.noDisponibles).toEqual([]);
    });
  });

  describe('motivos', () => {

    it('trae todos los registros que causan la no disponibilidad, cada uno con su origen', () => {
      const d = datos(
        registro('vac', sujetoChofer('D1')),
        registro('enf', sujetoChofer('D1'), { desde: '2026-11-14', hasta: null }),
        registro('taller', sujetoVehiculo('V1')),
      );
      expect(motivos(disponibilidadDe(d, ch('D1'), F))).toEqual([['propia', 'vac'], ['propia', 'enf']]);
      expect(motivos(disponibilidadDe(d, ve('V1'), F)))
        .toEqual([['propia', 'taller'], ['cascadaChofer', 'vac'], ['cascadaChofer', 'enf']]);
    });

    it('el motivo trae el registro completo, no sólo el id', () => {
      const registroD1 = registro('nd', sujetoChofer('D1'));
      const r = disponibilidadDe(datos(registroD1), ve('V1'), F);
      expect(r.disponible).toBeFalse();
      if (!r.disponible) expect(r.motivos[0].noDisponibilidad).toBe(registroD1);
    });

    it('un registro de otro período o de otro sujeto no aparece', () => {
      const d = datos(
        registro('otroPeriodo', sujetoChofer('D1'), { desde: '2026-12-01', hasta: '2026-12-05' }),
        registro('otroSujeto', sujetoChofer('D2')),
      );
      expect(disponibilidadDe(d, ch('D1'), F)).toEqual({ disponible: true });
      expect(disponibilidadDe(d, ve('V1'), F)).toEqual({ disponible: true });
    });

    it('sujeto que no está en los datos (p. ej. en papelera): sólo cuentan sus registros propios', () => {
      expect(disponibilidadDe(datos(), ve('borrado'), F)).toEqual({ disponible: true });
      const d = datos(registro('nd', sujetoVehiculo('borrado')));
      expect(motivos(disponibilidadDe(d, ve('borrado'), F))).toEqual([['propia', 'nd']]);
    });
  });
});
