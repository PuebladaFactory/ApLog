````
INSTRUCCIÓN TC7 — Tarifas (cierre): lectura directa de tarifasHabilitadas (helper puro, badges, papelera, forms)
==============================================================================================================

Si no ves la línea "FIN DE LA INSTRUCCIÓN TC7" al final, el texto llegó
cortado: leé el archivo completo antes de empezar.

## Contexto y razonamiento

`tarifaTipoDesdeHabilitadas` (interfaces/tarifa-habilitada.ts) es un shim:
convierte la lista tarifasHabilitadas (multiplicidad: una entidad puede
tener Personalizada + General, etc.) a los 4 booleanos viejos de TarifaTipo.
Los consumidores de PANTALLA lo usaban para colapsar la lista en una sola
etiqueta, y así mostraban información incompleta:
- operaciones-editor: badge "Tarifa Cliente" con UN nivel aunque el cliente
  tenga varios.
- objeto-papelera: etiqueta con UN nivel, y "Eventual" si la lista venía
  vacía (error).
- Forms de alta (cliente, chofer, proveedor): pasaban por TarifaTipo solo
  para tildar los checkboxes por nivel.

Decisiones ya tomadas (T6/T7 del diseño):
1. Helper puro nuevo en interfaces/tarifa-habilitada.ts:
   `nivelesHabilitados(lista): NivelHabilitado[]` — niveles sin repetidos,
   en orden fijo (personalizada, especial, general, eventual); acepta
   null/undefined. Se eligió array ordenado (no Set) porque los badges y la
   etiqueta necesitan un orden estable; para "¿tiene X?" alcanza
   `.includes`.
2. operaciones-editor: un badge por nivel, con los mismos pipes que
   operacion-cabecera (claseNivelTarifa / etiquetaNivelTarifa). Cliente no
   encontrado en memoria → badge "—" (antes caía a op.tarifaTipo).
3. Papelera: "Personalizada + General"; sin datos → "—".
4. Forms de alta: checkboxes desde nivelesHabilitados(...).includes(...).

Qué NO cambia en este bloque (TC8): el shim sigue existiendo porque todavía
lo usan los que PRODUCEN op.tarifaTipo (OperacionFactoryService y
ProveedorService.getTarifaTipo → ResolucionTarifaOpService.asignarChofer).
Sale en TC8 junto con tarifaTipo. Su docblock queda al día.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto a BUSCAR no está, o aparece más de una vez: detenete y reportá.
- Aplicá los cambios de cada archivo EN ORDEN.
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Ningún BUSCAR de esta instrucción tiene espacios al final de línea.
- Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md.
- Se toca una interfaz interna del editor (GrupoEditor.tipoCliente →
  nivelesCliente) y se agrega un export a tarifa-habilitada.ts: revisá
  usos en src/ (incluidos .spec.ts y .html) — ver 0.2 y 0.3.

## PASO 0 — Verificación (sin modificar nada)

0.1 `grep -rn "tarifaTipoDesdeHabilitadas" src/` → la definición en
    interfaces/tarifa-habilitada.ts y usos en: objeto-papelera (import + 2),
    operacion-factory.service.ts (import + 2 + 2 menciones en docblocks),
    proveedor.service.ts (import + 1 + 1 mención en docblock),
    operaciones-editor (import + 1), cliente-alta, choferes-alta y
    proveedores-alta (import + 1 cada uno). Ningún .spec.ts.
0.2 `grep -rn "tipoCliente\b\|tipoClienteLabel" src/app/raiz/operaciones/` →
    solo operaciones-editor.component.ts y .html.
0.3 `grep -rn "nivelesHabilitados\|NivelHabilitado\b" src/` → sin resultados.
0.4 operaciones.module.ts importa SharedModule (que exporta los pipes
    claseNivelTarifa y etiquetaNivelTarifa, ya usados por operacion-cabecera).
Si algo no coincide, DETENETE y reportá.

## PASO 1 — src/app/interfaces/tarifa-habilitada.ts

