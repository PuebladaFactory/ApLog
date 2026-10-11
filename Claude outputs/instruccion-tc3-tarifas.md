````
INSTRUCCIÓN TC3 — Tarifas (cierre): versionado y baja con el log en la transacción
==================================================================================

Si no ves la línea "FIN DE LA INSTRUCCIÓN TC3" al final, el texto llegó
cortado: leé el archivo completo antes de empezar.

## Contexto y razonamiento

Regla de arquitectura del proyecto: negocio + log en el MISMO batch/
transacción (un log por gesto, LogRegistroService.agregarAlBatch). En
TarifarioService hay 4 métodos que no la cumplen:
  - nuevaVersionTarifa / nuevaVersionTarifaEspecial: usan
    DbFirestoreService.reemplazarConVersionNueva (runTransaction directo) y
    loguean DESPUÉS con registrarMutacionSuelta (best-effort, fuera de la
    transacción, sin diff);
  - darDeBajaTarifa / darDeBajaTarifaEspecial: db.update() directo + log
    suelto después, y sin releer la tarifa (no detecta si otra persona ya la
    dio de baja o la reemplazó).

Cambios:
1. Dos helpers privados en TarifarioService, sobre commitEnTransaccion:
   - versionarEnTransaccion: relee 'anterior' (leerEnTransaccion), aborta si
     no existe o ya no está activa, y arma 3 escrituras: versión nueva
     ('crear'), anterior → { activo: false, fechaActualizacion:
     vigenciaDesde de la nueva } ('actualizar', solo esos 2 campos — antes
     se re-escribía el documento entero), y el log EDITAR con `anterior`
     explícito → el log ahora trae el DIFF real de la versión nueva contra
     la anterior, sin lectura extra.
   - darDeBajaEnTransaccion: relee la tarifa, aborta si no existe o ya no
     está activa, 'actualizar' { activo: false, fechaActualizacion: hoy,
     actualizadoPor } + log BAJA en la misma transacción.
   idNuevo se genera UNA vez fuera de `armar` (armar tiene que ser puro y
   re-ejecutable: el SDK lo reintenta ante contención).
2. Los 4 métodos públicos delegan en esos helpers. Firmas sin cambios, así
   que TarifaGuardadoService y los componentes no se tocan; los mensajes de
   error siguen llegando al Swal por e.message.
3. Se borra DbFirestoreService.reemplazarConVersionNueva (sin otro caller).
4. Docblocks al día: los 2 que Claude Code marcó en TC2 (CandidatosLado y
   calcularValoresIniciales) y 2 de TarifarioService que decían "sin
   consumidor/escritura todavía".

