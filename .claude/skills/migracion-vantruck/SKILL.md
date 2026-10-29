---
name: migracion-vantruck
description: Checklists y deuda pendiente de ApLog para migrar datos y deployar en producción (Vantruck, proyecto pf-logistics) — región de Cloud Functions, bucket de Storage, tarifas y eventuales, choferes/vehículos/legajos y fechas de nacimiento. Leer antes de planificar o ejecutar la migración, un deploy a pf-logistics o cualquier herramienta de /migracion que toque datos de producción.
---

## Estrategia de migración — sin decidir

La forma de la migración todavía no está definida. Opciones en análisis:

- **Migración en el mismo proyecto**: migrar los datos de Vantruck a la estructura nueva y
  hacer el switch en el proyecto existente.
- **Proyecto nuevo en paralelo**: crear un proyecto Firebase nuevo donde corra el código
  nuevo, dejando Vantruck en funcionamiento como respaldo de hecho y como camino de vuelta
  si la versión nueva falla en producción con algo que no apareció en la simulación. Permite
  tener las dos versiones corriendo a la vez para comparar resultados.

Nada de lo que sigue asume una de las dos. Cuando se decida, revisar esta skill completa.

## Lo que existe sólo en `main`

`refactor` no se va a fusionar con `main`: el código de `main` está escrito contra campos que
el refactor eliminó (`tarifaTipo`, `op.valores`, `acompanienteCant`, `facturaCliente` /
`facturaChofer`), así que no compila contra el modelo nuevo. La promoción va a ser un
**reemplazo de rama**, no un merge.

Consecuencia: en el momento del reemplazo se pierde todo lo que exista sólo en `main`, salvo
lo que se haya pasado explícitamente. Esta tabla es ese inventario.

**Mantenerla al día: cada hotfix que se haga directo sobre `main` agrega una fila acá.**

Para regenerar la lista: `git log --oneline refactor..main`

| Commit | Qué hace | Decisión |
|---|---|---|
| `98edb35` — `feat(ajustes): recálculo de tarifa por cliente y período` | Herramienta en Configuración (solo rol god) que recalcula las operaciones de un cliente y período contra su tarifa vigente, con vista previa y simulacro. Corrió en producción: Logistica Patagonia S.A., octubre 2026, 59 operaciones por $1.148.100 y 7 informes de liquidación ajustados. | **A portar y rediseñar.** Ver "Deuda abierta — herramienta de recálculo de tarifas" más abajo. |
| `98edb35` (segunda parte del mensaje) — `fix(papelera): restaurar operaciones a su forma de alta real` | `resetearOperacionAFormaDeAlta()` y una guarda que bloquea la restauración si quedan `InformeOp` huérfanos. | **Ya cubierto.** `refactor` tiene su equivalente en `5672836`. El problema de huérfanos no se da en el modelo nuevo. |
| `3378cc7` — `fix: ignorar node_modules en cualquier nivel del repo` | Regla de `.gitignore`. | **Portado** (ver `.gitignore` en `refactor`). |
| `74ca1eb` — `Merge hotfix errorProveedores: tarifa proveedor en cierre` y `8fec196` — `fix(tarifas): cierre de op con tarifa vigente de chofer/proveedor` | Al actualizar la tarifa especial de un proveedor no se actualizaba la referencia de sus choferes ni sus tarifas, lo que afectaba la obtención de la tarifa en el cálculo del cierre. | **No aplica.** Son defectos del modelo viejo de tarifas y de cálculo. El modelo nuevo reescribió la resolución completa (`RefTarifaHabilitada`, `TarifaEspecial` como patch, `ResolucionTarifaOpService`), así que no se reproducen. |

### Checklist — migración de Tarifas a Vantruck
Después del backup completo y de deployar este código en `pf-logistics`:
1. Reglas: `tarifas`, `tarifasEspeciales` ('tarifas') y `registrosOpEventuales`
   ('informesOp'; sin esta, `user` no puede cerrar una eventual).
2. Auditar en `/migracion` las colecciones viejas de tarifas y
   `Vehiculo.categoria.nombre` contra la General; corregir los vehículos antes de
   cargar Especiales de chofer/proveedor.
