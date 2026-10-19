````
Si no ves la línea FIN DE LA INSTRUCCIÓN DOC-FI7 al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN DOC-FI7 — Frente Ficha de entidad: documentación de FI7 y frente futuro (ApLog, rama refactor)
==========================================================================================================
Documentación: CLAUDE.md y CHANGELOG.md

## Contexto y razonamiento

Después del cierre del frente (DOC-FI) se hizo FI7, el detalle de valores de una tarifa en la
ficha (aplicado, probado en demo y commiteado). Además quedó analizada la idea de que el
nombre de la entidad sea un enlace a su ficha en toda la app, que Nico decidió encarar en el
futuro como FRENTE PROPIO. Esta instrucción documenta las dos cosas.

**Cambios (SOLO documentación, ningún archivo de código):**

CLAUDE.md
1. "Frente Ficha de entidad": FI7 en la lista de bloques; `FichaTarifaDetalle` en las
   piezas; párrafo nuevo "Detalle de valores (FI7)" en la pestaña Tarifas (lado de la
   entidad con la regla del motor, categorías de sus vehículos, vista inicial, contexto);
   chunk de la ficha ≈ 59 kB.
2. "Deuda — tras el frente Ficha de entidad": F3 tachado como RESUELTO (FI7); F7 remite al
   frente futuro.
3. Sección NUEVA al final: "Frente futuro — nombre de la entidad como enlace a la ficha en
   toda la app" (pieza compartida, inventario inicial, pros, contras / riesgos, alcance por
   etapas).

CHANGELOG.md
4. Entrada "Frente Ficha de entidad": bullet de FI7.
5. "Pendiente → Frentes de refactor": el frente futuro.

**Verificación previa:** traje CLAUDE.md y CHANGELOG.md de tu repo por el puente (son
exactamente los que dejó DOC-FI) y apliqué los BUSCAR/REEMPLAZAR con un script sobre esas
copias: cada BUSCAR aparece una sola vez, el resultado es idéntico a la referencia y no deja
espacios al final de línea.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- **Esta instrucción toca SOLO CLAUDE.md y CHANGELOG.md.** Ningún otro archivo.
- Validá TODOS los BUSCAR antes de escribir el primero. Si un texto a BUSCAR no está o
  aparece más de una vez: detenete y reportá. Los BUSCAR son líneas completas.
- Aplicá los cambios de cada archivo EN ORDEN (siguen el orden del archivo).
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un archivo para
  escritura antes de haber leído su contenido.
- Finales de línea LF; codificación UTF-8 (hay tildes, flechas y "→").
- Los textos a REEMPLAZAR son markdown: copialos tal cual (incluidos `~~`, backticks y
  tablas).

## PASO 0 — Verificación (sin modificar nada)

```
git status --short CLAUDE.md CHANGELOG.md
wc -l CLAUDE.md CHANGELOG.md
grep -n "^### Deuda — tras el frente Ficha\|^### Checklist — migración a Vantruck: frente Ficha\|^### Frente futuro — nombre de la entidad" CLAUDE.md
grep -n "^## Frente Ficha de entidad\|^### Pendiente" CHANGELOG.md
grep -c " $" CLAUDE.md
grep -c " $" CHANGELOG.md
```

Esperado:
1. Sin cambios pendientes.
2. 4635 y 2319 (los que dejó DOC-FI).
3. 4612 y 4631; nada más.
4. 2243 y 2274.
5. 0 y 0.

Si algo no coincide, DETENETE y reportá: los BUSCAR están armados contra esas versiones
exactas.

## PASO 1 — CLAUDE.md

1.1 `CLAUDE.md` — bloques del frente. BUSCAR:
```
FI1c, FI2, FI3 (incluye FI5 del plan), FI4 y FI6. Diseño, decisiones F1–F14 y avance:
```
REEMPLAZAR:
```
FI1c, FI2, FI3 (incluye FI5 del plan), FI4, FI6 y FI7 (detalle de valores, posterior al
cierre). Diseño, decisiones F1–F14 y de la Ronda 2 (§11), y avance:
```

1.2 `CLAUDE.md` — pestañas: el detalle de valores. BUSCAR:
```
  `Cliente`), `FichaContactos`, `FichaChoferes` (`@Output() abrir`) y `FichaTarifas`
  (`@Output() irATarifas`).
```
REEMPLAZAR:
```
  `Cliente`), `FichaContactos`, `FichaChoferes` (`@Output() abrir`), `FichaTarifas`
  (`@Output() irATarifas`) y `FichaTarifaDetalle` (FI7, recibe `DetalleTarifaFicha`).
```

