#!/usr/bin/env node
/**
 * Hook Stop — impide que un turno termine con el proyecto sin compilar.
 *
 * Dos pasadas, de la mas rapida a la mas lenta:
 *
 *   1. tsc --noEmit -p tsconfig.hook.json, que incluye TODO src/.
 *      Necesaria porque tsconfig.app.json solo compila lo alcanzable desde
 *      main.ts: un .ts que todavia nadie importa NO se verifica, y el bloque 1
 *      de cualquier frente son justamente archivos sin consumidores.
 *      Excluye los .spec.ts, que tienen errores preexistentes.
 *
 *   2. npm run build:demo, que ademas verifica los templates de Angular, cosa
 *      que tsc no hace. NO `npm run build`, que dispara prebuild/set-version.js
 *      y regeneraria src/environments/version.ts en cada turno.
 *
 * Solo corre si hay archivos .ts/.html/.scss modificados segun git.
 */

const { execSync } = require('node:child_process');
const fs = require('node:fs');

const EXTENSIONES = ['.ts', '.html', '.scss'];
const MAX_LINEAS_ERROR = 60;
const PREFIJO_ESTADO = 3; // formato porcelain v1: "XY <ruta>"

// Secuencias de color ANSI: ensucian el texto que recibe Claude.
const ANSI = /\u001B\[[0-9;]*[A-Za-z]/g;

// Un warning NO es un error. NG8107 y companía matchean /NG\d{4}/, asi que hay
// que descartarlos ANTES de buscar errores o desplazan al error real.
const ES_WARNING = /\bwarning\b|\[WARNING\]/i;
const ES_ERROR = /\berror\b|\[ERROR\]|\bTS\d{4}\b|\bNG\d{4}\b/i;

const PASADAS = [
  {
    etiqueta: 'la verificacion de tipos (tsc --noEmit -p tsconfig.hook.json)',
    comando: 'npx tsc --noEmit -p tsconfig.hook.json',
  },
  {
    etiqueta: 'el build de verificacion (npm run build:demo)',
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
function correr(comando) {
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
  const detalle = correr(pasada.comando);
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