3. Entidades: `migrar<Entidad>()` y DESPUÉS `migrarTarifasHabilitadas()`; revisar a
   mano los niveles habilitados que quedaron.
4. Tarifas, a mano con los forms (rol dev, `vigenciaDesde` retroactiva): General (el
   linaje se arma con el volcado histórico), Especiales y Personalizadas, en orden
   cronológico real (la vigencia por fecha depende de eso).
5. Eventual: previsualizar y confirmar → `registrosOpEventuales`. ANTES, corregir el
   parseo de `fecha` en `TarifaMigrationService` (decisión D7 del frente Lazy loading +
   fechas): en `tarifasEventuales` de Vantruck `fecha` es un string 'YYYY-MM-DD' y el
   código actual lo pasa por `Date` y lo deja un día antes; tomar el string tal cual.
   Revisar contra la fecha de su operación los 214 registros ya migrados en demo.
6. Operaciones: método de migración propio (por diseñar), con entidades, vehículos y
   tarifas nuevos ya cargados: cada op vieja → `tarifaAplicada*` /
   `datosTarifaEventual` / `valoresNuevos` / `adExtra`, sin `valores`, `tarifaTipo`,
   `datosTarifaPersonalizada` ni `adExtraConcepto`. Recién después, Recálculo de
   `resumenesOp` y de comisiones (sin `valoresNuevos`, la op es un error y bloquea).
7. Entidades: borrar `idTarifa` y `tarifaAsignada` (`deleteField`).
8. Al terminar, con backup: borrar las colecciones viejas de tarifas (7 vigentes, 7
   historiales, `tarifasEventuales` y `tarifasChofer`/`tarifasCliente`/
   `tarifasProveedor`), sus mapeos en `firestore.rules`, `TarifaMigrationService` y
   su sección de `/migracion`, y los `_backup_*` de entidades que usa.

### Checklist — migración a Vantruck: frente Lazy loading + fechas
Después del backup completo y de deployar este código en `pf-logistics`:
1. **Cloud Functions:** deployar `verificarVencimientosDocumentacion` con la regla
   nueva (D1) y forzar una corrida. Recalcula el estado de todos los legajos y la
   colección `vencimientos`.
2. **Budget:** agregar a la configuración `vantruck` de `angular.json` el budget del
   inicial (aviso 2 MB, error 3 MB), y actualizar o quitar el de `production`
   (6 / 7 MB).
3. **Eventuales (D7):** ver "Checklist — migración de Tarifas a Vantruck", paso 5.
4. **Legajos (FL4):** ver "Deuda — migración a Vantruck: Choferes/Vehículos/Legajos"
   → fechas de vencimiento.
5. **Producción hoy (`main`, D10; revisado sin tocar):**
   - FV1: el Legajos viejo vence a las 21:00 del día anterior (estado calculado en el
     cliente con `new Date(fechaVto)`, umbral de 30 días);
   - FV2: "Últimos 12 meses" de Reportes da 11 meses los días 31.
   Los dos se corrigen solos con la migración (Vantruck pasa a correr este código). Al
   migrar, avisar al usuario que "por vencer" pasa de 30 a 45 días.
6. **Supabase:** decidir qué hacer con las facturas históricas (ver la skill
   `modulo-facturacion`, subsección "Deuda abierta — Facturación") y rotar las anon keys.

### Checklist — migración a Vantruck: frente Ficha de entidad
Después del backup completo y de migrar `choferes` (incluida la papelera):
1. `/migracion` → "Fecha de nacimiento de choferes": simular, ejecutar (id
   `pf-logistics`) y corregir a mano los que queden en "revisar" (editando el chofer).
2. Sin reglas ni índices nuevos: la ficha solo lee colecciones que ya están mapeadas.

## Deuda abierta — alinear región de Cloud Functions en `pf-logistics`/Vantruck

Al agregar `verificarVencimientosDocumentacion` (ver "Cloud Functions"), todo el
codebase de funciones se alineó a `southamerica-east1` vía `setGlobalOptions`. Esto
solo se deployó contra `demoapplog` (`--project demo`) hasta ahora. Cuando este mismo
frente (o cualquier deploy de funciones) se lleve a `pf-logistics`/Vantruck, las 5
funciones ya existentes ahí (`syncRoleClaim` + las 4 de `gestionUsuarios`, corriendo en
la región default) también van a requerir delete + recreate para adoptar la región
nueva — ahí sí es un corte real en producción (a diferencia de `demo`, sin ventana de
riesgo). Coordinar el momento del deploy con el desarrollador, en una franja que no
afecte operación real, y no asumir que puede hacerse en cualquier momento como en demo.

