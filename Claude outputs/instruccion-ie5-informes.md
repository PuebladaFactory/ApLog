Si no ves la línea FIN DE LA INSTRUCCIÓN IE5 al final, el texto llegó cortado: leé el archivo completo.

# IE5 — Se retiran `ExcelService` y `PdfService`, y `pdfmake` sale del proyecto

## Contexto y razonamiento

El cierre del frente. IE4 dejó a los dos servicios viejos sin un solo importador en la app,
así que acá se borran: **4 archivos, 1.276 líneas** (`excel.service.ts` 890,
`pdf.service.ts` 354 y sus dos `.spec.ts` de 16 cada uno). La carpeta
`src/app/servicios/informes/` queda vacía y desaparece — contenía solo esos cuatro
archivos; no confundir con `servicios/informes-liq/` y `servicios/informes-op/`, que son
otra cosa y no se tocan.

Y sale `pdfmake` del `package.json`, junto con `@types/pdfmake`. Desde IE0 no lo importa
ningún archivo (ahí se borraron los imports muertos de `PdfService`), así que era una
dependencia instalada que nadie usaba.

**El build no se mueve ni un byte, y eso es exactamente lo que confirma que el trabajo ya
estaba hecho.** Comparé la tabla de chunks de este build contra la del build de IE4: los 41
chunks lazy, idénticos en tamaño, y el inicial sigue en 1,53 MB. Tiene que ser así: webpack
ya no incluía estos dos servicios desde IE4, porque nadie los importaba. Lo que este bloque
saca es código fuente y una dependencia, no peso del bundle.

El peso se fue antes, y así quedó el frente completo:

| Bloque | Qué dejó de descargarse |
|---|---|
| IE0 | El chunk de `pdfmake` (**2,51 MB**) desaparece del build entero |
| IE1b | `exceljs` sale de la ruta `/op` (945,76 kB / 217,91 kB transferidos) |
| IE3b | `exceljs` sale de `clientes`, `choferes` y `proveedores` |
| IE4 | `exceljs` + `jspdf` salen de `ajustes` (1.331,88 kB / 324,46 kB) |
| IE5 | Nada: el bundle ya no los tenía. Se van el código y la dependencia |

Resultado del frente: **ninguna ruta de la app descarga una librería de exportación al
entrar**. `exceljs`, `jspdf` y `jspdf-autotable` quedan en sus chunks y los carga el
renderer genérico con `import()` cuando de verdad se exporta algo.

**Lo que se queda, a propósito:**
- `exceljs`, `jspdf`, `jspdf-autotable` y `file-saver` en `package.json`: los usan los
  renderers nuevos.
