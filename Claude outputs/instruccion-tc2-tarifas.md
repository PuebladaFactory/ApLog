````
INSTRUCCIÓN TC2 — Tarifas (cierre): el alta exige la tarifa elegida
====================================================================

Si no ves la línea "FIN DE LA INSTRUCCIÓN TC2" al final, el texto llegó
cortado: leé el archivo completo antes de empezar.

## Contexto y razonamiento

ValoresTarifaService.calcularAlta tenía un camino automático
(`resolverLado` + `resolverEnCandidatas`) para cuando una operación llegaba
al alta sin `tarifaAplicadaCliente`/`tarifaAplicadaChofer`. Ese camino:
  - cae a la tarifa General aunque 'general' NO esté en tarifasHabilitadas
    (y también cuando la Especial no cubre la categoría del vehículo);
  - contradice la regla vigente desde el 15/09 en listarCandidatosLado (sin
    fallback implícito entre niveles);
  - en la práctica no se ejecuta: los 3 callers de altaDesdeAsignacion
    llegan siempre con las referencias elegidas:
      * tablero-asignaciones y carga-asignacion pasan por
        operaciones-editor, que bloquea el alta sin referencias
        (validarOperacion);
      * el generador de pruebas descarta la operación si resolverTarifas no
        resuelve.

Decisión (T3-b): el alta EXIGE las referencias. Cambios:
1. calcularAlta deja de resolver jerarquía. Si falta una referencia (y la op
   no es eventual), devuelve el motivo en `errores` con valoresNuevos en
   null. Se conserva el espejo defensivo de Personalizada (cliente →
   chofer). Si armarValoresNuevos devuelve null (tarifa o
   sección/categoría no encontrada en memoria), también es error.
2. Se borran resolverLado y resolverEnCandidatas (código sin otro caller).
   El servicio deja de usar ClienteService y ProveedorService: se quitan
   del constructor y de los imports.
3. altaDesdeAsignacion: si calcularAlta devuelve errores, ABORTA el alta
   completa con Resultado exito:false (mismo patrón que el chequeo de
   contratación que ya hay en el mismo loop, que corre antes de tocar la
   red). Antes solo se logueaba y la op quedaba guardada con valoresNuevos
   en null, y fallaba recién al cerrarla.
4. Comentarios al día en ValoresTarifaService, interfaces/operacion.ts,
   interfaces/ref-tarifa-aplicada.ts y operacion-cabecera (mencionaban la
   resolución automática en el alta).

calcularCierre, listarCandidatosLado, resolverSeccionCategoria,
armarRefManual y el cálculo NO cambian.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto a BUSCAR no está, o aparece más de una vez: detenete y reportá.
- Aplicá los cambios de cada archivo EN ORDEN.
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md.

## PASO 0 — Verificación (sin modificar nada)

0.1 `grep -rn "resolverLado\|resolverEnCandidatas" src/app` → solo en
    src/app/servicios/tarifario/valores-tarifa.service.ts.
0.2 `grep -rn "calcularAlta(" src/app --include=*.ts` → la definición en
    valores-tarifa.service.ts y una sola llamada, en
    src/app/servicios/operaciones/operacion.service.ts (altaDesdeAsignacion).
0.3 En valores-tarifa.service.ts, `clienteServ` y `proveedorServ` se usan
    SOLO dentro de calcularAlta (no en otro método del servicio).
0.4 `grep -rn "new ValoresTarifaService" src/app` → sin resultados (nadie
    construye el servicio a mano; el cambio de constructor no rompe specs ni
    llamadas).
Si algo no coincide, DETENETE y reportá.

## PASO 1 — src/app/servicios/tarifario/valores-tarifa.service.ts
BUSCAR:
```
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
```
REEMPLAZAR:
```
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
```

