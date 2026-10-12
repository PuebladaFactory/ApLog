````
INSTRUCCIÓN TC-P1 — Tarifas (cierre): helpers del historial a shared/utils
================================================================================

Si no ves la línea "FIN DE LA INSTRUCCIÓN TC-P1" al final, el texto llegó
cortado: leé el archivo completo antes de empezar.

## Contexto y razonamiento

Las cuatro pantallas de Tarifas (General, Personalizada, Especial e
Historial) tienen copiado el mismo código para mostrar el historial de
versiones:
  - `textoAumento(t)`: 4 copias idénticas.
  - delta cobrar/pagar de una Tarifa: 3 copias idénticas (`deltaGeneral` en
    General, `deltaPersonalizada` en Personalizada e Historial).
  - delta de una TarifaEspecial: 2 copias idénticas (`deltaEspecial` en
    Especial e Historial).
Si mañana cambia el criterio (por ejemplo, un modo de aumento nuevo), hay
que tocar 4 lugares y es fácil que diverjan. Decisión T10: pasan a
funciones puras en `shared/utils/historial-tarifa.util.ts` (mismo patrón
que vigencia-tarifa.util de TC5).

Cómo se conectan sin tocar los templates: cada componente expone la función
como propiedad con el MISMO nombre que el método actual:
    readonly textoAumento = textoAumentoTarifa;
    readonly deltaGeneral = deltaTarifa;
El template sigue llamando `textoAumento(t)` / `deltaGeneral(t, ant)` igual
que hoy. Las funciones no usan `this`, así que referenciarlas como propiedad
es seguro. Los .html NO se tocan.

Comportamiento: idéntico (el cuerpo de las funciones es el mismo código que
hoy; solo cambian los tipos de los parámetros a `Pick<…, 'secciones'>`, que
aceptan lo mismo que antes). El import de `MetadataAumento` queda sin uso en
los 4 componentes y se quita.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto a BUSCAR no está, o aparece más de una vez: detenete y reportá.
- Aplicá los cambios de cada archivo EN ORDEN.
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un
  archivo para escritura antes de haber leído su contenido. El único archivo
  NUEVO es historial-tarifa.util.ts (verificá antes que no exista).
- Ningún BUSCAR de esta instrucción tiene espacios al final de línea.
- Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md.
- No toques ningún .html.

## PASO 0 — Verificación (sin modificar nada)

0.1 `src/app/shared/utils/historial-tarifa.util.ts` NO existe, y
    `grep -rn "textoAumentoTarifa\|deltaTarifa" src/` → sin resultados.
0.2 `grep -rn "textoAumento\|deltaGeneral\|deltaPersonalizada\|deltaEspecial" src/ --include=*.ts`
    → solo en los 4 componentes: tarifas-especial, tarifas-general,
    tarifas-personalizada, tarifas-historial (definiciones y comentarios).
    Ningún .spec.ts, ningún otro .ts.
0.3 En .html, esas llamadas aparecen solo en los templates de esos mismos 4
    componentes (`grep -rln "textoAumento\|deltaGeneral\|deltaPersonalizada\|deltaEspecial" src/ --include=*.html`
    → 4 archivos).
0.4 `grep -c "MetadataAumento" <componente>.ts` → 2 en cada uno de los 4
    (el import y la firma de textoAumento).
Si algo no coincide, DETENETE y reportá.

## PASO 1 — NUEVO src/app/shared/utils/historial-tarifa.util.ts

Crear con este contenido exacto:

```
import { MetadataAumento, Tarifa } from 'src/app/interfaces/tarifa';
import { TarifaEspecial } from 'src/app/interfaces/tarifa-especial';

/** Helpers del historial de versiones de tarifas (pantallas de Tarifas:
 *  General, Personalizada, Especial e Historial). Funciones puras, sin
 *  Angular. Los componentes las exponen como propiedades para usarlas en
 *  los templates (TC-P1: antes estaban copiadas en cada componente). */

/** Variación % aproximada contra la versión inmediata anterior del mismo
 *  linaje, separada cobrar/pagar — suma de todas las categorías, no por
 *  categoría individual (el detalle se ve entrando a cada versión). null si
 *  no hay anterior o si la base es 0. Sirve para General y Personalizada
 *  (misma interfaz Tarifa). */
export function deltaTarifa(
  actual: Pick<Tarifa, 'secciones'>,
  anterior?: Pick<Tarifa, 'secciones'>,
): { cobrar: number | null; pagar: number | null } {
  if (!anterior) return { cobrar: null, pagar: null };
  const sumar = (t: Pick<Tarifa, 'secciones'>, campo: 'aCobrar' | 'aPagar') =>
    t.secciones.flatMap(s => s.categorias).reduce((acc, c) => acc + c[campo], 0);
  const calc = (campo: 'aCobrar' | 'aPagar'): number | null => {
    const base = sumar(anterior, campo);
    if (base === 0) return null;
    return ((sumar(actual, campo) - base) / base) * 100;
  };
  return { cobrar: calc('aCobrar'), pagar: calc('aPagar') };
}

/** Ídem para Especial: un solo `valor` por categoría (no aCobrar/aPagar
 *  separados). null si no hay anterior o si la base es 0. */
export function deltaTarifaEspecial(
  actual: Pick<TarifaEspecial, 'secciones'>,
  anterior?: Pick<TarifaEspecial, 'secciones'>,
): number | null {
  if (!anterior) return null;
  const sumar = (t: Pick<TarifaEspecial, 'secciones'>) =>
    t.secciones.flatMap(s => s.categorias).reduce((acc, c) => acc + c.valor, 0);
  const base = sumar(anterior);
  if (base === 0) return null;
  return ((sumar(actual) - base) / base) * 100;
}

/** Texto descriptivo de metadataAumento para el historial, o null si la
 *  versión no vino de la herramienta de aumento (edición manual, o versión
 *  anterior a este campo). */
export function textoAumentoTarifa(t: { metadataAumento?: MetadataAumento }): string | null {
  const m = t.metadataAumento;
  if (!m) return null;
  const redondeo = m.redondeo ? `, redondeo ${m.redondeo}` : '';
  const ajuste = m.ajustadoManualmente ? ' (con ajuste manual)' : '';
  if (m.modo === 'manual') return `Aumento manual${redondeo}`;
  if (m.modo === 'unico') return `Aumento único +${m.porcentajeUnico}%${redondeo}${ajuste}`;
  const partes = [
    m.porcentajeCobrar !== undefined ? `cobrar +${m.porcentajeCobrar}%` : null,
    m.porcentajePagar !== undefined ? `pagar +${m.porcentajePagar}%` : null,
    m.porcentajeProveedor !== undefined ? `proveedor +${m.porcentajeProveedor}%` : null,
  ].filter((p): p is string => p !== null);
  return `Aumento segmentado — ${partes.join(', ')}${redondeo}${ajuste}`;
}
```

## PASO 2 — src/app/raiz/tarifas/tarifas-especial/tarifas-especial.component.ts

2.1 BUSCAR:
```
import { EntidadTipo, MetadataAumento } from 'src/app/interfaces/tarifa';
```
REEMPLAZAR:
```
import { EntidadTipo } from 'src/app/interfaces/tarifa';
```

2.2 BUSCAR:
```
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
```
REEMPLAZAR:
```
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
import { deltaTarifaEspecial, textoAumentoTarifa } from 'src/app/shared/utils/historial-tarifa.util';
```

