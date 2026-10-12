````
INSTRUCCIÓN TC-R4 — Tarifas (cierre): código muerto de Liquidación acoplado a tarifas viejas
==========================================================================================

Si no ves la línea "FIN DE LA INSTRUCCIÓN TC-R4" al final, el texto llegó
cortado: leé el archivo completo antes de empezar.

## Contexto y razonamiento

Último bloque de retiro de código del sistema viejo de tarifas. Todo lo que
sigue es código muerto (verificado con grep sobre src/app antes de escribir
esta instrucción):

1. EditarInfOpComponent (shared/modales/editar-inf-op) y
   EditarTarifaOpComponent (raiz/liquidacion/modales/editar-tarifa-op):
   declarados, pero ningún `modalService.open` ni selector los usa. El
   editor vivo de InformeOp es InformeOpEditorComponent.
2. Lo que solo esos modales arrastran:
   - BuscarTarifaService (servicios/buscarTarifa/): único consumidor
     editar-inf-op.
   - ValoresOpClienteService.$calcularKm: único caller editar-inf-op; fórmula
     vieja de km (la del motor nuevo es ValoresTarifaService.calcularKmAdicional,
     TC1b).
   - DbFirestoreService.buscarContraParteInformeOp: único caller
     editar-inf-op; consulta las colecciones viejas informesOp*/infOpLiq*.
3. DbFirestoreService.guardarOpMultiple y buscarInformesPorIdOperacion: sin
   ningún caller.
4. Remanentes sueltos (P6 del diseño):
   - app.component.ts y cliente-alta / proveedores-alta: imports sin uso de
     TarifaGralCliente / TarifaPersonalizadaCliente.
   - choferes-alta: campo `tarifaGralCliente` sin uso (se conserva
     CategoriaTarifa, que sí se usa).
   - proveedores-alta.onSubmit: `const tarifaGeneral =
     this.storageService.loadInfo('tarifasGralProveedor')` sin uso (última
     lectura de esas claves de localStorage fuera de lo que se borra acá).
   - db-firestore: import de InformeOp (modelo viejo) que queda sin uso.
5. Interfaces sin consumidores tras lo anterior:
   - interfaces/tarifa-eventual.ts (ya sin ninguno).
   - interfaces/tarifa-personalizada-cliente.ts (solo app.component.ts, que
     se limpia acá).
   interfaces/tarifa-gral-cliente.ts SE QUEDA: exporta TarifaTipo y
   CategoriaTarifa, que todavía usan operacion.ts, informe-op.ts,
   migrar-datos y choferes-alta (TC8/TC11).
6. Comentarios que nombraban a EditarInfOpComponent como vigente
   (informe-liq-detalle, informe-op-editor, informe-op-nuevo) quedan al día.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto a BUSCAR no está, o aparece más de una vez: detenete y reportá.
- Aplicá los cambios de cada archivo EN ORDEN.
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Borrado: SOLO lo listado en el último PASO, con borrado común (sin
  `git rm`, sin commit).
- Los BUSCAR de db-firestore.service.ts y valores-op-cliente.service.ts son
  métodos completos: cada uno termina en la primera línea que se conserva
  (que el REEMPLAZAR repite). No tienen espacios al final de línea.
- Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md.
- Se tocan interfaces (se borran 2 archivos): revisá sus usos en src/
  (incluidos .spec.ts y .html) — ver 0.3.

## PASO 0 — Verificación (sin modificar nada)

0.1 `grep -rln "EditarInfOpComponent\|EditarTarifaOpComponent\|BuscarTarifaService\|editar-inf-op\|editar-tarifa-op\|buscarTarifa/\|<app-editar-inf-op\|<app-editar-tarifa-op" src/`
    → SOLO: shared.module.ts, liquidacion.module.ts, archivos dentro de las
    3 carpetas a borrar, y los comentarios de informe-liq-detalle.component.ts,
    informe-op-editor.component.ts e interfaces/informe-op-nuevo.ts.
    Cualquier otro (incluidos .spec.ts): DETENETE y reportá.