## PASO 2 — src/app/servicios/tarifario/valores-tarifa.service.ts
BUSCAR:
```
/** Resolución de jerarquía + cálculo del sistema NUEVO de Tarifas (Bloque 6).
 *  Corre en paralelo al sistema viejo (ValoresOpService / op.tarifaTipo /
 *  op.valores) sin tocarlo ni reemplazarlo — completa exclusivamente
 *  op.tarifaAplicadaCliente/Chofer y op.valoresNuevos.
 *
 *  Dos momentos de uso:
 *   - ALTA (calcularAlta): resuelve jerarquía (Eventual > Personalizada >
 *     Especial > General) y calcula valores iniciales. Congela la referencia.
 *   - CIERRE (calcularCierre): NO vuelve a resolver — reusa la referencia
 *     congelada en el alta y recalcula con km/multiplicadores/acompañantes
 *     actuales (pueden haber cambiado desde el alta).
 *
 *  Resolución automática con fallback a selección manual en operaciones-editor
 *  (Bloque 7 Paso 1). Si no puede determinar un único ganador (nivel habilitado
 *  sin tarifa vigente, más de una vigente simultánea, una tarifa con más de una
 *  sección, o — Personalizada por km — más de una categoría libre en su única
 *  sección) NO bloquea: deja la referencia/valores en null para ese lado y
 *  devuelve el motivo en `errores` para que el caller lo registre en el log de
 *  actividad.
 *
 *  modoTarifacion === 'km' (Personalizada): sin escalones de distancia — el valor
 *  cargado en la categoría ES la tarifa por km, se multiplica por op.km al calcular
 *  (ver calcularLado). Igual que en modo categoría, con una sola categoría se
 *  resuelve sola; con 2+ no hay forma automática de saber cuál corresponde (no
 *  matchean por categoría de vehículo) y requiere elegir a mano. */
```
REEMPLAZAR:
```
/** Candidatos y cálculo de valores del sistema de Tarifas.
 *
 *  La ELECCIÓN de la tarifa de cada lado (op.tarifaAplicadaCliente/Chofer) no
 *  se hace en el alta: la hace el usuario en operaciones-editor (o el
 *  generador de pruebas), vía ResolucionTarifaOpService, sobre los candidatos
 *  de listarCandidatosLado (niveles HABILITADOS de la entidad, sin fallback
 *  implícito entre niveles) + resolverSeccionCategoria / armarRefManual.
 *  Personalizada es exclusiva de Clientes y determina ambos lados (el lado
 *  chofer/proveedor espeja la misma referencia). Eventual no usa referencias:
 *  se identifica por op.datosTarifaEventual.
 *
 *  Momentos de cálculo:
 *   - ALTA (calcularAlta): EXIGE las dos referencias ya elegidas (o eventual).
 *     Si falta alguna, valoresNuevos queda en null y el motivo vuelve en
 *     `errores`; altaDesdeAsignacion aborta el alta (TC2).
 *   - CIERRE, edición de InformeOp y restaurar (calcularCierre): reusa las
 *     referencias congeladas y recalcula con km/multiplicadores/acompañantes
 *     actuales.
 *
 *  modoTarifacion === 'km' (Personalizada): sin escalones de distancia — el valor
 *  cargado en la categoría ES la tarifa por km, se multiplica por op.km al calcular
 *  (ver calcularLado). Con una sola categoría, resolverSeccionCategoria la elige
 *  sola; con 2+ no hay forma automática de saber cuál corresponde (no matchean
 *  por categoría de vehículo) y se elige a mano. */
```

## PASO 3 — src/app/servicios/tarifario/valores-tarifa.service.ts
BUSCAR:
```
    private tarifario: TarifarioService,
    private clienteServ: ClienteService,
    private choferServ: ChoferService,
    private proveedorServ: ProveedorService,
```
REEMPLAZAR:
```
    private tarifario: TarifarioService,
    private choferServ: ChoferService,
```

