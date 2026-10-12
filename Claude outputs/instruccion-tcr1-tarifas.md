````
INSTRUCCIÓN TC-R1 — Tarifas (cierre): retiro del módulo viejo de tarifas de Clientes
==================================================================================

Si no ves la línea "FIN DE LA INSTRUCCIÓN TC-R1" al final, el texto llegó
cortado: leé el archivo completo antes de empezar.

## Contexto y razonamiento

Las tarifas de clientes viven en el módulo nuevo (/tarifas: General,
Especial, Personalizada, Eventual, sobre las colecciones `tarifas`,
`tarifasEspeciales` y `registrosOpEventuales`). En Clientes siguen ruteadas
y visibles las pantallas del sistema VIEJO (pestañas Tarifa General /
Especial / Personalizada / Eventual), que leen y ESCRIBEN las colecciones
viejas (tarifasGralCliente, tarifasEspCliente, tarifasPersCliente, …). El
motor nuevo no las lee: lo que se edita ahí no afecta ninguna operación, y
es una trampa para quien entre por esa pestaña.

Este bloque retira la parte de Clientes:
- 4 rutas + `personalizada/:id` y las 4 pestañas de tarifas de
  ClientesControlComponent (queda solo "Alta/Listado").
- 7 componentes (carpetas completas, con .html/.scss/.spec.ts):
  cliente-tarifa-aumento, cliente-tarifa-especial, cliente-tarifa-gral,
  cliente-tarifa-personalizada, cliente-tarifa-viewer,
  modal-tarifa-personalizada, tarifa-editor.
- TarifasService (servicios/tarifas/, con su spec): sin ningún consumidor
  fuera de esos componentes (importa tipos de dos de ellos).

Verificado antes de escribir esta instrucción: ningún archivo fuera de esas
carpetas importa esos componentes ni TarifasService, ni usa sus selectores;
ningún link de la app navega a clientes/general|especial|personalizada|
eventual. Las colecciones viejas NO se tocan (T12: quedan para el ensayo de
migración). Siguen vivos, y se retiran después: choferes y proveedores
(TC-R2); los componentes shared viejos — TarifasEventuales, ConsolaTarifa,
HistorialTarifasGral, TarigaGralEdicion — y los listeners de
HomeComponent/StorageService (TC-R3). Por eso TarifasEventualesComponent
solo pierde su ruta acá, no se borra.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto a BUSCAR no está, o aparece más de una vez: detenete y reportá.
- Aplicá los cambios de cada archivo EN ORDEN.
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Borrado: SOLO las carpetas/archivos listados en el PASO 4, con borrado
  común de archivos (sin `git rm`, sin commit). Nada más.
- Ojo: en clientes.module.ts varias líneas del bloque `declarations` terminan
  con espacios; el BUSCAR 2.3 los incluye tal cual. Si no matchea solo por
  eso, matcheá ignorando espacios al final de línea y reportalo.
- Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md.

## PASO 0 — Verificación (sin modificar nada)

0.1 `grep -rln "ClienteTarifa\|TarifaEditorComponent\|ModalTarifaPersonalizada\|TarifasService\b\|servicios/tarifas/\|TarifaAumentoPayload\|ResumenTarifa\b" src/`
    → SOLO archivos dentro de las 7 carpetas a borrar y de
    src/app/servicios/tarifas/, más clientes.module.ts y
    clientes-routing.module.ts. Si aparece CUALQUIER otro archivo
    (incluidos .spec.ts y .html), DETENETE y reportá.
0.2 `grep -rn "<app-cliente-tarifa\|<app-tarifa-editor\|<app-modal-tarifa-personalizada" src/`
    → solo dentro de las carpetas a borrar.
0.3 `grep -rn "TarifaForm\b" src/` → solo dentro de las carpetas a borrar y
    tarifas.service.ts.
0.4 `grep -rn "clientes/general\|clientes/especial\|clientes/personalizada\|clientes/eventual" src/`
    → solo las 4 pestañas de clientes-control.component.ts.
0.5 `ls src/app/servicios/tarifas/` → solo tarifas.service.ts y
    tarifas.service.spec.ts.
Si algo no coincide, DETENETE y reportá.

## PASO 1 — src/app/raiz/clientes/clientes-routing.module.ts

1.1 BUSCAR:
```
import { ClientesControlComponent } from './clientes-control/clientes-control.component';
import { ClienteTarifaPersonalizadaComponent } from './cliente-tarifa-personalizada/cliente-tarifa-personalizada.component';
import { ClienteTarifaGralComponent } from './cliente-tarifa-gral/cliente-tarifa-gral.component';
import { ClienteTarifaEspecialComponent } from './cliente-tarifa-especial/cliente-tarifa-especial.component';
import { TarifasEventualesComponent } from 'src/app/shared/tarifas-eventuales/tarifas-eventuales.component';
import { RoleGuard } from 'src/app/guards/role.guard';
```
REEMPLAZAR:
```
import { ClientesControlComponent } from './clientes-control/clientes-control.component';
import { RoleGuard } from 'src/app/guards/role.guard';
```

1.2 BUSCAR:
```
import { ClientesListadoComponent } from './clientes-listado/clientes-listado.component';
import { TarifaEditorComponent } from './tarifa-editor/tarifa-editor.component';
```
REEMPLAZAR:
```
import { ClientesListadoComponent } from './clientes-listado/clientes-listado.component';
```

