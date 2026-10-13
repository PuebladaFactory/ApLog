````
Si no ves la línea FIN DE LA INSTRUCCIÓN LR2c al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN LR2c — Frente Lazy loading + fechas (ApLog, rama refactor)
======================================================================
Limpieza de código sin uso (3/4): ValidarService, ExcelService y PdfService

## Contexto y razonamiento

Tercer bloque de la limpieza. Lo que quedaba (LR2c en el plan) se partió
en dos:
- **LR2c (este):** los servicios de validación y de informes Excel/PDF.
- **LR2d:** los miembros sueltos de los demás servicios, más lo que queda
  huérfano en cascada: LogService, NumeradorService, AsignacionService,
  DbFirestoreService.getInformesOpPorPeriodo y otros.

Alcance medido sobre el código con LR2b, igual que antes:
- referencias del compilador de TypeScript;
- uso en templates;
- uso por instancia (`excelServ`, `pdfServ`);
- cascada iterada hasta que no aparece nada nuevo.

**ValidarService:**
- Hoy solo se usan sus validadores ESTÁTICOS (`ValidarService.soloLetras`,
  `.validarDominio`, etc.).
- Salen los 13 `FormGroup` de instancia (`nombreV`, `apellidoV`, …,
  `marcaGpsV`), que nadie usa. Con ellos sale el constructor, que solo
  inyectaba FormBuilder para armarlos.
- Salen los imports sin uso: `Input`, `FormBuilder`, `Validator`,
  `ValidatorFn`, `Chofer`, `Cliente`, `Legajo`, `Proveedor`, `Router` y
  `StorageService`.
- El código COMENTADO del final del archivo no se toca.

**ExcelService:**
- Sale `generarInformeAsignaciones` (el tablero de asignaciones en Excel)
  con sus 7 auxiliares, que solo usaba él: `mapColorClassToExcelColor`,
  `chunkArray`, `shouldUseWhiteText`, `setCellWithMetadata`,
  `agregarMetadata`, `leerMetadataExcel` y `agregarHojaMetadata`. También
  los tipos locales `ChoferAsignado` y `MetadataChofer`.
- Salen `factura`, `CATEGORIAS_TEXTO_CLARO`, `getProveedor` y
  `formatearDireccion`.
- Salen los imports sin uso: `Categoria`, `Direccion`, `Operacion`,
  `Proveedor`, `ConIdType`, `saveAs` y `Workbook`.
- `exportToExcelInforme` y lo que usan Papelera legado y los listados se
  quedan.

**PdfService:**
- Salen `$choferes` y `limpiarValorFormateado`.
- Sale la inyección de StorageService, que estaba sin uso.
- Salen los imports sin uso: `Alignment`, `StorageService`, `Descuento` y
  `TDocumentDefinitions`.

No cambia comportamiento. Los tres servicios viven en chunks lazy, así que
el inicial no cambia.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto a BUSCAR no está o aparece más de una vez: detenete y
  reportá.
- Aplicá los cambios de cada archivo EN ORDEN.
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md.
- Si se toca un tipo, interfaz, módulo o export, revisá TODOS sus usos en
  src/ (incluidos .spec.ts y .html).
- **Borrado por RANGO** (igual que en LR2a y LR2b). Se borra desde INICIO
  (inclusive) hasta la línea anterior a ANCLA (ANCLA se queda). Las dos se
  identifican por cómo EMPIEZA la línea, con la sangría indicada. Antes de
  borrar, verificá:
  - que cada prefijo sea único en el archivo;
  - que ANCLA esté después de INICIO;
  - que la distancia sea exactamente la indicada.
  Si algo no coincide, detenete y reportá sin borrar.

## PASO 0 — Verificación (sin modificar nada)

Corré y reportá la salida:

```
grep -rnE "\b(generarInformeAsignaciones|leerMetadataExcel|agregarHojaMetadata|mapColorClassToExcelColor|chunkArray|shouldUseWhiteText|setCellWithMetadata|agregarMetadata|CATEGORIAS_TEXTO_CLARO|formatearDireccion|limpiarValorFormateado|ChoferAsignado|MetadataChofer|nombreV|apellidoV|cuitV|fechaNacV|emailV|celulcarContactoV|celularEmergenciaV|domicilioV|dominioV|marcaV|modeloV|proveedorV|marcaGpsV)\b" src --include=*.ts --include=*.html | grep -v "servicios/informes/excel/excel.service.ts\|servicios/informes/pdf/pdf.service.ts\|servicios/validar/validar.service.ts"
grep -rnE "\b(excelServ|excelService|pdfServ|pdfService)\.(getProveedor|factura|\$choferes)\b" src --include=*.ts --include=*.html
grep -rn "inject(ValidarService)\|: ValidarService" src --include=*.ts
wc -l src/app/servicios/validar/validar.service.ts src/app/servicios/informes/excel/excel.service.ts src/app/servicios/informes/pdf/pdf.service.ts
```