## PASO 4 — src/app/servicios/tarifario/valores-tarifa.service.ts
BUSCAR:
```
  calcularAlta(op: Operacion): ResultadoCalculoTarifa {
    const errores: string[] = [];

    if (op.datosTarifaEventual !== null) {
      op.tarifaAplicadaCliente = null;
      op.tarifaAplicadaChofer = null;
      op.valoresNuevos = this.valoresEventual(op);
      return { op, errores };
    }

    const cliente = this.clienteServ.getClientePorId(op.cliente.id);
    if (!cliente) {
      errores.push(`cliente ${op.cliente.id} no encontrado`);
      op.tarifaAplicadaCliente = null;
      op.tarifaAplicadaChofer = null;
      op.valoresNuevos = null;
      return { op, errores };
    }

    const chofer = this.choferServ.getChoferPorId(op.chofer.id);
    if (!chofer) {
      errores.push(`chofer ${op.chofer.id} no encontrado`);
      op.tarifaAplicadaCliente = null;
      op.tarifaAplicadaChofer = null;
      op.valoresNuevos = null;
      return { op, errores };
    }

    const esProveedor = chofer.contratacion.tipo === 'proveedor';
    const idEntidadChofer = esProveedor
      ? (chofer.contratacion as { tipo: 'proveedor'; idProveedor: string }).idProveedor
      : chofer.id;
    const entidadTipoChofer: EntidadTipo = esProveedor ? 'proveedor' : 'chofer';
    const habilitadasChofer = this.proveedorServ.resolverTarifasHabilitadasChofer(chofer);

    // Bloque 7 (mini-frente operaciones-editor): si el lado ya viene resuelto desde la
    // selección manual del usuario en el editor, se respeta tal cual — NO se vuelve a
    // resolver la jerarquía acá (pisaría una elección de Personalizada o una tarifa
    // elegida entre varias vigentes simultáneas).
    const resCliente = op.tarifaAplicadaCliente
      ? { ref: op.tarifaAplicadaCliente, error: null }
      : this.resolverLado('cliente', cliente.id, cliente.tarifasHabilitadas, op.vehiculo.categoria, op.cliente.id);

    // Personalizada es exclusiva de Clientes y determina AMBOS lados de la
    // operación — si el cliente resolvió a una Personalizada, el chofer/proveedor
    // NO resuelve su propia jerarquía: hereda la misma referencia (misma tarifa/
    // sección/categoría; calcularLado ya lee aPagar/aPagarProveedor de esa
    // categoría para el lado chofer). Defensa en profundidad — en el flujo real
    // esto ya viene resuelto así desde operaciones-editor (Bloque 7 Paso 1/2).
    const resChofer = op.tarifaAplicadaChofer
      ? { ref: op.tarifaAplicadaChofer, error: null }
      : resCliente.ref?.nivel === 'personalizada'
        ? { ref: resCliente.ref, error: null }
        : this.resolverLado(entidadTipoChofer, idEntidadChofer, habilitadasChofer, op.vehiculo.categoria, op.cliente.id);

    op.tarifaAplicadaCliente = resCliente.ref;
    op.tarifaAplicadaChofer = resChofer.ref;
    if (resCliente.error) errores.push(resCliente.error);
    if (resChofer.error) errores.push(resChofer.error);

    op.valoresNuevos = this.armarValoresNuevos(op, resCliente.ref, resChofer.ref, esProveedor);

    return { op, errores };
  }
```
REEMPLAZAR:
```
  calcularAlta(op: Operacion): ResultadoCalculoTarifa {
    const errores: string[] = [];

    if (op.datosTarifaEventual !== null) {
      op.tarifaAplicadaCliente = null;
      op.tarifaAplicadaChofer = null;
      op.valoresNuevos = this.valoresEventual(op);
      return { op, errores };
    }

    // Personalizada determina AMBOS lados (calcularLado lee aPagar/
    // aPagarProveedor de la misma categoría para el lado chofer). En el flujo
    // real ya viene espejada desde ResolucionTarifaOpService.aplicarRef — esto
    // es defensa en profundidad.
    if (op.tarifaAplicadaCliente?.nivel === 'personalizada' && !op.tarifaAplicadaChofer) {
      op.tarifaAplicadaChofer = op.tarifaAplicadaCliente;
    }

    // TC2: el alta EXIGE las referencias ya elegidas — no se resuelve
    // jerarquía acá (se retiró resolverLado, que caía a General aunque no
    // estuviera habilitada).
    if (!op.tarifaAplicadaCliente) {
      errores.push('lado cliente sin tarifa elegida (se elige en operaciones-editor o en el generador)');
    }
    if (!op.tarifaAplicadaChofer) {
      errores.push('lado chofer/proveedor sin tarifa elegida (se elige en operaciones-editor o en el generador)');
    }
    if (errores.length > 0) {
      op.valoresNuevos = null;
      return { op, errores };
    }

    const chofer = this.choferServ.getChoferPorId(op.chofer.id);
    const esProveedor = chofer ? chofer.contratacion.tipo === 'proveedor' : op.proveedor !== null;

    op.valoresNuevos = this.armarValoresNuevos(op, op.tarifaAplicadaCliente, op.tarifaAplicadaChofer, esProveedor);
    if (!op.valoresNuevos) {
      errores.push('no se pudieron calcular los valores: la tarifa o la sección/categoría elegida no está en memoria');
    }

    return { op, errores };
  }
```

## PASO 5 — src/app/servicios/tarifario/valores-tarifa.service.ts
(Borra resolverLado y resolverEnCandidatas completos. El BUSCAR va desde
el comentario de sección hasta el cierre de resolverEnCandidatas, sin incluir
el comentario "Listado de candidatos..." que sigue.)