Cambios de comportamiento visibles: el log de la baja pasa de EDITAR a BAJA,
y el de nueva versión gana el detalle de campos cambiados. La baja ahora
falla con mensaje si la tarifa ya no estaba vigente (antes la "volvía a dar
de baja" en silencio).

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto a BUSCAR no está, o aparece más de una vez: detenete y reportá.
- Aplicá los cambios de cada archivo EN ORDEN.
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md.

## PASO 0 — Verificación (sin modificar nada)

0.1 `grep -rn "reemplazarConVersionNueva" src/` → solo la definición en
    db-firestore.service.ts y 2 llamadas en tarifario.service.ts (ningún
    .spec.ts la usa).
0.2 db-firestore.service.ts tiene `commitEnTransaccion<R>(armar: (tx:
    Transaction) => Promise<{ escrituras: EscrituraBatch[]; resultado: R }>)`
    y `leerEnTransaccion<T>(tx, coleccion, id)`.
0.3 LogRegistroService.agregarAlBatch acepta un 6º parámetro opcional
    `anterior?: any` y 'BAJA' como acción.
0.4 tarifario.service.ts ya importa `EscrituraBatch` y `toISODateString`.
Si algo no coincide, DETENETE y reportá.

## PASO 1 — src/app/servicios/tarifario/tarifario.service.ts
(El BUSCAR va desde el docblock de nuevaVersionTarifa hasta el final de
darDeBajaTarifa, sin incluir el comentario "Escritura — TarifaEspecial".)

BUSCAR:
```
  /** Nueva versión de una tarifa existente: crea documento nuevo, desactiva el
   *  anterior — transaccional (DbFirestoreService.reemplazarConVersionNueva),
   *  no un batch ciego: relee 'anterior' fresco del server al momento de
   *  escribir y aborta si ya no está activo, en vez de confiar en el estado
   *  local cacheado como antes — eso es lo que podía generar una bifurcación
   *  de versionAnteriorId si dos ediciones caían casi al mismo tiempo (ver
   *  comentario en reemplazarConVersionNueva). El documento anterior NUNCA se
   *  toca en sus campos de valor (operaciones en curso pueden seguir
   *  referenciándolo). Devuelve el id nuevo — el caller es responsable de
   *  actualizar cualquier referencia que deba apuntar a la versión vigente
   *  (personalizada/especial: la entidad dueña; general: no aplica, se
   *  resuelve siempre vía getTarifaGeneralVigente()). */
  async nuevaVersionTarifa(idAnterior: string, tarifaNueva: Omit<Tarifa, 'idTarifa'>): Promise<string> {
    const idNuevo = this.db.generarId('tarifas');
    try {
      await this.db.reemplazarConVersionNueva('tarifas', idAnterior, idNuevo, this.toFirestoreTarifa(tarifaNueva));
    } catch (e: any) {
      await this.logRegistro.registrarError('EDITAR', 'tarifas', idNuevo, `Error: ${e?.message ?? e}`);
      throw e;
    }
    // Log fuera de la transacción — mismo criterio best-effort que
    // registrarAccion/registrarMutacionSuelta: es auditoría, no debe poder
    // tumbar el guardado real si falla (y agregarAlBatch tampoco aplicaba acá:
    // diffeaba contra 'tarifas/idNuevo', que todavía no existía al armar el
    // batch, así que nunca calculó un diff real para este caso puntual).
    await this.logRegistro.registrarMutacionSuelta(
      'EDITAR', 'tarifas', idNuevo, `Nueva versión de tarifa ${tarifaNueva.nombre} (reemplaza ${idAnterior})`,
    );
    return idNuevo;
  }

  /** Baja definitiva sin reemplazo: pone activo=false directo, sin crear ninguna
   *  versión nueva — para cuando una tarifa deja de tener validez porque la
   *  entidad cambió de modoTarifacion (categoría↔km) y por eso se cargó con
   *  crearTarifa() en vez de versionarse (nuevaVersionTarifa() solo aplica
   *  dentro del mismo linaje). No hace falta transacción: a diferencia de
   *  nuevaVersionTarifa(), acá no se crea ningún documento nuevo que dependa
   *  de que 'anterior' siga vigente — el peor caso de una carrera con una
   *  nuevaVersionTarifa() concurrente sobre la misma tarifa es que esa
   *  transacción relea activo=false y aborte con su propio error (correcto:
   *  ya no correspondía versionarla). Irreversible por diseño — no hay
   *  reactivar: si hace falta volver al modo anterior, se carga una tarifa
   *  nueva. */
  async darDeBajaTarifa(idTarifa: string, actualizadoPor: string): Promise<void> {
    const data = { activo: false, fechaActualizacion: toISODateString(new Date()), actualizadoPor };
    try {
      await this.db.update('tarifas', data, idTarifa);
    } catch (e: any) {
      await this.logRegistro.registrarError('EDITAR', 'tarifas', idTarifa, `Error al dar de baja: ${e?.message ?? e}`);
      throw e;
    }
    await this.logRegistro.registrarMutacionSuelta('EDITAR', 'tarifas', idTarifa, 'Baja de tarifa sin reemplazo');
  }
```
REEMPLAZAR:
```
  /** Nueva versión de una tarifa existente (append-only): crea el documento
   *  nuevo y desactiva el anterior en UNA transacción (commitEnTransaccion),
   *  con el log adentro. Relee 'anterior' fresco del server y aborta si ya no
   *  está activo — protege contra la bifurcación de versionAnteriorId cuando
   *  dos ediciones de la misma tarifa caen casi al mismo tiempo (el SDK
   *  reintenta la transacción si hay escritura concurrente sobre el mismo
   *  documento). El documento anterior NUNCA se toca en sus campos de valor
   *  (operaciones en curso pueden seguir referenciándolo): solo activo=false
   *  y fechaActualizacion = vigenciaDesde de la nueva (el instante en que una
   *  deja de aplicar es el mismo en que empieza la otra). El log diffea la
   *  versión nueva contra la anterior. Devuelve el id nuevo. */
  async nuevaVersionTarifa(idAnterior: string, tarifaNueva: Omit<Tarifa, 'idTarifa'>): Promise<string> {
    return this.versionarEnTransaccion(
      'tarifas', idAnterior, this.toFirestoreTarifa(tarifaNueva),
      `Nueva versión de tarifa ${tarifaNueva.nombre} (reemplaza ${idAnterior})`,
    );
  }

  /** Baja definitiva sin reemplazo (activo=false, sin versión nueva) — para
   *  cuando una tarifa deja de tener validez porque la entidad cambió de
   *  modoTarifacion (categoría↔km) y la nueva se cargó con crearTarifa().
   *  Transacción con log adentro: relee la tarifa y aborta si ya no está
   *  activa (dada de baja o reemplazada por otra persona). Irreversible por
   *  diseño — no hay reactivar: si hace falta volver, se carga una tarifa
   *  nueva. */
  async darDeBajaTarifa(idTarifa: string, actualizadoPor: string): Promise<void> {
    await this.darDeBajaEnTransaccion('tarifas', idTarifa, actualizadoPor, 'Baja de tarifa sin reemplazo');
  }

  // ── Escritura — piezas comunes de versionado/baja (Tarifa y TarifaEspecial) ──

  /** Versionado transaccional compartido por nuevaVersionTarifa y
   *  nuevaVersionTarifaEspecial (TC3 — reemplaza a
   *  DbFirestoreService.reemplazarConVersionNueva, que dejaba el log afuera,
   *  best-effort). `armar` es puro y re-ejecutable: solo lee 'anterior' y
   *  arma las escrituras; idNuevo se genera una sola vez afuera. */
  private async versionarEnTransaccion(
    coleccion: 'tarifas' | 'tarifasEspeciales',
    idAnterior: string,
    dataNueva: any,
    detalleLog: string,
  ): Promise<string> {
    const idNuevo = this.db.generarId(coleccion);
    try {
      await this.db.commitEnTransaccion<void>(async (tx) => {
        const anterior = await this.db.leerEnTransaccion<any>(tx, coleccion, idAnterior);
        if (!anterior) {
          throw new Error(`No se encontró la tarifa ${idAnterior} para versionar.`);
        }
        if (anterior.activo === false) {
          throw new Error('Esta tarifa ya fue actualizada por otra persona mientras la estabas editando. Recargá la página para ver la versión vigente antes de volver a guardar.');
        }
        // — fin de lecturas —

        const escrituras: EscrituraBatch[] = [
          { coleccion, id: idNuevo, data: dataNueva, modo: 'crear' },
          {
            coleccion, id: idAnterior, modo: 'actualizar',
            data: { activo: false, fechaActualizacion: dataNueva.vigenciaDesde },
          },
        ];
        // `anterior` explícito: diff de la versión nueva contra la anterior,
        // sin lectura extra fuera de la transacción.
        await this.logRegistro.agregarAlBatch(escrituras, 'EDITAR', coleccion, idNuevo, detalleLog, anterior);
        return { escrituras, resultado: undefined };
      });
      return idNuevo;
    } catch (e: any) {
      await this.logRegistro.registrarError('EDITAR', coleccion, idNuevo, `Error: ${e?.message ?? e}`);
      throw e;
    }
  }

  /** Baja sin reemplazo compartida por darDeBajaTarifa y
   *  darDeBajaTarifaEspecial (TC3). Log BAJA en la misma transacción. */
  private async darDeBajaEnTransaccion(
    coleccion: 'tarifas' | 'tarifasEspeciales',
    idTarifa: string,
    actualizadoPor: string,
    detalleLog: string,
  ): Promise<void> {
    try {
      await this.db.commitEnTransaccion<void>(async (tx) => {
        const actual = await this.db.leerEnTransaccion<any>(tx, coleccion, idTarifa);
        if (!actual) {
          throw new Error(`No se encontró la tarifa ${idTarifa}.`);
        }
        if (actual.activo === false) {
          throw new Error('Esta tarifa ya no está vigente (fue dada de baja o reemplazada por otra persona). Recargá la página.');
        }
        // — fin de lecturas —

        const escrituras: EscrituraBatch[] = [
          {
            coleccion, id: idTarifa, modo: 'actualizar',
            data: { activo: false, fechaActualizacion: toISODateString(new Date()), actualizadoPor },
          },
        ];
        await this.logRegistro.agregarAlBatch(escrituras, 'BAJA', coleccion, idTarifa, detalleLog);
        return { escrituras, resultado: undefined };
      });
    } catch (e: any) {
      await this.logRegistro.registrarError('BAJA', coleccion, idTarifa, `Error al dar de baja: ${e?.message ?? e}`);
      throw e;
    }
  }
```

## PASO 2 — src/app/servicios/tarifario/tarifario.service.ts
(El BUSCAR cubre nuevaVersionTarifaEspecial y darDeBajaTarifaEspecial, sin
incluir el comentario "Escritura — RegistroOpEventual".)

BUSCAR:
```
  async nuevaVersionTarifaEspecial(idAnterior: string, tarifaNueva: Omit<TarifaEspecial, 'idTarifa'>): Promise<string> {
    const idNuevo = this.db.generarId('tarifasEspeciales');
    try {
      await this.db.reemplazarConVersionNueva('tarifasEspeciales', idAnterior, idNuevo, this.toFirestoreTarifaEspecial(tarifaNueva));
    } catch (e: any) {
      await this.logRegistro.registrarError('EDITAR', 'tarifasEspeciales', idNuevo, `Error: ${e?.message ?? e}`);
      throw e;
    }
    await this.logRegistro.registrarMutacionSuelta(
      'EDITAR', 'tarifasEspeciales', idNuevo, `Nueva versión de tarifa especial ${tarifaNueva.nombre} (reemplaza ${idAnterior})`,
    );
    return idNuevo;
  }

  async darDeBajaTarifaEspecial(idTarifa: string, actualizadoPor: string): Promise<void> {
    const data = { activo: false, fechaActualizacion: toISODateString(new Date()), actualizadoPor };
    try {
      await this.db.update('tarifasEspeciales', data, idTarifa);
    } catch (e: any) {
      await this.logRegistro.registrarError('EDITAR', 'tarifasEspeciales', idTarifa, `Error al dar de baja: ${e?.message ?? e}`);
      throw e;
    }
    await this.logRegistro.registrarMutacionSuelta('EDITAR', 'tarifasEspeciales', idTarifa, 'Baja de tarifa especial sin reemplazo');
  }
```
REEMPLAZAR:
```
  async nuevaVersionTarifaEspecial(idAnterior: string, tarifaNueva: Omit<TarifaEspecial, 'idTarifa'>): Promise<string> {
    return this.versionarEnTransaccion(
      'tarifasEspeciales', idAnterior, this.toFirestoreTarifaEspecial(tarifaNueva),
      `Nueva versión de tarifa especial ${tarifaNueva.nombre} (reemplaza ${idAnterior})`,
    );
  }

  async darDeBajaTarifaEspecial(idTarifa: string, actualizadoPor: string): Promise<void> {
    await this.darDeBajaEnTransaccion('tarifasEspeciales', idTarifa, actualizadoPor, 'Baja de tarifa especial sin reemplazo');
  }
```

## PASO 3 — src/app/servicios/tarifario/tarifario.service.ts
BUSCAR:
```
   *  más motivo: el alcance ('entidad' vs 'entidadCliente') ya habilita
   *  múltiples activas por diseño. Sin consumidor todavía (Bloque 4). */
```
REEMPLAZAR:
```
   *  más motivo: el alcance ('entidad' vs 'entidadCliente') ya habilita
   *  múltiples activas por diseño. */
```

## PASO 4 — src/app/servicios/tarifario/tarifario.service.ts
BUSCAR:
```
   *  configuración vigente). Sin escritura todavía — el registro se crea al
   *  cerrar la operación, Bloque 6/7; hasta entonces esto siempre devuelve
   *  vacío. */
```
REEMPLAZAR:
```
   *  configuración vigente). Los registros los crea el cierre de una
   *  operación eventual (y la migración del historial viejo). */
```

## PASO 5 — src/app/servicios/database/db-firestore.service.ts
(Borra reemplazarConVersionNueva completo con su docblock. El BUSCAR
termina en el cierre del método, sin incluir el docblock de setDocSinId.)

BUSCAR:
```
  /** Reemplaza 'anterior' por una versión nueva de forma TRANSACCIONAL — la
   *  protección de idempotencia que el TODO de commitBatch() deja pendiente
   *  para cuando haga falta, aplicada acá porque tarifas-historial demostró
   *  que hacía falta: dos ediciones concurrentes de la misma entidad (dos
   *  pestañas, dos usuarios) podían generar dos documentos nuevos apuntando
   *  al mismo 'anterior' (bifurcación de versionAnteriorId) porque
   *  nuevaVersionTarifa() decidía si 'anterior' seguía vigente mirando el
   *  estado LOCAL cacheado, no el server. Acá se relee 'anterior' fresco
   *  dentro de la transacción — si ya no está activo, aborta con un error
   *  legible en vez de crear la bifurcación. El SDK reintenta la transacción
   *  sola si detecta una escritura concurrente sobre el mismo documento, así
   *  que la protección es real incluso si dos llamadas caen exactamente al
   *  mismo tiempo. */
  async reemplazarConVersionNueva(
    coleccion: string,
    idAnterior: string,
    idNuevo: string,
    dataNueva: any,
  ): Promise<void> {
    await runTransaction(this.firestore, async (transaction) => {
      const refAnterior = doc(this.firestore, `/Vantruck/datos/${coleccion}/${idAnterior}`);
      const snapAnterior = await transaction.get(refAnterior);
      if (!snapAnterior.exists()) {
        throw new Error(`No se encontró el documento ${idAnterior} en ${coleccion} para versionar.`);
      }
      const anteriorData = snapAnterior.data();
      if (anteriorData['activo'] === false) {
        throw new Error('Esta tarifa ya fue actualizada por otra persona mientras la estabas editando. Recargá la página para ver la versión vigente antes de volver a guardar.');
      }
      const refNuevo = doc(this.firestore, `/Vantruck/datos/${coleccion}/${idNuevo}`);
      transaction.set(refNuevo, dataNueva);
      // fechaActualizacion de la anterior pasa a ser la vigenciaDesde de la
      // nueva — el instante en que una deja de aplicar es el mismo en que
      // empieza a aplicar la otra, no hace falta un dato aparte.
      transaction.set(refAnterior, { ...anteriorData, activo: false, fechaActualizacion: dataNueva.vigenciaDesde });
    });
  }
```
REEMPLAZAR:
```
  // (TC3: reemplazarConVersionNueva retirado — el versionado de tarifas pasó a
  // TarifarioService.versionarEnTransaccion, sobre commitEnTransaccion con el
  // log adentro.)
```

## PASO 6 — src/app/servicios/tarifario/valores-tarifa.service.ts
BUSCAR:
```
/** Resultado de listar candidatos de un lado (cliente o chofer/proveedor) en el nivel
 *  de jerarquía que ganó (Personalizada > Especial > General). Con 1 candidato la UI
 *  puede autoseleccionar; con 2+ el usuario elige. */
```
REEMPLAZAR:
```
/** Resultado de listar candidatos de un lado (cliente o chofer/proveedor): todos
 *  los vigentes de los niveles HABILITADOS de la entidad. nivelResuelto es el nivel
 *  del candidato cuando hay exactamente uno (null con 0 o 2+). Con 1 candidato la
 *  UI autoselecciona; con 2+ el usuario elige. */
```

## PASO 7 — src/app/servicios/operaciones/operacion.service.ts
BUSCAR:
```
  /** Copia op.valoresNuevos (calculado por ValoresTarifaService.calcularAlta,
   *  que corre ANTES en el loop de altaDesdeAsignacion) a la estructura vieja
   *  op.valores — única fuente de valores desde Bloque 7 Paso 2. Si
   *  valoresNuevos quedó en null (algún lado no se pudo resolver — ya
   *  registrado en el log de actividad por altaDesdeAsignacion) op.valores
   *  queda en los ceros que trae crearOperacionBase. */
```
REEMPLAZAR:
```
  /** Copia op.valoresNuevos (calculado por ValoresTarifaService.calcularAlta,
   *  que corre ANTES en el loop de altaDesdeAsignacion) a la estructura vieja
   *  op.valores. Desde TC2 el alta se aborta si valoresNuevos no se pudo
   *  calcular, así que acá siempre llega poblado; el if es defensivo (si
   *  faltara, op.valores queda en los ceros de crearOperacionBase). */
```

## Verificación

1. `grep -rn "reemplazarConVersionNueva(" src/` → sin resultados (el nombre
   queda solo en 2 comentarios que explican el retiro).
2. `grep -n "registrarMutacionSuelta" src/app/servicios/tarifario/tarifario.service.ts` → sin resultados.
3. `grep -c "this.db.commitEnTransaccion" src/app/servicios/tarifario/tarifario.service.ts` → 2.
4. `grep -n "Sin consumidor todavía\|Sin escritura todavía" src/app/servicios/tarifario/tarifario.service.ts` → sin resultados.
5. `npm run build:demo` sin errores nuevos.
6. Mostrá el diff completo de los 4 archivos.

## Pruebas manuales (demo)

1. Tarifas → General → Editar y guardar: nueva versión vigente, la anterior
   queda inactiva; el Historial muestra ambas. Ajustes → Registro: un único
   log EDITAR con el detalle de campos cambiados.
2. Ídem con Aumentar (General y Personalizada) y con Editar/Aumentar una
   Especial.
3. Personalizada y Especial → Dar de baja: queda inactiva; log BAJA.
4. Concurrencia: abrir la misma Personalizada en 2 pestañas, guardar una
   edición en la primera y después, en la segunda y sin recargar, intentar
   Editar → Guardar (o Dar de baja) → mensaje de error ("ya fue actualizada
   por otra persona" / "ya no está vigente"), sin crear nada.
5. Alta de una operación con la tarifa recién versionada: usa la versión
   nueva.

## Mensaje de commit

refactor(tarifas): versionado y baja con el log en la transacción (TC3)

- TarifarioService: versionarEnTransaccion y darDeBajaEnTransaccion sobre
  commitEnTransaccion — relectura + validación de vigencia + negocio + log
  en la misma transacción (EDITAR con diff contra la versión anterior;
  BAJA). La versión anterior se actualiza solo en activo/fechaActualizacion.
- DbFirestoreService.reemplazarConVersionNueva retirado.
- Docblocks al día (TarifarioService, CandidatosLado,
  calcularValoresIniciales).

FIN DE LA INSTRUCCIÓN TC3
````