2.3 BUSCAR:
```
  /** % de variación aproximado contra la versión inmediata anterior del
   *  mismo linaje — mismo criterio que TarifasHistorialComponent.
   *  deltaEspecial (Especial tiene un solo `valor` por categoría, no
   *  aCobrar/aPagar separados). null si no hay anterior o si la base es 0. */
  deltaEspecial(actual: ConIdType<TarifaEspecial>, anterior?: ConIdType<TarifaEspecial>): number | null {
    if (!anterior) return null;
    const sumar = (t: ConIdType<TarifaEspecial>) =>
      t.secciones.flatMap(s => s.categorias).reduce((acc, c) => acc + c.valor, 0);
    const base = sumar(anterior);
    if (base === 0) return null;
    return ((sumar(actual) - base) / base) * 100;
  }

  /** Texto descriptivo de metadataAumento — mismo criterio que
   *  TarifasGeneralComponent/TarifasHistorialComponent. */
  textoAumento(t: { metadataAumento?: MetadataAumento }): string | null {
    const m = t.metadataAumento;
    if (!m) return null;
    const redondeo = m.redondeo ? `, redondeo ${m.redondeo}` : '';
    const ajuste = m.ajustadoManualmente ? ' (con ajuste manual)' : '';
    if (m.modo === 'manual') return `Aumento manual${redondeo}`;
    if (m.modo === 'unico') return `Aumento único +${m.porcentajeUnico}%${redondeo}${ajuste}`;
    const partes = [
      m.porcentajeCobrar !== undefined ? `cobrar +${m.porcentajeCobrar}%` : null,
      m.porcentajePagar !== undefined ? `pagar +${m.porcentajePagar}%` : null,
      m.porcentajeProveedor !== undefined ? `proveedor +${m.porcentajeProveedor}%` : null,
    ].filter((p): p is string => p !== null);
    return `Aumento segmentado — ${partes.join(', ')}${redondeo}${ajuste}`;
  }
```
REEMPLAZAR:
```
  /** Helpers del historial (shared/utils/historial-tarifa.util — TC-P1),
   *  expuestos para el template. */
  readonly deltaEspecial = deltaTarifaEspecial;
  readonly textoAumento = textoAumentoTarifa;
```

## PASO 3 — src/app/raiz/tarifas/tarifas-general/tarifas-general.component.ts

3.1 BUSCAR:
```
import { MetadataAumento, Tarifa } from 'src/app/interfaces/tarifa';
```
REEMPLAZAR:
```
import { Tarifa } from 'src/app/interfaces/tarifa';
```

3.2 BUSCAR:
```
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
```
REEMPLAZAR:
```
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
import { deltaTarifa, textoAumentoTarifa } from 'src/app/shared/utils/historial-tarifa.util';
```

3.3 BUSCAR:
```
  /** % de variación aproximado contra la versión anterior — mismo criterio que
   *  TarifasHistorialComponent.deltaPersonalizada (General usa la misma
   *  interfaz Tarifa, el cálculo es idéntico). Suma de todas las categorías,
   *  no por categoría individual. null si no hay anterior o si la base es 0. */
  deltaGeneral(actual: ConIdType<Tarifa>, anterior?: ConIdType<Tarifa>): { cobrar: number | null; pagar: number | null } {
    if (!anterior) return { cobrar: null, pagar: null };
    const sumar = (t: ConIdType<Tarifa>, campo: 'aCobrar' | 'aPagar') =>
      t.secciones.flatMap(s => s.categorias).reduce((acc, c) => acc + c[campo], 0);
    const calc = (campo: 'aCobrar' | 'aPagar'): number | null => {
      const base = sumar(anterior, campo);
      if (base === 0) return null;
      return ((sumar(actual, campo) - base) / base) * 100;
    };
    return { cobrar: calc('aCobrar'), pagar: calc('aPagar') };
  }

  /** Texto descriptivo de metadataAumento para el historial, o null si la
   *  versión no vino de la herramienta de aumento (edición manual, o versión
   *  anterior a este campo). */
  textoAumento(t: { metadataAumento?: MetadataAumento }): string | null {
    const m = t.metadataAumento;
    if (!m) return null;
    const redondeo = m.redondeo ? `, redondeo ${m.redondeo}` : '';
    const ajuste = m.ajustadoManualmente ? ' (con ajuste manual)' : '';
    if (m.modo === 'manual') return `Aumento manual${redondeo}`;
    if (m.modo === 'unico') return `Aumento único +${m.porcentajeUnico}%${redondeo}${ajuste}`;
    const partes = [
      m.porcentajeCobrar !== undefined ? `cobrar +${m.porcentajeCobrar}%` : null,
      m.porcentajePagar !== undefined ? `pagar +${m.porcentajePagar}%` : null,
      m.porcentajeProveedor !== undefined ? `proveedor +${m.porcentajeProveedor}%` : null,
    ].filter((p): p is string => p !== null);
    return `Aumento segmentado — ${partes.join(', ')}${redondeo}${ajuste}`;
  }
```
REEMPLAZAR:
```
  /** Helpers del historial (shared/utils/historial-tarifa.util — TC-P1),
   *  expuestos para el template. */
  readonly deltaGeneral = deltaTarifa;
  readonly textoAumento = textoAumentoTarifa;
```

## PASO 4 — src/app/raiz/tarifas/tarifas-personalizada/tarifas-personalizada.component.ts

