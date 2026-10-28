#!/usr/bin/env node
/**
 * Hook Stop — impide que un turno termine con el proyecto sin compilar.
 *
 * Corre `npm run build:demo` (NO `npm run build`, que dispara prebuild/set-version.js
 * y regeneraria src/environments/version.ts en cada turno).
 *
 * Solo corre el build si hay archivos .ts/.html/.scss modificados segun git.
 * Si el build falla, devuelve decision "block" con los errores para que Claude siga
 * trabajando hasta que compile.
 */

const { execSync } = require('node:child_process');
const fs = require('node:fs');

const EXTENSIONES = ['.ts', '.html', '.scss'];
const MAX_LINEAS_ERROR = 60;
const PREFIJO_ESTADO = 3; // formato porcelain v1: "XY <ruta>"

// Secuencias de color ANSI: el build las emite y ensucian el texto que recibe Claude.
const ANSI = /\u001B\[[0-9;]*[A-Za-z]/g;

// Un warning NO es un error. NG8107 y companía matchean /NG\d{4}/, asi que hay que
// descartarlos ANTES de buscar errores o desplazan al error real fuera del tope.
const ES_WARNING = /\bwarning\b|\[WARNING\]/i;
const ES_ERROR = /\berror\b|\[ERROR\]|\bTS\d{4}\b|\bNG\d{4}\b/i;

function leerEntrada() {
  try {
    const crudo = fs.readFileSync(0, 'utf8');
    return crudo ? JSON.parse(crudo) : {};
  } catch {
    return {};
  }
}

/** Quita comillas de los paths que git escapa por tener espacios o caracteres especiales. */
function limpiarRuta(ruta) {
  const limpia = ruta.trim();
  if (limpia.length > 1 && limpia.startsWith('"') && limpia.endsWith('"')) {
    return limpia.slice(1, -1);
  }
  return limpia;
}

/**
 * Devuelve las rutas de una linea de `git status --porcelain`.
 * Un rename trae dos rutas separadas por " -> "; devolvemos las dos.
 */
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

const entrada = leerEntrada();

// Guarda anti-bucle: si ya estamos dentro de un ciclo de bloqueo, no bloqueamos de nuevo.
if (entrada.stop_hook_active) {
  salirSinBloquear();
}

// ¿Hay codigo modificado? Si no, no tiene sentido compilar.
// -uall expande los directorios no versionados archivo por archivo: sin esta bandera una
// carpeta nueva aparece como una sola linea y los .ts de adentro quedan invisibles.
let estadoGit = '';
try {
  estadoGit = execSync('git status --porcelain -uall', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
} catch {
  // Sin git disponible, el hook no bloquea.
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

// Build de verificacion. NO_COLOR/FORCE_COLOR piden salida sin ANSI en origen.
try {
  execSync('npm run build:demo', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  });
  salirSinBloquear();
} catch (error) {
  const salida = `${error.stdout || ''}\n${error.stderr || ''}`.replace(ANSI, '');
  const lineas = salida.split(/\r?\n/).filter(Boolean);

  // Descartar warnings primero, quedarse con los errores despues.
  const errores = lineas.filter((linea) => !ES_WARNING.test(linea) && ES_ERROR.test(linea));
  const mostradas = errores.slice(0, MAX_LINEAS_ERROR);
  const omitidas = errores.length - mostradas.length;

  const detalle = mostradas.length
    ? mostradas.join('\n') + (omitidas > 0 ? `\n\n[... ${omitidas} lineas de error mas, omitidas]` : '')
    : `No se pudieron aislar lineas de error. Cola de la salida del build:\n\n${salida.slice(-3000)}`;

  bloquear(
    'El build de verificacion fallo (npm run build:demo). ' +
      'Corregi estos errores antes de terminar el turno. ' +
      'Si un error no corresponde al alcance de la tarea, deci cual y por que en vez de ampliar el alcance.\n\n' +
      detalle
  );
}