1.1 BUSCAR:
```
/**
 * Shim de compatibilidad — reconstruye los 4 booleanos legacy a partir de
 * tarifasHabilitadas, para los consumidores que todavía esperan TarifaTipo.
 * TODO: refactor Tarifas — reemplazar cada consumidor por lectura directa de
 * tarifasHabilitadas cuando se resuelva multiplicidad real en cada uno.
 */
export function tarifaTipoDesdeHabilitadas(
```
REEMPLAZAR:
```
export type NivelHabilitado = RefTarifaHabilitada['nivel'];

/** Orden de exhibición de los niveles (del más específico al más genérico). */
const ORDEN_NIVELES: NivelHabilitado[] = ['personalizada', 'especial', 'general', 'eventual'];

/** Niveles habilitados de una entidad, sin repetidos y en orden fijo
 *  (personalizada, especial, general, eventual). Lista vacía o ausente → [].
 *  Helper puro para leer tarifasHabilitadas sin pasar por TarifaTipo: forms
 *  de alta, badges, etiquetas (TC7). */
export function nivelesHabilitados(lista: RefTarifaHabilitada[] | null | undefined): NivelHabilitado[] {
  const presentes = new Set((lista ?? []).map(t => t.nivel));
  return ORDEN_NIVELES.filter(n => presentes.has(n));
}

/**
 * Shim de compatibilidad — reconstruye los 4 booleanos legacy (TarifaTipo) a
 * partir de tarifasHabilitadas. Desde TC7 solo lo usan los que todavía
 * producen op.tarifaTipo (OperacionFactoryService y
 * ProveedorService.getTarifaTipo); se retira en TC8 junto con tarifaTipo.
 */
export function tarifaTipoDesdeHabilitadas(
```

## PASO 2 — src/app/shared/modales/objeto-papelera/objeto-papelera.component.ts

2.1 BUSCAR:
```
import { RefTarifaHabilitada, tarifaTipoDesdeHabilitadas } from 'src/app/interfaces/tarifa-habilitada';
```
REEMPLAZAR:
```
import { RefTarifaHabilitada, nivelesHabilitados } from 'src/app/interfaces/tarifa-habilitada';
import { EtiquetaNivelTarifaPipe } from 'src/app/shared/pipes/etiqueta-nivel-tarifa.pipe';
```

2.2 BUSCAR:
```
    // TODO: refactor Tarifas — reemplazar por lectura directa de tarifasHabilitadas
    getTarifaLabel(objeto: any): string {
      if (objeto?.contratacion?.tipo === 'proveedor') {
        const proveedor = this.proveedorService.getProveedorPorId(objeto.contratacion.idProveedor);
        const tarifasHabilitadas = proveedor?.tarifasHabilitadas ?? this.tarifasProveedorFallback;
        if (!tarifasHabilitadas) return '—';
        const tProveedor = tarifaTipoDesdeHabilitadas(tarifasHabilitadas);
        return tProveedor.general ? 'General' : tProveedor.especial ? 'Especial' : tProveedor.personalizada ? 'Personalizada' : 'Eventual';
      }
      const t = tarifaTipoDesdeHabilitadas(objeto?.tarifasHabilitadas ?? []);
      return t.general ? 'General' : t.especial ? 'Especial' : t.personalizada ? 'Personalizada' : 'Eventual';
    }
```
REEMPLAZAR:
```
    /** Tarifas habilitadas como texto ("Personalizada + General"). Chofer de
     *  proveedor: las del proveedor (vivo o en papelera). Sin datos → '—'.
     *  Antes mostraba un solo nivel, y 'Eventual' si la lista venía vacía. */
    getTarifaLabel(objeto: any): string {
      const lista: RefTarifaHabilitada[] | null = objeto?.contratacion?.tipo === 'proveedor'
        ? (this.proveedorService.getProveedorPorId(objeto.contratacion.idProveedor)?.tarifasHabilitadas
           ?? this.tarifasProveedorFallback)
        : (objeto?.tarifasHabilitadas ?? null);
      const niveles = nivelesHabilitados(lista);
      if (niveles.length === 0) return '—';
      return niveles.map(n => this.etiquetaNivel.transform(n)).join(' + ');
    }

    private etiquetaNivel = new EtiquetaNivelTarifaPipe();
```

## PASO 3 — src/app/raiz/operaciones/operaciones-editor/operaciones-editor.component.ts

3.1 BUSCAR:
```
import { tarifaTipoDesdeHabilitadas } from 'src/app/interfaces/tarifa-habilitada';
```
REEMPLAZAR:
```
import { NivelHabilitado, nivelesHabilitados } from 'src/app/interfaces/tarifa-habilitada';
```