BUSCAR:
```
  // ── Resolución de jerarquía (privado) ───────────────────────────

  private resolverLado(
    entidadTipo: EntidadTipo,
    idEntidad: string,
    habilitadas: RefTarifaHabilitada[],
    categoriaVehiculo: { catOrden: number; nombre: string },
    idClienteOp: string,
  ): { ref: RefTarifaAplicada | null; error: string | null } {

    const niveles = new Set(habilitadas.map(h => h.nivel));

    // 1. Personalizada
    if (niveles.has('personalizada')) {
      const candidatas = this.tarifario.getTarifasPersonalizadasVigentes(idEntidad);
      const r = this.resolverEnCandidatas(candidatas, categoriaVehiculo);
      if (r.ref) return { ref: r.ref, error: null };
      return { ref: null, error: `personalizada de ${entidadTipo} ${idEntidad}: ${r.motivo}` };
    }

    // 2. Especial (alcance específico al cliente de la operación gana sobre el genérico)
    if (niveles.has('especial')) {
      let candidatas = this.tarifario.getTarifasEspecialesVigentes(idEntidad).filter(t => t.entidadTipo === entidadTipo);
      if (entidadTipo !== 'cliente') {
        const especificas = candidatas.filter(t => t.alcance.tipo === 'entidadCliente' && t.alcance.idCliente === idClienteOp);
        candidatas = especificas.length > 0 ? especificas : candidatas.filter(t => t.alcance.tipo === 'entidad');
      }
      const r = this.resolverEnCandidatas(candidatas, categoriaVehiculo);
      if (r.ref) return { ref: r.ref, error: null };
      if (!r.categoriaNoIncluida) {
        return { ref: null, error: `especial de ${entidadTipo} ${idEntidad}: ${r.motivo}` };
      }
      // categoriaNoIncluida → Bloque 4 ajuste 1: la especial no cubre esta categoría del vehículo → cae a General.
    }

    // 3. General
    const general = this.tarifario.getTarifaGeneralVigente();
    if (!general) return { ref: null, error: `no hay tarifa general vigente` };
    const r = this.resolverEnCandidatas([general], categoriaVehiculo);
    if (r.ref) return { ref: r.ref, error: null };
    return { ref: null, error: `general: ${r.motivo}` };
  }

  /** Exige exactamente 1 tarifa vigente y exactamente 1 sección (más de una
   *  sección requiere elegir a mano cuál — no disponible en este bloque). */
  private resolverEnCandidatas(
    candidatas: (ConIdType<Tarifa> | ConIdType<TarifaEspecial>)[],
    categoriaVehiculo: { catOrden: number; nombre: string },
  ): { ref: RefTarifaAplicada | null; motivo: string | null; categoriaNoIncluida: boolean } {

    if (candidatas.length === 0) {
      return { ref: null, motivo: 'sin tarifa vigente', categoriaNoIncluida: false };
    }
    if (candidatas.length > 1) {
      return { ref: null, motivo: `${candidatas.length} tarifas vigentes simultáneas (ambigüedad)`, categoriaNoIncluida: false };
    }
    const tarifa = candidatas[0];
    if (tarifa.secciones.length !== 1) {
      return { ref: null, motivo: `tiene ${tarifa.secciones.length} secciones — requiere selección manual (pendiente, mini-frente operaciones-editor)`, categoriaNoIncluida: false };
    }
    const seccion = tarifa.secciones[0];
    let categoria: any;
    if (tarifa.modoTarifacion === 'km') {
      // Personalizada por km: categorías libres, no matchean por nombre de vehículo.
      // Con una sola no hay ambigüedad — se resuelve sola. Con 2+ no hay forma
      // automática de saber cuál corresponde — requiere elegir a mano.
      if (seccion.categorias.length === 0) {
        return { ref: null, motivo: `modoTarifacion 'km': la tarifa no tiene categorías cargadas`, categoriaNoIncluida: false };
      }
      if (seccion.categorias.length > 1) {
        return { ref: null, motivo: `modoTarifacion 'km' con ${seccion.categorias.length} categorías — requiere selección manual (mini-frente operaciones-editor)`, categoriaNoIncluida: false };
      }
      categoria = seccion.categorias[0];
    } else {
      categoria = seccion.categorias.find((c: any) => c.nombre === categoriaVehiculo.nombre);
      if (!categoria) {
        return { ref: null, motivo: `categoría '${categoriaVehiculo.nombre}' no está en la tarifa`, categoriaNoIncluida: true };
      }
    }
    return {
      ref: {
        idTarifa: tarifa.idTarifa,
        nivel: tarifa.nivel as 'general' | 'especial' | 'personalizada',
        nombreTarifa: tarifa.nombre,
        seccion: seccion.orden,
        nombreSeccion: seccion.nombre,
        categoria: categoria.orden,
        nombreCategoria: categoria.nombre,
      },
      motivo: null,
      categoriaNoIncluida: false,
    };
  }
```
REEMPLAZAR:
```
  // (TC2: resolverLado / resolverEnCandidatas retirados — la elección de
  // tarifa vive en listarCandidatosLado + resolverSeccionCategoria /
  // armarRefManual, usados por ResolucionTarifaOpService.)
```

