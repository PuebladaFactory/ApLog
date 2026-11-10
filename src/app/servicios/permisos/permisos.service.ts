import { Injectable } from '@angular/core';
import { UsuarioSesionService } from '../usuario-sesion/usuario-sesion.service';
import { RolUsuario } from 'src/app/interfaces/usuario';
import { ModuloPermiso, AccionPermiso, AccionCrud } from 'src/app/interfaces/permiso';

type MatrizRoles = Record<RolUsuario, boolean>;
type MatrizAcciones = Record<AccionCrud, MatrizRoles>;

// Módulos de permitido() (firestore.rules) que la UI consulta, más 'usuarios'.
// No son los ModuloPermiso de Angular: varios ModuloPermiso comparten el mismo
// módulo de las reglas (ver mapaModuloReglas). 'usuarios' no es un módulo de
// las reglas (permitido()/moduloDe() no lo conocen, /users/{uid} tiene su
// propio match block) pero vive en la misma matriz por conveniencia — ver
// puede(). Cada módulo de esta lista es alcanzable desde algún ModuloPermiso;
// los de permitido() que faltan están ausentes a propósito, ver abajo.
//
// Módulos de permitido() que la UI deliberadamente NO consulta: ningún
// ModuloPermiso los alcanza (quitados de matrizBase en el bloque 2 del frente
// de reglas y matriz, docs/disenos/reglas-y-matriz-de-permisos.md, 4.1). No
// son omisiones: son celdas que las reglas necesitan para escrituras que
// ninguna pantalla ofrece como gesto propio. Su verificación vive en los
// test-*-rules.mjs de functions/, no en matriz-esperada.json.
//   - asignaciones: tablero de asignaciones (borrador). dev/admin/user con las
//     4 acciones, sin distinción, porque 'user' arma, guarda y descarta el
//     borrador; se separó de 'operaciones' por un bug real (limpiar un
//     borrador fallaba para 'user'). La UI lo gatea con 'operaciones' más los
//     overrides de limpiarTablero y descargarAsignaciones.
//   - informesOp: el cierre de una operación, que hace 'user', lee el par de
//     InformeOp (anti-duplicado) y lo crea. Editar y eliminar, sólo dev/admin.
//   - comisiones: comisionesVenta. El cierre ('user') las escribe con
//     set+merge (crear si no existe, editar si existe); 'user' no las lee.
//   - tarifasHistorial: historial del tarifario viejo, append-only (nadie
//     edita ni elimina, dev incluido).
//   - legacySoloLectura: colecciones legado y código muerto; lectura para
//     cualquier autenticado (manager incluido), escritura para nadie.
//   - historicoSoloLectura: logs y papelera viejos, histórico congelado; la
//     pantalla que lo lee (RegistroComponent) se gatea por ruta.
//   - numeradores: lo escribe NumeradorService al asignar ids secuenciales
//     dentro de un alta; sin gesto propio en la UI.
//   - logs: registroLog. Toda mutación escribe su entrada en el mismo batch
//     (por eso 'user' crea); la pantalla de lectura se gatea por ruta.
//   - papelera: papeleraEventos/objetosEliminados. La baja ('user' da de baja
//     operaciones abiertas) crea el evento; la pantalla se gatea por ruta.
//   - vencimientos: la escribe sólo la Cloud Function
//     verificarVencimientosDocumentacion; la UI sólo la lee.
//
// El cierre de una operación escribe informesOp, comisiones, resumenes y
// registroLog: por eso 'user' tiene escritura en esos cuatro módulos de las
// reglas aunque ninguna pantalla le ofrezca escribirlos directamente.
// 'resumenes' sí está en esta lista porque lo alcanza 'reportes'.
type ModuloReglas =
  | 'desarrollo'
  | 'entidades'
  | 'legajos'
  | 'vendedores'
  | 'operaciones'
  | 'tarifas'
  | 'finanzas'
  | 'resumenes'
  | 'configuracion'
  | 'usuarios';

@Injectable({
  providedIn: 'root'
})
export class PermisosService {

  constructor(private usuarioSesion: UsuarioSesionService) {}