3.2 BUSCAR:
```
  /** tarifaTipo del CLIENTE (informativo, para el badge del encabezado). */
  tipoCliente: 'general' | 'especial' | 'eventual' | 'personalizada';
```
REEMPLAZAR:
```
  /** Niveles de tarifa habilitados del CLIENTE (informativo, badges del
   *  encabezado; uno por nivel, como operacion-cabecera). Vacío si el cliente
   *  no está en memoria (p. ej. en papelera). */
  nivelesCliente: NivelHabilitado[];
```

3.3 BUSCAR:
```
          tipoCliente: clienteVivo
            // TODO: refactor Tarifas — operaciones-editor con multiplicidad
            ? this.tipoClienteLabel(tarifaTipoDesdeHabilitadas(clienteVivo.tarifasHabilitadas))
            : this.tipoClienteLabel(c.operacion.tarifaTipo),  // fallback: cliente en papelera
```
REEMPLAZAR:
```
          nivelesCliente: nivelesHabilitados(clienteVivo?.tarifasHabilitadas),
```

3.4 BUSCAR:
```
  /** Etiqueta del badge de cliente. NOTA: usa el tarifaTipo de la PRIMERA op del
   *  cliente como referencia de exhibición (todas las ops del mismo cliente comparten
   *  la tarifa de cliente; la eventual es override por op, no cambia la del cliente). */
  private tipoClienteLabel(t: TarifaTipo): GrupoEditor['tipoCliente'] {
    if (t.personalizada) return 'personalizada';
    if (t.especial)      return 'especial';
    if (t.eventual)      return 'eventual';
    return 'general';
  }

  /** Si chofer o vehículo quedaron pendientes pero solo hay UNA opción disponible, se
```
REEMPLAZAR:
```
  /** Si chofer o vehículo quedaron pendientes pero solo hay UNA opción disponible, se
```

## PASO 4 — src/app/raiz/operaciones/operaciones-editor/operaciones-editor.component.html

4.1 BUSCAR:
```
                {{ grupo.razonSocial }} — Tarifa Cliente:
                <span
                    class="badge align-middle mb-1"
                    [ngClass]="{
                        'bg-primary': grupo.tipoCliente === 'general',
                        'bg-info': grupo.tipoCliente === 'especial',
                        'bg-success': grupo.tipoCliente === 'personalizada',
                        'bg-warning': grupo.tipoCliente === 'eventual',
                    }"
                >
                    {{ grupo.tipoCliente }}
                </span>
```
REEMPLAZAR:
```
                {{ grupo.razonSocial }} — Tarifa Cliente:
                @for (nivel of grupo.nivelesCliente; track nivel) {
                    <span class="badge align-middle mb-1 me-1 {{ nivel | claseNivelTarifa }}">
                        {{ nivel | etiquetaNivelTarifa }}
                    </span>
                } @empty {
                    <span class="badge align-middle mb-1 bg-secondary">—</span>
                }
```

## PASO 5 — src/app/raiz/clientes/cliente-alta/cliente-alta.component.ts

5.1 BUSCAR:
```
import { RefTarifaHabilitada, tarifaTipoDesdeHabilitadas } from 'src/app/interfaces/tarifa-habilitada';
```
REEMPLAZAR:
```
import { RefTarifaHabilitada, nivelesHabilitados } from 'src/app/interfaces/tarifa-habilitada';
```

5.2 BUSCAR:
```
    const tipoTarifaCliente = tarifaTipoDesdeHabilitadas(this.clienteEditar.tarifasHabilitadas);
    this.formTipoTarifa.patchValue({
        general: tipoTarifaCliente.general,
        especial: tipoTarifaCliente.especial,
        eventual: tipoTarifaCliente.eventual,
        personalizada: tipoTarifaCliente.personalizada,
    });
```
REEMPLAZAR:
```
    const nivelesCliente = nivelesHabilitados(this.clienteEditar.tarifasHabilitadas);
    this.formTipoTarifa.patchValue({
        general: nivelesCliente.includes('general'),
        especial: nivelesCliente.includes('especial'),
        eventual: nivelesCliente.includes('eventual'),
        personalizada: nivelesCliente.includes('personalizada'),
    });
```

## PASO 6 — src/app/raiz/choferes/choferes-alta/choferes-alta.component.ts

