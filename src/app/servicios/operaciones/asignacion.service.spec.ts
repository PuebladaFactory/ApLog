import { TestBed } from '@angular/core/testing';
import { AsignacionService } from './asignacion.service';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { LogRegistroService } from 'src/app/servicios/log-registro/log-registro.service';
import { DisponibilidadService } from 'src/app/servicios/no-disponibilidad/disponibilidad.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import { AsignacionItem } from 'src/app/interfaces/asignacion';

/* Bloque 2c (eje de sesión): el borrador en curso es trabajo sin guardar de un
 * usuario y no se le entrega a otro que entra en la misma pestaña. */
describe('AsignacionService — borrador en curso por usuario (bloque 2c)', () => {
  let uid: string | null;
  let servicio: AsignacionService;
  const items = [] as AsignacionItem[];

  beforeEach(() => {
    uid = 'admin';
    TestBed.configureTestingModule({
      providers: [
        AsignacionService,
        { provide: DbFirestoreService, useValue: {} },
        { provide: LogRegistroService, useValue: {} },
        { provide: DisponibilidadService, useValue: {} },
        { provide: UsuarioSesionService, useValue: { getUsuarioActual: () => (uid ? { uid } : null) } },
      ],
    });
    servicio = TestBed.inject(AsignacionService);
  });

  it('el mismo usuario recupera su borrador', () => {
    servicio.setBorradorEnCurso('2026-11-09', items);
    expect(servicio.getBorradorEnCurso()?.fecha).toBe('2026-11-09');
  });

  it('otro usuario no lo recibe, y queda descartado aunque vuelva el primero', () => {
    servicio.setBorradorEnCurso('2026-11-09', items);
    uid = 'user';
    expect(servicio.getBorradorEnCurso()).toBeNull();
    uid = 'admin';
    expect(servicio.getBorradorEnCurso()).toBeNull();
  });
});
