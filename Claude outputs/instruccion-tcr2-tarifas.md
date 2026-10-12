````
INSTRUCCIÓN TC-R2 — Tarifas (cierre): retiro del módulo viejo de tarifas de Choferes y Proveedores
================================================================================================

Si no ves la línea "FIN DE LA INSTRUCCIÓN TC-R2" al final, el texto llegó
cortado: leé el archivo completo antes de empezar.

## Contexto y razonamiento

Mismo criterio que TC-R1 (Clientes), ahora en Choferes y Proveedores: las
pestañas Tarifa General / Especial / Eventual de esos módulos son del
sistema VIEJO (leen y escriben tarifasGralChofer, tarifasEspChofer,
tarifasGralProveedor, tarifasEspProveedor, …), que el motor nuevo no lee.
Las tarifas de choferes y proveedores viven en /tarifas.

Este bloque:
- Choferes: quita las rutas general/especial/eventual y sus 3 pestañas
  (queda "Alta/Listado"); borra choferes-tarifa-gral y
  choferes-tarifa-especial.
- Proveedores: ídem, borra proveedores-tarifa-gral y
  proveedores-tarifa-especial.
- Cada carpeta de componente se borra completa (.ts, .html, .scss,
  .spec.ts).

Verificado antes de escribir esta instrucción: ningún archivo fuera de esas
4 carpetas importa esos componentes ni usa sus selectores (el selector de
-gral solo se usa dentro de -especial, que también se borra); ningún link
navega a esas rutas. Con esto TarifasEventualesComponent (shared) se queda
sin ninguna ruta; sigue declarado en SharedModule y se borra en TC-R3 junto
con ConsolaTarifa, HistorialTarifasGral, TarigaGralEdicion y los
listeners/estado viejo de HomeComponent/StorageService. Las colecciones
viejas no se tocan (T12).

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto a BUSCAR no está, o aparece más de una vez: detenete y reportá.
- Aplicá los cambios de cada archivo EN ORDEN.
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Borrado: SOLO las 4 carpetas del PASO 7, con borrado común (sin `git rm`,
  sin commit).
- Ojo: varias líneas de estos archivos terminan con espacios (la ruta
  'eventual' en choferes-routing, la ruta 'especial' en proveedores-routing
  y casi todo el bloque `declarations` de choferes.module.ts). Los BUSCAR
  los incluyen tal cual. Si alguno no matchea solo por eso, matcheá
  ignorando espacios al final de línea y reportalo.
- Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md.

## PASO 0 — Verificación (sin modificar nada)

0.1 `grep -rln "ChoferesTarifaGral\|ChoferesTarifaEspecial\|ProveedoresTarifaGral\|ProveedoresTarifaEspecial\|choferes-tarifa-\|proveedores-tarifa-" src/`
    → SOLO archivos dentro de las 4 carpetas a borrar, más
    choferes.module.ts, choferes-routing.module.ts, proveedores.module.ts y
    proveedores-routing.module.ts. Cualquier otro archivo (incluidos
    .spec.ts y .html): DETENETE y reportá.
0.2 `grep -rn "choferes/general\|choferes/especial\|choferes/eventual\|proveedores/general\|proveedores/especial\|proveedores/eventual" src/`
    → solo las 3 pestañas de choferes-control y las 3 de
    proveedores-control.
0.3 `grep -rn "TarifasEventualesComponent" src/app/raiz/` → solo
    choferes-routing.module.ts y proveedores-routing.module.ts (import +
    ruta en cada uno).
Si algo no coincide, DETENETE y reportá.

## PASO 1 — src/app/raiz/choferes/choferes-routing.module.ts

1.1 BUSCAR:
```
import { ChoferesControlComponent } from './choferes-control/choferes-control.component';
import { ChoferesTarifaGralComponent } from './choferes-tarifa-gral/choferes-tarifa-gral.component';
import { ChoferesTarifaEspecialComponent } from './choferes-tarifa-especial/choferes-tarifa-especial.component';
import { TarifasEventualesComponent } from 'src/app/shared/tarifas-eventuales/tarifas-eventuales.component';
import { RoleGuard } from 'src/app/guards/role.guard';
```
REEMPLAZAR:
```
import { ChoferesControlComponent } from './choferes-control/choferes-control.component';
import { RoleGuard } from 'src/app/guards/role.guard';
```