  // La porción de permitido() de firestore.rules que la UI consulta: un
  // módulo por cada ModuloReglas, con granularidad por acción (leer/crear/
  // editar/eliminar) — la versión anterior colapsaba las 4 acciones a un solo
  // booleano por [modulo][rol], y 'user'/'demo' heredaban 'eliminar' en
  // clientes/choferes/proveedores por tener 'leer'. Dos excepciones, las dos
  // deliberadas: 'usuarios', que no está en permitido() (regla propia en
  // /users/{uid}, ver su entrada), y `overrides`, los desvíos puntuales que el
  // negocio pide sobre esta matriz sin cambiar las reglas.
  //
  // Duplica a mano las reglas, a propósito. La expectativa mantenida a mano es
  // matriz-esperada.json: permisos.service.spec.ts verifica esta tabla contra
  // ella y functions/test-matriz-permisos-rules.mjs verifica las reglas contra
  // ella. Un cambio acá sin el mismo cambio en las reglas (o al revés) rompe
  // uno de los dos.
  //
  // ⚠️ 'manager' está en false en todas las celdas, pero eso NO quiere decir
  // que no lea nada en Firestore: permitido() da 'leer' sobre
  // 'legacySoloLectura' a cualquier rol autenticado, sin condición de rol, y
  // ese módulo no está acá porque la UI no lo consulta. Ver la skill
  // `botones-y-permisos`.
  private readonly matrizBase: Record<ModuloReglas, MatrizAcciones> = {
    // Herramientas de desarrollo de /migracion (colección generacionesPrueba).
    // En permitido() esta rama no distingue acción: es `r == 'dev'` para las
    // cuatro. Se agrega acá porque el sidebar de Migración se gatea con
    // 'desarrollo.ver' en el bloque 3, en reemplazo de la comparación de rol
    // cruda que tiene hoy; hasta entonces no la consulta nadie.
    desarrollo: {
      leer:     { dev: true, admin: false, manager: false, user: false, demo: false },
      crear:    { dev: true, admin: false, manager: false, user: false, demo: false },
      editar:   { dev: true, admin: false, manager: false, user: false, demo: false },
      eliminar: { dev: true, admin: false, manager: false, user: false, demo: false },
    },
    entidades: {
      leer:     { dev: true, admin: true, manager: false, user: true,  demo: true },
      crear:    { dev: true, admin: true, manager: false, user: true,  demo: false },
      editar:   { dev: true, admin: true, manager: false, user: true,  demo: false },
      eliminar: { dev: true, admin: true, manager: false, user: false, demo: false },
    },
    // 'crear' en 'user': true — crear un legajo nunca es un gesto propio del
    // módulo Legajos, es consecuencia obligatoria e inseparable del alta de
    // un Chofer (misma cascada choferes→vehiculos→legajos, mismo perfil de
    // riesgo que crear el vehículo). Fix de bug real: la matriz (y la regla
    // real) le negaban 'crear' a 'user' pese a que ChoferService.altaChofer
    // ya lo necesitaba — mismo perfil que el bug de 'asignaciones'/
    // 'operaciones' (ver CLAUDE.md → "Fix post-cierre"). No hay, ni va a
    // haber, un botón de alta de legajo suelto — no se agrega ningún
    // ModuloPermiso/AccionPermiso nuevo por esto.
    legajos: {
      leer:     { dev: true, admin: true, manager: false, user: true,  demo: true },
      crear:    { dev: true, admin: true, manager: false, user: true,  demo: false },
      editar:   { dev: true, admin: true, manager: false, user: true,  demo: false },
      eliminar: { dev: true, admin: true, manager: false, user: false, demo: false },
    },
    vendedores: {
      leer:     { dev: true, admin: true, manager: false, user: false, demo: true },
      crear:    { dev: true, admin: true, manager: false, user: false, demo: false },
      editar:   { dev: true, admin: true, manager: false, user: false, demo: false },
      eliminar: { dev: true, admin: true, manager: false, user: false, demo: false },
    },
    operaciones: {
      leer:     { dev: true, admin: true, manager: false, user: true,  demo: true },
      crear:    { dev: true, admin: true, manager: false, user: true,  demo: false },
      editar:   { dev: true, admin: true, manager: false, user: true,  demo: false },
      eliminar: { dev: true, admin: true, manager: false, user: false, demo: false },
    },
    tarifas: {
      leer:     { dev: true, admin: true, manager: false, user: true,  demo: true },
      crear:    { dev: true, admin: true, manager: false, user: false, demo: false },
      editar:   { dev: true, admin: true, manager: false, user: false, demo: false },
      eliminar: { dev: true, admin: true, manager: false, user: false, demo: false },
    },
    finanzas: {
      leer:     { dev: true, admin: true, manager: false, user: false, demo: true },
      crear:    { dev: true, admin: true, manager: false, user: false, demo: false },
      editar:   { dev: true, admin: true, manager: false, user: false, demo: false },
      eliminar: { dev: true, admin: true, manager: false, user: false, demo: false },
    },
    // Resúmenes nuevos (resumenesOp): 'user' los escribe al cerrar
    // (set+merge = crear si no existe, editar si existe), no los lee.
    resumenes: {
      leer:     { dev: true, admin: true, manager: false, user: false, demo: true },
      crear:    { dev: true, admin: true, manager: false, user: true,  demo: false },
      editar:   { dev: true, admin: true, manager: false, user: true,  demo: false },
      eliminar: { dev: true, admin: true, manager: false, user: false, demo: false },
    },
    // Configuración de la app (F8b): `configuracion/empresa`. La leen todos
    // los roles con acceso (la usan los comprobantes); escriben dev/admin.
    configuracion: {
      leer:     { dev: true, admin: true,  manager: false, user: true,  demo: true },
      crear:    { dev: true, admin: true,  manager: false, user: false, demo: false },
      editar:   { dev: true, admin: true,  manager: false, user: false, demo: false },
      eliminar: { dev: true, admin: false, manager: false, user: false, demo: false },
    },
    // Caso especial (Opción A): no pasa por permitido()/moduloDe() — regla
    // propia en firestore.rules (/users/{uid}: write solo 'dev', lectura
    // dev/admin/propio uid). 'admin' SÍ puede editar/eliminar usuarios en la
    // práctica, pero vía Cloud Functions con autorización propia
    // (exigirObjetivoEditable en functions/src/gestionUsuarios.ts), no por
    // escritura directa a Firestore. Esto refleja "puede intentar la acción"
    // (capa de permiso); la jerarquía fina por fila (admin no se edita el
    // rol a sí mismo, admin no toca a otro admin salvo que sea dev) vive en
    // gestion-usuarios.component.ts (editarDeshabilitado()/
    // eliminarDeshabilitado()), no se duplica acá.
    usuarios: {
      leer:     { dev: true, admin: true, manager: false, user: false, demo: false },
      crear:    { dev: true, admin: true, manager: false, user: false, demo: false },
      editar:   { dev: true, admin: true, manager: false, user: false, demo: false },
      eliminar: { dev: true, admin: true, manager: false, user: false, demo: false },
    },
  };

