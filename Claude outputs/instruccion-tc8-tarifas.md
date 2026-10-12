````
INSTRUCCIÓN TC8 — Tarifas (cierre): fuera `tarifaTipo` de Operacion (marca de eventual = datosTarifaEventual)
==========================================================================================================

Si no ves la línea "FIN DE LA INSTRUCCIÓN TC8" al final, el texto llegó
cortado: leé el archivo completo antes de empezar.

## Contexto y razonamiento

`Operacion.tarifaTipo` son los 4 booleanos del sistema viejo
({general, especial, eventual, personalizada}). En el código vivo su ÚNICO
rol funcional es ser la marca de eventual, que ya representa
`datosTarifaEventual !== null` (el motor, el cierre, Reportes y el tablero
ya usan esa). El resto de su vida es ceremonia:
- OperacionFactoryService lo calcula con una "jerarquía" (resolverJerarquiaTarifa,
  vía el shim tarifaTipoDesdeHabilitadas) y lo mantiene sincronizado en
  aplicarTarifaTipo / aplicarTarifaEventual.
- ResolucionTarifaOpService.asignarChofer lo recalcula con
  ProveedorService.getTarifaTipo.
- operaciones-editor guarda un TarifaTipo "original" por op para volver
  atrás del toggle Eventual y lo lee para esEventual.
- El generador lo consulta antes de marcar eventual.
- Respaldos para entidades/ops sin dato nuevo: operacion-cabecera
  (legacyComoHabilitadas) y Reportes (nivelLegacy + la fuente legacy
  op.valores para ops sin valoresNuevos).

Decisión de diseño (T2): no se conserva tarifaTipo ni ningún respaldo; las
operaciones viejas de Vantruck se traducen con la migración antes de correr
este código.

Cambios:
1. Interfaces: fuera Operacion.tarifaTipo y su import; fuera TarifaTipo de
   chofer.ts (sin consumidores después de esto). El TarifaTipo de
   tarifa-gral-cliente.ts SE QUEDA (lo usan el InformeOp viejo y
   migrar-datos).
2. tarifa-habilitada.ts: fuera el shim tarifaTipoDesdeHabilitadas.
3. OperacionFactoryService:
   - esEventualPorHabilitadas(cliente, habilitadasChofer): true si el
     cliente o el chofer/proveedor tienen Eventual habilitado (mismo
     criterio que ResolucionTarifaOpService.esEventualForzada). Es lo único
     que la jerarquía vieja aportaba.
   - aplicarEventual(op, eventual): mantiene el invariante
     eventual ⟺ datosTarifaEventual (crea en cero si no existía; conserva
     lo cargado; null al salir).
   - Fuera resolverJerarquiaTarifa, recalcularTarifaTipo, aplicarTarifaTipo
     y aplicarTarifaEventual (con esto también se va el docblock que había
     quedado pegado en el lugar equivocado, señalado en TC6).
4. ProveedorService.getTarifaTipo fuera (su único caller era asignarChofer).
5. ResolucionTarifaOpService.asignarChofer: recalcula la marca con
   esEventualPorHabilitadas(cliente, resolverTarifasHabilitadasChofer(chofer))
   y devuelve `eventualRecalculado: boolean | null` en vez de
   `tipoRecalculado`.
6. operaciones-editor: `eventualOriginal: Map<idItem, boolean>` en vez de
   `tarifaOriginal: Map<idItem, TarifaTipo>`; esEventual lee
   datosTarifaEventual; el toggle llama aplicarEventual(op, activar ||
   eraEventual) — mismo comportamiento que antes.
7. Generador: deja de llamar aplicarTarifaEventual (justo después ya
   asigna op.datosTarifaEventual con los valores al azar).
8. operacion-cabecera: entidad no encontrada → sin badges (fuera el
   respaldo legacyComoHabilitadas).
9. Reportes (ResumenOpFactoryService): fuera la fuente legacy
   (ladosDesdeLegacy, nivelLegacy, usaFuenteLegacy, contador `legacy`).
   Una op sin valoresNuevos, o sin tarifa aplicada en un lado y no
   eventual, es un error que el recálculo lista. RecalculoResumenesService
   y su pantalla pierden `opsLegacy`.

Datos de demo: las ops ya guardadas conservan `tarifaTipo` en Firestore
(opToFirestore hace spread); no lo lee nadie y lo borra TC-L.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto a BUSCAR no está, o aparece más de una vez: detenete y reportá.
- Aplicá los cambios de cada archivo EN ORDEN.
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Ningún BUSCAR de esta instrucción tiene espacios al final de línea. Los
  que son bloques largos (métodos completos) terminan en la primera línea
  que se conserva, que el REEMPLAZAR repite.
- Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md.
- Se tocan interfaces (Operacion, TarifaTipo de chofer.ts, el retorno de
  asignarChofer, el de agregados, SimulacionRecalculo): revisá todos sus
  usos en src/ (incluidos .spec.ts y .html) — ver PASO 0.

## PASO 0 — Verificación (sin modificar nada)

