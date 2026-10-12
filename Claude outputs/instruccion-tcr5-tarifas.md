````
INSTRUCCIÓN TC-R5 — Tarifas (cierre): reglas, fuera los mapeos de historial del modelo nuevo
================================================================================

Si no ves la línea "FIN DE LA INSTRUCCIÓN TC-R5" al final, el texto llegó
cortado: leé el archivo completo antes de empezar.

## Contexto y razonamiento

En firestore.rules, `moduloDe()` mapea dos colecciones del modelo nuevo
que nunca se usaron:
  - `historialTarifas`
  - `historialTarifasEspeciales`
Se reservaron al empezar el frente, pero el historial del modelo nuevo
terminó siendo el linaje de versiones append-only dentro de `tarifas` y
`tarifasEspeciales` (versionAnteriorId). Ningún código las lee ni las
escribe (diseño, P18). Una colección sin mapeo queda denegada para todos
los roles, que es lo correcto para algo que no existe.

Se quedan, a propósito:
  - Las 7 colecciones `historialTarifas<Gral|Esp|Pers><Entidad>` y el
    módulo `tarifasHistorial`: las leen las herramientas de /migracion
    (auditoría y volcado de la General), hasta migrar Vantruck (T12).
  - Las 8 colecciones viejas `tarifas<...>` / `tarifasEventuales` y las
    3 `legacySoloLectura` de tarifas: mismo motivo; su retiro va al
    checklist de la migración de Vantruck (TC-DOC).

Es un cambio solo de reglas: no hay código de la app que tocar ni build
que pueda detectarlo. El deploy lo hace Nico, SOLO a demo.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto a BUSCAR no está, o aparece más de una vez: detenete y reportá.
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Ningún BUSCAR de esta instrucción tiene espacios al final de línea.
- Finales de línea LF. Conservá la codificación UTF-8 (el archivo tiene
  tildes en comentarios).
- No toques CLAUDE.md ni CHANGELOG.md.

## PASO 0 — Verificación (sin modificar nada)

0.1 `grep -rn "historialTarifas['\"]\|historialTarifasEspeciales" src/ functions/ --exclude-dir=node_modules --exclude-dir=lib`
    → sin resultados (ni en .spec.ts ni en functions).
0.2 `grep -n "historialTarifas'\|historialTarifasEspeciales'" firestore.rules`
    → exactamente 2 líneas (~68 y ~69), las del bloque "Frente grande de
    Tarifas".
0.3 `grep -c "': 'tarifasHistorial'" firestore.rules` → 9 (7 viejas + 2
    nuevas).
Si algo no coincide, DETENETE y reportá.

## PASO 1 — firestore.rules

1.1 BUSCAR:
```
        // Frente grande de Tarifas — colecciones nuevas, módulo unificado
        // (a diferencia del viejo, general/personalizada comparten UNA colección
        // porque ahora una Tarifa trae aCobrar Y aPagar en la misma categoría).
        'tarifas': 'tarifas', 'tarifasEspeciales': 'tarifas',
        'historialTarifas': 'tarifasHistorial',
        'historialTarifasEspeciales': 'tarifasHistorial',
```
REEMPLAZAR:
```
        // Frente grande de Tarifas — colecciones nuevas, módulo unificado
        // (a diferencia del viejo, general/personalizada comparten UNA colección
        // porque ahora una Tarifa trae aCobrar Y aPagar en la misma categoría).
        // Sin colecciones de historial propias: el historial es el linaje de
        // versiones append-only (versionAnteriorId) dentro de estas dos.
        'tarifas': 'tarifas', 'tarifasEspeciales': 'tarifas',
```

## Verificación

1. El grep de 0.2 → sin resultados.
2. `grep -c "': 'tarifasHistorial'" firestore.rules` → 7.
3. `grep -n "modulo == 'tarifasHistorial'" firestore.rules` → 1 (la matriz
   de permisos no cambia).
4. Mostrá el diff completo de firestore.rules.
(No hace falta `npm run build:demo`: las reglas no forman parte del build.)

## Deploy (lo hace Nico, NO Claude Code)

`firebase deploy --only firestore:rules --project demo`

## Pruebas manuales (demo, después del deploy)

Con la consola del navegador abierta (buscar "permission-denied" /
"Missing or insufficient permissions"):
1. Tarifas → General, Personalizada y Especial: listados, historial de
   versiones, aumentar/editar una tarifa (crea versión nueva) y dar de baja
   una de prueba. Sin errores de permisos.
2. Alta de operaciones desde asignación (candidatos de tarifa) y cierre de
   una operación (incluida una eventual: registrosOpEventuales). Sin
   errores.
3. /migracion → auditoría de tarifas viejas: sigue leyendo las colecciones
   viejas y sus historiales.
4. Opcional: en la consola de Firebase de demo, si existen las colecciones
   `historialTarifas` o `historialTarifasEspeciales` con documentos, son
   restos sin uso; se pueden borrar a mano.

## Mensaje de commit

chore(reglas): fuera historialTarifas/historialTarifasEspeciales de moduloDe (TC-R5)

Colecciones del modelo nuevo reservadas y nunca usadas: el historial es
el linaje de versiones de tarifas/tarifasEspeciales. Las colecciones
viejas y el módulo tarifasHistorial se quedan hasta migrar Vantruck.

FIN DE LA INSTRUCCIÓN TC-R5
````