1.3 `CLAUDE.md` — pestaña Tarifas: Ver valores (FI7). BUSCAR:
```
fecha (la misma regla que la pantalla de Tarifas). "Ver en Tarifas" cierra y navega a la
pestaña del nivel (Tarifas no tiene enlace a una tarifa puntual).
```
REEMPLAZAR:
```
fecha (la misma regla que la pantalla de Tarifas). "Ver en Tarifas" cierra y navega a la
pestaña del nivel (Tarifas no tiene enlace a una tarifa puntual).

**Detalle de valores (FI7):** cada tarifa (General, Personalizadas, Especiales) tiene "Ver
valores", que despliega debajo del renglón una tabla de solo lectura
(`FichaTarifaDetalleComponent`, componente propio: los viewers de `raiz/tarifas` no se
tocan). `detalleTarifaFicha` (`ficha-tarifas.util.ts`, puro) arma:
- **Solo el lado de la entidad**, con la regla del motor (`ValoresTarifaService.calcularLado`):
  cliente → `aCobrar` / `adicionalKmACobrar` / `acompanianteACobrar`; chofer directo →
  `aPagar` / `adicionalKmAPagar` / `acompanianteAPagar`; proveedor y chofer de proveedor →
  `aPagarProveedor ?? aPagar` (ídem adicional y acompañante); Especial → `valor` /
  `adicionalKm` / `adicionalAcompaniante`. Adicional por km con 1er sector e intervalo y los
  escalones de `kmDistancia`; tarifa por km: "(por km)".
- **Categorías de sus vehículos** (chofer: los suyos; chofer de proveedor: los suyos y los
  del proveedor; proveedor: los del proveedor; cliente: ninguno), comparadas por NOMBRE como
  `resolverSeccionCategoria` (en todas las secciones; una tarifa por km no se compara):
  columna con los dominios, y un aviso por cada vehículo cuya categoría no está en la
  tarifa (el caso en que el motor no puede usarla para ese vehículo).
- **Vista inicial:** si hay vehículos que coinciden, solo sus categorías ("Ver todas las
  categorías" muestra el resto con las suyas resaltadas); si no, todas.
- El contenedor arma el contexto (`ContextoTarifaFicha`: lado + vehículos) en
  `armarTarifas`; con datos vivos el detalle se actualiza y respeta la vista elegida.
```

1.4 `CLAUDE.md` — bundle. BUSCAR:
```
La ficha vive en un chunk compartido (≈ 51 kB) entre Clientes, Choferes, Proveedores y
```
REEMPLAZAR:
```
La ficha vive en un chunk compartido (≈ 59 kB desde FI7) entre Clientes, Choferes, Proveedores y
```

1.5 `CLAUDE.md` — deuda: F3 resuelto, F7 al frente futuro. BUSCAR:
```
- **Para analizar con la ficha en uso:**
  - F3: un componente que muestre el detalle de una tarifa con sus valores (sin
    edición), reutilizable desde la ficha y otras pantallas (comparar con los viewers de
    `raiz/tarifas`, que hoy viven en el módulo de Tarifas);
  - F7 (pedido del cliente): el apellido / la razón social de los listados como enlace a
    la ficha. Con `accionCelda` es una línea por listado.
```
REEMPLAZAR:
```
- ~~F3: un componente que muestre el detalle de una tarifa con sus valores~~ — RESUELTO
  en FI7 (ver "Frente Ficha de entidad → Pestaña Tarifas → Detalle de valores").
- F7 (pedido del cliente: el apellido / la razón social de los listados como enlace a la
  ficha): ampliado a toda la app, va como frente propio — ver "Frente futuro — nombre de la
  entidad como enlace a la ficha en toda la app".
```

1.6 `CLAUDE.md` — frente futuro al final. BUSCAR:
```
2. Sin reglas ni índices nuevos: la ficha solo lee colecciones que ya están mapeadas.
```
REEMPLAZAR:
```
2. Sin reglas ni índices nuevos: la ficha solo lee colecciones que ya están mapeadas.

### Frente futuro — nombre de la entidad como enlace a la ficha en toda la app
Análisis hecho al cierre del frente Ficha de entidad (18/10/2026); se encara como FRENTE
PROPIO, no como extra de ese frente. Idea: en (casi) todas las pantallas donde aparece el
nombre de un cliente, chofer o proveedor (razón social, apellido y nombre), que sea un
enlace que abre su ficha (`FichaEntidadService.abrir`).
- **Pieza única compartida**, no código suelto por pantalla: una directiva o componente de
  Shared (por ejemplo `<app-enlace-entidad tipo id>`) con estilo (`.enlace-entidad`),
  teclado y accesibilidad; en `tabla-generica`, `accionCelda` más una condición por fila
  (si la celda es enlace o texto, por ejemplo con la entidad dada de baja o un chofer
  directo en la columna Proveedor); en `tabla-listado`, sumar una acción al lado de
  `enlace` (hoy solo `routerLink`). Cada pantalla queda en una línea.
- **Inventario inicial:** nombres de entidades en ≈ 34 plantillas (Operaciones,
  Liquidación, Facturación, Finanzas, Vendedores, Reportes, Legajos, Tarifas, Ajustes y
  modales de Shared). Antes de abrir el frente: inventario fino por pantalla (componente,
  tipo de tabla, clics que ya existen).
- **Pros:** ir a la carpeta de la entidad desde cualquier pantalla sin pasar por el
  listado; mismo comportamiento en toda la app (como Legajos y Vencimientos); costo bajo
  por pantalla (la ficha lee de memoria; el chunk compartido de ≈ 59 kB se descarga una
  vez).
- **Contras / riesgos:**
  - clics que ya existen: tablero de asignaciones (las tarjetas se arrastran: excluir),
    Finanzas (el nombre abre la CUENTA: no cambiarlo; la ficha tiene "Ver cuenta"), filas
    que se expanden o abren algo al hacer clic (el enlace debe cortar la propagación);
  - modales apilados cuando el nombre está dentro de otro modal (detalle de operación o
    de liquidación): decidir caso por caso;
  - datos históricos vs vivos: en operaciones y liquidaciones el nombre es el snapshot del
    alta y la ficha muestra la entidad HOY (si se dio de baja, lo avisa; si cambió el
    nombre, no coinciden); los snapshots traen el id;
  - Registro y Papelera muestran entidades borradas: tienen su propio "ver" con la foto
    (excluir);
  - saturación visual (mitigada por el estilo sin azul ni subrayado) y copiar texto con el
    mouse (menor).
- **Alcance sugerido por etapas:** (1) pieza compartida + `tabla-listado` con acción;
  (2) listados de Clientes, Choferes y Proveedores (el pedido original del cliente: F7);
  (3) Operaciones y Liquidación (tablero de operaciones, InformeOp, borradores, emitidos,
  facturados); (4) Vendedores, Reportes y modales de Shared, caso por caso; (5) excluidos:
  tablero de asignaciones, Finanzas (salvo lo que no sea "abrir cuenta"), Registro y
  Papelera.
```