0.1 `grep -rn "\.tarifaTipo\b\|tarifaTipo:" src/ --include=*.ts --include=*.html`
    → solo: interfaces/operacion.ts, interfaces/informe-op.ts,
    operacion-factory.service.ts, operaciones-editor.component.ts,
    generador-operaciones.service.ts, operacion-cabecera.component.ts,
    resumen-op-factory.service.ts, migrar-datos.component.ts, comentarios
    en recalculo-resumenes.service.ts y tarifa-habilitada.ts, y en
    servicios/migracion/ los 3 servicios de entidades más
    tarifa-habilitada-migracion.util.ts (leen el campo VIEJO de las
    entidades con `any`, no de Operacion).
    Ningún .spec.ts; ningún otro archivo que arme un objeto Operacion
    con tarifaTipo.
0.2 `grep -rn "from 'src/app/interfaces/chofer'\|from \"src/app/interfaces/chofer\"\|from './chofer'" src/ | grep TarifaTipo`
    → solo: tarifa-habilitada.ts, operacion-factory.service.ts,
    proveedor.service.ts, resolucion-tarifa-op.service.ts,
    operaciones-editor.component.ts.
0.3 `grep -rn "tarifaTipoDesdeHabilitadas\|getTarifaTipo\|aplicarTarifaTipo\|recalcularTarifaTipo\|aplicarTarifaEventual\|tipoRecalculado" src/`
    → solo en: tarifa-habilitada.ts, operacion-factory.service.ts,
    proveedor.service.ts, resolucion-tarifa-op.service.ts,
    operaciones-editor.component.ts y generador-operaciones.service.ts.
0.4 `grep -rn "opsLegacy\|usaFuenteLegacy\|\.legacy\b\|legacy }" src/`
    → solo resumen-op-factory.service.ts, recalculo-resumenes.service.ts
    y recalculo-resumenes.component.html.
0.5 `grep -rn "agregados(" src/` → la definición y la llamada en
    recalculo-resumenes.service.ts.
Si algo no coincide, DETENETE y reportá.

## PASO 1 — src/app/interfaces/operacion.ts

1.1 BUSCAR:
```
import { TarifaTipo } from "./tarifa-gral-cliente";
import { RefTarifaAplicada } from "./ref-tarifa-aplicada";
```
REEMPLAZAR:
```
import { RefTarifaAplicada } from "./ref-tarifa-aplicada";
```

1.2 BUSCAR:
```
  tarifaTipo: TarifaTipo;
  datosTarifaEventual: DatosTarifaEventual | null;
```
REEMPLAZAR:
```
  // Marca de eventual: datosTarifaEventual !== null (TC8: fuera los 4
  // booleanos legacy de tipo de tarifa; la tarifa elegida vive en
  // tarifaAplicada*).
  datosTarifaEventual: DatosTarifaEventual | null;
```

## PASO 2 — src/app/interfaces/chofer.ts

2.1 BUSCAR:
```
    domicilio: string;
}

export interface TarifaTipo {
    general: boolean;
    especial: boolean;
    eventual: boolean;
    personalizada: boolean;
}
```
REEMPLAZAR:
```
    domicilio: string;
}
```

## PASO 3 — src/app/interfaces/tarifa-habilitada.ts

3.1 BUSCAR:
```
import { TarifaTipo } from './chofer';

export type RefTarifaHabilitada =
```
REEMPLAZAR:
```
export type RefTarifaHabilitada =
```

3.2 BUSCAR:
```
/**
 * Shim de compatibilidad — reconstruye los 4 booleanos legacy (TarifaTipo) a
 * partir de tarifasHabilitadas. Desde TC7 solo lo usan los que todavía
 * producen op.tarifaTipo (OperacionFactoryService y
 * ProveedorService.getTarifaTipo); se retira en TC8 junto con tarifaTipo.
 */
export function tarifaTipoDesdeHabilitadas(lista: RefTarifaHabilitada[]): TarifaTipo {
  return {
    general: lista.some(t => t.nivel === 'general'),
    especial: lista.some(t => t.nivel === 'especial'),
    personalizada: lista.some(t => t.nivel === 'personalizada'),
    eventual: lista.some(t => t.nivel === 'eventual'),
  };
}

/**
 * Valida el invariante
```
REEMPLAZAR:
```
/**
 * Valida el invariante
```

3.3 BUSCAR:
```
 *  Helper puro para leer tarifasHabilitadas sin pasar por TarifaTipo: forms
 *  de alta, badges, etiquetas (TC7). */
```
REEMPLAZAR:
```
 *  Helper puro para leer tarifasHabilitadas: forms de alta, badges,
 *  etiquetas (TC7). */
```

## PASO 4 — src/app/servicios/operaciones/operacion-factory.service.ts

4.1 BUSCAR:
```
import { Chofer, TarifaTipo, Vehiculo } from 'src/app/interfaces/chofer';
```
REEMPLAZAR:
```
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
```

4.2 BUSCAR:
```
import { tarifaTipoDesdeHabilitadas } from 'src/app/interfaces/tarifa-habilitada';
```
REEMPLAZAR:
```
import { RefTarifaHabilitada } from 'src/app/interfaces/tarifa-habilitada';
```

