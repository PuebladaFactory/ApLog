#!/usr/bin/env node
/**
 * Hook Stop — impide que un turno termine con el proyecto sin compilar.
 *
 * Cuatro pasos, de la mas rapida a la mas lenta, para fallar rapido:
 *
 *   1. Chequeo estatico de forma (verificar-esrol.js, en proceso): esRol() con
 *      dos o mas roles literales esta prohibido; una lista de acceso se toma de
 *      una constante compartida (spec 2.13). Es instantaneo, por eso va primero.
 *
 *   2. tsc --noEmit -p tsconfig.hook.json, que incluye TODO src/.
 *      Necesaria porque tsconfig.app.json solo compila lo alcanzable desde
 *      main.ts: un .ts que todavia nadie importa NO se verifica, y el bloque 1
 *      de cualquier frente son justamente archivos sin consumidores.
 *      Excluye los .spec.ts (los compila el paso 3).
 *
 *   3. npm run test:ci (Karma + Chrome headless). Entre otros, corre
 *      permisos.service.spec.ts, que compara matrizBase contra
 *      matriz-esperada.json: un spec que hay que acordarse de correr no es una
 *      verificacion (docs/disenos/reglas-y-matriz-de-permisos.md, 4.4). Puede
 *      fallar por entorno (no encuentra o no levanta Chrome) y no por un test
 *      roto: el mensaje dice cual de los dos fue.
 *
 *   4. npm run build:demo, que ademas verifica los templates de Angular, cosa
 *      que tsc no hace. NO `npm run build`, que dispara prebuild/set-version.js
 *      y regeneraria src/environments/version.ts en cada turno.
 *
 * El mensaje de bloqueo nombra el paso que fallo. Mudo si los cuatro pasan.
 *
 * Solo corre si hay archivos .ts/.html/.scss/.json modificados segun git.
 */

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const { verificarEsRol } = require('./verificar-esrol');

// .json por matriz-esperada.json, el pivote de la verificacion de permisos (spec 4.4): un
// cambio de reglas en sus 9 modulos obliga a tocarlo, y ese toque es lo que hace correr el
// spec que verifica que matrizBase lo siguio. Sin .json, actualizar el fixture y olvidarse
// del cliente no dispara nada. .rules no: si cambia solo firestore.rules, el spec compara
// matrizBase contra el fixture y ninguno de los dos cambio.
const EXTENSIONES = ['.ts', '.html', '.scss', '.json'];
const MAX_LINEAS_ERROR = 60;
const PREFIJO_ESTADO = 3; // formato porcelain v1: "XY <ruta>"

