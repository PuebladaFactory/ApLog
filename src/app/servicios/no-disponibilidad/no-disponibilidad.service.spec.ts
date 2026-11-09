import { TestBed } from '@angular/core/testing';
import { MonoTypeOperatorFunction, Observable, Subscriber } from 'rxjs';
import { NoDisponibilidadService } from './no-disponibilidad.service';
import { NoDisponibilidadFactoryService } from './no-disponibilidad-factory.service';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { LogRegistroService } from 'src/app/servicios/log-registro/log-registro.service';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import { SesionInvalidaService } from 'src/app/servicios/usuario-sesion/sesion-invalida.service';

/* Bloque 2c (eje de sesión): init() lo llaman varios componentes, así que es
 * idempotente dentro de una sesión; si cambió el usuario o el listener murió,
 * cierra lo anterior, vacía y vuelve a suscribir. */
describe('NoDisponibilidadService.init — bloque 2c', () => {
  let listeners: Subscriber<unknown[]>[];
  let activos: number;
  let uid: string | null;
  let servicio: NoDisponibilidadService;

  const nd = (id: string) => ({ id, type: 'added', desde: '2026-11-01', timestamp: 1 });

  beforeEach(() => {
    listeners = [];
    activos = 0;
    uid = 'admin';
    TestBed.configureTestingModule({
      providers: [
        NoDisponibilidadService,
        {
          provide: DbFirestoreService,
          useValue: {
            getAllStateChanges: () => new Observable<unknown[]>(sub => {
              listeners.push(sub);
              activos++;
              return () => { activos--; };
            }),
          },
        },
        { provide: LogRegistroService, useValue: {} },
        { provide: NoDisponibilidadFactoryService, useValue: {} },
        { provide: ChoferService, useValue: {} },
        { provide: ProveedorService, useValue: {} },
        { provide: UsuarioSesionService, useValue: { getUsuarioActual: () => (uid ? { uid } : null) } },
        { provide: SesionInvalidaService, useValue: { vigilar: <T>(): MonoTypeOperatorFunction<T> => src => src } },
      ],
    });
    servicio = TestBed.inject(NoDisponibilidadService);
    spyOn(console, 'error');   // el callback de error propio del servicio
  });

  it('con el mismo usuario, varios init() no abren listeners nuevos ni vacían', () => {
    servicio.init();
    listeners[0].next([nd('n1')]);
    servicio.init();
    servicio.init();
    expect(listeners.length).toBe(1);
    expect(servicio.getNoDisponibilidadesActuales().length).toBe(1);
    expect(servicio.estaCargado()).toBeTrue();
  });

  it('con otro usuario, cierra el listener anterior, vacía y marca no cargado', () => {
    servicio.init();
    listeners[0].next([nd('n1')]);
    uid = 'manager';
    servicio.init();
    expect(listeners.length).toBe(2);
    expect(activos).toBe(1);
    expect(servicio.getNoDisponibilidadesActuales()).toEqual([]);
    expect(servicio.estaCargado()).toBeFalse();
  });

  it('si el listener murió, el próximo init() vuelve a suscribir aunque sea el mismo usuario', () => {
    servicio.init();
    listeners[0].error({ name: 'FirebaseError', code: 'permission-denied' });
    servicio.init();
    expect(listeners.length).toBe(2);
    expect(activos).toBe(1);
  });
});