- Las menciones a `ExcelService` en los JSDoc de `documento-entidades.util.ts` y
  `documento-operaciones.util.ts`. No son referencias a código: dicen de dónde salieron las
  columnas de cada informe ("las 14 del informe viejo,
  `ExcelService.exportarChoferesTablaExcel`, en el mismo orden"). Esa procedencia es
  justamente lo que hay que poder consultar cuando alguien pregunte por qué una columna es
  como es.
- Los 7 `.spec.ts` que no compilan (deuda preexistente, `npm test` no corre). Los dos que
  se borran acá **no eran de esos**: compilaban bien, así que el contero de errores de
  `tsc -p tsconfig.spec.json` sigue en 7, ni uno más ni uno menos.

**El único cambio de código fuera de los borrados** es el comentario de `logo-empresa.ts`,
que decía "los servicios viejos ExcelService/PdfService conservan la suya hasta que se
retiren". Después de este bloque eso sería falso, y un comentario que miente es peor que no
tenerlo.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Validá el BUSCAR del PASO 2 antes de escribir. Si no está o está repetido, detenete y
  avisá.
- **Borrá los cuatro archivos del PASO 1 completos, y la carpeta `servicios/informes/`**
  (queda vacía). No toques `servicios/informes-liq/` ni `servicios/informes-op/`.
- `npm uninstall` SIEMPRE con `--legacy-peer-deps` (ERESOLVE preexistente de
  `@angular/fire` 19 con Angular 20). No corras `npm install` sin ese flag.
- No toques `exceljs`, `jspdf`, `jspdf-autotable` ni `file-saver`.
- No toques los JSDoc de `documento-entidades.util.ts` ni de `documento-operaciones.util.ts`.
- No toques CLAUDE.md ni CHANGELOG.md: van en el bloque DOC de cierre (IEDOC), que es el
  siguiente y último.
- NO corras `npm run build`, `deploy:*` ni `node set-version.js`. Para compilar:
  `npm run build:demo` (línea base: 9 advertencias, inicial 1,53 MB).

## PASO 0 — verificación, sin modificar nada

Los hashes están en el archivo de la instrucción (`instruccion-ie5-informes.md`),
generados con `git`. Usá esa lista.

1. `git rev-parse --abbrev-ref HEAD` → `refactor`; `git log --oneline -1` → el commit de IE4.
2. Los cuatro archivos a borrar, con su hash y su cantidad de líneas (lista del archivo).
3. `git hash-object src/app/servicios/exportacion/logo-empresa.ts` → el hash de partida de
   la lista.
4. **Nadie los importa** (lo que dejó IE4):
   `grep -rn "^import { ExcelService\|^import { PdfService" src/ --include=*.ts` → solo las
   dos líneas de los `.spec.ts` que se borran en este bloque.
5. `find src/app/servicios/informes -type f | sort` → exactamente esos cuatro archivos y
   nada más (si aparece un quinto, detenete: el plan asume que la carpeta solo tiene esos).
6. `grep -c pdfmake package.json` → `2` (`pdfmake` y `@types/pdfmake`).
7. `npx tsc -p tsconfig.spec.json --noEmit 2>&1 | grep -c error` → `7` (la deuda
   preexistente de specs; anotá el número para comparar al final).

## PASO 1 — borrar los dos servicios viejos y sus specs

Borrá estos cuatro archivos y después la carpeta `src/app/servicios/informes/`, que queda
vacía:

| Archivo | Líneas | Hash en HEAD |
|---|---|---|
| `src/app/servicios/informes/excel/excel.service.ts` | 890 | `c58ab3aa077e30ff7ddcae51e908b52eef882876` |
| `src/app/servicios/informes/excel/excel.service.spec.ts` | 16 | `209ccedb7e2f9165d59c9a3a9e6d7f56c9b56353` |
| `src/app/servicios/informes/pdf/pdf.service.ts` | 354 | `5451d616fededc452c7fc43eb0a408aba4dd2d4d` |
| `src/app/servicios/informes/pdf/pdf.service.spec.ts` | 16 | `7c057dc5cea47ef03349a2502f8fe0368c382d28` |

Son 1.276 líneas en total. La carpeta no tiene nada más (el PASO 0 punto 5 lo confirma).

## PASO 2 — src/app/servicios/exportacion/logo-empresa.ts

BUSCAR (4 líneas):

```
/** Logo de la empresa para los documentos exportados (PNG 202×62 px, data
 *  URL). Una sola copia: la usan PdfTabularService y ExcelTabularService.
 *  (Los servicios viejos ExcelService/PdfService conservan la suya hasta que
 *  se retiren.) */
```

REEMPLAZAR por (5 líneas):

```
/** Logo de la empresa para los documentos exportados (PNG 202×62 px, data
 *  URL). Única copia en el proyecto: la usan PdfTabularService y
 *  ExcelTabularService, los dos renderers genéricos. (Los servicios viejos
 *  ExcelService/PdfService tenían la suya; se retiraron en el frente
 *  Informes, IE5.) */
```

## PASO 3 — sacar `pdfmake` del proyecto

Corré exactamente esto, con el flag:

```
npm uninstall pdfmake @types/pdfmake --legacy-peer-deps
```

Nada más: no corras `npm install`, ni `npm audit fix`, ni actualices otra cosa. El comando
toca `package.json`, `package-lock.json` y `node_modules/`.

Si npm imprime avisos de `npm audit` o de peer dependencies, son los preexistentes del
proyecto (ERESOLVE de `@angular/fire` 19 con Angular 20): no hagas nada con ellos.

## Verificación

1. Los cuatro archivos y su carpeta ya no están:
   - `ls src/app/servicios/informes` → error de "no such file or directory"
   - `git status --short` → cuatro líneas `D` con esos archivos, más `M package.json`,
     `M package-lock.json` y `M src/app/servicios/exportacion/logo-empresa.ts`
2. `git hash-object src/app/servicios/exportacion/logo-empresa.ts` → el hash de resultado
   de la lista del archivo.
3. Nada en el código los menciona como import:
   - `grep -rn "^import { ExcelService\|^import { PdfService" src/ --include=*.ts | wc -l` → `0`
   - `grep -rn "servicios/informes/" src/ | wc -l` → `0`
4. `pdfmake` fuera:
   - `grep -c pdfmake package.json` → `0`
   - `ls node_modules/pdfmake` → error de "no such file or directory"
   - ⚠️ El diff de `package-lock.json` depende de tu versión de npm, así que no te paso un
     hash para ese archivo: lo que importa es que `package.json` pierda exactamente esas dos
     líneas (`git diff package.json` → dos `-`, nada más) y que el build siga en verde.
5. Las librerías del camino nuevo siguen:
   `grep -cE '"(exceljs|jspdf|jspdf-autotable|file-saver)"' package.json` → `4`.
6. `npx tsc -p tsconfig.app.json --noEmit` → sin errores.
7. `npx tsc -p tsconfig.app.json --noEmit --noUnusedLocals` → solo el error preexistente de
   `appVersion` en `app.component.ts`.
8. `npx tsc -p tsconfig.spec.json --noEmit 2>&1 | grep -c error` → **el mismo número que en
   el PASO 0** (`7`): los dos specs borrados compilaban bien, así que la deuda de specs no
   se mueve.
9. `npm run build:demo` → OK, 9 advertencias, inicial 1,53 MB.
10. **La medición del cierre.** Guardá el log de este build y compará su tabla de chunks
    con la del build de IE4 (si lo tenés). Tienen que ser **idénticas**: mismos 41 chunks
    lazy, mismos tamaños. Es la prueba de que IE4 ya los había dejado fuera del bundle y
    que este bloque no cambia lo que se descarga. Si querés el comando:
    ```
    diff <(grep -E "^[0-9]+\.js" build-ie4.log  | awk '{print $3, $4, $5}' | sort) \
         <(grep -E "^[0-9]+\.js" build-ie5.log  | awk '{print $3, $4, $5}' | sort)
    ```
    Y confirmá que `grep -rl "pdfmake" dist/ap-log/*.js | wc -l` → `0`.

## Pruebas manuales en demo (las hago yo)

Este bloque borra código que ya no tenía consumidores, así que lo que se prueba es que no
falte nada. Un repaso corto por las cinco exportaciones vivas:

1. **Operaciones → Tablero de operaciones → "Descargar Op"**: baja la Tabla con Nivel y
   Tarifa (IE2b).
2. **Clientes / Choferes / Proveedores → "Descargar"**: bajan los tres listados nuevos
   (IE3b).
3. **Liquidación / Facturación**: Excel y PDF de una liquidación (emitida o proforma) y una
   "Vista previa" en PDF.
4. **Reportes → Resumen general**: Excel (tres hojas) y PDF.
5. **Vendedores → Tablero**: Excel; y **Finanzas**: Excel de Cuentas o Movimientos, y un
   Recibo / Orden de pago en PDF.
6. **Ajustes → Papelera (legado)**: el modal de detalle sigue abriendo sin la columna de
   reimpresión (IE4) y sin errores en la consola.

## Mensaje de commit

```
IE5 (informes): se retiran ExcelService y PdfService, y pdfmake sale del proyecto

- Borrados src/app/servicios/informes/excel/excel.service.ts (890 lineas),
  pdf.service.ts (354) y sus dos .spec.ts: 4 archivos, 1.276 lineas. La carpeta
  servicios/informes/ queda vacia y desaparece (no confundir con
  servicios/informes-liq/ y servicios/informes-op/, que no se tocan).
- IE4 los habia dejado sin un solo importador en la app; desde IE0 tampoco
  importaban pdfmake. npm uninstall pdfmake @types/pdfmake --legacy-peer-deps.
- El build no se mueve ni un byte: la tabla de chunks es identica a la de IE4
  (41 chunks lazy, mismos tamanos, inicial 1,53 MB). Es lo esperado y es la
  prueba de que ya no entraban al bundle. El peso se fue antes: IE0 saco el
  chunk de pdfmake (2,51 MB) del build entero, IE1b saco exceljs de /op, IE3b
  de clientes/choferes/proveedores e IE4 exceljs + jspdf de ajustes. Resultado
  del frente: ninguna ruta descarga una libreria de exportacion al entrar; las
  carga el renderer generico con import() al exportar.
- logo-empresa: el comentario decia que los servicios viejos conservaban su
  copia del logo "hasta que se retiren". Actualizado.
- Se quedan: exceljs, jspdf, jspdf-autotable y file-saver (los usan los
  renderers nuevos), las menciones a ExcelService en los JSDoc de
  documento-entidades y documento-operaciones (dicen de donde salieron las
  columnas de cada informe, no son referencias a codigo) y los 7 .spec.ts que
  no compilan (deuda preexistente; los dos borrados no eran de esos).
```

## Anexo — hashes

| Archivo | Líneas | Hash en HEAD |
|---|---|---|
| `src/app/servicios/informes/excel/excel.service.ts` | 890 | `c58ab3aa077e30ff7ddcae51e908b52eef882876` |
| `src/app/servicios/informes/excel/excel.service.spec.ts` | 16 | `209ccedb7e2f9165d59c9a3a9e6d7f56c9b56353` |
| `src/app/servicios/informes/pdf/pdf.service.ts` | 354 | `5451d616fededc452c7fc43eb0a408aba4dd2d4d` |
| `src/app/servicios/informes/pdf/pdf.service.spec.ts` | 16 | `7c057dc5cea47ef03349a2502f8fe0368c382d28` |

   - `git hash-object src/app/servicios/exportacion/logo-empresa.ts`
     - de partida: `2a52866a646a669ccee164c1f96d1d5ed8fa40a8`
     - resultado: `5551ed017b6bd28b5d57f5fdda35d129169940f8`

FIN DE LA INSTRUCCIÓN IE5