4.3 BUSCAR:
```
    // TODO: refactor Tarifas — operaciones-editor con multiplicidad
    const tarifaSecundariaChofer = chofer
      ? tarifaTipoDesdeHabilitadas(this.proveedorService.resolverTarifasHabilitadasChofer(chofer))
      : undefined;
    const tarifaTipo = this.resolverJerarquiaTarifa(cliente, tarifaSecundariaChofer);
```
REEMPLAZAR:
```
    const esEventual = this.esEventualPorHabilitadas(
      cliente,
      chofer ? this.proveedorService.resolverTarifasHabilitadasChofer(chofer) : undefined,
    );
```

4.4 BUSCAR:
```
      tarifaTipo,
      // Nace con objeto en cero SOLO si la op es eventual; sino null.
      datosTarifaEventual: tarifaTipo.eventual
```
REEMPLAZAR:
```
      // Nace con objeto en cero SOLO si la op es eventual; sino null.
      datosTarifaEventual: esEventual
```

4.5 BUSCAR:
```
  /**
   * Jerarquía de tarifas: eventual > personalizada > especial > general.
   * `tarifaSecundaria` es la tarifa de la entidad que acompaña al cliente: para chofer
   * directo o de proveedor por igual, tarifaTipoDesdeHabilitadas(proveedorService.
   * resolverTarifasHabilitadasChofer(chofer)) — el resolver ya distingue ambos casos.
   * undefined cuando todavía no hay chofer/proveedor resuelto (alta con pendiente).
   * Personalizada es exclusiva del cliente; no la aporta la tarifa secundaria.
   * TODO: refactor Tarifas — esta lógica migrará al sistema de tarifas unificado.
   */
  private resolverJerarquiaTarifa(
    cliente: Cliente,
    tarifaSecundaria: TarifaTipo | undefined,
  ): TarifaTipo {
    // TODO: refactor Tarifas — operaciones-editor con multiplicidad
    const tipoCliente = tarifaTipoDesdeHabilitadas(cliente.tarifasHabilitadas);
    if (tipoCliente.eventual || tarifaSecundaria?.eventual) {
      return { general: false, especial: false, eventual: true,  personalizada: false };
    }
    if (tipoCliente.personalizada) {
      return { general: false, especial: false, eventual: false, personalizada: true  };
    }
    if (tipoCliente.especial || tarifaSecundaria?.especial) {
      return { general: false, especial: true,  eventual: false, personalizada: false };
    }
    return   { general: true,  especial: false, eventual: false, personalizada: false };
  }

  /**
   * Recalcula el tarifaTipo de una op cuando se resuelve el chofer pendiente
   * (caso proveedor). Quien llama resuelve la tarifa secundaria y la pasa ya resuelta,
   * vía proveedorService.resolverTarifasHabilitadasChofer(chofer) + tarifaTipoDesdeHabilitadas
   * (mismo resolver para chofer directo o de proveedor). Devuelve el nuevo TarifaTipo;
   * NO muta la op (la mutación coherente, con datosTarifaX, la hace aplicarTarifaTipo
   * más abajo si hace falta).
   * TODO: refactor Tarifas — operaciones-editor con multiplicidad
   */
  recalcularTarifaTipo(cliente: Cliente, tarifaSecundaria: TarifaTipo | undefined): TarifaTipo {
    return this.resolverJerarquiaTarifa(cliente, tarifaSecundaria);
  }

  /**
   * Aplica o revierte la tarifa eventual sobre una op, manteniendo el invariante
   * de datosTarifaX. Estado de UI de operaciones-editor.
   *
   *  - activar=true: pasa la op a eventual. Crea datosTarifaEventual en cero si
   *    no existía. (El tipo original lo guarda el componente en su Map para
   *    poder volver atrás.)
   *  - activar=false: restaura tarifaOriginal y reconstruye datosTarifaEventual
   *    (en cero si la original era eventual; null si no).
   *
   * TODO: refactor Tarifas — la mutación de datosTarifaX migrará al sistema unificado.
   */
  /**
   * Aplica un tarifaTipo ya resuelto sobre una op, manteniendo el invariante de
   * datosTarifaX (eventual ⟺ datosTarifaEventual).
   * Lo usa operaciones-editor al resolver el chofer de un proveedor (el tipo se
   * recalcula con recalcularTarifaTipo y se aplica acá). Muta la op in-place.
   * TODO: refactor Tarifas — la mutación de datosTarifaX migrará al sistema unificado.
   * TODO: refactor Tarifas — operaciones-editor con multiplicidad
   */
  aplicarTarifaTipo(op: Operacion, tipo: TarifaTipo): void {
    op.tarifaTipo = { ...tipo };
    op.datosTarifaEventual = tipo.eventual
      ? (op.datosTarifaEventual
         ?? { chofer: { concepto: '', valor: 0 }, cliente: { concepto: '', valor: 0 } })
      : null;
  }

  // TODO: refactor Tarifas — operaciones-editor con multiplicidad
  aplicarTarifaEventual(
    op: Operacion,
    activar: boolean,
    tarifaOriginal: TarifaTipo,
  ): void {
    if (activar) {
      op.tarifaTipo = { general: false, especial: false, eventual: true, personalizada: false };
      op.datosTarifaEventual = op.datosTarifaEventual
        ?? { chofer: { concepto: '', valor: 0 }, cliente: { concepto: '', valor: 0 } };
    } else {
      op.tarifaTipo = { ...tarifaOriginal };
      op.datosTarifaEventual = tarifaOriginal.eventual
        ? (op.datosTarifaEventual
           ?? { chofer: { concepto: '', valor: 0 }, cliente: { concepto: '', valor: 0 } })
        : null;
    }
  }

  /** Convierte una Operación (ConId) al body que se persiste en Firestore —
```
REEMPLAZAR:
```
  /** True si la op es eventual porque el cliente o el chofer/proveedor tienen
   *  el nivel Eventual habilitado (por invariante, cuando Eventual está
   *  habilitado es el único nivel de esa entidad). `habilitadasChofer`:
   *  proveedorService.resolverTarifasHabilitadasChofer(chofer), que ya
   *  resuelve directo vs. proveedor; undefined con chofer pendiente → solo
   *  cuenta el cliente. Mismo criterio que
   *  ResolucionTarifaOpService.esEventualForzada.
   *  Reemplaza a la jerarquía legacy de 4 booleanos de la op (TC8): de ella
   *  solo se usaba la marca de eventual. */
  esEventualPorHabilitadas(cliente: Cliente, habilitadasChofer: RefTarifaHabilitada[] | undefined): boolean {
    return cliente.tarifasHabilitadas.some(h => h.nivel === 'eventual')
      || (habilitadasChofer ?? []).some(h => h.nivel === 'eventual');
  }

  /** Deja la op eventual o no, manteniendo el invariante
   *  eventual ⟺ datosTarifaEventual !== null. Al pasar a eventual crea
   *  datosTarifaEventual en cero si no existía (si ya existía conserva lo
   *  cargado); al salir lo deja en null. Muta la op in-place. Lo usan
   *  ResolucionTarifaOpService.asignarChofer (chofer de proveedor resuelto) y
   *  el toggle Eventual de operaciones-editor. */
  aplicarEventual(op: Operacion, eventual: boolean): void {
    op.datosTarifaEventual = eventual
      ? (op.datosTarifaEventual
         ?? { chofer: { concepto: '', valor: 0 }, cliente: { concepto: '', valor: 0 } })
      : null;
  }

  /** Convierte una Operación (ConId) al body que se persiste en Firestore —
```

