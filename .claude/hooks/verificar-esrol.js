#!/usr/bin/env node
/**
 * Chequeo estático de forma: esRol() con dos o más roles escritos como
 * literales está prohibido (docs/disenos/reglas-y-matriz-de-permisos.md, 2.13).
 *
 * POR QUÉ EXISTE. Una lista de varios roles es casi siempre una lista de ACCESO
 * ("¿quién entra a tal pantalla?"), y una lista de acceso tiene que venir de una
 * fuente compartida: una constante en src/app/constantes/roles-acceso.ts,
 * esparcida con esRol(...ROLES_X). Un literal es una copia, y una copia queda
 * desfasada en silencio el día que cambia el original: así nació el bug de
 * InformeOpAnuladosComponent.puedeVerPapelera, que repetía a mano los roles de
 * la ruta de papelera y siguió admitiendo a 'demo' cuando la ruta lo sacó.
 *
 * QUÉ NO ATRAPA (los cuatro límites):
 *   1. Una copia de UN solo rol: esRol('dev') pasa siempre.
 *   2. Una lista armada de otra forma: ['dev','admin'].includes(rol), una
 *      variable intermedia, un array construido en otro lado.
 *   3. Que la constante elegida sea la correcta: sólo obliga a que la lista
 *      exista una vez y se comparta, no que sea la que corresponde.
 *   4. La regla distingue dos preguntas, y sólo vigila la primera:
 *      "¿quién accede?" (una lista: fuente compartida) y "¿este rol puede esto?"
 *      (un rol: las clases 2 y 3 de 2.12, el rol como dato o un affordance de
 *      rol sin contraparte en las reglas, como esDev o las guardas de
 *      servicios/desarrollo/). Por eso un rol solo no se marca.
 *
 * Recorre src/ (.ts y .html), sin los specs. Uso suelto:
 *   node .claude/hooks/verificar-esrol.js
 */

const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..', '..');
const SRC = path.join(RAIZ, 'src');

function archivos(dir) {
  const salida = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) salida.push(...archivos(ruta));
    else if (/\.(ts|html)$/.test(e.name) && !e.name.endsWith('.spec.ts')) salida.push(ruta);
  }
  return salida;
}

/** Argumentos de la llamada que empieza en `desde` (justo después del '('),
 *  separados por comas de primer nivel. null si no cierra. */
function argumentos(texto, desde) {
  const args = [];
  let actual = '';
  let profundidad = 0;
  let comilla = null;
  for (let i = desde; i < texto.length; i++) {
    const c = texto[i];
    if (comilla) {
      actual += c;
      if (c === '\\') { actual += texto[++i] ?? ''; continue; }
      if (c === comilla) comilla = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { comilla = c; actual += c; continue; }
    if (c === '(' || c === '[' || c === '{') profundidad++;
    if (c === ')' || c === ']' || c === '}') {
      if (profundidad === 0 && c === ')') {
        if (actual.trim()) args.push(actual.trim());
        return args;
      }
      profundidad--;
    }
    if (c === ',' && profundidad === 0) { args.push(actual.trim()); actual = ''; continue; }
    actual += c;
  }
  return null;
}

const ES_LITERAL = /^(['"])[^'"]*\1$/;
const FIRMA_METODO =
  /^\s*(?:(?:public|private|protected|static|async|override|readonly)\s+)*(?:get\s+|set\s+)?([A-Za-z_$][\w$]*)\s*(?:<[^>]*>)?\s*\([^;]*\)\s*(?::[^={;]+)?\{\s*$/;
const NO_METODO = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'return']);

/** Nombre del método que contiene la línea (heurística: la firma más cercana
 *  hacia arriba), o '(template)' en un .html. */
function metodoDe(lineas, indice, esHtml) {
  if (esHtml) return '(template)';
  for (let i = indice; i >= 0; i--) {
    const m = FIRMA_METODO.exec(lineas[i]);
    if (m && !NO_METODO.has(m[1])) return m[1];
  }
  return '(fuera de un método)';
}

/** Violaciones en todo src/. Cada una: { archivo, linea, metodo, llamada }. */
function buscarViolaciones() {
  const violaciones = [];
  for (const archivo of archivos(SRC)) {
    const texto = fs.readFileSync(archivo, 'utf8');
    const lineas = texto.split(/\r?\n/);
    const patron = /\besRol\s*\(/g;
    let m;
    while ((m = patron.exec(texto))) {
      const args = argumentos(texto, m.index + m[0].length);
      if (!args) continue;
      const literales = args.filter((a) => ES_LITERAL.test(a));
      if (literales.length < 2) continue;
      const linea = texto.slice(0, m.index).split(/\r?\n/).length;
      const textoLinea = lineas[linea - 1].trim();
      // Comentarios: una mención en prosa no es una llamada.
      if (textoLinea.startsWith('//') || textoLinea.startsWith('*') || textoLinea.startsWith('/*')) continue;
      violaciones.push({
        archivo: path.relative(RAIZ, archivo).split(path.sep).join('/'),
        linea,
        metodo: metodoDe(lineas, linea - 1, archivo.endsWith('.html')),
        llamada: `esRol(${args.join(', ')})`,
      });
    }
  }
  return violaciones;
}

/** Para el hook: null si no hay violaciones, o el detalle para el bloqueo. */
function verificarEsRol() {
  const violaciones = buscarViolaciones();
  if (violaciones.length === 0) return null;
  return (
    'esRol() con dos o más roles literales es una lista de acceso copiada a mano. ' +
    'Mové la lista a una constante compartida en src/app/constantes/roles-acceso.ts ' +
    'y esparcila: esRol(...ROLES_X). (Por qué y qué no atrapa: encabezado de .claude/hooks/verificar-esrol.js.)\n\n' +
    violaciones.map((v) => `${v.archivo}:${v.linea}, método ${v.metodo}: ${v.llamada}`).join('\n')
  );
}

module.exports = { verificarEsRol, buscarViolaciones };

if (require.main === module) {
  const detalle = verificarEsRol();
  if (detalle) {
    console.log(detalle);
    process.exit(1);
  }
  console.log('verificar-esrol: 0 violaciones en src/.');
}
