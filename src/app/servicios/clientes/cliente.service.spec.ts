import { TestBed } from '@angular/core/testing';
import { MonoTypeOperatorFunction, Observable, Subscriber } from 'rxjs';
import { ClienteService } from './cliente.service';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { LogRegistroService } from 'src/app/servicios/log-registro/log-registro.service';
import { PapeleraService } from 'src/app/servicios/papelera/papelera.service';
import { ClienteFactoryService } from 'src/app/servicios/clientes/cliente-factory.service';
import { SesionInvalidaService } from 'src/app/servicios/usuario-sesion/sesion-invalida.service';

/* Bloque 2c (eje de sesión): init() cierra lo anterior, vacía y vuelve a
 * suscribir. ClienteService representa a los seis catálogos que sólo inicia
 * HomeComponent (mismo patrón en Choferes, Proveedores, Tarifario,
 * CategoríaDocumentación y Legajos). */
describe('ClienteService.init — bloque 2c', () => {
  let listeners: Subscriber<unknown[]>[];
  let activos: number;
  let servicio: ClienteService;

  const db = {
    getAllStateChanges: () => new Observable<unknown[]>(sub => {
      listeners.push(sub);
      activos++;
      return () => { activos--; };
    }),
  };
  const sinVigilancia = { vigilar: <T>(): MonoTypeOperatorFunction<T> => src => src };

  beforeEach(() => {
    listeners = [];
    activos = 0;
    TestBed.configureTestingModule({
      providers: [
        ClienteService,
        { provide: DbFirestoreService, useValue: db },
        { provide: LogRegistroService, useValue: {} },
        { provide: PapeleraService, useValue: {} },
        { provide: ClienteFactoryService, useValue: {} },
        { provide: SesionInvalidaService, useValue: sinVigilancia },
      ],
    });
    servicio = TestBed.inject(ClienteService);
  });

  it('un segundo init() cierra el listener anterior: no se acumulan', () => {
    servicio.init();
    servicio.init();
    servicio.init();
    expect(listeners.length).toBe(3);
    expect(activos).toBe(1);
  });

  it('un segundo init() vacía los datos del anterior aunque el listener nuevo nunca emita', () => {
    servicio.init();
    listeners[0].next([{ id: 'c1', razonSocial: 'Del usuario anterior', type: 'added' }]);
    expect(servicio.getClientesActuales().length).toBe(1);

    // El usuario nuevo no tiene lectura: su listener nunca emite. (Sin error
    // simulado: la suscripción real no tiene callback de error y RxJS lo relanza.)
    servicio.init();
    expect(servicio.getClientesActuales()).toEqual([]);
  });

  it('después de re-iniciar, el listener nuevo vuelve a llenar', () => {
    servicio.init();
    servicio.init();
    listeners[1].next([{ id: 'c2', razonSocial: 'Nuevo', type: 'added' }]);
    expect(servicio.getClientesActuales().map(c => c.id)).toEqual(['c2']);
  });
});
