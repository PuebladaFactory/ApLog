import { Route } from '@angular/router';
import { RolUsuario } from 'src/app/interfaces/usuario';
import { AccionCrud } from 'src/app/interfaces/permiso';
import { routes as rutasRaiz } from 'src/app/raiz/raiz-routing.module';
import { routes as rutasAjustes } from 'src/app/raiz/ajustes/ajustes-routing.module';
import { routes as rutasLegajos } from 'src/app/raiz/legajos/legajos-routing.module';
import { MODULOS_ARRANQUE } from 'src/app/raiz/home/home.component';
import matrizEsperada from './matriz-esperada.json';

/**
 * Invariante cruzado ruta x rol x módulo (docs/disenos/reglas-y-matriz-de-permisos.md, 4.5):
 * para cada ruta, para cada rol que la ruta admite, todo módulo que la pantalla
 * lee al abrirse tiene que darle 'leer' a ese rol.
 *
 * Cada ruta guardada declara en su `data`, al lado de `roles`, qué módulos lee
 * (`lee`). El spec cruza esa declaración con matriz-esperada.json, y la fuerza
 * de la garantía depende de la sección donde está la clave:
 *
 *   - "reglas": la celda la probó test-matriz-permisos-rules.mjs contra el
 *     emulador, así que por transitividad se verifica contra firestore.rules.
 *   - "soloCliente" (hoy sólo 'usuarios'): ese módulo no pasa por permitido();
 *     su regla vive en el match propio de /users/{uid}, que ningún test cruza
 *     con el fixture. La celda se verifica contra la INTENCIÓN registrada en el
 *     fixture, no contra la regla. Es una garantía más débil.
 *
 * EL LÍMITE: verifica la declaración contra la matriz, no la declaración contra
 * la realidad. Si una pantalla declara que lee 'operaciones' y además lee
 * 'asignaciones', este test pasa. Lo que gana es que "qué lee esta pantalla"
 * pasa a ser una pregunta obligatoria y revisable en cada ruta guardada; que la
 * respuesta sea cierta lo revisa una persona.
 *
 * Las declaraciones `lee` no incluyen los listeners que HomeComponent abre para
 * todas las rutas: eso es un chequeo global, no de una pantalla, y lo cubre la
 * afirmación (e). Sus roles no se escriben a mano: son la unión de los `roles`
 * de las rutas, así que admitir un rol nuevo en cualquier ruta la dispara
 * también. MODULOS_ARRANQUE tiene el mismo límite que `lee`: es una declaración
 * a mano y el test no verifica que coincida con lo que abre ngOnInit.
 */

type Matriz = Record<string, Record<AccionCrud, Record<RolUsuario, boolean>>>;
const reglas = matrizEsperada.reglas as Matriz;
const soloCliente = matrizEsperada.soloCliente as Matriz;
// La sección que contiene la clave (ver el encabezado: no dan la misma garantía).
const seccionDe = (m: string): Matriz | undefined =>
  m in reglas ? reglas : m in soloCliente ? soloCliente : undefined;
const ROLES: RolUsuario[] = ['dev', 'admin', 'manager', 'user', 'demo'];

interface RutaDeclarada {
  ruta: string;
  roles: unknown[];
  lee: unknown;
}

// Recorre el árbol y junta las rutas que declaran `roles`, con su path
// completo para los mensajes.
function rutasConRoles(arbol: Route[], prefijo: string): RutaDeclarada[] {
  const salida: RutaDeclarada[] = [];
  for (const r of arbol) {
    const ruta = [prefijo, r.path].filter(Boolean).join('/');
    if (r.data && 'roles' in r.data) {
      salida.push({ ruta: ruta || '(raíz)', roles: r.data['roles'], lee: r.data['lee'] });
    }
    if (r.children) salida.push(...rutasConRoles(r.children, ruta));
  }
  return salida;
}

const RUTAS: RutaDeclarada[] = [
  ...rutasConRoles(rutasRaiz, ''),
  ...rutasConRoles(rutasAjustes, 'ajustes'),
  ...rutasConRoles(rutasLegajos, 'legajos'),
];

describe('Invariante ruta x rol x módulo', () => {
  it('encuentra las 19 rutas que declaran roles', () => {
    expect(RUTAS.map(r => r.ruta)).toEqual(jasmine.arrayContaining(['clientes', 'ajustes/usuarios', 'legajos/cargarDoc']));
    expect(RUTAS.length).toBe(19);
  });

  it('(a) toda ruta que declara roles declara también lee', () => {
    const sinLee = RUTAS.filter(r => !Array.isArray(r.lee)).map(r => r.ruta);
    expect(sinLee).withContext('rutas con roles y sin lee').toEqual([]);
  });

  it('(b) todo valor de lee es una clave de "reglas" o de "soloCliente" del fixture', () => {
    const invalidos: string[] = [];
    for (const r of RUTAS) {
      for (const m of (r.lee as unknown[]) ?? []) {
        if (typeof m !== 'string' || !seccionDe(m)) invalidos.push(`${r.ruta}: lee '${String(m)}', que no es un módulo del fixture`);
      }
    }
    expect(invalidos).toEqual([]);
  });

  it('(c) cada rol admitido puede leer cada módulo que la ruta declara', () => {
    const violaciones: string[] = [];
    for (const r of RUTAS) {
      for (const rol of r.roles as RolUsuario[]) {
        for (const m of (r.lee as string[]) ?? []) {
          if (seccionDe(m)?.[m]?.leer?.[rol] !== true) {
            violaciones.push(`ruta '${r.ruta}' admite al rol '${rol}', que no tiene 'leer' en el módulo '${m}'`);
          }
        }
      }
    }
    expect(violaciones).toEqual([]);
  });

  it('(e) todo rol que alguna ruta admite puede leer los módulos del arranque', () => {
    // Roles derivados de las rutas, no escritos a mano (ver el encabezado).
    const rutasPorRol = new Map<string, string[]>();
    for (const r of RUTAS) {
      for (const rol of r.roles as string[]) rutasPorRol.set(rol, [...(rutasPorRol.get(rol) ?? []), r.ruta]);
    }
    const violaciones: string[] = [];
    for (const [rol, rutas] of rutasPorRol) {
      for (const m of MODULOS_ARRANQUE) {
        if (seccionDe(m)?.[m]?.leer?.[rol as RolUsuario] !== true) {
          violaciones.push(`el rol '${rol}' (lo admite la ruta '${rutas[0]}'${rutas.length > 1 ? ` y ${rutas.length - 1} más` : ''}) ` +
            `no tiene 'leer' en el módulo '${m}', que el arranque (HomeComponent) abre para todas las rutas`);
        }
      }
    }
    expect(violaciones).toEqual([]);
  });

  it('(d) ninguna ruta declara un rol fuera de los cinco', () => {
    const invalidos = RUTAS.flatMap(r =>
      r.roles.filter(rol => !ROLES.includes(rol as RolUsuario)).map(rol => `${r.ruta}: rol '${String(rol)}'`));
    expect(invalidos).toEqual([]);
  });
});