1.3 BUSCAR:
```
    {path: 'general', component:ClienteTarifaGralComponent},
    {path: 'especial', component:ClienteTarifaEspecialComponent},
    {path: 'personalizada', component:ClienteTarifaPersonalizadaComponent},
    {path: 'eventual', component:TarifasEventualesComponent},
    {path: 'listado', component:ClientesListadoComponent},
    {path: 'personalizada/:id',component: TarifaEditorComponent}
```
REEMPLAZAR:
```
    // Tarifas de clientes: módulo Tarifas (/tarifas). Las rutas viejas
    // (general, especial, personalizada, eventual, personalizada/:id) se
    // retiraron en TC-R1.
    {path: 'listado', component:ClientesListadoComponent}
```

## PASO 2 — src/app/raiz/clientes/clientes.module.ts

2.1 BUSCAR:
```
import { ClienteTarifaPersonalizadaComponent } from './cliente-tarifa-personalizada/cliente-tarifa-personalizada.component';
import { ClienteTarifaGralComponent } from './cliente-tarifa-gral/cliente-tarifa-gral.component';
import { ClienteTarifaEspecialComponent } from './cliente-tarifa-especial/cliente-tarifa-especial.component';
import { ModalContactoComponent } from './modal-contacto/modal-contacto.component';
import { ModalTarifaPersonalizadaComponent } from './modal-tarifa-personalizada/modal-tarifa-personalizada.component';
```
REEMPLAZAR:
```
import { ModalContactoComponent } from './modal-contacto/modal-contacto.component';
```

2.2 BUSCAR:
```
import { AgGridModule } from 'ag-grid-angular';
import { TarifaEditorComponent } from './tarifa-editor/tarifa-editor.component';
import { ClienteTarifaViewerComponent } from './cliente-tarifa-viewer/cliente-tarifa-viewer.component';
import { ClienteTarifaAumentoComponent } from './cliente-tarifa-aumento/cliente-tarifa-aumento.component';
```
REEMPLAZAR:
```
import { AgGridModule } from 'ag-grid-angular';
```

2.3 BUSCAR:
```
  declarations: [
    ClientesControlComponent,    
    ClienteAltaComponent,            
    ClienteTarifaPersonalizadaComponent, 
    ClienteTarifaGralComponent, 
    ClienteTarifaEspecialComponent, 
    ModalContactoComponent, 
    ModalTarifaPersonalizadaComponent, 
    ClientesListadoComponent,    
    TarifaEditorComponent,
    ClienteTarifaViewerComponent,
    ClienteTarifaAumentoComponent
  ],
```
REEMPLAZAR:
```
  declarations: [
    ClientesControlComponent,
    ClienteAltaComponent,
    ModalContactoComponent,
    ClientesListadoComponent,
  ],
```

## PASO 3 — src/app/raiz/clientes/clientes-control/clientes-control.component.ts

3.1 BUSCAR:
```
    { id: 'tab1', name: 'Alta/Listado', route: 'clientes/listado', alias: ['clientes/alta'] },
    { id: 'tab2', name: 'Tarifa General', route: 'clientes/general' },
    { id: 'tab3', name: 'Tarifa Especial', route: 'clientes/especial' },
    { id: 'tab4', name: 'Tarifa Personalizada', route: 'clientes/personalizada' },
    { id: 'tab5', name: 'Tarifa Eventual', route: 'clientes/eventual' },
  ];
```
REEMPLAZAR:
```
    { id: 'tab1', name: 'Alta/Listado', route: 'clientes/listado', alias: ['clientes/alta'] },
    // Pestañas de tarifas retiradas en TC-R1: las tarifas viven en /tarifas.
  ];
```

## PASO 4 — Borrar (carpetas completas, con todo su contenido)

- src/app/raiz/clientes/cliente-tarifa-aumento/
- src/app/raiz/clientes/cliente-tarifa-especial/
- src/app/raiz/clientes/cliente-tarifa-gral/
- src/app/raiz/clientes/cliente-tarifa-personalizada/
- src/app/raiz/clientes/cliente-tarifa-viewer/
- src/app/raiz/clientes/modal-tarifa-personalizada/
- src/app/raiz/clientes/tarifa-editor/
- src/app/servicios/tarifas/

Antes de borrar, listá el contenido de cada una (debería ser .ts, .html,
.scss y .spec.ts del componente; en servicios/tarifas, el servicio y su
spec). Si alguna tiene otro archivo, DETENETE y reportá.

## Verificación

1. El mismo grep de 0.1 → sin resultados.
2. `grep -rn "TarifasEventualesComponent" src/app/raiz/clientes/` → sin resultados.
3. `ls src/app/raiz/clientes/` → cliente-alta, clientes-control,
   clientes-listado, modal-contacto, clientes-routing.module.ts,
   clientes.module.ts.
4. `npm run build:demo` sin errores nuevos.
5. `git status` (solo lectura) y el diff de los 3 archivos editados.

## Pruebas manuales (demo)

1. Clientes: una sola pestaña "Alta/Listado"; alta, edición y listado de
   clientes funcionan igual.
2. Ir a mano a /clientes/general, /clientes/personalizada y
   /clientes/personalizada/x → ya no hay pantalla (comportamiento de ruta
   inexistente de la app).
3. Tarifas (/tarifas): General, Especial, Personalizada y Eventual
   funcionan igual.
4. Alta de una operación y cierre: sin cambios.

## Mensaje de commit

refactor(tarifas): retira el módulo viejo de tarifas de Clientes (TC-R1)

- Clientes: fuera las rutas general/especial/personalizada/eventual/
  personalizada/:id y sus 4 pestañas.
- Borrados 7 componentes del sistema viejo (cliente-tarifa-aumento,
  -especial, -gral, -personalizada, -viewer, modal-tarifa-personalizada,
  tarifa-editor) y TarifasService, con sus specs.
- Las colecciones viejas no se tocan (ensayo de migración).

FIN DE LA INSTRUCCIÓN TC-R1
````