  // ModuloPermiso (Angular) → módulo real de firestore.rules. Varios
  // ModuloPermiso comparten el mismo módulo real cuando sus colecciones
  // comparten módulo en moduloDe(): facturacion/liquidaciones/finanzas →
  // 'finanzas', y clientes/choferes/proveedores → 'entidades'. 'usuarios'
  // queda afuera a propósito: es un caso especial que no usa esta tabla, ver
  // puede().
  //
  // ⚠️ 'reportes' apuntaba a 'finanzas' con la justificación de que sus
  // colecciones no tenían módulo propio ("incluye resumenOpMensual→'finanzas'").
  // Dejó de ser cierto con el frente Reportes: las pantallas de Reportes leen
  // resumenesOp, que moduloDe() mapea a 'resumenes'. En 'leer' los dos módulos
  // dan los mismos roles (dev/admin/demo), así que el mapeo equivocado no tenía
  // efecto visible — pero en 'crear' y 'editar' difieren ('resumenes' da 'user',
  // 'finanzas' no). Corregido acá.
  //
  // ⚠️ Compartir módulo es válido sólo mientras la pantalla lea de verdad las
  // colecciones del módulo compartido, y hay tres casos donde el módulo que se
  // gatea no es el que se lee: 'liquidaciones' gatea 'finanzas' pero
  // informe-op-listado escribe informesOp; 'vendedores' gatea 'vendedores' pero
  // el tablero lee comisionesVenta → 'comisiones'; 'operaciones' gatea
  // 'operaciones' pero el tablero de asignaciones lee asignaciones (de ahí el
  // override de limpiarTablero). Los tres coinciden en valor con el módulo
  // correcto para las acciones que se consultan hoy, así que no hay efecto —
  // pero es coincidencia, no diseño. El test del bloque 6 del frente lo
  // verifica por ruta: docs/disenos/reglas-y-matriz-de-permisos.md, 4.5.
  private readonly mapaModuloReglas: Record<Exclude<ModuloPermiso, 'usuarios'>, ModuloReglas> = {
    clientes: 'entidades',
    choferes: 'entidades',
    proveedores: 'entidades',
    legajos: 'legajos',
    vendedores: 'vendedores',
    operaciones: 'operaciones',
    facturacion: 'finanzas',
    liquidaciones: 'finanzas',
    finanzas: 'finanzas',
    reportes: 'resumenes',
    tarifas: 'tarifas',
    desarrollo: 'desarrollo',
    configuracion: 'configuracion',
  };