0.2 `grep -rn "calcularKm(\|buscarContraParteInformeOp\|guardarOpMultiple\|buscarInformesPorIdOperacion" src/`
    → solo las definiciones (valores-op-cliente.service.ts y
    db-firestore.service.ts) y usos dentro de editar-inf-op. Ojo: un
    `.spec.ts` de valores-op-cliente o de db-firestore que los use también
    es motivo para DETENERSE.
0.3 `grep -rn "tarifa-eventual'\|tarifa-eventual\"\|tarifa-personalizada-cliente\|TarifaPersonalizadaCliente\b\|\bTarifaEventual\b" src/`
    → solo: las 2 interfaces, app.component.ts, y archivos dentro de las
    carpetas a borrar.
0.4 `grep -n "InformeOp\b" src/app/servicios/database/db-firestore.service.ts`
    → el import y usos solo dentro de buscarContraParteInformeOp y
    buscarInformesPorIdOperacion.
0.5 `grep -n "tarifaGralCliente\|TarifaGralCliente" src/app/raiz/choferes/choferes-alta/choferes-alta.component.ts src/app/raiz/choferes/choferes-alta/choferes-alta.component.html`
    → solo el import y la declaración del campo en el .ts.
0.6 `grep -n "tarifaGeneral\b" src/app/raiz/proveedores/proveedores-alta/proveedores-alta.component.ts`
    → solo la línea del loadInfo en onSubmit.
Si algo no coincide, DETENETE y reportá.

## PASO 1 — src/app/shared/shared.module.ts

1.1 BUSCAR:
```
import { AccionesCellRendererComponent } from './tabla/ag-cell-renderers/acciones-cell-renderer/acciones-cell-renderer.component';
import { EditarInfOpComponent } from './modales/editar-inf-op/editar-inf-op.component';
```
REEMPLAZAR:
```
import { AccionesCellRendererComponent } from './tabla/ag-cell-renderers/acciones-cell-renderer/acciones-cell-renderer.component';
```

1.2 BUSCAR:
```
    EstadoCellRendererComponent,
    EditarInfOpComponent,
    InformeOpDetalleComponent,
```
REEMPLAZAR:
```
    EstadoCellRendererComponent,
    InformeOpDetalleComponent,
```

## PASO 2 — src/app/raiz/liquidacion/liquidacion.module.ts

2.1 BUSCAR:
```
import { EditarTarifaOpComponent } from './modales/editar-tarifa-op/editar-tarifa-op.component';
import { ProformaComponent } from './proforma/proforma.component';
```
REEMPLAZAR:
```
import { ProformaComponent } from './proforma/proforma.component';
```

2.2 BUSCAR:
```
    ResumenOpLiquidadasComponent,
    EditarTarifaOpComponent,
    ProformaComponent,
```
REEMPLAZAR:
```
    ResumenOpLiquidadasComponent,
    ProformaComponent,
```

## PASO 3 — src/app/servicios/database/db-firestore.service.ts

3.1 BUSCAR:
```
import { InformeOp } from "src/app/interfaces/informe-op";
import { InformeOpNuevo } from "src/app/interfaces/informe-op-nuevo";
```
REEMPLAZAR:
```
import { InformeOpNuevo } from "src/app/interfaces/informe-op-nuevo";
```

3.2 BUSCAR:
```
  async guardarOpMultiple(
    operaciones: Operacion[],
  ): Promise<{ exito: boolean; mensaje: string }> {
    const batch = writeBatch(this.firestore);
    const colRef = collection(this.firestore, `/Vantruck/datos/operaciones`);

    try {
      // Validación interna: verificar duplicados dentro del mismo lote
      const ids = operaciones.map((op) => op.idOperacion);
      const idsDuplicados = ids.filter(
        (id, index) => ids.indexOf(id) !== index,
      );
      if (idsDuplicados.length > 0) {
        return {
          exito: false,
          mensaje: `Se encontraron ${idsDuplicados.length} operaciones duplicadas dentro del lote: ${idsDuplicados.join(", ")}`,
        };
      }

      // Verificación externa: verificar que NINGUNO ya exista en Firestore
      for (const idOperacion of ids) {
        const q = query(colRef, where("idOperacion", "==", idOperacion));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          return {
            exito: false,
            mensaje: `Ya existe una operación con idOperacion: ${idOperacion}`,
          };
        }
      }

      // Si todo está OK, agregar al batch
      for (const op of operaciones) {
        const docRef = doc(colRef); // id autogenerado
        batch.set(docRef, op);
      }

      await batch.commit();

      return {
        exito: true,
        mensaje: "Todas las operaciones fueron guardadas correctamente.",
      };
    } catch (error: any) {
      console.error("❌ Error al guardar operaciones múltiples:", error);
      return {
        exito: false,
        mensaje: `Error inesperado al guardar: ${error.message || error}`,
      };
    }
  }

  async guardarMultipleOtraColeccion(
```
REEMPLAZAR:
```
  async guardarMultipleOtraColeccion(
```