1.2 BUSCAR:
```
    {path: 'general', component:ChoferesTarifaGralComponent},
    {path: 'especial', component:ChoferesTarifaEspecialComponent},
    {path: 'eventual', component:TarifasEventualesComponent},    
    {path: 'listado', component:ChoferesListadoComponent},
```
REEMPLAZAR:
```
    // Tarifas de choferes: módulo Tarifas (/tarifas). Las rutas viejas
    // (general, especial, eventual) se retiraron en TC-R2.
    {path: 'listado', component:ChoferesListadoComponent},
```

## PASO 2 — src/app/raiz/choferes/choferes.module.ts

2.1 BUSCAR:
```
import { ChoferesTarifaGralComponent } from './choferes-tarifa-gral/choferes-tarifa-gral.component';
import { ChoferesTarifaEspecialComponent } from './choferes-tarifa-especial/choferes-tarifa-especial.component';
import { ModalVehiculoComponent } from './modal-vehiculo/modal-vehiculo.component';
```
REEMPLAZAR:
```
import { ModalVehiculoComponent } from './modal-vehiculo/modal-vehiculo.component';
```

2.2 BUSCAR:
```
  declarations: [
    ChoferesControlComponent,    
    ChoferesAltaComponent,   
    ChoferesTarifaGralComponent,
    ChoferesTarifaEspecialComponent,    
    ModalVehiculoComponent,
    ChoferesListadoComponent    
  ],
```
REEMPLAZAR:
```
  declarations: [
    ChoferesControlComponent,
    ChoferesAltaComponent,
    ModalVehiculoComponent,
    ChoferesListadoComponent,
  ],
```

## PASO 3 — src/app/raiz/choferes/choferes-control/choferes-control.component.ts

3.1 BUSCAR:
```
    { id: 'tab1', name: 'Alta/Listado', route: 'choferes/listado', alias: ['choferes/alta'] },
    { id: 'tab2', name: 'Tarifa General', route: 'choferes/general' },
    { id: 'tab3', name: 'Tarifa Especial', route: 'choferes/especial' },
    { id: 'tab4', name: 'Tarifa Eventual', route: 'choferes/eventual' },
```
REEMPLAZAR:
```
    { id: 'tab1', name: 'Alta/Listado', route: 'choferes/listado', alias: ['choferes/alta'] },
    // Pestañas de tarifas retiradas en TC-R2: las tarifas viven en /tarifas.
```

## PASO 4 — src/app/raiz/proveedores/proveedores-routing.module.ts

4.1 BUSCAR:
```
import { ProveedoresControlComponent } from './proveedores-control/proveedores-control.component';
import { ProveedoresTarifaGralComponent } from './proveedores-tarifa-gral/proveedores-tarifa-gral.component';
import { ProveedoresTarifaEspecialComponent } from './proveedores-tarifa-especial/proveedores-tarifa-especial.component';
import { TarifasEventualesComponent } from 'src/app/shared/tarifas-eventuales/tarifas-eventuales.component';
import { RoleGuard } from 'src/app/guards/role.guard';
```
REEMPLAZAR:
```
import { ProveedoresControlComponent } from './proveedores-control/proveedores-control.component';
import { RoleGuard } from 'src/app/guards/role.guard';
```

4.2 BUSCAR:
```
      {path: 'general', component:ProveedoresTarifaGralComponent},
      {path: 'especial', component:ProveedoresTarifaEspecialComponent},      
      {path: 'eventual', component:TarifasEventualesComponent},
      {path: 'listado', component:ProveedoresListadoComponent},
```
REEMPLAZAR:
```
      // Tarifas de proveedores: módulo Tarifas (/tarifas). Las rutas viejas
      // (general, especial, eventual) se retiraron en TC-R2.
      {path: 'listado', component:ProveedoresListadoComponent},
```