4.1 BUSCAR:
```
import { MetadataAumento, Tarifa } from 'src/app/interfaces/tarifa';
```
REEMPLAZAR:
```
import { Tarifa } from 'src/app/interfaces/tarifa';
```

4.2 BUSCAR:
```
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
```
REEMPLAZAR:
```
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
import { deltaTarifa, textoAumentoTarifa } from 'src/app/shared/utils/historial-tarifa.util';
```

4.3 BUSCAR:
```
  /** % de variación aproximado contra la versión inmediata anterior del mismo
   *  linaje, separado cobrar/pagar — mismo criterio que
   *  TarifasGeneralComponent.deltaGeneral()/TarifasHistorialComponent.deltaPersonalizada(). */
  deltaPersonalizada(actual: ConIdType<Tarifa>, anterior?: ConIdType<Tarifa>): { cobrar: number | null; pagar: number | null } {
    if (!anterior) return { cobrar: null, pagar: null };
    const sumar = (t: ConIdType<Tarifa>, campo: 'aCobrar' | 'aPagar') =>
      t.secciones.flatMap(s => s.categorias).reduce((acc, c) => acc + c[campo], 0);
    const calc = (campo: 'aCobrar' | 'aPagar'): number | null => {
      const base = sumar(anterior, campo);
      if (base === 0) return null;
      return ((sumar(actual, campo) - base) / base) * 100;
    };
    return { cobrar: calc('aCobrar'), pagar: calc('aPagar') };
  }

  /** Texto descriptivo de metadataAumento — mismo criterio que
   *  TarifasGeneralComponent/TarifasHistorialComponent. */
  textoAumento(t: { metadataAumento?: MetadataAumento }): string | null {
    const m = t.metadataAumento;
    if (!m) return null;
    const redondeo = m.redondeo ? `, redondeo ${m.redondeo}` : '';
    const ajuste = m.ajustadoManualmente ? ' (con ajuste manual)' : '';
    if (m.modo === 'manual') return `Aumento manual${redondeo}`;
    if (m.modo === 'unico') return `Aumento único +${m.porcentajeUnico}%${redondeo}${ajuste}`;
    const partes = [
      m.porcentajeCobrar !== undefined ? `cobrar +${m.porcentajeCobrar}%` : null,
      m.porcentajePagar !== undefined ? `pagar +${m.porcentajePagar}%` : null,
      m.porcentajeProveedor !== undefined ? `proveedor +${m.porcentajeProveedor}%` : null,
    ].filter((p): p is string => p !== null);
    return `Aumento segmentado — ${partes.join(', ')}${redondeo}${ajuste}`;
  }
```
REEMPLAZAR:
```
  /** Helpers del historial (shared/utils/historial-tarifa.util — TC-P1),
   *  expuestos para el template. */
  readonly deltaPersonalizada = deltaTarifa;
  readonly textoAumento = textoAumentoTarifa;
```

## PASO 5 — src/app/raiz/tarifas/tarifas-historial/tarifas-historial.component.ts

5.1 BUSCAR:
```
import { EntidadTipo, MetadataAumento, Tarifa } from 'src/app/interfaces/tarifa';
```
REEMPLAZAR:
```
import { EntidadTipo, Tarifa } from 'src/app/interfaces/tarifa';
```

5.2 BUSCAR:
```
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
```
REEMPLAZAR:
```
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
import { deltaTarifa, deltaTarifaEspecial, textoAumentoTarifa } from 'src/app/shared/utils/historial-tarifa.util';
```

