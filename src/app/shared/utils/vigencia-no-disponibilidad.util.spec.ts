import { NoDisponibilidad } from 'src/app/interfaces/no-disponibilidad';
import { cubreFecha } from './vigencia-no-disponibilidad.util';

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