// Secuencias de color ANSI: ensucian el texto que recibe Claude.
const ANSI = /\u001B\[[0-9;]*[A-Za-z]/g;

// Un warning NO es un error. NG8107 y companía matchean /NG\d{4}/, asi que hay
// que descartarlos ANTES de buscar errores o desplazan al error real.
const ES_WARNING = /\bwarning\b|\[WARNING\]/i;
const ES_ERROR = /\berror\b|\[ERROR\]|\bTS\d{4}\b|\bNG\d{4}\b/i;

// Karma sin Chrome: no encuentra el binario, no lo puede lanzar o el navegador
// nunca se conecta. Es entorno, no un test roto.
const ES_FALLA_DE_CHROME =
  /No binary for Chrome|CHROME_BIN|Cannot start Chrome|Can not find the binary|ChromeHeadless.*(crashed|failed|have not captured|not captured)|Disconnected.*Chrome|ENOENT.*chrome/i;
// Lineas utiles de un test roto: el test que fallo, lo que esperaba y el total.
const ES_LINEA_DE_TEST = /FAILED|Expected|Unexpected|Error:|TOTAL:|TS\d{4}/;

/** Diagnostico del paso de tests: distingue entorno (Chrome) de test roto. */
function diagnosticarTests(salida, lineas) {
  if (ES_FALLA_DE_CHROME.test(salida) && !/TOTAL:/.test(salida)) {
    return (
      'Es una falla de ENTORNO, no un test roto: Karma no pudo levantar Chrome headless ' +
      '(test:ci espera Chrome Dev en la ruta de CHROME_BIN de package.json). ' +
      'Lineas relevantes:\n\n' +
      lineas.filter((l) => ES_FALLA_DE_CHROME.test(l)).slice(0, MAX_LINEAS_ERROR).join('\n')
    );
  }
  const utiles = lineas
    .filter((l) => ES_LINEA_DE_TEST.test(l))
    // Karma reimprime "Executed N of M (1 FAILED)" en cada test: no aporta.
    .filter((l) => !/Executed \d+ of \d+/.test(l));
  // Sin duplicados, conservando el orden.
  const unicas = [...new Set(utiles)].slice(0, MAX_LINEAS_ERROR);
  return unicas.length ? `Fallaron tests:\n\n${unicas.join('\n')}` : null;
}

const PASADAS = [
  {
    etiqueta: 'el paso 1 de 4, el chequeo de forma de esRol (.claude/hooks/verificar-esrol.js)',
    funcion: verificarEsRol,
  },
  {
    etiqueta: 'el paso 2 de 4, la verificacion de tipos (npx tsc --noEmit -p tsconfig.hook.json)',
    comando: 'npx tsc --noEmit -p tsconfig.hook.json',
  },
  {
    etiqueta: 'el paso 3 de 4, los tests (npm run test:ci)',
    comando: 'npm run test:ci',
    diagnosticar: diagnosticarTests,
  },
  {
    etiqueta: 'el paso 4 de 4, el build de verificacion (npm run build:demo)',
    comando: 'npm run build:demo',
  },
];

function leerEntrada() {
  try {
    const crudo = fs.readFileSync(0, 'utf8');
    return crudo ? JSON.parse(crudo) : {};
  } catch {
    return {};
  }
}

/** Quita comillas de los paths que git escapa por tener espacios. */
function limpiarRuta(ruta) {
  const limpia = ruta.trim();
  if (limpia.length > 1 && limpia.startsWith('"') && limpia.endsWith('"')) {
    return limpia.slice(1, -1);
  }
  return limpia;
}

/** Rutas de una linea de `git status --porcelain`. Un rename trae dos. */
function rutasDeLinea(linea) {
  return linea.slice(PREFIJO_ESTADO).split(' -> ').map(limpiarRuta).filter(Boolean);
}

function esArchivoDeCodigo(ruta) {
  const minuscula = ruta.toLowerCase();
  return EXTENSIONES.some((ext) => minuscula.endsWith(ext));
}

function salirSinBloquear() {
  process.exit(0);
}

function bloquear(motivo) {
  process.stdout.write(JSON.stringify({ decision: 'block', reason: motivo }));
  process.exit(0);
}

/** Corre una pasada. Devuelve null si paso, o el detalle de los errores. */
function correr(comando, diagnosticar) {
  try {
    execSync(comando, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
    });
    return null;
  } catch (error) {
    const salida = `${error.stdout || ''}\n${error.stderr || ''}`.replace(ANSI, '');
    const lineas = salida.split(/\r?\n/).filter(Boolean);

    const especifico = diagnosticar ? diagnosticar(salida, lineas) : null;
    if (especifico) return especifico;

    // Descartar warnings primero, quedarse con los errores despues.
    const errores = lineas.filter((linea) => !ES_WARNING.test(linea) && ES_ERROR.test(linea));
    const mostradas = errores.slice(0, MAX_LINEAS_ERROR);
    const omitidas = errores.length - mostradas.length;

    return mostradas.length
      ? mostradas.join('\n') + (omitidas > 0 ? `\n\n[... ${omitidas} lineas de error mas, omitidas]` : '')
      : `No se pudieron aislar lineas de error. Cola de la salida:\n\n${salida.slice(-3000)}`;
  }
}

const entrada = leerEntrada();

// Guarda anti-bucle.
if (entrada.stop_hook_active) {
  salirSinBloquear();
}

// ¿Hay codigo modificado? -uall expande los directorios no versionados archivo
// por archivo: sin esa bandera una carpeta nueva aparece como una sola linea.
let estadoGit = '';
try {
  estadoGit = execSync('git status --porcelain -uall', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
} catch {
  salirSinBloquear();
}

const hayCodigoModificado = estadoGit
  .split(/\r?\n/)
  .filter(Boolean)
  .flatMap(rutasDeLinea)
  .some(esArchivoDeCodigo);

if (!hayCodigoModificado) {
  salirSinBloquear();
}

for (const pasada of PASADAS) {
  const detalle = pasada.funcion ? pasada.funcion() : correr(pasada.comando, pasada.diagnosticar);
  if (detalle) {
    bloquear(
      `Fallo ${pasada.etiqueta}. ` +
        'Corregi estos errores antes de terminar el turno. ' +
        'Si un error no corresponde al alcance de la tarea, deci cual y por que en vez de ampliar el alcance.\n\n' +
        detalle
    );
  }
}

salirSinBloquear();
