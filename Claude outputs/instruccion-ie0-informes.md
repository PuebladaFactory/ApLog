Si no ves la línea FIN DE LA INSTRUCCIÓN IE0 al final, el texto llegó cortado: leé el archivo completo.

# IE0 — Frente Informes Excel/PDF: borrar los imports muertos de pdfmake

## Contexto y razonamiento

Primer bloque del frente "Informes Excel/PDF" (pasar los informes que todavía salen de
`ExcelService` / `PdfService` al camino nuevo `DocumentoTabular` / `LibroTabular` + los
renderers de `servicios/exportacion/`, y retirar los dos servicios viejos al final).

Este bloque NO migra ningún informe: borra código muerto.

`PdfService` (`src/app/servicios/informes/pdf/pdf.service.ts`) importa `pdfmake` y
`pdfmake/build/vfs_fonts` y asigna `(pdfMake as any).vfs` a nivel de módulo, pero NINGÚN
método del servicio usa `pdfMake`: el único que lo usaba, `generarMovimientoPdf`, se
retiró en el frente Finanzas (F9). Los dos métodos vivos (`exportToPdfInforme` y
`exportarPdfInfomeOpLiquidadas`, que sirven a la Papelera legado) dibujan con
jsPDF + jspdf-autotable, no con pdfmake.

Efecto medido sobre la línea base de este frente (`npm run build:demo` en una copia limpia
del commit actual): el chunk `578.js` — 2,51 MB en bruto / 778,18 kB transferidos, que
Angular etiqueta `ajustes-ajustes-module` — es exactamente `pdfmake`. Al borrar estas
líneas ese chunk desaparece del build. El bundle inicial (1,53 MB) no cambia: `pdfmake`
nunca estuvo en el inicial.

Se borra también el bloque comentado de las líneas 3-4, que son los mismos imports de
`pdfmake` en una versión vieja: dejarlo sería dejar la pista falsa de que el servicio
todavía necesita la librería.

Las 7 líneas se borran con un único BUSCAR que cubre de la línea 1 a la 15 del archivo:
son contiguas y así se valida el encabezado completo en una sola pasada.

NO se desinstala `pdfmake` de `package.json` en este bloque: eso va en el bloque de cierre
del frente (IE5), junto con el retiro de los dos servicios viejos.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Validá el BUSCAR ANTES de escribir. Si no está, o está repetido, detenete y avisá.
- Editá en el lugar (leé el archivo antes de escribir). Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md: van en el bloque DOC de cierre del frente.
- NO corras `npm run build`, `deploy:*` ni `node set-version.js`. Para compilar:
  `npm run build:demo` (línea base: 9 advertencias, inicial 1,53 MB).
- npm con `--legacy-peer-deps` (en este bloque no hace falta instalar nada).

## PASO 0 — verificación, sin modificar nada

Corré esto y mostrame la salida. Si algo no coincide, detenete y avisá:

1. `git rev-parse --abbrev-ref HEAD` → tiene que decir `refactor`.
2. `git hash-object src/app/servicios/informes/pdf/pdf.service.ts` → tiene que dar
   `2d6e2256af7dda7985c3b90c1117e51d4c77babb`.
3. `grep -rn "pdfmake\|pdfMake" src/ | wc -l` → tiene que dar `5`: las 2 líneas
   comentadas, los 2 imports y la asignación de `vfs`, todas en `pdf.service.ts`.
4. `grep -c "generarMovimientoPdf" src/app/servicios/informes/pdf/pdf.service.ts` → `0`
   (confirma que el único método que usaba `pdfMake` ya no existe).

## PASO 1 — src/app/servicios/informes/pdf/pdf.service.ts

BUSCAR (15 líneas; son las primeras del archivo):

```
import { Injectable } from "@angular/core";

/* import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts'; */

import { Chofer, Vehiculo } from "src/app/interfaces/chofer";
import { Cliente } from "src/app/interfaces/cliente";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as pdfMake from "pdfmake/build/pdfmake";
import * as pdfFonts from "pdfmake/build/vfs_fonts";
import { InformeLiq } from "src/app/interfaces/informe-liq";
import { anioDe } from "src/app/shared/utils/fecha.util";

(pdfMake as any).vfs = (pdfFonts as any).vfs;
```

REEMPLAZAR por (8 líneas):

```
import { Injectable } from "@angular/core";

import { Chofer, Vehiculo } from "src/app/interfaces/chofer";
import { Cliente } from "src/app/interfaces/cliente";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { InformeLiq } from "src/app/interfaces/informe-liq";
import { anioDe } from "src/app/shared/utils/fecha.util";
```

## Verificación

1. `grep -rn "pdfmake\|pdfMake" src/ | wc -l` → `0`.
2. `git diff --numstat` → exactamente una línea:
   `0	7	src/app/servicios/informes/pdf/pdf.service.ts`. Ningún otro archivo tocado.
3. `git hash-object src/app/servicios/informes/pdf/pdf.service.ts` →
   `5451d616fededc452c7fc43eb0a408aba4dd2d4d`.
4. `npx tsc -p tsconfig.app.json --noEmit` → sin errores.
5. `npx tsc -p tsconfig.app.json --noEmit --noUnusedLocals` → el ÚNICO error esperado es
   el preexistente y documentado en CLAUDE.md:
   `src/app/app.component.ts(6,1): error TS6133: 'appVersion' is declared but its value is
   never read.` NO lo toques (ese import es el que mete `version.ts` en la compilación; sin
   él el build falla). Ningún error en `pdf.service.ts`. Si aparece algún otro, avisá.
6. `npm run build:demo` → termina OK, con las mismas 9 advertencias e inicial 1,53 MB. En
   la tabla "Lazy chunk files" ya NO tiene que aparecer ningún chunk de ~2,51 MB; el más
   grande pasa a ser el de `exceljs` (945,76 kB, etiquetado `clientes-clientes-module`).
   Pegame la tabla de chunks en el reporte.

## Pruebas manuales en demo (las hago yo)

- Ajustes → Papelera (legado): abrir un objeto de factura y usar los botones de
  "Reimpresión" excel / pdf. Tienen que comportarse EXACTAMENTE igual que antes de este
  bloque (si ya fallaban, fallan igual: este bloque no arregla nada de eso).
- Que siga funcionando algún PDF del camino nuevo, que es el que de verdad usa jsPDF:
  Liquidación → Vista previa, Facturación → Facturados → PDF, o Finanzas → Recibo.

## Mensaje de commit

```
IE0 (informes): PdfService sin los imports muertos de pdfmake

- pdf.service.ts: fuera los imports de pdfmake y vfs_fonts, su bloque comentado
  equivalente y la asignación de (pdfMake as any).vfs. Ningún método los usaba desde
  que el frente Finanzas (F9) retiró generarMovimientoPdf; los dos métodos vivos
  dibujan con jsPDF + jspdf-autotable.
- Efecto en build:demo: desaparece el chunk de pdfmake (2,51 MB en bruto / 778,18 kB
  transferidos, etiquetado ajustes-ajustes-module). Inicial sin cambios (1,53 MB).
- pdfmake queda en package.json hasta el bloque de cierre del frente (IE5).
```

FIN DE LA INSTRUCCIÓN IE0