3.3 BUSCAR:
```
  // ------------------------------------------
  // MÉTODO AUXILIAR: Buscar contra-parte
  // ------------------------------------------
  /**
   * Busca la contra-parte de un InformeOp original, deduciendo las colecciones
   * a inspeccionar según:
   *  - Si el original es de Clientes => buscar en Choferes o Proveedores (según idProveedor)
   *  - Si el original es de Choferes/Proveedores => buscar en Clientes
   *  - Primero busca en la colección "no liquidada", luego en la "liquidada"
   *
   * Devuelve null si no la encuentra.
   */
  public async buscarContraParteInformeOp(
    informeOriginal: ConId<InformeOp>,
    coleccionOriginal: string,
  ): Promise<{
    docRef: DocumentReference<DocumentData>;
    data: ConId<InformeOp>;
    coleccion: string;
  } | null> {
    // Colecciones
    const COLS = {
      clientes: { noLiq: "informesOpClientes", liq: "infOpLiqClientes" },
      choferes: { noLiq: "informesOpChoferes", liq: "infOpLiqChoferes" },
      proveedores: {
        noLiq: "informesOpProveedores",
        liq: "infOpLiqProveedores",
      },
    };

    // Detectar "lado" del informe original
    const esCliente = coleccionOriginal.includes("Clientes");
    const esChofer = coleccionOriginal.includes("Choferes");
    const esProveedor = coleccionOriginal.includes("Proveedores");

    // Determinar a dónde buscar la contra-parte
    let targets: { noLiq: string; liq: string };

    if (esCliente) {
      // El original es del cliente ⇒ buscar chofer o proveedor
      targets =
        informeOriginal.idProveedor === '' ? COLS.choferes : COLS.proveedores;
    } else {
      // El original es del chofer o proveedor ⇒ buscar cliente
      targets = COLS.clientes;
    }

    // Buscar por contraParteId (idInfOp del otro informe)
    const contraId = informeOriginal.contraParteId;

    // 1) Primero "no liquidado"
    for (const colName of [targets.noLiq, targets.liq]) {
      const colRef = collection(this.firestore, `/Vantruck/datos/${colName}`);
      const qContra = query(colRef, where("idInfOp", "==", contraId));
      const snap = await getDocs(qContra);

      if (!snap.empty) {
        const d = snap.docs[0];
        const data = {
          id: d.id,
          ...(d.data() as InformeOp),
        } as ConId<InformeOp>;
        return { docRef: d.ref, data, coleccion: colName };
      }
    }

    return null;
  }

  /**
   * Busca en una colección destino informesOp cuyo idOperacion coincida
   * con los idOperacion de los informes pasados en el array.
   *
   * @param informeOps Array de InformeOp base
   * @param coleccionDestino Ruta de la colección destino
   * @returns Promise<InformeOp[]> Array de informes encontrados (vacío si ninguno coincide)
   */
  async buscarInformesPorIdOperacion(
    informeOps: ConId<InformeOp>[],
    coleccionDestino: string,
  ): Promise<InformeOp[]> {
    try {
      const colRef = collection(
        this.firestore,
        `Vantruck/datos/${coleccionDestino}`,
      );
      const resultados: InformeOp[] = [];

      for (const inf of informeOps) {
        const snap = await getDocs(
          query(colRef, where("idOperacion", "==", inf.idOperacion)),
        );

        snap.forEach((docSnap) => {
          resultados.push(docSnap.data() as InformeOp);
        });
      }

      return resultados;
    } catch (error) {
      console.error("Error en buscarInformesPorIdOperacion:", error);
      return [];
    }
  }

  async existeCuit(coleccion: string, cuit: string): Promise<boolean> {
```
REEMPLAZAR:
```
  async existeCuit(coleccion: string, cuit: string): Promise<boolean> {
```