6.1 BUSCAR:
```
import { RefTarifaHabilitada, tarifaTipoDesdeHabilitadas } from "src/app/interfaces/tarifa-habilitada";
```
REEMPLAZAR:
```
import { RefTarifaHabilitada, nivelesHabilitados } from "src/app/interfaces/tarifa-habilitada";
```

6.2 BUSCAR:
```
      const tipoTarifaChofer = tarifaTipoDesdeHabilitadas(this.chofer.tarifasHabilitadas ?? []);
      this.formTipoTarifa.patchValue({
        general: tipoTarifaChofer.general,
        especial: tipoTarifaChofer.especial,
        eventual: tipoTarifaChofer.eventual,
      });
```
REEMPLAZAR:
```
      const nivelesChofer = nivelesHabilitados(this.chofer.tarifasHabilitadas);
      this.formTipoTarifa.patchValue({
        general: nivelesChofer.includes('general'),
        especial: nivelesChofer.includes('especial'),
        eventual: nivelesChofer.includes('eventual'),
      });
```

## PASO 7 — src/app/raiz/proveedores/proveedores-alta/proveedores-alta.component.ts

7.1 BUSCAR:
```
import { RefTarifaHabilitada, tarifaTipoDesdeHabilitadas } from 'src/app/interfaces/tarifa-habilitada';
```
REEMPLAZAR:
```
import { RefTarifaHabilitada, nivelesHabilitados } from 'src/app/interfaces/tarifa-habilitada';
```

7.2 BUSCAR:
```
      const tipoTarifaProveedor = tarifaTipoDesdeHabilitadas(this.proveedorEditar.tarifasHabilitadas);
      this.formTipoTarifa.patchValue({
          general: tipoTarifaProveedor.general,
          especial: tipoTarifaProveedor.especial,
          eventual: tipoTarifaProveedor.eventual,
      });
```
REEMPLAZAR:
```
      const nivelesProveedor = nivelesHabilitados(this.proveedorEditar.tarifasHabilitadas);
      this.formTipoTarifa.patchValue({
          general: nivelesProveedor.includes('general'),
          especial: nivelesProveedor.includes('especial'),
          eventual: nivelesProveedor.includes('eventual'),
      });
```

## Verificación

1. `grep -rn "tarifaTipoDesdeHabilitadas" src/` → solo: la definición (y su
   docblock) en tarifa-habilitada.ts, operacion-factory.service.ts y
   proveedor.service.ts.
2. `grep -rn "tipoCliente\b\|tipoClienteLabel" src/app/raiz/operaciones/` → sin resultados.
3. `grep -rn "nivelesHabilitados(" src/` → 1 definición + 5 usos (papelera,
   editor, 3 forms de alta).
4. `npm run build:demo` sin errores nuevos.
5. Mostrá el diff completo de los 7 archivos.

## Pruebas manuales (demo)

1. Asignación de un cliente con Personalizada + General → completar
   operaciones: el encabezado del grupo muestra DOS badges (Personalizada,
   General) con los colores de operacion-cabecera. Cliente con solo General:
   un badge.
2. Editar cliente / chofer directo / proveedor con varias tarifas
   habilitadas: los checkboxes reflejan exactamente las habilitadas.
   Chofer de proveedor: selector deshabilitado como antes.
3. Ajustes → Papelera: abrir un cliente y un chofer de proveedor dados de
   baja → el campo de tarifa muestra "Personalizada + General" (o la que
   corresponda); el de proveedor eliminado también.
4. Alta de operaciones y toggle Eventual en el editor: sin cambios.

## Mensaje de commit

refactor(tarifas): lectura directa de tarifasHabilitadas en pantallas (TC7)

- tarifa-habilitada.ts: helper puro nivelesHabilitados (orden fijo, sin
  repetidos); docblock del shim al día (queda solo para producir
  tarifaTipo hasta TC8).
- operaciones-editor: un badge por nivel habilitado del cliente (pipes de
  operacion-cabecera) en vez de una sola etiqueta.
- Papelera: etiqueta con todos los niveles ("Personalizada + General");
  sin datos → "—" (antes "Eventual").
- Forms de alta de cliente, chofer y proveedor: checkboxes desde
  nivelesHabilitados.

FIN DE LA INSTRUCCIÓN TC7
````
