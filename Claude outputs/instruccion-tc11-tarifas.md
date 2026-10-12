````
INSTRUCCIÓN TC11 — Tarifas (cierre): fuera idTarifa / tarifaAsignada de Cliente, Chofer y Proveedor
================================================================================

Si no ves la línea "FIN DE LA INSTRUCCIÓN TC11" al final, el texto llegó
cortado: leé el archivo completo antes de empezar.

## Contexto y razonamiento

Cliente, Chofer y Proveedor arrastran dos campos del sistema viejo de
tarifas, marcados con `// TODO: refactor Tarifas — reemplazar por
RefTarifaHabilitada`:
  - `tarifaAsignada: boolean`
  - `idTarifa: string`
Ya están reemplazados por `tarifasHabilitadas: RefTarifaHabilitada[]` (TC1)
y desde TC-R1..R4 no los lee nadie: solo se escriben (factories con valores
fijos `false` / `''`, migraciones copiándolos del documento viejo) y
choferes-alta los copia a un campo local que no usa ningún template.

Cambios:
1. Interfaces cliente.ts, chofer.ts, proveedor.ts: fuera los dos campos (y
   sus TODO).
2. Factories de las tres entidades: dejan de escribirlos en las altas.
3. Servicios de migración de las tres entidades: dejan de copiarlos.
4. choferes-alta.component.ts: fuera el campo local `tarifaAsignada` y sus
   dos asignaciones.
5. Arreglo pendiente de TC10 (papelera): el detalle de una op dada de baja
   mostraba `valoresNuevos.<lado>.tarifaBase` crudo; en valoresNuevos la
   base es por unidad y el total la multiplica por el multiplicador del
   lado (igual que el InformeOp). Ahora muestra
   tarifaBase × multiplicadorCliente / multiplicadorChofer.

NO se tocan los `idTarifa` del modelo nuevo (Tarifa / TarifaBase,
RefTarifaAplicada, RegistroOpEventual, tarifas-historial,
operaciones-editor) ni los del modelo de facturación vieja
(informe-op.ts, tarifa-gral-cliente.ts, migrar-datos): son otra cosa.

Datos: los documentos de clientes/choferes/proveedores de demo conservan
`idTarifa`/`tarifaAsignada` en Firestore; sin interfaz que los declare,
son inertes. Se limpian en la migración de Vantruck (checklist de TC-DOC).
Ediciones de la entidad usan merge/update y no los borran: es esperado.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto a BUSCAR no está, o aparece más de una vez: detenete y reportá.
- Aplicá los cambios de cada archivo EN ORDEN.
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Ningún BUSCAR de esta instrucción tiene espacios al final de línea.
- Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md.
- Se tocan las interfaces Cliente, Chofer y Proveedor: revisá todos los usos
  de los campos retirados en src/ (incluidos .spec.ts y .html; ojo con
  objetos tipados `any`, que el build no detecta) — ver PASO 0.

## PASO 0 — Verificación (sin modificar nada)

0.1 `grep -rn "tarifaAsignada" src/` → exactamente 12 líneas:
    interfaces cliente.ts, chofer.ts, proveedor.ts (1 c/u);
    cliente-factory, chofer-factory, proveedor-factory (1 c/u);
    cliente-migration, chofer-migration, proveedor-migration (1 c/u);
    choferes-alta.component.ts (3: el campo local y dos asignaciones).
    Ningún .spec.ts ni .html.
0.2 `grep -rn "\.idTarifa\b" src/ --include=*.ts --include=*.html | grep -v "src/app/servicios/tarifario/\|src/app/raiz/tarifas/"`
    → solo: las 3 migraciones de entidades (`datos.idTarifa`, se van en
    este bloque), tarifa-migration.service.ts (`datos.idTarifa` de la
    tarifa eventual vieja), migrar-datos.component.ts (`facturaOp.idTarifa`),
    informe-op-editor (`ref.idTarifa`), operaciones-editor
    (.ts y .html: candidatos y tarifa aplicada) y el comentario de
    registro-op-eventual.ts. Ninguno lee `idTarifa` de un Cliente, Chofer o
    Proveedor. Ningún .spec.ts.