Esperado:
1. Nada: ningún archivo fuera de los 3 servicios usa lo que sale.
2. Nada.
3. Solo validar.service.spec.ts. Ningún componente inyecta
   ValidarService: todos usan los métodos estáticos.
4. Referencia: `246`, `1395` y `372`.

Si algo no coincide, detenete y reportá.

## PASO 1 — src/app/servicios/validar/validar.service.ts

1.1 BUSCAR:
```
import { Injectable, Input } from '@angular/core';

import {
  AbstractControl,
  FormBuilder,
  ValidationErrors,
  Validator,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Legajo } from 'src/app/interfaces/legajo';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { Router } from '@angular/router';
import { StorageService } from 'src/app/servicios/storage/storage.service';
```
REEMPLAZAR:
```
import { Injectable } from '@angular/core';

import {
  AbstractControl,
  ValidationErrors,
  Validators,
} from '@angular/forms';
```

1.2 Borrá la línea COMPLETA que contiene:
```
  constructor(private fb: FormBuilder) {}
```
por:
```
(borrar la línea)
```

Los 13 `FormGroup` sin uso (`nombreV` a `marcaGpsV`), con sus líneas en blanco:

1.3 RANGO (52 líneas).
- INICIO: la línea que empieza con (4 espacios de sangría):
```
    nombreV = this.fb.group({
```
- ANCLA (se queda): la línea que empieza con (5 espacios de sangría):
```
     // Validador para solo permitir caracteres alfab
```


## PASO 2 — src/app/servicios/informes/excel/excel.service.ts

2.1 Borrá la línea COMPLETA que contiene:
```
  Categoria,
```
por:
```
(borrar la línea)
```

2.2 Borrá la línea COMPLETA que contiene:
```
  Direccion,
```
por:
```
(borrar la línea)
```

2.3 BUSCAR:
```
import { Operacion } from "src/app/interfaces/operacion";
import { Proveedor } from "src/app/interfaces/proveedor";
import { StorageService } from "../../storage/storage.service";
```
REEMPLAZAR:
```
import { StorageService } from "../../storage/storage.service";
```

2.4 BUSCAR:
```
import { ConId, ConIdType } from "src/app/interfaces/conId";
```
REEMPLAZAR:
```
import { ConId } from "src/app/interfaces/conId";
```

2.5 BUSCAR:
```
import saveAs from "file-saver";
import { InformeLiq } from "src/app/interfaces/informe-liq";
import { Workbook } from "exceljs";
```
REEMPLAZAR:
```
import { InformeLiq } from "src/app/interfaces/informe-liq";
```

Tipos locales `ChoferAsignado` y `MetadataChofer` (solo los usaba el tablero en Excel que sale abajo):

2.6 RANGO (14 líneas).
- INICIO: la línea que empieza con (0 espacios de sangría):
```
type ChoferAsignado = ConIdType<Chofer> & {
```
- ANCLA (se queda): la línea que empieza con (0 espacios de sangría):
```
@Injectable({
```

Propiedades `factura` y `CATEGORIAS_TEXTO_CLARO`:

2.7 RANGO (8 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  factura!: InformeLiq;
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  constructor(private storageService: StorageService) {}
```

`getProveedor`:

2.8 RANGO (10 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  getProveedor(idProveedor: string) {
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  getCategoria(patente: string, idChofer: number) {
```

`generarInformeAsignaciones` (tablero de asignaciones en Excel, sin uso) y sus auxiliares, que solo usaba él: `mapColorClassToExcelColor`, `chunkArray`, `shouldUseWhiteText`, `setCellWithMetadata`, `agregarMetadata`, `leerMetadataExcel` y `agregarHojaMetadata`:

2.9 RANGO (462 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  /** Crea y descarga el tablero en Excel */
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  ///listado de clientes
```

`formatearDireccion`:

2.10 RANGO (4 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  private formatearDireccion(dir: Direccion): string {
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  private formatearContactosRich(contactos: Contacto[]) {
```


## PASO 3 — src/app/servicios/informes/pdf/pdf.service.ts

3.1 Borrá la línea COMPLETA que contiene:
```
import { Alignment } from "pdfmake/interfaces";
```
por:
```
(borrar la línea)
```

3.2 Borrá la línea COMPLETA que contiene:
```
import { StorageService } from "../../storage/storage.service";
```
por:
```
(borrar la línea)
```

3.3 BUSCAR:
```
import { Descuento, InformeLiq } from "src/app/interfaces/informe-liq";
import { TDocumentDefinitions } from "pdfmake/interfaces";
```
REEMPLAZAR:
```
import { InformeLiq } from "src/app/interfaces/informe-liq";
```

3.4 Borrá la línea COMPLETA que contiene:
```
  $choferes!: Chofer[];
```
por:
```
(borrar la línea)
```

3.5 Borrá la línea COMPLETA que contiene:
```
  constructor(private storageService: StorageService) {}
```
por:
```
(borrar la línea)
```

`limpiarValorFormateado`:

3.6 RANGO (5 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  limpiarValorFormateado(valorFormateado: string): number {
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  obtenerDatos(
```

## Verificación

1. Greps (reportá la salida):
```
grep -rnE "\b(generarInformeAsignaciones|leerMetadataExcel|agregarHojaMetadata|mapColorClassToExcelColor|chunkArray|shouldUseWhiteText|setCellWithMetadata|agregarMetadata|CATEGORIAS_TEXTO_CLARO|formatearDireccion|limpiarValorFormateado|ChoferAsignado|MetadataChofer|nombreV|apellidoV|cuitV|fechaNacV|emailV|celulcarContactoV|celularEmergenciaV|domicilioV|dominioV|marcaV|modeloV|proveedorV|marcaGpsV)\b" src --include=*.ts --include=*.html
grep -nE "FormBuilder|Input|Router|StorageService|import \{ Chofer|import \{ Cliente|Legajo|Proveedor" src/app/servicios/validar/validar.service.ts | grep -v "^[0-9]*:\s*\(//\|/\*\)" | head -20
grep -n "StorageService\|Alignment\|Descuento\|TDocumentDefinitions\|\$choferes" src/app/servicios/informes/pdf/pdf.service.ts
wc -l src/app/servicios/validar/validar.service.ts src/app/servicios/informes/excel/excel.service.ts src/app/servicios/informes/pdf/pdf.service.ts
git diff --numstat -- src
git diff -U0 -- src | grep -n "^+.* $"
```
Esperado:
- (a) nada;
- (b) solo las líneas 134 a 139 y 155, que están dentro del bloque de
  código COMENTADO del final del archivo (`/*import { Injectable } …`), que
  no se toca;
- (c) nada;
- (d) `184`, `891` y `362`;
- (e) excel.service.ts `1	505`, pdf.service.ts `1	11`,
  validar.service.ts `1	63`. Nada más;
- (f) nada.

2. `npm run build:demo`. Reportá la tabla de tamaños y las advertencias.
   Referencia (medido sobre una copia del repo con LR2b + este cambio):
   - Initial total: sin cambio (≈ 1,53 MB, main ≈ 1,10 MB). Excel y PDF
     viven en chunks lazy;
   - las mismas 9 advertencias.

## Pruebas manuales en demo (las hace Nico)

1. Validaciones (usan los métodos estáticos que se quedan):
   - alta de chofer con un dominio inválido y uno válido (AAA111 / AA111AA);
   - un nombre con números (soloLetras);
   - alta de cliente y de proveedor;
   - alta de vendedor;
   - modal de contacto de cliente y de proveedor.
2. Excel:
   - exportar un listado de clientes y uno de choferes;
   - en Papelera legado, exportar un objeto a Excel.
3. PDF: en Papelera legado, exportar un objeto a PDF.
4. Liquidación/Facturación: descargar el PDF y el Excel de un informe
   emitido (camino nuevo; no usa estos servicios, pero sirve de control).

## Mensaje de commit

```
LR2c (lazy-fechas): ValidarService, ExcelService y PdfService sin código muerto

- ValidarService: fuera los 13 FormGroup de instancia sin uso (nombreV …
  marcaGpsV) y el constructor con FormBuilder; quedan los validadores
  estáticos. Imports sin uso fuera.
- ExcelService: fuera generarInformeAsignaciones y sus 7 auxiliares
  (tablero de asignaciones en Excel, sin uso), los tipos ChoferAsignado y
  MetadataChofer, factura, CATEGORIAS_TEXTO_CLARO, getProveedor,
  formatearDireccion e imports sin uso.
- PdfService: fuera $choferes, limpiarValorFormateado, la inyección sin uso
  de StorageService e imports sin uso.
```

FIN DE LA INSTRUCCIÓN LR2c
````