  // AccionPermiso (semántica de UI/botón) → AccionCrud (lo que distingue
  // firestore.rules). Si aparece una AccionPermiso nueva que no mapee
  // claramente a una de las 4, agregar acá con un TODO explícito — no asumir.
  private readonly mapaAccionCrud: Record<AccionPermiso, AccionCrud> = {
    ver: 'leer',
    vehiculos: 'leer',
    agregar: 'crear',
    editar: 'editar',
    eliminar: 'eliminar',
    // Anular un InformeLiq es una actualización de estado del documento, no
    // un delete: el documento se conserva con otro estado.
    anular: 'editar',
    // Actualiza el documento con la URL de la factura vinculada.
    vincularFactura: 'editar',
    verFactura: 'leer',
    // Exporta/lee (excel, pdf), no escribe.
    reimprimir: 'leer',
    // Cerrar una operación es una actualización de su estado (EstadoOp.ciclo),
    // no una creación ni un delete.
    cerrar: 'editar',
    // liquidarProforma() crea un InformeLiq nuevo a partir de una proforma —
    // distinta de 'vincularFactura' (adjunta un archivo a un informe ya
    // existente en Facturación) y de 'anular'.
    liquidar: 'crear',
    // Exporta el informe del tablero de OPERACIONES (Excel), no escribe. El
    // comentario original decía "tablero de asignaciones": era correcto cuando
    // esta acción gobernaba el botón inerte de ese tablero, pero desde IE1b
    // gobierna la descarga real del tablero de operaciones.
    descargarTablero: 'leer',
    // Exporta el informe del tablero de ASIGNACIONES (Excel o PDF), no escribe.
    // Acción propia y no 'descargarTablero': son dos informes distintos, de dos
    // pantallas distintas, y el negocio los habilita a roles distintos (ver los
    // overrides).
    descargarAsignaciones: 'leer',
    // Exporta el listado de una entidad (Clientes/Choferes/Proveedores) a
    // Excel: lee lo que ya está en pantalla, no escribe.
    descargarListado: 'leer',
    // Limpiar el tablero borra el borrador en curso — acción destructiva
    // sobre datos ya cargados, no una edición parcial.
    limpiarTablero: 'eliminar',
    // Revertir un InformeLiq emitido es una transición de estado del
    // documento (no un delete) — mismo criterio que 'anular'.
    revertir: 'editar',
    // Desvincular la factura de un InformeLiq (facturado → emitido): edición
    // del documento, igual que vincularFactura.
    desvincular: 'editar',
    // Administrar no disponibilidades (alta, edición, cierre, anulación —
    // ninguna borra: la anulación es un update). Escribe la colección
    // noDisponibilidades, mapeada al módulo 'operaciones' en las reglas.
    // Acción propia y no 'editar' para que un cambio sobre quién las
    // administra no arrastre a la edición de operaciones. 'editar' en
    // 'operaciones' da dev/admin/user sí, demo/manager no: lo pedido.
    noDisponibilidad: 'editar',
  };

