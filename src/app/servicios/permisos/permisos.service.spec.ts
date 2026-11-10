import { TestBed } from '@angular/core/testing';
import { PermisosService } from './permisos.service';
import { UsuarioSesionService } from '../usuario-sesion/usuario-sesion.service';
import { RolUsuario } from 'src/app/interfaces/usuario';
import { AccionCrud, AccionPermiso, ModuloPermiso } from 'src/app/interfaces/permiso';
import matrizEsperada from './matriz-esperada.json';

type Matriz = Record<string, Record<AccionCrud, Record<RolUsuario, boolean>>>;

// Lo que el spec lee de PermisosService: las dos tablas escritas a mano, no la
// resolución de puede(). Comparar la tabla contra el fixture es lo que verifica
// algo; repetir el camino mapaModuloReglas + mapaAccionCrud no.
interface TablasPermisos {
  matrizBase: Matriz;
  overrides: Record<string, Partial<Record<RolUsuario, boolean>>>;
}

const ROLES: RolUsuario[] = ['dev', 'admin', 'manager', 'user', 'demo'];
const ACCIONES: AccionCrud[] = ['leer', 'crear', 'editar', 'eliminar'];

const reglas = matrizEsperada.reglas as Matriz;
const soloCliente = matrizEsperada.soloCliente as Matriz;
const esperada: Matriz = { ...reglas, ...soloCliente };

describe('PermisosService', () => {
  let rolActual: RolUsuario | null;
  let servicio: PermisosService;
  let tablas: TablasPermisos;

  beforeEach(() => {
    rolActual = null;
    TestBed.configureTestingModule({
      providers: [{ provide: UsuarioSesionService, useValue: { getRol: () => rolActual } }],
    });
    servicio = TestBed.inject(PermisosService);
    tablas = servicio as unknown as TablasPermisos;
  });

  describe('matrizBase contra matriz-esperada.json', () => {
    it('el fixture tiene 9 módulos de reglas y usuarios aparte', () => {
      expect(Object.keys(reglas).length).toBe(9);
      expect(Object.keys(soloCliente)).toEqual(['usuarios']);
    });

    it('tiene exactamente los mismos módulos que el fixture', () => {
      expect(Object.keys(tablas.matrizBase).sort()).toEqual(Object.keys(esperada).sort());
    });

    it('coincide celda por celda (200 celdas)', () => {
      const diferencias: string[] = [];
      let celdas = 0;
      for (const modulo of Object.keys(esperada)) {
        for (const accion of ACCIONES) {
          for (const rol of ROLES) {
            celdas++;
            const real = tablas.matrizBase[modulo]?.[accion]?.[rol];
            const esp = esperada[modulo][accion][rol];
            if (real !== esp) diferencias.push(`${modulo}.${accion}.${rol}: matrizBase=${real}, fixture=${esp}`);
          }
        }
      }
      expect(celdas).toBe(200);
      expect(diferencias).toEqual([]);
    });
  });

  describe('overrides', () => {
    // Cada caso: la clave del override, el rol, el valor del override y la
    // celda de la matriz que el override pisa (para afirmar que el override es
    // el que decide, no la matriz).
    const casos: { clave: string; rol: RolUsuario; valor: boolean; celda: [string, AccionCrud] }[] = [
      { clave: 'operaciones.descargarTablero',     rol: 'demo', valor: false, celda: ['operaciones', 'leer'] },
      { clave: 'operaciones.descargarTablero',     rol: 'user', valor: false, celda: ['operaciones', 'leer'] },
      { clave: 'operaciones.limpiarTablero',       rol: 'user', valor: true,  celda: ['operaciones', 'eliminar'] },
      { clave: 'operaciones.descargarAsignaciones', rol: 'demo', valor: false, celda: ['operaciones', 'leer'] },
      { clave: 'clientes.descargarListado',        rol: 'demo', valor: false, celda: ['entidades', 'leer'] },
      { clave: 'clientes.descargarListado',        rol: 'user', valor: false, celda: ['entidades', 'leer'] },
      { clave: 'choferes.descargarListado',        rol: 'demo', valor: false, celda: ['entidades', 'leer'] },
      { clave: 'choferes.descargarListado',        rol: 'user', valor: false, celda: ['entidades', 'leer'] },
      { clave: 'proveedores.descargarListado',     rol: 'demo', valor: false, celda: ['entidades', 'leer'] },
      { clave: 'proveedores.descargarListado',     rol: 'user', valor: false, celda: ['entidades', 'leer'] },
    ];

    it('son exactamente los 6 cubiertos acá, con 10 valores por rol', () => {
      const claves = [...new Set(casos.map(c => c.clave))].sort();
      expect(Object.keys(tablas.overrides).sort()).toEqual(claves);
      const valores = Object.values(tablas.overrides).reduce((n, o) => n + Object.keys(o).length, 0);
      expect(claves.length).toBe(6);
      expect(valores).toBe(casos.length);
    });

    for (const c of casos) {
      it(`${c.clave} para ${c.rol} devuelve ${c.valor}, no lo de la matriz`, () => {
        const [modulo, celdaAccion] = c.celda;
        expect(esperada[modulo][celdaAccion][c.rol]).not.toBe(c.valor);
        expect(tablas.overrides[c.clave][c.rol]).toBe(c.valor);
        rolActual = c.rol;
        const [mod, accion] = c.clave.split('.') as [ModuloPermiso, AccionPermiso];
        expect(servicio.puede(mod, accion)).toBe(c.valor);
      });
    }
  });
});