0.3 En objeto-papelera.component.html, `grep -n "tarifaBase" ` → 2 líneas
    (cliente ~68, chofer ~108), y la interfaz Operacion tiene
    `multiplicadorCliente: number;` y `multiplicadorChofer: number;`.
Si algo no coincide, DETENETE y reportá.

## PASO 1 — src/app/interfaces/cliente.ts

1.1 BUSCAR:
```
    tarifasHabilitadas: RefTarifaHabilitada[];
    // TODO: refactor Tarifas — reemplazar por RefTarifaHabilitada
    tarifaAsignada: boolean;
    // TODO: refactor Tarifas — reemplazar por RefTarifaHabilitada
    idTarifa: string;
```
REEMPLAZAR:
```
    tarifasHabilitadas: RefTarifaHabilitada[];
```

## PASO 2 — src/app/interfaces/chofer.ts

2.1 BUSCAR:
```
    tarifasHabilitadas: RefTarifaHabilitada[] | null;
    // TODO: refactor Tarifas — reemplazar por RefTarifaHabilitada
    tarifaAsignada: boolean;
    // TODO: refactor Tarifas — reemplazar por RefTarifaHabilitada
    idTarifa: string;
```
REEMPLAZAR:
```
    tarifasHabilitadas: RefTarifaHabilitada[] | null;
```

## PASO 3 — src/app/interfaces/proveedor.ts

3.1 BUSCAR:
```
    tarifasHabilitadas: RefTarifaHabilitada[];
    // TODO: refactor Tarifas — reemplazar por RefTarifaHabilitada
    tarifaAsignada: boolean;
    // TODO: refactor Tarifas — reemplazar por RefTarifaHabilitada
    idTarifa: string;
```
REEMPLAZAR:
```
    tarifasHabilitadas: RefTarifaHabilitada[];
```

## PASO 4 — src/app/servicios/clientes/cliente-factory.service.ts

4.1 BUSCAR:
```
      tarifasHabilitadas,
      tarifaAsignada: false,
      idTarifa: '',
```
REEMPLAZAR:
```
      tarifasHabilitadas,
```

## PASO 5 — src/app/servicios/choferes/chofer-factory.service.ts

5.1 BUSCAR:
```
      tarifasHabilitadas,
      tarifaAsignada: false,
      idTarifa: '',
```
REEMPLAZAR:
```
      tarifasHabilitadas,
```

## PASO 6 — src/app/servicios/proveedores/proveedor-factory.service.ts

6.1 BUSCAR:
```
      tarifasHabilitadas,
      tarifaAsignada: false,
      idTarifa: '',
```
REEMPLAZAR:
```
      tarifasHabilitadas,
```

## PASO 7 — src/app/servicios/migracion/cliente-migration.service.ts

7.1 BUSCAR:
```
        tarifaAsignada: datos.tarifaAsignada ?? false,
        idTarifa: datos.idTarifa !== undefined ? String(datos.idTarifa) : '',
        // TODO: migrar vendedor a string[] cuando se refactorice ese módulo
```
REEMPLAZAR:
```
        // TODO: migrar vendedor a string[] cuando se refactorice ese módulo
```

## PASO 8 — src/app/servicios/migracion/proveedor-migration.service.ts

8.1 BUSCAR:
```
        tarifaAsignada: datos.tarifaAsignada ?? false,
        idTarifa: datos.idTarifa !== undefined ? String(datos.idTarifa) : '',
        activo: true,
```
REEMPLAZAR:
```
        activo: true,
```

## PASO 9 — src/app/servicios/migracion/chofer-migration.service.ts

9.1 BUSCAR:
```
        tarifaAsignada: datos.tarifaAsignada ?? false,
        idTarifa: datos.idTarifa !== undefined ? String(datos.idTarifa) : '',
        activo: datos.activo ?? true,
```
REEMPLAZAR:
```
        activo: datos.activo ?? true,
```