## PASO 5 — src/app/servicios/proveedores/proveedor.service.ts

5.1 BUSCAR:
```
import { Chofer, Vehiculo, TarifaTipo } from 'src/app/interfaces/chofer';
```
REEMPLAZAR:
```
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
```

5.2 BUSCAR:
```
import { RefTarifaHabilitada, tarifaTipoDesdeHabilitadas } from 'src/app/interfaces/tarifa-habilitada';
```
REEMPLAZAR:
```
import { RefTarifaHabilitada } from 'src/app/interfaces/tarifa-habilitada';
```

5.3 BUSCAR:
```
  /** Devuelve el tarifaTipo del proveedor por id, o undefined si no está.
   *  Fuente de verdad de la tarifa heredada por los choferes de proveedor.
   *  TODO: refactor Tarifas — eliminar el campo tarifasHabilitadas de la interfaz Chofer
   *  (hoy duplicado al crear el chofer); los choferes de proveedor deben resolver
   *  su tarifa SIEMPRE por acá, no por tarifaTipoDesdeHabilitadas(chofer.tarifasHabilitadas). */
  getTarifaTipo(idProveedor: string): TarifaTipo | undefined {
    const proveedor = this.getProveedorPorId(idProveedor);
    return proveedor ? tarifaTipoDesdeHabilitadas(proveedor.tarifasHabilitadas) : undefined;
  }

  /** Resuelve las tarifas habilitadas de un chofer sin importar su contratación.
```
REEMPLAZAR:
```
  /** Resuelve las tarifas habilitadas de un chofer sin importar su contratación.
```

## PASO 6 — src/app/servicios/tarifario/resolucion-tarifa-op.service.ts

6.1 BUSCAR:
```
import { Chofer, TarifaTipo, Vehiculo } from 'src/app/interfaces/chofer';
```
REEMPLAZAR:
```
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
```