5.3 BUSCAR:
```
  /** % de variación aproximado contra la versión inmediata anterior del mismo
   *  linaje — suma de todas las categorías, no por categoría individual (el
   *  detalle real se ve entrando a "Ver" en cada versión). null si no hay
   *  anterior o si la base es 0. */
  deltaPersonalizada(actual: ConIdType<Tarifa>, anterior?: ConIdType<Tarifa>): { cobrar: number | null; pagar: number | null } {
    if (!anterior) return { cobrar: null, pagar: null };
    const sumar = (t: ConIdType<Tarifa>, campo: 'aCobrar' | 'aPagar') =>
      t.secciones.flatMap(s => s.categorias).reduce((acc, c) => acc + c[campo], 0);
    const calc = (campo: 'aCobrar' | 'aPagar'): number | null => {
      const base = sumar(anterior, campo);
      if (base === 0) return null;
      return ((sumar(actual, campo) - base) / base) * 100;
    };
    return { cobrar: calc('aCobrar'), pagar: calc('aPagar') };
  }

  deltaEspecial(actual: ConIdType<TarifaEspecial>, anterior?: ConIdType<TarifaEspecial>): number | null {
    if (!anterior) return null;
    const sumar = (t: ConIdType<TarifaEspecial>) =>
      t.secciones.flatMap(s => s.categorias).reduce((acc, c) => acc + c.valor, 0);
    const base = sumar(anterior);
    if (base === 0) return null;
    return ((sumar(actual) - base) / base) * 100;
  }

  /** Texto descriptivo de metadataAumento para el historial, o null si la
   *  versión no vino de la herramienta de aumento (edición manual, o versión
   *  anterior a este campo). Mismo criterio que TarifasGeneralComponent. */
  textoAumento(t: { metadataAumento?: MetadataAumento }): string | null {
    const m = t.metadataAumento;
    if (!m) return null;
    const redondeo = m.redondeo ? `, redondeo ${m.redondeo}` : '';
    const ajuste = m.ajustadoManualmente ? ' (con ajuste manual)' : '';
    if (m.modo === 'manual') return `Aumento manual${redondeo}`;
    if (m.modo === 'unico') return `Aumento único +${m.porcentajeUnico}%${redondeo}${ajuste}`;
    const partes = [
      m.porcentajeCobrar !== undefined ? `cobrar +${m.porcentajeCobrar}%` : null,
      m.porcentajePagar !== undefined ? `pagar +${m.porcentajePagar}%` : null,
      m.porcentajeProveedor !== undefined ? `proveedor +${m.porcentajeProveedor}%` : null,
    ].filter((p): p is string => p !== null);
    return `Aumento segmentado — ${partes.join(', ')}${redondeo}${ajuste}`;
  }
```
REEMPLAZAR:
```
  /** Helpers del historial (shared/utils/historial-tarifa.util — TC-P1),
   *  expuestos para el template. */
  readonly deltaPersonalizada = deltaTarifa;
  readonly deltaEspecial = deltaTarifaEspecial;
  readonly textoAumento = textoAumentoTarifa;
```

## Verificación

1. `grep -rn "MetadataAumento" src/app/raiz/tarifas/tarifas-especial/ src/app/raiz/tarifas/tarifas-general/ src/app/raiz/tarifas/tarifas-personalizada/ src/app/raiz/tarifas/tarifas-historial/`
   → sin resultados.
2. `grep -rln "historial-tarifa.util" src/` → los 4 componentes.
3. `grep -rn "porcentajeProveedor !== undefined" src/` → 1 (solo el util).
4. `grep -rn "readonly textoAumento = textoAumentoTarifa;" src/` → 4.
5. `npm run build:demo` sin errores nuevos (el chequeo estricto de
   templates valida que las llamadas de los .html sigan tipando).
6. Mostrá el diff completo de los 4 componentes y el archivo nuevo.

## Pruebas manuales (demo)

Antes de aplicar, abrí y anotá (o sacá captura) de lo que muestra cada
pantalla; después, tiene que verse exactamente igual:
1. Tarifas → General → historial de versiones: textos "Aumento único +X%",
   "Aumento segmentado — …", "Aumento manual" y los % de variación
   cobrar/pagar (o "s/d" en la primera versión).
2. Tarifas → Personalizada de un cliente con varias versiones: ídem.
3. Tarifas → Especial con varias versiones: texto de aumento y % de
   variación (un solo valor).
4. Tarifas → Historial (vista de linajes) de una Personalizada y de una
   Especial: ídem, en ambos sentidos de la lista.

## Mensaje de commit

refactor(tarifas): helpers del historial a shared/utils (TC-P1)

- shared/utils/historial-tarifa.util.ts (nuevo, puro): deltaTarifa,
  deltaTarifaEspecial, textoAumentoTarifa.
- Tarifas General / Personalizada / Especial / Historial: fuera las copias
  locales; exponen las funciones como propiedades con el mismo nombre (los
  templates no cambian). Sin cambios de comportamiento.

FIN DE LA INSTRUCCIÓN TC-P1
````
