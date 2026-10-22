Si no ves la línea FIN DE LA INSTRUCCIÓN AUD1 al final, el texto llegó cortado: leé el archivo completo.

# AUD1 — auditoría: ¿se pueden retirar el `LogService` viejo y la Papelera legado?

## Contexto y razonamiento

**Esta instrucción NO cambia una línea de código.** Es una auditoría de solo lectura. El
entregable es un REPORTE, y la pregunta que tiene que contestar es una sola:

> ¿Retirar el `LogService` viejo (colección `logs`) y la Papelera legado es un trabajo
> CHICO, o no?

Se pregunta porque el presupuesto es limitado: si la respuesta es "no es chico", conviene
saberlo antes de empezar y no a mitad de camino. Así que **la auditoría tiene que poder
terminar en "no conviene", y eso es un resultado válido**, no un fracaso.

`CLAUDE.md` dice que retirarlos es decisión de producto del frente Ajustes (decisión D5
del frente Lazy loading + fechas), y que los dos mecanismos nuevos que los reemplazan ya
están en producción: `LogRegistroService` sobre `registroLog`, y la Papelera por
referencia sobre `papeleraEventos` / `objetosEliminados`.

### Las dos cosas a auditar

**1. `LogService` viejo** — `servicios/log/`, escribe en la colección `logs`. Lo lee la
pantalla `RegistroComponent` (`raiz/ajustes/registro/`, pestaña "Registro" de Ajustes).

**2. Papelera legado** — `PapeleraLegadoComponent` (`raiz/ajustes/papelera-legado/`,
pestaña "Papelera (legado)"), el modal `ObjetoPapeleraComponent`
(`shared/modales/objeto-papelera/`), la colección `papelera`, y los métodos de
`StorageService` que escriben ahí (`deleteItemPapelera*`, `addSimpleLogPapelera`,
`deleteItemPapeleraCompuestoAsync`).

### Pistas de `CLAUDE.md`, que hay que VERIFICAR contra el código, no dar por ciertas

El archivo tiene varias afirmaciones sobre esto, escritas en frentes anteriores. Algunas
pueden haber quedado desactualizadas — el frente Finanzas (F9), el de Lazy loading (LR1 /
LR2) y el de Vendedores borraron mucho código desde entonces. Tratalas como LEADS:

- Escritores del `LogService` viejo que el archivo menciona todavía vivos:
  `AsignacionService.reactivarItem`, `TableroService.altaOperacionYActualizarTablero`, y
  `StorageService` (`addItem` / `updateItem` / `deleteItem` / `logSimple`).
- La Papelera legado sería "el único camino de papelera para Vendedores / Facturación /
  Liquidación". Pero: Vendedores dejó de usarla en su frente (los vendedores se
  desactivan, no se borran), y los componentes viejos de Facturación y de Liquidación se
  borraron en el frente Finanzas (F9) y en el de Lazy loading (LR1 / LR1b). **Puede que ya
  no le quede ningún escritor vivo.** Es la pregunta más importante de esta auditoría.
- `objeto-papelera` carga `arrayFacOp` y `$choferes` sin ningún consumidor desde IE4, y
  `clientes$` / `choferes$` / `proveedores$` de `StorageService` siempre emiten `[]`.
- `BajaObjetoComponent` (el modal del motivo de baja) lo usan callers viejos Y nuevos: no
  se va con esto.

## Reglas

- **NO modifiques ningún archivo. NO borres nada. NO commits, NO deploy.** Si te parece
  que algo habría que borrar, eso va en el reporte, no en el código.
- No corras `npm run build`, `deploy:*` ni `node set-version.js`. Si necesitás compilar
  para una verificación, `npm run build:demo`.
- Las afirmaciones del reporte van con EVIDENCIA: archivo y línea. Si algo no lo pudiste
  determinar, decí "no determinado" y por qué — no lo completes con lo que parece.
- Distinguí siempre **escritura** de **lectura**: un mecanismo viejo que solo se LEE
  (una pantalla de histórico) es un caso muy distinto de uno al que todavía se le escribe.
- Distinguí **código vivo** de **código muerto**: un método que existe pero que nadie
  llama no es un consumidor.
- **Tope de esfuerzo:** si en algún punto ves que el retiro claramente NO es chico
  (digamos, más de ~10 archivos con cambios reales de lógica, o un escritor vivo que
  obliga a migrar un flujo de negocio), **terminá ahí**: completá lo que puedas del
  reporte, marcá el resto como "no auditado por tope", y cerrá con el veredicto. No sigas
  bajando.

## Método (el del proyecto, está en `CLAUDE.md` → "Método para buscar código sin uso")

1. `findReferences` del LanguageService de TypeScript sobre cada export y cada miembro
   público.
2. Uso en TEMPLATES: por selector de componente y por nombre de pipe (grep en `.html`).
   Es el paso que más se olvida y el que más falsos "sin uso" produce.
3. `npx tsc -p tsconfig.app.json --noEmit --noUnusedLocals`.
4. Archivos que no entran en la compilación: los `.ts` de `src` contra
   `npx tsc -p tsconfig.app.json --listFiles`.