6.2 BUSCAR:
```
  /** Resuelve el chofer: puebla RefChofer y recalcula tarifaTipo con la tarifa
   *  del PROVEEDOR (el chofer de proveedor la hereda), manteniendo el
   *  invariante de datosTarifaX (aplicarTarifaTipo). `tipoRecalculado` es null
   *  si el cliente no está en memoria (no se recalcula). `asignado` false si
   *  el id es vacío o el chofer no existe (la op no se toca). */
  asignarChofer(op: Operacion, idChofer: string): { asignado: boolean; tipoRecalculado: TarifaTipo | null } {
    if (!idChofer) return { asignado: false, tipoRecalculado: null };
    const chofer = this.choferService.getChoferPorId(idChofer);
    if (!chofer) return { asignado: false, tipoRecalculado: null };

    op.chofer = {
      id:       chofer.id,
      nombre:   chofer.datosPersonales.nombre,
      apellido: chofer.datosPersonales.apellido,
      cuit:     chofer.datosPersonales.cuit,
    };

    // Recalcular tarifaTipo. Cliente vivo + tarifa secundaria del proveedor.
    const cliente = this.clienteService.getClientePorId(op.cliente.id);
    if (!cliente) return { asignado: true, tipoRecalculado: null };

    const tarifaProveedor = op.proveedor
      ? this.proveedorService.getTarifaTipo(op.proveedor.id)
      : undefined;
    const nuevoTipo = this.operacionFactory.recalcularTarifaTipo(cliente, tarifaProveedor);
    this.operacionFactory.aplicarTarifaTipo(op, nuevoTipo);
    return { asignado: true, tipoRecalculado: nuevoTipo };
  }

  /** Resuelve el vehículo: puebla RefVehiculo.
```
REEMPLAZAR:
```
  /** Resuelve el chofer: puebla RefChofer y recalcula si la op es eventual
   *  (cliente o chofer/proveedor con Eventual habilitado — el chofer de
   *  proveedor hereda la tarifa del proveedor vía
   *  resolverTarifasHabilitadasChofer), manteniendo el invariante de
   *  datosTarifaEventual (OperacionFactoryService.aplicarEventual).
   *  `eventualRecalculado` es null si el cliente no está en memoria (no se
   *  recalcula). `asignado` false si el id es vacío o el chofer no existe (la
   *  op no se toca). */
  asignarChofer(op: Operacion, idChofer: string): { asignado: boolean; eventualRecalculado: boolean | null } {
    if (!idChofer) return { asignado: false, eventualRecalculado: null };
    const chofer = this.choferService.getChoferPorId(idChofer);
    if (!chofer) return { asignado: false, eventualRecalculado: null };

    op.chofer = {
      id:       chofer.id,
      nombre:   chofer.datosPersonales.nombre,
      apellido: chofer.datosPersonales.apellido,
      cuit:     chofer.datosPersonales.cuit,
    };

    const cliente = this.clienteService.getClientePorId(op.cliente.id);
    if (!cliente) return { asignado: true, eventualRecalculado: null };

    const eventual = this.operacionFactory.esEventualPorHabilitadas(
      cliente, this.proveedorService.resolverTarifasHabilitadasChofer(chofer),
    );
    this.operacionFactory.aplicarEventual(op, eventual);
    return { asignado: true, eventualRecalculado: eventual };
  }

  /** Resuelve el vehículo: puebla RefVehiculo.
```

## PASO 7 — src/app/raiz/operaciones/operaciones-editor/operaciones-editor.component.ts

7.1 BUSCAR:
```
import { Chofer, Vehiculo, TarifaTipo } from 'src/app/interfaces/chofer';
```
REEMPLAZAR:
```
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
```

7.2 BUSCAR:
```
  /** tarifaTipo original de cada op (clave idItem), para volver atrás del toggle eventual.
   *  Estado de UI puro; no ensucia la Operacion. */
  private tarifaOriginal = new Map<string, TarifaTipo>();
```
REEMPLAZAR:
```
  /** Si cada op era eventual al entrar al editor (clave idItem): punto de
   *  retorno del toggle Eventual. Estado de UI puro; no ensucia la Operacion. */
  private eventualOriginal = new Map<string, boolean>();
```

7.3 BUSCAR:
```
  // INIT — agrupar por cliente + sembrar tarifaOriginal
```
REEMPLAZAR:
```
  // INIT — agrupar por cliente + sembrar eventualOriginal
```

7.4 BUSCAR:
```
    // Sembrar el tipo original de cada op (antes de cualquier toggle).
    for (const c of this.operacionesCreadas) {
      this.tarifaOriginal.set(c.item.idItem, { ...c.operacion.tarifaTipo });
    }
```
REEMPLAZAR:
```
    // Sembrar si cada op era eventual (antes de cualquier toggle).
    for (const c of this.operacionesCreadas) {
      this.eventualOriginal.set(c.item.idItem, c.operacion.datosTarifaEventual !== null);
    }
```

7.5 BUSCAR:
```
  /** Resuelve el chofer pendiente: puebla RefChofer, recalcula tarifaTipo con la tarifa
   *  del PROVEEDOR (no del chofer, que la hereda) y re-siembra el tipo original. */
  onChoferSeleccionado(c: OperacionCreada, idChofer: string): void {
    const { asignado, tipoRecalculado } = this.resolucionTarifa.asignarChofer(c.operacion, idChofer);
    if (!asignado) return;

    // Re-sembrar el tipo original (este pasa a ser el nuevo punto de retorno del toggle).
    if (tipoRecalculado) {
      this.tarifaOriginal.set(c.item.idItem, { ...tipoRecalculado });
    }

    // Sistema nuevo (Bloque 6/7): el chofer recién resuelto cambia los candidatos
```
REEMPLAZAR:
```
  /** Resuelve el chofer pendiente: puebla RefChofer, recalcula si la op es
   *  eventual (con la tarifa del PROVEEDOR, que el chofer hereda) y re-siembra
   *  el punto de retorno del toggle. */
  onChoferSeleccionado(c: OperacionCreada, idChofer: string): void {
    const { asignado, eventualRecalculado } = this.resolucionTarifa.asignarChofer(c.operacion, idChofer);
    if (!asignado) return;

    // Re-sembrar el punto de retorno del toggle con el estado recalculado.
    if (eventualRecalculado !== null) {
      this.eventualOriginal.set(c.item.idItem, eventualRecalculado);
    }

    // Sistema nuevo (Bloque 6/7): el chofer recién resuelto cambia los candidatos
```