## PASO 4 — src/app/servicios/valores-op/valores-op-cliente/valores-op-cliente.service.ts

4.1 BUSCAR:
```
import { Valores } from "src/app/interfaces/informe-op-nuevo";

import {
  TarifaGralCliente,
  CategoriaTarifa,
} from "src/app/interfaces/tarifa-gral-cliente";
```
REEMPLAZAR:
```
import { Valores } from "src/app/interfaces/informe-op-nuevo";
```

4.2 BUSCAR:
```
  }

  // TODO: refactor Tarifas — firma ampliada de Vehiculo a tipo estructural mínimo
  // (solo se usa categoria.catOrden). Acepta Vehiculo y RefVehiculo por igual.
  $calcularKm(op: Operacion, tarifa: TarifaGralCliente, vehiculo: { categoria: { catOrden: number } }) {
    let catCg = tarifa.cargasGenerales.filter((cat: CategoriaTarifa) => {
      return cat.orden === vehiculo.categoria.catOrden;
    });

    let montoTotal = 0;

    if (tarifa.adicionales.KmDistancia.primerSector > 0) {
      // Verifica si los kilómetros recorridos son menores o iguales al primer sector
      if (op.km < tarifa.adicionales.KmDistancia.primerSector) {
        return montoTotal; // No se cobra adicional
      }

      // Si supera el primer sector, se cobra el valor del primer sector
      montoTotal = catCg[0].adicionalKm.primerSector;

      // Calcula cuántos kilómetros adicionales quedan luego del primer sector
      let kmRestantes = op.km - tarifa.adicionales.KmDistancia.primerSector;

      // Calcula cuántos sectores adicionales completos se recorren
      let sectoresAdicionales = Math.floor(
        kmRestantes / tarifa.adicionales.KmDistancia.sectoresSiguientes,
      );

      // Suma el costo de los sectores adicionales
      montoTotal +=
        sectoresAdicionales * catCg[0].adicionalKm.sectoresSiguientes;
    }

    return montoTotal;
  }
}
```
REEMPLAZAR:
```
  }
}
```

## PASO 5 — src/app/shared/modales/informe-liq-detalle/informe-liq-detalle.component.ts

5.1 BUSCAR:
```
 *  InformeOp (botón "Editar" por fila) está deshabilitada temporalmente —
 *  vuelve en el chunk de edición, junto con EditarInfOpComponent. */
```
REEMPLAZAR:
```
 *  InformeOp (botón "Editar" por fila) está deshabilitada temporalmente —
 *  vuelve en el chunk de edición (el editor viejo, EditarInfOpComponent, se
 *  retiró en TC-R4; el nuevo es InformeOpEditorComponent). */
```

## PASO 6 — src/app/shared/modales/informe-op-editor/informe-op-editor.component.ts

6.1 BUSCAR:
```
/** Modal nuevo de edición de InformeOp — en paralelo a EditarInfOpComponent
 *  (viejo, sin tocar). Edita UN SOLO lado
```
REEMPLAZAR:
```
/** Modal nuevo de edición de InformeOp (reemplaza a EditarInfOpComponent,
 *  el viejo, retirado en TC-R4). Edita UN SOLO lado
```

## PASO 7 — src/app/interfaces/informe-op-nuevo.ts

7.1 BUSCAR:
```
  observaciones: string;        // copia denormalizada de la operación —
                                 // EditarInfOpComponent es el único write path
```
REEMPLAZAR:
```
  observaciones: string;        // copia denormalizada de la operación, tomada
                                 // al armar el InformeOp (InformeOpFactoryService)
```

## PASO 8 — src/app/app.component.ts