⚠️ **Hallazgo (sesión de diseño del frente Log, ago-2026): esta desalineación ya tenía
un bug real en el cliente, preexistente, sin relación con el frente de Log.** El SDK
cliente (`app.module.ts`, `provideFunctions(() => getFunctions())`) nunca leyó región
— quedó en el default `us-central1` desde siempre, mientras las funciones de gestión de
usuarios (`crearUsuario`/`editarUsuario`/`editarEmailUsuario`/`eliminarUsuario`) corren
en `southamerica-east1` en `demoapplog` desde que se hizo el realineamiento de arriba.
Efecto real: toda llamada `httpsCallable` a esas 4 funciones desde la app en `demo`
fallaba con 404/CORS (la URL que arma el SDK sin región explícita apunta a
`us-central1-demoapplog.cloudfunctions.net`, donde esas funciones no existen).
Confirmado el bug Y el fix con el emulador de Functions — a diferencia del emulador de
Firestore con Security Rules (que ignora reglas de acceso reales), el de Functions SÍ
reproduce esto: cada función se registra en una ruta HTTP con la región como parte del
path (`http://127.0.0.1:5001/{proyecto}/{region}/{nombre}`), así que pedir la región
equivocada falla ahí también (`functions/not-found`) — ver
`functions/test-functions-region.mjs`, 2/2 checks: sin región → `not-found`; con
`southamerica-east1` → la llamada llega y responde OK.

**Fix aplicado:** el SDK cliente ahora lee la región desde `environment.functionsRegion`
(`src/environments/environment.model.ts`, interfaz `Environment` compartida por los 3
environments — `functionsRegion` es opcional a propósito) —
`provideFunctions(() => getFunctions(undefined, environment.functionsRegion))` en
`app.module.ts`. `environment.ts`/`environment.prod.ts` (ambos apuntan a `demoapplog`):
`functionsRegion: 'southamerica-east1'`. `environment.vantruck.ts`: la propiedad queda
**ausente a propósito** (ni siquiera `undefined` explícito — directamente no declarada,
válido porque es opcional en `Environment`) hasta que la deuda de arriba se pague
(realineación de `pf-logistics` a `southamerica-east1`) — con `functionsRegion:
undefined`, `getFunctions(undefined, undefined)` cae al comportamiento actual sin
cambios, cero riesgo para Vantruck. **Al pagar esa deuda: agregar `functionsRegion:
'southamerica-east1'` a `environment.vantruck.ts`** (mismo valor que los otros dos) —
es el único paso que falta del lado cliente, todo lo demás ya está armado para leerlo.

## Deuda abierta — verificar bucket de Storage de `pf-logistics` antes de migrar a Vantruck

El mismo gap encontrado en demo (bucket de Storage nunca creado pese a que el SDK config
ya reporta un `storageBucket` válido) puede repetirse en `pf-logistics`/Vantruck — un
nombre correcto en `environment.vantruck.ts` NO es evidencia de que el bucket realmente
exista. Antes de que Legajos (o cualquier otro módulo que use `StorageArchivosService`)
llegue a producción: confirmar que el bucket existe de verdad (no solo por el nombre en
config), que tiene CORS configurado para los dominios reales de Vantruck, y que
`storage.rules` está desplegado ahí — mismas tres piezas verificadas en demo, ver
la skill `modulo-legajos` para el detalle completo de por qué las tres son necesarias
por separado. Aprovechar para confirmar también que la región del bucket de demo
(`SOUTHAMERICA-EAST1`, elegida sin una referencia real al momento de crearlo) coincide
con la de `pf-logistics` — si no coincide, no es un bloqueante pero vale la pena
saberlo antes de migrar.

## Deuda abierta — migración a Vantruck: Choferes/Vehículos/Legajos (y Proveedores/Choferes-de-proveedor/Vehículos/Legajos) deben migrarse en un mismo proceso, no por colección aislada

