````
Si no ves la línea FIN DE LA INSTRUCCIÓN SB1b al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN SB1b — Fix de SB1: tipografía del contenido (ApLog, rama refactor)
=============================================================================

## Contexto y razonamiento

**Regresión de SB1.** Después de SB1, el contenido de todas las pantallas se
ve con la letra grande (24 px, peso 500). El sidebar y las pestañas se ven
bien.

**Causa** (medida en Chromium, antes y después de SB1):
- El `<h1>` sin cerrar de `index.html` envuelve toda la app. Es la deuda de
  UX registrada en LZ4.
- Antes, el `<body id="content">` anidado recibía la regla `body` de
  Bootstrap: `font-size: 1rem` (9,6 px con el `html { font-size: 60% }` de
  styles.scss), peso 400 y `line-height` 1,5. Eso cortaba lo heredado del
  `<h1>`.
- SB1 lo pasó a `<main>`, que no recibe esa regla y hereda 24 px / 500 del
  `<h1>`.

**Medición del cálculo de `#content`:**

| | font-size | font-weight | line-height |
|---|---|---|---|
| Antes de SB1 (`<body>`) | 9,6 px | 400 | 14,4 px |
| Con SB1 (`<main>`) | 24 px | 500 | 28,8 px |
| Con SB1b | 9,6 px | 400 | 14,4 px |

**Fix:** `#content` repite las propiedades tipográficas de la regla `body`
de Bootstrap, con sus mismas variables: `--bs-body-font-size`,
`--bs-body-font-weight`, `--bs-body-line-height`, `--bs-body-color` y
`--bs-body-text-align`. Vuelve exactamente al aspecto anterior. Sacar el
`<h1>` sigue siendo un tema del frente de UX.

`build:demo` limpio, con las 9 advertencias y los tamaños sin cambio.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- NO corras `npm run deploy:*`, `npm run build` ni `node set-version.js`.
  Para compilar usá `npm run build:demo`.
- Se aplica sobre SB1, commiteado o no.
- Si el texto a BUSCAR no está o aparece más de una vez: detenete y
  reportá.
- Finales de línea LF.

## PASO 1 — src/app/raiz/home/home.component.css

BUSCAR:
```
#content {
    font-family: 'Poppins', sans-serif;
```
REEMPLAZAR:
```
#content {
    /* Lo que antes aplicaba Bootstrap al <body> anidado: corta lo que hereda
       del <h1> sin cerrar de index.html (24 px / 500). */
    font-size: var(--bs-body-font-size);
    font-weight: var(--bs-body-font-weight);
    line-height: var(--bs-body-line-height);
    color: var(--bs-body-color);
    text-align: var(--bs-body-text-align);
    font-family: 'Poppins', sans-serif;
```

## Verificación

1. `git diff --numstat -- src/app/raiz/home/home.component.css`: si SB1 ya
   está commiteado, `7 0`. Si no, `34 2` (SB1 + SB1b).
2. `npm run build:demo`: sin errores, las mismas 9 advertencias.

## Pruebas manuales en demo (las hace Nico)

1. Finanzas, Operaciones y un listado: la letra del contenido vuelve al
   tamaño de antes de SB1.
2. Seguir con las pruebas del sidebar de SB1.

## Mensaje de commit

Si SB1 todavía no está commiteado, commitealos juntos con el mensaje de SB1
y agregale esta línea:
```
- #content repite la tipografía de body de Bootstrap (el <main> heredaba
  24 px del <h1> sin cerrar de index.html).
```
Si ya está commiteado:
```
SB1b: tipografía del contenido tras pasar <body> a <main>

- #content repite font-size/weight/line-height/color/text-align de la
  regla body de Bootstrap: el <main> heredaba 24 px / 500 del <h1> sin
  cerrar de index.html (antes lo cortaba el <body> anidado).
```

FIN DE LA INSTRUCCIÓN SB1b
````