## PASO 5 — src/app/raiz/proveedores/proveedores.module.ts

5.1 BUSCAR:
```
import { ProveedoresTarifaGralComponent } from './proveedores-tarifa-gral/proveedores-tarifa-gral.component';
import { ProveedoresTarifaEspecialComponent } from './proveedores-tarifa-especial/proveedores-tarifa-especial.component';
import { ModalContactoProveedoresComponent } from './modal-contacto-proveedores/modal-contacto-proveedores.component';
```
REEMPLAZAR:
```
import { ModalContactoProveedoresComponent } from './modal-contacto-proveedores/modal-contacto-proveedores.component';
```

5.2 BUSCAR:
```
    ProveedoresTarifaGralComponent,
    ProveedoresTarifaEspecialComponent,
    ModalContactoProveedoresComponent,
```
REEMPLAZAR:
```
    ModalContactoProveedoresComponent,
```

## PASO 6 — src/app/raiz/proveedores/proveedores-control/proveedores-control.component.ts

6.1 BUSCAR:
```
    { id: 'tab1', name: 'Alta/Listado', route: 'proveedores/listado', alias: ['proveedores/alta'] },
    { id: 'tab2', name: 'Tarifa General', route: 'proveedores/general' },
    { id: 'tab3', name: 'Tarifa Especial', route: 'proveedores/especial' },
    { id: 'tab4', name: 'Tarifa Eventual', route: 'proveedores/eventual' },
```
REEMPLAZAR:
```
    { id: 'tab1', name: 'Alta/Listado', route: 'proveedores/listado', alias: ['proveedores/alta'] },
    // Pestañas de tarifas retiradas en TC-R2: las tarifas viven en /tarifas.
```

## PASO 7 — Borrar (carpetas completas, con todo su contenido)

- src/app/raiz/choferes/choferes-tarifa-gral/
- src/app/raiz/choferes/choferes-tarifa-especial/
- src/app/raiz/proveedores/proveedores-tarifa-gral/
- src/app/raiz/proveedores/proveedores-tarifa-especial/

Antes de borrar, listá el contenido de cada una (solo .ts, .html, .scss y
.spec.ts del componente). Si alguna tiene otro archivo, DETENETE y reportá.

## Verificación

1. El mismo grep de 0.1 → sin resultados.
2. `grep -rn "TarifasEventualesComponent" src/app/raiz/` → sin resultados.
3. `ls src/app/raiz/choferes/` → choferes-alta, choferes-control,
   choferes-listado, modal-vehiculo, choferes-routing.module.ts,
   choferes.module.ts.
4. `ls src/app/raiz/proveedores/` → modal-contacto-proveedores,
   proveedores-alta, proveedores-control, proveedores-listado,
   proveedores-routing.module.ts, proveedores.module.ts.
5. `npm run build:demo` sin errores nuevos.
6. `git status` (solo lectura) y el diff de los 6 archivos editados.

## Pruebas manuales (demo)

1. Choferes: una sola pestaña "Alta/Listado"; alta, edición, listado y
   modal de vehículo funcionan igual.
2. Proveedores: una sola pestaña "Alta/Listado"; alta, edición, listado y
   modal de contacto funcionan igual.
3. /choferes/general, /choferes/eventual, /proveedores/especial a mano → ya
   no hay pantalla.
4. Tarifas (/tarifas) y alta/cierre de una operación de chofer directo y de
   proveedor: sin cambios.

## Mensaje de commit

refactor(tarifas): retira el módulo viejo de tarifas de Choferes y Proveedores (TC-R2)

- Choferes y Proveedores: fuera las rutas general/especial/eventual y sus
  pestañas.
- Borrados choferes-tarifa-gral, choferes-tarifa-especial,
  proveedores-tarifa-gral y proveedores-tarifa-especial, con sus specs.
- TarifasEventualesComponent (shared) queda sin rutas; se borra en TC-R3.

FIN DE LA INSTRUCCIÓN TC-R2
````