## PASO 10 — src/app/raiz/choferes/choferes-alta/choferes-alta.component.ts

10.1 BUSCAR:
```
  condFiscal: string = "";
  tarifaAsignada: boolean = false;
  cargando: boolean = false;
```
REEMPLAZAR:
```
  condFiscal: string = "";
  cargando: boolean = false;
```

10.2 BUSCAR:
```
    if (this.fromParent.modo === "vista") {
      this.tarifaAsignada = this.chofer.tarifaAsignada;
      this.soloVista = true;
```
REEMPLAZAR:
```
    if (this.fromParent.modo === "vista") {
      this.soloVista = true;
```

10.3 BUSCAR:
```
    } else if (this.fromParent.modo === "edicion") {
      this.tarifaAsignada = this.chofer.tarifaAsignada;
      this.soloVista = false;
```
REEMPLAZAR:
```
    } else if (this.fromParent.modo === "edicion") {
      this.soloVista = false;
```

## PASO 11 — src/app/shared/modales/objeto-papelera/objeto-papelera.component.html

11.1 BUSCAR:
```
[value]="objeto.valoresNuevos?.cliente?.tarifaBase | formatearValor" >
```
REEMPLAZAR:
```
[value]="(objeto.valoresNuevos?.cliente?.tarifaBase ?? 0) * (objeto.multiplicadorCliente ?? 0) | formatearValor" >
```

11.2 BUSCAR:
```
[value]="objeto.valoresNuevos?.chofer?.tarifaBase | formatearValor" >
```
REEMPLAZAR:
```
[value]="(objeto.valoresNuevos?.chofer?.tarifaBase ?? 0) * (objeto.multiplicadorChofer ?? 0) | formatearValor" >
```

## Verificación

1. `grep -rn "tarifaAsignada" src/` → sin resultados.
2. `grep -rn "idTarifa" src/app/interfaces/cliente.ts src/app/interfaces/chofer.ts src/app/interfaces/proveedor.ts src/app/servicios/clientes/ src/app/servicios/choferes/ src/app/servicios/proveedores/ src/app/servicios/migracion/cliente-migration.service.ts src/app/servicios/migracion/chofer-migration.service.ts src/app/servicios/migracion/proveedor-migration.service.ts`
   → sin resultados.
3. `grep -c "tarifaBase ?? 0) \* (objeto.multiplicador" src/app/shared/modales/objeto-papelera/objeto-papelera.component.html` → 2.
4. `npm run build:demo` sin errores nuevos.
5. Mostrá el diff completo de los archivos editados.

## Pruebas manuales (demo)

1. Clientes → alta de un cliente nuevo: se crea; en Firestore el documento
   NO tiene `idTarifa` ni `tarifaAsignada` (sí `tarifasHabilitadas`).
   Editarlo y guardar: sin errores.
2. Lo mismo con un chofer (alta, vista y edición desde el listado) y con un
   proveedor.
3. Una operación con ese cliente/chofer: candidatos de tarifa y alta
   normales.
4. Papelera → detalle de una op dada de baja: "Tarifa Base" de cliente y de
   chofer = tarifaBase × multiplicador (coincide con lo que mostraba el
   modal de la op antes de la baja; con multiplicador 1, igual que antes).
5. /migracion: si usás la migración de entidades en demo, corre sin errores.

## Mensaje de commit

refactor(tarifas): fuera idTarifa/tarifaAsignada de Cliente, Chofer y Proveedor (TC11)

- Interfaces: retirados los campos legacy (reemplazados por
  tarifasHabilitadas desde TC1).
- Factories y servicios de migración de las tres entidades: dejan de
  escribirlos.
- choferes-alta: fuera el campo local tarifaAsignada sin uso.
- Papelera (detalle de op): Tarifa Base = valoresNuevos.<lado>.tarifaBase ×
  multiplicador del lado (pendiente de TC10).

FIN DE LA INSTRUCCIÓN TC11
````