## PASO 2 — CHANGELOG.md

2.1 `CHANGELOG.md` — entrada del frente: FI7. BUSCAR:
```
- **Tarifas:** niveles habilitados y vigentes sin valores; "Ver en Tarifas".
```
REEMPLAZAR:
```
- **Tarifas:** niveles habilitados y vigentes; "Ver en Tarifas".
- **Detalle de valores (FI7):** "Ver valores" en cada tarifa de la ficha,
  solo del lado de la entidad (regla del motor: a cobrar / a pagar / a pagar
  al proveedor / valor especial), con las categorías de sus vehículos (vista
  inicial solo esas, "Ver todas" las resalta) y aviso si una no está en la
  tarifa.
```

2.2 `CHANGELOG.md` — Pendiente: frente futuro. BUSCAR:
```
- UX: el `<h1>` sin cerrar de `index.html` envuelve toda la app (ver "Deuda —
  tras el frente Lazy loading + fechas").
```
REEMPLAZAR:
```
- UX: el `<h1>` sin cerrar de `index.html` envuelve toda la app (ver "Deuda —
  tras el frente Lazy loading + fechas").
- Frente futuro: el nombre de la entidad como enlace a su ficha en toda la
  app (pieza compartida, por etapas; ver "Frente futuro — nombre de la entidad
  como enlace a la ficha en toda la app").
```

## Verificación

1. Comandos (reportá la salida):
```
grep -n "^### Deuda — tras el frente Ficha\|^### Frente futuro — nombre de la entidad\|^\*\*Detalle de valores (FI7)" CLAUDE.md
grep -c "~~F3: un componente que muestre el detalle" CLAUDE.md
grep -n "Detalle de valores (FI7)\|^- Frente futuro: el nombre" CHANGELOG.md
wc -l CLAUDE.md CHANGELOG.md
grep -c " $" CLAUDE.md
grep -c " $" CHANGELOG.md
git diff --numstat
git status --short
```
Esperado:
- (a) 3 líneas, en este orden: 3626 (Detalle de valores), 4633 (Deuda — tras el frente) y
  4657 (Frente futuro).
- (b) 1.
- (c) 2253 y 2291.
- (d) 4694 y 2327.
- (e) 0 y 0.
- (f) CHANGELOG.md `9 1`; CLAUDE.md `69 10`.
- (g) solo CLAUDE.md y CHANGELOG.md modificados (más los `.md` de instrucciones sin
  trackear, si los hay).

2. Mostrá el diff completo de los dos archivos.

No hace falta build: no se toca código.

## Revisión (Nico)

Leé en el diff:
1. "Detalle de valores (FI7)": que la regla de lados y la vista inicial coincidan con lo que
   probaste en demo.
2. "Frente futuro — nombre de la entidad como enlace a la ficha en toda la app": que el
   alcance y las exclusiones sean los que querés para cuando se encare.
3. CHANGELOG: el bullet de FI7 y el pendiente nuevo.

## Mensaje de commit

```
docs(ficha-entidad): FI7 (detalle de valores) y frente futuro de enlaces a la ficha

- CLAUDE.md: Frente Ficha de entidad con FI7 (detalle de valores del lado de la entidad,
  categorías de sus vehículos, vista inicial); F3 resuelto; F7 remite al frente futuro;
  sección nueva "Frente futuro — nombre de la entidad como enlace a la ficha en toda la
  app".
- CHANGELOG: FI7 en la entrada del frente y el frente futuro en "Pendiente".
```

FIN DE LA INSTRUCCIÓN DOC-FI7
````