8.1 BUSCAR:
```
import { Proveedor } from './interfaces/proveedor';
import { TarifaGralCliente } from './interfaces/tarifa-gral-cliente';
import { TarifaPersonalizadaCliente } from './interfaces/tarifa-personalizada-cliente';
```
REEMPLAZAR:
```
import { Proveedor } from './interfaces/proveedor';
```

## PASO 9 — src/app/raiz/choferes/choferes-alta/choferes-alta.component.ts

9.1 BUSCAR:
```
import {
  CategoriaTarifa,
  TarifaGralCliente,
} from "src/app/interfaces/tarifa-gral-cliente";
```
REEMPLAZAR:
```
import { CategoriaTarifa } from "src/app/interfaces/tarifa-gral-cliente";
```

9.2 BUSCAR:
```
  tarifaGralCliente!: TarifaGralCliente;
  categoriaSeleccionada: CategoriaTarifa | null = null;
```
REEMPLAZAR:
```
  categoriaSeleccionada: CategoriaTarifa | null = null;
```

## PASO 10 — src/app/raiz/proveedores/proveedores-alta/proveedores-alta.component.ts

10.1 BUSCAR:
```
import { TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';
```
REEMPLAZAR:
```
import { StorageService } from 'src/app/servicios/storage/storage.service';
```

10.2 BUSCAR:
```
  onSubmit(): void {
    const tarifaGeneral = this.storageService.loadInfo('tarifasGralProveedor');
```
REEMPLAZAR:
```
  onSubmit(): void {
```

## PASO 11 — src/app/raiz/clientes/cliente-alta/cliente-alta.component.ts

11.1 BUSCAR:
```
import { TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';
```
REEMPLAZAR:
```
import { StorageService } from 'src/app/servicios/storage/storage.service';
```

## PASO 12 — Borrar

Carpetas completas (con todo su contenido):
- src/app/shared/modales/editar-inf-op/
- src/app/raiz/liquidacion/modales/editar-tarifa-op/
- src/app/servicios/buscarTarifa/

Archivos:
- src/app/interfaces/tarifa-eventual.ts
- src/app/interfaces/tarifa-personalizada-cliente.ts

Antes de borrar, listá el contenido de cada carpeta (solo .ts, .html, .scss
y .spec.ts del componente/servicio). Si alguna tiene otro archivo,
DETENETE y reportá.

## Verificación

1. El grep de 0.1 → solo los 2 comentarios actualizados de
   informe-liq-detalle e informe-op-editor (que nombran a
   EditarInfOpComponent como retirado).
2. El grep de 0.2 → sin resultados.
3. El grep de 0.3 → sin resultados.
4. `grep -rn "loadInfo('tarifas\|loadInfo(\"tarifas" src/` → sin resultados.
5. `grep -rln "tarifa-gral-cliente" src/` → interfaces/operacion.ts,
   interfaces/informe-op.ts, migrar-datos.component.ts y
   choferes-alta.component.ts (además del propio archivo si se nombra a sí
   mismo).
6. `npm run build:demo` sin errores nuevos.
7. `git status` (solo lectura) y el diff de los archivos editados.

## Pruebas manuales (demo)

1. Liquidación: listado de InformeOp, edición de InformeOp (editor nuevo),
   proformas/informes de liquidación y su detalle: igual que antes.
2. Cierre de una operación y baja de una operación cerrada: sin cambios.
3. Alta y edición de cliente, chofer (con vehículo) y proveedor: sin
   cambios.
4. /migracion y /liquidacion → migrar datos: abren sin errores.

## Mensaje de commit

refactor(tarifas): retira el código muerto de Liquidación acoplado a tarifas viejas (TC-R4)

- Borrados EditarInfOpComponent, EditarTarifaOpComponent y
  BuscarTarifaService (sin quien los abra/inyecte), con sus specs.
- ValoresOpClienteService.$calcularKm y DbFirestoreService.
  buscarContraParteInformeOp / guardarOpMultiple /
  buscarInformesPorIdOperacion fuera (sin callers vivos).
- Interfaces TarifaEventual y TarifaPersonalizadaCliente borradas.
- Remanentes: imports sin uso, campo tarifaGralCliente de choferes-alta,
  loadInfo sin uso en proveedores-alta; comentarios al día.

FIN DE LA INSTRUCCIÓN TC-R4
````