## PASO 6 — src/app/servicios/tarifario/valores-tarifa.service.ts
BUSCAR:
```
  /** A diferencia de resolverLado (que exige un único ganador de la jerarquía
   *  Personalizada > Especial > General), acá se devuelven TODOS los candidatos
   *  vigentes de TODOS los niveles habilitados que tengan alguno — el usuario elige
```
REEMPLAZAR:
```
  /** Devuelve TODOS los candidatos vigentes de TODOS los niveles habilitados
   *  de la entidad (Personalizada, Especial, General) que tengan alguno — el usuario elige
```

## PASO 7 — src/app/servicios/tarifario/valores-tarifa.service.ts
BUSCAR:
```
      // Mismo criterio que resolverLado: una especial de 1 sola sección que no cubre
      // la categoría del vehículo no es candidata.
```
REEMPLAZAR:
```
      // Una especial de 1 sola sección que no cubre la categoría del vehículo no
      // es candidata.
```

## PASO 8 — src/app/servicios/tarifario/valores-tarifa.service.ts
BUSCAR:
```
   *  Categoría por match de nombre contra la categoría del vehículo — mismo criterio
   *  que resolverEnCandidatas. Si la tarifa tiene más de una sección devuelve
```
REEMPLAZAR:
```
   *  Categoría por match exacto de nombre contra la categoría del vehículo.
   *  Si la tarifa tiene más de una sección devuelve
```

## PASO 9 — src/app/servicios/operaciones/operacion.service.ts
BUSCAR:
```
      // Sistema nuevo de Tarifas: resuelve jerarquía y calcula valoresNuevos.
      // Corre ANTES de calcularValoresIniciales — desde Bloque 7 Paso 2,
      // valoresNuevos es la única fuente de op.valores (ver ese método). No
      // bloquea el alta si no puede resolver: deja tarifaAplicada*/valoresNuevos
      // en null para ese lado y lo registra en el log de actividad.
      const resultadoTarifaNueva = this.valoresTarifaServ.calcularAlta(c.operacion);
      c.operacion = resultadoTarifaNueva.op;
      if (resultadoTarifaNueva.errores.length > 0) {
        await this.logRegistro.registrarError(
          'ALTA', 'operaciones', fecha,
          `Tarifa nueva no resuelta al alta (cliente ${c.operacion.cliente.id}, chofer ${c.operacion.chofer.id}): ` +
          resultadoTarifaNueva.errores.join(' | '),
        );
      }
```
REEMPLAZAR:
```
      // Tarifas: calcula valoresNuevos con las referencias YA elegidas
      // (operaciones-editor / generador). Corre ANTES de
      // calcularValoresIniciales. TC2: si falta una referencia o no se pueden
      // calcular los valores, se ABORTA el alta completa (nada tocó la red
      // todavía) — antes quedaba la op con valoresNuevos en null y fallaba
      // recién al cerrarla.
      const resultadoTarifaNueva = this.valoresTarifaServ.calcularAlta(c.operacion);
      c.operacion = resultadoTarifaNueva.op;
      if (resultadoTarifaNueva.errores.length > 0) {
        const detalle = resultadoTarifaNueva.errores.join(' | ');
        await this.logRegistro.registrarError(
          'ALTA', 'operaciones', fecha,
          `Tarifa no resuelta al alta (cliente ${c.operacion.cliente.id}, chofer ${c.operacion.chofer.id}): ${detalle}`,
        );
        return {
          exito: false,
          mensaje: `No se pudo calcular la tarifa de una operación de ${c.operacion.cliente.razonSocial}: ` +
                   `${detalle}. No se guardó ninguna operación.`,
          objeto: { creadas, errores: [] },
        };
      }
```