7.6 BUSCAR:
```
  esEventual(op: Operacion): boolean {
    return op.tarifaTipo.eventual;
  }

  /** Toggle eventual. La mutación coherente (tarifaTipo + datosTarifaX) vive en el factory.
   *  El punto de retorno es el tarifaOriginal sembrado para esta op. */
  onEventualToggle(c: OperacionCreada, activar: boolean): void {
    const original = this.tarifaOriginal.get(c.item.idItem)
      ?? { ...c.operacion.tarifaTipo };
    this.operacionFactory.aplicarTarifaEventual(c.operacion, activar, original);
```
REEMPLAZAR:
```
  esEventual(op: Operacion): boolean {
    return op.datosTarifaEventual !== null;
  }

  /** Toggle eventual. La mutación coherente (datosTarifaEventual) vive en el
   *  factory. Al desactivar, la op vuelve a su estado sembrado
   *  (eventualOriginal): solo sigue eventual si ya lo era al entrar. */
  onEventualToggle(c: OperacionCreada, activar: boolean): void {
    const eraEventual = this.eventualOriginal.get(c.item.idItem) ?? false;
    this.operacionFactory.aplicarEventual(c.operacion, activar || eraEventual);
```

7.7 BUSCAR:
```
   *  se asume no forzado hasta ese momento, igual que tarifaTipo.eventual en ese
   *  mismo estado transitorio (ver OperacionFactoryService.crearOperacionBase). */
```
REEMPLAZAR:
```
   *  se asume no forzado hasta ese momento, igual que en el alta (ver
   *  OperacionFactoryService.esEventualPorHabilitadas). */
```

## PASO 8 — src/app/servicios/desarrollo/generador-operaciones.service.ts

8.1 BUSCAR:
```
    if (eventual !== 'no') {
      if (!op.tarifaTipo.eventual) {
        this.operacionFactory.aplicarTarifaEventual(op, true, { ...op.tarifaTipo });
      }
      const datos = this.valoresEventual(azar, op, general);
```
REEMPLAZAR:
```
    if (eventual !== 'no') {
      const datos = this.valoresEventual(azar, op, general);
```

## PASO 9 — src/app/raiz/operaciones/operacion-cabecera/operacion-cabecera.component.ts

9.1 BUSCAR:
```
  ngOnChanges(): void {
    const cliente = this.clienteServ.getClientePorId(this.op.cliente.id);
    this.tarifasHabilitadasCliente = cliente
      ? cliente.tarifasHabilitadas
      : this.legacyComoHabilitadas(this.op.tarifaTipo);

    const chofer = this.choferServ.getChoferPorId(this.op.chofer.id);
    // resolverTarifasHabilitadasChofer ya resuelve directo vs. proveedor
    // internamente (mismo método que usa ResolucionTarifaOpService.candidatosOp).
    this.tarifasHabilitadasChofer = chofer
      ? this.proveedorServ.resolverTarifasHabilitadasChofer(chofer)
      : this.legacyComoHabilitadas(this.op.tarifaTipo);
  }

  /** Fallback cuando la entidad viva no está en memoria (cliente/chofer en
   *  papelera) — reconstruye la lista de habilitadas desde el tarifaTipo
   *  legacy de la operación, mismo precedente de respaldo que usa
   *  operaciones-editor.reagrupar(). No es exacto (tarifaTipo es un snapshot
   *  de la operación puntual, no la configuración actual de la entidad) pero
   *  evita mostrar la cabecera vacía. */
  private legacyComoHabilitadas(t: Operacion['tarifaTipo']): RefTarifaHabilitada[] {
    const out: RefTarifaHabilitada[] = [];
    if (t.general) out.push({ nivel: 'general' });
    if (t.especial) out.push({ nivel: 'especial' });
    if (t.personalizada) out.push({ nivel: 'personalizada' });
    if (t.eventual) out.push({ nivel: 'eventual' });
    return out;
  }
}
```
REEMPLAZAR:
```
  ngOnChanges(): void {
    // Entidad no encontrada en memoria (p. ej. en papelera) → sin badges.
    // (TC8: fuera el respaldo que reconstruía la lista desde los booleanos
    // legacy de la operación.)
    const cliente = this.clienteServ.getClientePorId(this.op.cliente.id);
    this.tarifasHabilitadasCliente = cliente ? cliente.tarifasHabilitadas : [];

    const chofer = this.choferServ.getChoferPorId(this.op.chofer.id);
    // resolverTarifasHabilitadasChofer ya resuelve directo vs. proveedor
    // internamente (mismo método que usa ResolucionTarifaOpService.candidatosOp).
    this.tarifasHabilitadasChofer = chofer
      ? this.proveedorServ.resolverTarifasHabilitadasChofer(chofer)
      : [];
  }
}
```

## PASO 10 — src/app/servicios/reportes/resumenes-op/resumen-op-factory.service.ts

10.1 BUSCAR:
```
 *  datosTarifaEventual. NO lee op.valores ni op.tarifaTipo (legacy). */
```
REEMPLAZAR:
```
 *  datosTarifaEventual. Sin fuente legacy (TC8): una operación sin
 *  valoresNuevos o sin tarifa aplicada (y no eventual) es un error — las ops
 *  históricas de Vantruck se traducen con la migración antes de usar este
 *  código. */
```