  // Primer caso real poblado (Bloque 7, tablero-asignaciones) — hasta acá
  // vacío desde el Bloque 1. Key: 'modulo.accion' (indexado por
  // AccionPermiso, el valor que pasan los callers — no por AccionCrud).
  // Se completa caso a caso cuando la matriz base (fiel a firestore.rules)
  // no alcanza para un requisito de negocio puntual — no para "arreglar"
  // la matriz en general, eso sería reinterpretar las reglas reales.
  private readonly overrides: Partial<Record<string, Partial<Record<RolUsuario, boolean>>>> = {
    // 'reimprimir' (Facturación/Liquidaciones) y 'descargarTablero' mapean
    // ambos a 'leer', y 'leer' da demo=true y user=true en 'operaciones' —
    // pero el negocio pide que la descarga quede solo en dev/admin, sin
    // afectar 'reimprimir' en los otros módulos. Por eso el override es
    // específico de 'operaciones.descargarTablero', no un cambio a
    // mapaAccionCrud ni a matrizBase (que romperían 'reimprimir' en
    // Facturación).
    // 'user' se agregó al override en el frente Informes (IE2c): desde IE1b
    // esta acción gobierna el botón real de descarga del tablero de
    // OPERACIONES (antes solo el botón inerte de tablero-asignaciones), y
    // bajar ese informe es una tarea de administración, no del empleado que
    // carga operaciones — confirmado con el negocio el 19/10/2026.
    'operaciones.descargarTablero': { demo: false, user: false },
    // 'limpiarTablero' mapea a 'eliminar', que da user=false en
    // 'operaciones' — pero 'user' es el rol del único empleado activo en
    // producción y uso principal de tablero-asignaciones: el negocio
    // exige que conserve esta acción en su pantalla principal pese a no
    // tener 'eliminar' general en el módulo.
    'operaciones.limpiarTablero': { user: true },
    // 'descargarAsignaciones' mapea a 'leer', que en 'operaciones' da
    // user=true y demo=true. Se baja demo (mismo criterio que el resto de las
    // descargas del frente Informes) y se CONSERVA user, a diferencia de
    // 'descargarTablero': el tablero de asignaciones es la pantalla principal
    // del único empleado activo y el informe es de su propio trabajo del día,
    // no el informe de administración del mes. Mismo razonamiento que
    // 'limpiarTablero', que también se aparta de la matriz por esta pantalla.
    'operaciones.descargarAsignaciones': { demo: false },
    // Los tres listados de entidades (frente Informes, IE3b): 'descargarListado'
    // mapea a 'leer', y 'leer' en 'entidades' da user=true y demo=true — pero
    // bajar el listado completo de clientes, choferes o proveedores es una
    // tarea de administración, mismo criterio que la descarga del tablero de
    // operaciones (IE2c). Van tres entradas y no una porque la clave es el
    // ModuloPermiso que pasa el caller: los tres módulos comparten el módulo
    // 'entidades' de las reglas, pero no comparten la clave del override.
    // Además, la columna "Vendedores asignados" del listado de Clientes lee la
    // colección 'vendedores', que 'user' no puede leer: dejarlo descargar le
    // rompería la descarga con permission-denied.
    'clientes.descargarListado': { demo: false, user: false },
    'choferes.descargarListado': { demo: false, user: false },
    'proveedores.descargarListado': { demo: false, user: false },
  };

  puede(modulo: ModuloPermiso, accion?: AccionPermiso): boolean {
    const rol = this.usuarioSesion.getRol();
    if (rol === null) return false;

    if (accion) {
      const overrideRol = this.overrides[`${modulo}.${accion}`]?.[rol];
      if (overrideRol !== undefined) return overrideRol;
    }

    // Sin `accion` (uso típico de *appPermiso con solo 'modulo', gating de
    // sección completa): 'leer' es el default a propósito — visibilidad de
    // sección equivale a "¿puede al menos leer?", decisión de diseño, no un
    // valor arbitrario.
    const accionCrud: AccionCrud = accion ? this.mapaAccionCrud[accion] : 'leer';

    if (modulo === 'usuarios') {
      return this.matrizBase.usuarios[accionCrud][rol];
    }

    const moduloReal = this.mapaModuloReglas[modulo];
    return this.matrizBase[moduloReal]?.[accionCrud]?.[rol] ?? false;
  }
}