## PASO 10 — src/app/interfaces/operacion.ts
BUSCAR:
```
  // Sistema nuevo de Tarifas (Bloque 6) — corre en paralelo al sistema viejo
  // (tarifaTipo/valores) sin reemplazarlo todavía. Se completa en el alta
  // (ValoresTarifaService.calcularAlta, jerarquía Eventual > Personalizada >
  // Especial > General) y se recalcula en el cierre (calcularCierre) sin
  // volver a resolver la jerarquía. Si la resolución automática no puede
  // determinar un único ganador queda en null — no bloquea el alta, se
  // registra en el log de actividad. Eventual no usa tarifaAplicada*: se
  // identifica leyendo datosTarifaEventual de la operación.
```
REEMPLAZAR:
```
  // Sistema de Tarifas. tarifaAplicada*: referencia elegida ANTES del alta
  // (operaciones-editor / generador, vía ResolucionTarifaOpService) y
  // congelada; el alta la exige (ValoresTarifaService.calcularAlta) y nunca
  // se vuelve a resolver. valoresNuevos: calculado en el alta y recalculado
  // en cierre / edición de InformeOp / restaurar (calcularCierre). Eventual no
  // usa tarifaAplicada* (quedan en null): se identifica por
  // datosTarifaEventual !== null.
```

## PASO 11 — src/app/interfaces/ref-tarifa-aplicada.ts
BUSCAR:
```
// Cableada a Operacion desde Bloque 6 (ValoresTarifaService) — se resuelve y
// congela en el alta (operacion.service.ts → calcularAlta) y NO se vuelve a
// resolver en el cierre (ValoresTarifaService.calcularCierre, llamado desde
// ModalDetalleOpComponent, reutiliza esta misma referencia con valores
// actualizados).
```
REEMPLAZAR:
```
// Se elige antes del alta (operaciones-editor / generador, vía
// ResolucionTarifaOpService), se congela en el alta (calcularAlta la exige) y
// NO se vuelve a resolver: calcularCierre (cierre, edición de InformeOp,
// restaurar) reutiliza esta misma referencia con valores actualizados.
```

## PASO 12 — src/app/raiz/operaciones/operacion-cabecera/operacion-cabecera.component.ts
BUSCAR:
```
    // internamente (mismo método que usa ValoresTarifaService.calcularAlta).
```
REEMPLAZAR:
```
    // internamente (mismo método que usa ResolucionTarifaOpService.candidatosOp).
```

## Verificación

1. `grep -rn "private resolverLado\|private resolverEnCandidatas\|this.resolverLado(\|this.resolverEnCandidatas(" src/app` → sin resultados.
   (Las palabras resolverLado/resolverEnCandidatas siguen apareciendo en 2
   comentarios nuevos que explican el retiro; eso es esperado.)
2. `grep -n "clienteServ\|proveedorServ\|ClienteService\|ProveedorService" src/app/servicios/tarifario/valores-tarifa.service.ts` → sin resultados.
3. `grep -n "No se pudo calcular la tarifa de una operación" src/app/servicios/operaciones/operacion.service.ts` → 1 resultado.
4. `npm run build:demo` sin errores nuevos.
5. Mostrá el diff completo de los 5 archivos.

## Pruebas manuales (demo)

1. Tablero de asignaciones → alta de operaciones con cada tipo de tarifa
   (General, Especial, Personalizada por categoría, Personalizada por km,
   Eventual): el alta funciona igual que antes y los valores coinciden.
2. Carga puntual (carga-asignacion) → alta: igual que antes.
3. Generador de operaciones (/migracion) → Simular y Generar un lote chico:
   0 errores nuevos.
4. Cerrar una de las operaciones nuevas: cierra normal.
(El caso "op sin tarifa elegida" no se puede provocar desde la UI: el editor
lo bloquea antes. El abort de altaDesdeAsignacion es la red de seguridad.)

## Mensaje de commit

refactor(tarifas): el alta exige la tarifa elegida (TC2)

- ValoresTarifaService.calcularAlta: sin resolución automática de jerarquía;
  exige tarifaAplicadaCliente/Chofer (o eventual), con espejo defensivo de
  Personalizada. Se retiran resolverLado y resolverEnCandidatas (caían a
  General aunque no estuviera habilitada) y las dependencias ClienteService
  y ProveedorService.
- OperacionService.altaDesdeAsignacion: aborta el alta si la tarifa de una
  operación no se puede calcular.
- Comentarios al día en interfaces/operacion.ts, ref-tarifa-aplicada.ts y
  operacion-cabecera.

FIN DE LA INSTRUCCIÓN TC2
````