10.2 BUSCAR:
```
  /** Lo que suma UNA operación a cada uno de sus resúmenes.
   *  Fuente normal: op.valoresNuevos (tarifaBase × multiplicador) + nivel
   *  por lado desde tarifaAplicadaCliente/Chofer (o eventual).
   *  Fuente LEGACY (ops históricas sin valoresNuevos, ej. Vantruck antes de
   *  la migración): op.valores — su tarifaBase YA está multiplicada — y
   *  nivel desde op.tarifaTipo, el mismo en los dos lados. Lanza solo si la
   *  op no tiene ninguna de las dos fuentes. */
  aporteDeOperacion(op: Operacion): MetricasResumen {
    const { cliente, chofer } = op.valoresNuevos
      ? this.ladosDesdeValoresNuevos(op)
      : this.ladosDesdeLegacy(op);
```
REEMPLAZAR:
```
  /** Lo que suma UNA operación a cada uno de sus resúmenes: op.valoresNuevos
   *  (tarifaBase × multiplicador) + nivel por lado desde
   *  tarifaAplicadaCliente/Chofer (o eventual). Lanza si la op no tiene
   *  valoresNuevos. */
  aporteDeOperacion(op: Operacion): MetricasResumen {
    if (!op.valoresNuevos) {
      throw new Error(`ResumenOpFactory: la operación ${this.etiqueta(op)} no tiene valoresNuevos.`);
    }
    const { cliente, chofer } = this.ladosDesdeValoresNuevos(op);
```

10.3 BUSCAR:
```
   *  reporta en `errores` y no se suma. `legacy`: cuántas ops sumadas
   *  usaron la fuente legacy (op.valores / op.tarifaTipo). */
  agregados(
    ops: Operacion[],
    ahora: number,
  ): { resumenes: Map<string, ResumenOpNuevo>; errores: ErrorAgregado[]; legacy: number } {
    const resumenes = new Map<string, ResumenOpNuevo>();
    const errores: ErrorAgregado[] = [];
    let legacy = 0;
```
REEMPLAZAR:
```
   *  reporta en `errores` y no se suma. */
  agregados(
    ops: Operacion[],
    ahora: number,
  ): { resumenes: Map<string, ResumenOpNuevo>; errores: ErrorAgregado[] } {
    const resumenes = new Map<string, ResumenOpNuevo>();
    const errores: ErrorAgregado[] = [];
```

10.4 BUSCAR:
```
      if (this.usaFuenteLegacy(op)) legacy++;
      for (const clave of claves) {
```
REEMPLAZAR:
```
      for (const clave of claves) {
```

10.5 BUSCAR:
```
    return { resumenes, errores, legacy };
```
REEMPLAZAR:
```
    return { resumenes, errores };
```

10.6 BUSCAR:
```
  /** true si el aporte de la op sale de la fuente legacy (sin valoresNuevos). */
  usaFuenteLegacy(op: Operacion): boolean {
    return !op.valoresNuevos;
  }

  private ladosDesdeValoresNuevos(
```
REEMPLAZAR:
```
  private ladosDesdeValoresNuevos(
```

10.7 BUSCAR:
```
  private ladosDesdeLegacy(op: Operacion): { cliente: LadoResumen; chofer: LadoResumen } {
    const v = op.valores;
    if (!v?.cliente || !v?.chofer) {
      throw new Error(`ResumenOpFactory: la operación ${this.etiqueta(op)} no tiene valoresNuevos ni valores.`);
    }
    const nivel = this.nivelLegacy(op);
    return {
      cliente: this.lado(
        v.cliente.tarifaBase, v.cliente.kmAdicional, v.cliente.acompValor,
        v.cliente.adExtraValor ?? 0, v.cliente.aCobrar, nivel,
      ),
      chofer: this.lado(
        v.chofer.tarifaBase, v.chofer.kmAdicional, v.chofer.acompValor,
        v.chofer.adExtraValor ?? 0, v.chofer.aPagar, nivel,
      ),
    };
  }

  /** Nivel por lado: eventual (de la op) > tarifa aplicada del lado >
   *  fallback op.tarifaTipo (ops sin referencia congelada). */
  private nivelDeLado(op: Operacion, lado: 'cliente' | 'chofer', esEventual: boolean): NivelResumen {
    if (esEventual) return 'eventual';
    const ref = lado === 'cliente' ? op.tarifaAplicadaCliente : op.tarifaAplicadaChofer;
    return ref ? ref.nivel : this.nivelLegacy(op);
  }

  /** Nivel único del modelo viejo (op.tarifaTipo). */
  private nivelLegacy(op: Operacion): NivelResumen {
    const t = op.tarifaTipo;
    if (t?.general) return 'general';
    if (t?.especial) return 'especial';
    if (t?.eventual) return 'eventual';
    if (t?.personalizada) return 'personalizada';
    throw new Error(`ResumenOpFactory: la operación ${this.etiqueta(op)} no tiene nivel de tarifa (ni tarifaAplicada ni tarifaTipo).`);
  }

  private lado(
```
REEMPLAZAR:
```
  /** Nivel por lado: eventual (de la op) > tarifa aplicada del lado. Sin
   *  ninguna de las dos es un error (TC8: fuera el respaldo con los booleanos
   *  legacy de la op). */
  private nivelDeLado(op: Operacion, lado: 'cliente' | 'chofer', esEventual: boolean): NivelResumen {
    if (esEventual) return 'eventual';
    const ref = lado === 'cliente' ? op.tarifaAplicadaCliente : op.tarifaAplicadaChofer;
    if (!ref) {
      throw new Error(`ResumenOpFactory: la operación ${this.etiqueta(op)} no tiene tarifa aplicada del lado ${lado}.`);
    }
    return ref.nivel;
  }

  private lado(
```