Falsos positivos conocidos del proyecto, no los reportes como código muerto:
`RoleGuard.canMatch` / `canActivate` (los usa el router) y `resetearPassword` / `puedeVer`
(los usan templates).

## PASO 0 — punto de partida

1. `git rev-parse --abbrev-ref HEAD` → `refactor`; `git log --oneline -1` → `a4449715`
   (ASDOC).
2. `git status --short` → vacío. Si no lo está, avisá antes de seguir.

## PASO 1 — `LogService` viejo: quién lo inyecta y quién lo llama

1. Inventario del servicio: listá los métodos públicos de `servicios/log/` y cuáles
   escriben en `logs`.
2. Quién lo inyecta: `grep -rn "LogService" src/ --include=*.ts`. Por cada resultado,
   clasificá:
   - **ESCRITOR VIVO** — el método que lo llama tiene al menos un caller real (componente,
     servicio o template). Anotá la cadena hasta el caller.
   - **ESCRITOR MUERTO** — el método que lo llama no tiene ningún caller. Anotá cómo lo
     determinaste.
   - **SOLO LECTURA** — lee `logs` sin escribir.
3. Los tres leads de arriba (`AsignacionService.reactivarItem`,
   `TableroService.altaOperacionYActualizarTablero`, `StorageService`): confirmá uno por
   uno si siguen existiendo y si tienen caller vivo.
4. `RegistroComponent` y su ruta: ¿está declarada y navegable hoy? ¿Desde dónde se llega?
5. ¿Alguien más lee la colección `logs` además de esa pantalla? (grep por `'logs'`, y
   revisá `LimpiezaDemoService` y `firestore.rules`.)

## PASO 2 — Papelera legado: lo mismo

1. Quién escribe en la colección `papelera`: buscá los usos de
   `StorageService.deleteItemPapelera`, `deleteItemPapeleraCompuestoAsync` y
   `addSimpleLogPapelera`, y clasificá cada uno como ESCRITOR VIVO o MUERTO, igual que
   arriba. **Esta es la pregunta central de la auditoría.**
2. `PapeleraLegadoComponent`: ruta, pestaña y permiso. ¿Se llega hoy?
3. `ObjetoPapeleraComponent`: ¿quién lo abre? ¿Solo `papelera-legado`, o algo más?
4. ¿Qué otros símbolos se irían con ellos y no los usa nadie más? Mirá en particular
   `LogDoc` y las interfaces del modelo viejo de papelera, y confirmá si
   `VisualizadorObjetoService` (el camino nuevo) los toca.
5. ¿Qué queda vivo de `StorageService` si se van estos métodos? No hace falta el detalle
   fino: alcanza con decir si `StorageService` quedaría casi vacío o si sigue teniendo
   razones de ser.

## PASO 3 — qué NO se puede borrar aunque el código quede libre

Tres cosas distintas que conviene no mezclar, porque tienen tiempos distintos:

1. **El código** (servicios, componentes, rutas, interfaces).
2. **Los datos:** las colecciones `logs` y `papelera` **existen en Vantruck** con datos
   históricos reales. `CLAUDE.md` ya decidió que el Registro viejo queda como histórico
   congelado y que NO se migra a `registroLog`. Decí explícitamente qué pasaría con esos
   datos si se borra la pantalla que los muestra.
3. **Las reglas:** `firestore.rules` mapea `logs` y `papelera`, y `LimpiezaDemoService`
   las nombra. Anotá qué entradas quedarían huérfanas, sin tocarlas.

## PASO 4 — el reporte

Devolvé un reporte con esta forma, y nada más (sin cambios en el repo):

### A. Veredicto

Una de estas tres, en la primera línea:
- **SE PUEDE, Y ES CHICO** — ningún escritor vivo; el retiro es borrar código y rutas.
- **SE PUEDE, PERO NO ES CHICO** — se puede, pero hay que migrar o reescribir algo.
  Decí qué.
- **NO SE PUEDE TODAVÍA** — hay un bloqueante real. Decí cuál.

Y por separado, el veredicto de cada uno: el `LogService` viejo y la Papelera legado
pueden estar en estados distintos. **Si uno de los dos se puede retirar solo, decilo**:
puede ser el trabajo chico que estamos buscando.

### B. Tabla de consumidores

| Mecanismo | Archivo:línea | Quién lo llama | ¿Vivo o muerto? | Evidencia |

### C. Alcance estimado

- Archivos a BORRAR (con líneas de cada uno).
- Archivos a EDITAR (con qué habría que sacarles).
- Si hay que migrar algún flujo: cuál y por qué.
- Un número total de archivos tocados, para dimensionar.

### D. Bloqueantes y riesgos

Lo que haría que esto no sea un borrado limpio: datos históricos, pantallas que alguien
usa, permisos, reglas, un escritor vivo escondido.

### E. Orden sugerido

Si se puede hacer, en qué orden convendría, y qué se puede dejar para después.

---

No propongas un plan de bloques ni escribas código: con el reporte alcanza. La decisión de
avanzar la tomo yo con eso en la mano.

FIN DE LA INSTRUCCIÓN AUD1