Detectado durante el chequeo de datos del frente de refactor de Legajos (Bloque 3.5,
Agosto 2026), al cruzar `choferes` vs `legajos` en `demoapplog`: los legajos con
`idChofer` en esquema legacy (numérico, ej. `1737721846747`) no matchean contra los
choferes actuales (IDs de Firestore, ej. `0Uf2a9vefe875nscHT0t`) — arrastre de una
migración de IDs anterior, no relacionado a permisos ni al frente de Legajos en sí.

**Implicancia real para la migración de datos de producción a Vantruck (pendiente, no
iniciada):** no alcanza con migrar `choferes`, `vehiculos` y `legajos` como tres
colecciones independientes en tres pasadas separadas — sus IDs legacy se resuelven por
relación cruzada entre colecciones, no por transformación aislada de cada una. Mismo
problema, en espejo, para el lado de `proveedores` → choferes de proveedor → vehículos →
legajos.

**Secuencia correcta para este bloque de migración** (a definir en detalle cuando se
encare, pero el orden de dependencia ya es claro):
1. Backup de las colecciones involucradas (`choferes`, `vehiculos`, `legajos`,
   `proveedores`), como todo backup de migración del proyecto.
2. Migrar `choferes` primero (o `proveedores`, según el lado), generando los IDs nuevos
   de Firestore.
3. Con los choferes/proveedores ya migrados y su mapeo id-viejo → id-nuevo disponible
   (posiblemente trazado guardando el id nuevo en el documento de backup del id viejo,
   o alguna tabla de mapeo auxiliar), recién ahí migrar `legajos`, resolviendo
   `idChofer` legacy → `idChofer` nuevo por algún campo estable de cruce (CUIT es el
   candidato natural, dado que es el identificador de negocio que no cambia entre
   esquemas — a confirmar contra los datos reales si alcanza para un match 1:1 sin
   ambigüedad).
4. `vehiculos` tiene la misma dependencia (se resuelve contra el chofer/proveedor ya
   migrado), y probablemente conviene resolverse en el mismo proceso.

**Fechas de vencimiento (FL4, frente Lazy loading + fechas):** `LegajoMigracionService`
convierte una `fechaVto` vieja en milisegundos con `toISOString()` (fecha UTC). Es correcto
solo si el valor era medianoche de Argentina; revisarlo contra los datos reales de Vantruck
antes de migrar (el Legajos viejo guardaba `new Date(fecha).getTime()`, 00:00 UTC).

**No es deuda del modelo de datos de Legajos en sí** (ese frente ya resuelve el modelo
correcto hacia adelante) — es deuda del PROCESO de migración de datos legacy de
producción, que corre aparte y más adelante, cuando se aborde el traspaso completo a
Vantruck. Registrado acá para que no se pierda de vista al planificar ese proceso.

## Deuda abierta — herramienta de recálculo de tarifas

Existe en `main` (`98edb35`) y no en `refactor`. Funcionalidad en producción, usada sobre
datos reales.

**Por qué se escribió:** el cierre tomaba la tarifa vigente al momento de cerrar y no la
vigente a la fecha de la operación, así que un aumento cargado a mitad de mes dejaba las
operaciones ya cerradas valorizadas con la tarifa anterior.

**Por qué sigue haciendo falta aunque esa causa esté resuelta:** el modelo nuevo resuelve la
tarifa por la fecha de la operación, así que el desfasaje no se genera solo. Pero
`RefTarifaAplicada` queda congelada al cerrar: si se carga una tarifa con vigencia
retroactiva, las operaciones ya cerradas conservan el valor congelado y nada las corrige.

**Qué hay que hacer:** reimplementarla sobre el modelo nuevo (`RefTarifaAplicada`,
`valoresNuevos`, `resumenesOp`), no portar la versión de `main`, que además está incompleta
respecto del diseño que el modelo nuevo necesita. Conservar del original los criterios que
siguen siendo válidos: vista previa obligatoria antes de escribir, escritura atómica por
operación, idempotencia y reejecución, bloqueo de operaciones con proforma o con el lado
cliente ya liquidado, y control de concurrencia por fila.