## PASO 11 — src/app/servicios/desarrollo/recalculo-resumenes.service.ts

11.1 BUSCAR:
```
  opsSumadas: number;
  opsLegacy: number;      // sumadas desde op.valores / op.tarifaTipo
```
REEMPLAZAR:
```
  opsSumadas: number;
```

11.2 BUSCAR:
```
    const { resumenes, errores, legacy } = this.factory.agregados(cerradas, Date.now());
```
REEMPLAZAR:
```
    const { resumenes, errores } = this.factory.agregados(cerradas, Date.now());
```

11.3 BUSCAR:
```
      opsSumadas: cerradas.length - errores.length,
      opsLegacy: legacy,
```
REEMPLAZAR:
```
      opsSumadas: cerradas.length - errores.length,
```

## PASO 12 — src/app/componentes/recalculo-resumenes/recalculo-resumenes.component.html

12.1 BUSCAR:
```
        — sumadas: {{ simulacion.opsSumadas }} — con fuente legacy: {{ simulacion.opsLegacy }}</li>
```
REEMPLAZAR:
```
        — sumadas: {{ simulacion.opsSumadas }}</li>
```

## Verificación

1. `grep -rn "tarifaTipo\b\|TarifaTipo\b" src/` → solo: interfaces/informe-op.ts,
   interfaces/tarifa-gral-cliente.ts, migrar-datos.component.ts y
   servicios/migracion/ (cliente-, chofer-, proveedor-migration y
   tarifa-habilitada-migracion.util).
2. `grep -rn "tarifaTipoDesdeHabilitadas\|getTarifaTipo\|aplicarTarifaTipo\|recalcularTarifaTipo\|aplicarTarifaEventual\|resolverJerarquiaTarifa\|tarifaOriginal\|tipoRecalculado\|opsLegacy\|usaFuenteLegacy\|ladosDesdeLegacy\|nivelLegacy\|legacyComoHabilitadas" src/`
   → sin resultados.
3. `grep -rn "aplicarEventual(\|esEventualPorHabilitadas(" src/` → 2
   definiciones (factory) + usos en factory (alta), resolucion (asignarChofer)
   y editor (toggle).
4. `npm run build:demo` sin errores nuevos.
5. Mostrá el diff completo de los archivos editados.

## Pruebas manuales (demo)

ANTES de aplicar (nico): /migracion → Recálculo de resúmenes → Simular el
rango completo de operaciones de demo. Anotá "con fuente legacy" y los
errores. Si "con fuente legacy" es > 0, NO apliques TC8 y avisá (hay ops
sin valoresNuevos que el código nuevo ya no sabe sumar).

Después de aplicar:
1. Alta desde asignación:
   - cliente con Eventual habilitado → op nace eventual (toggle
     deshabilitado);
   - chofer/proveedor con Eventual → ídem;
   - cliente normal → no eventual.
2. Toggle Eventual en el editor sobre una op no forzada: activar → valores
   eventuales; desactivar → vuelve a candidatos normales.
3. Proveedor con chofer pendiente: resolver el chofer → si el proveedor es
   Eventual la op pasa a eventual; si no, sigue normal. Cambiar chofer y
   volver a elegir: sin errores.
4. Cabecera de una op (detalle): badges de cliente y chofer como antes.
5. Cierre de una op normal y de una eventual: valores y resúmenes OK.
6. /migracion → Recálculo → Simular el rango completo: 0 errores y la
   línea de sumadas sin "con fuente legacy". Si aparece un error "no tiene
   tarifa aplicada del lado …" o "no tiene valoresNuevos", avisá con la
   lista.
7. Generador: un plan chico con % de eventual extra > 0 se ejecuta sin
   errores.

## Mensaje de commit

refactor(tarifas): fuera tarifaTipo de Operacion; eventual = datosTarifaEventual (TC8)

- Operacion sin tarifaTipo; TarifaTipo de chofer.ts y el shim
  tarifaTipoDesdeHabilitadas fuera.
- OperacionFactoryService: esEventualPorHabilitadas + aplicarEventual en vez
  de la jerarquía legacy (resolverJerarquiaTarifa, recalcularTarifaTipo,
  aplicarTarifaTipo, aplicarTarifaEventual).
- ResolucionTarifaOpService.asignarChofer devuelve eventualRecalculado;
  ProveedorService.getTarifaTipo fuera.
- operaciones-editor: eventualOriginal (boolean) como punto de retorno del
  toggle; esEventual por datosTarifaEventual.
- Generador sin aplicarTarifaEventual; operacion-cabecera sin respaldo legacy.
- Reportes: fuera la fuente legacy (op.valores / tarifaTipo) y opsLegacy del
  recálculo.

FIN DE LA INSTRUCCIÓN TC8
````
