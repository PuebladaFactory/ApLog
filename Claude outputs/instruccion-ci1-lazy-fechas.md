````
Si no ves la línea FIN DE LA INSTRUCCIÓN CI1 al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN CI1 — Frente Lazy loading + fechas (ApLog, rama refactor)
=====================================================================
Cierre (código): imports, inyecciones y variables sin uso + versión al
deployar

## Contexto y razonamiento

Primer bloque del cierre del frente (el segundo es la documentación).

**1. Lo que queda sin uso.**
- Con LR2 terminado, el análisis de miembros, exports y componentes no
  encuentra nada sin uso (salvo los falsos positivos conocidos).
- Queda lo que ese análisis no cubría. `tsc --noUnusedLocals` marca 58
  casos en 33 archivos (decisión de Nico: limpiar los 58):
  - **imports sin uso** (interfaces, operadores de rxjs, servicios);
  - **servicios inyectados como `private` que nunca se usan** (20, entre
    ellos `OperacionService.formNumServ`, anotado en LR2d). Con `private`,
    el template no puede usarlos, así que es seguro sacarlos. Ninguno
    tiene efectos al construirse: StorageService solo lee localStorage;
  - **variables locales sin uso:**
    - en `const modalRef = this.modal.open(...)` se conserva la llamada
      y sale solo la variable;
    - `let respuesta` (Registro viejo y Papelera legado);
    - `apellido` y `nombre` en `choferes-alta.addItem`;
    - `date` en `getQuincena` (excel y pdf viejos);
    - `backupRef` en `chofer-migration` (nunca se leía; se borra con su
      comentario);
  - **miembros privados sin uso:**
    - `randomDominio` (choferes-listado);
    - `valorAnterior` de `SoloLetrasDirective` (se escribía, pero nunca
      se leía).
- Al sacar una inyección queda sin uso su import. Este bloque ya los
  incluye: el resultado final es 0 avisos.

**Excepción:** el import de `appVersion` en `app.component.ts`.
- tsc lo marca sin uso, pero al sacarlo el build falla: "version.ts is
  missing from the TypeScript compilation".
- `app.component`, `home` y `sidebar` leen la versión con `require()`,
  que tsc no ve. Ese import es lo único que mete `version.ts` en la
  compilación.
- Se deja, con un comentario que lo explica.

**2. Versión al deployar.**
- `set-version.js` regenera `src/environments/version.ts` (versión de
  package.json + commit + fecha). Hoy solo corre como `prebuild`, o sea
  con `npm run build`. Ni `build:demo` ni los `deploy:*` lo ejecutan.
- Se agrega `node set-version.js &&` al comienzo de `deploy:demo` y
  `deploy:vantruck` (decisión de Nico).
- No se agrega a `build:demo` / `build:vantruck`: cada build de
  verificación modificaría `version.ts`.
- Efecto: después de un deploy, `version.ts` queda modificado y conviene
  commitearlo.
- Hoy la app muestra solo `appVersion` (sidebar), que sale de
  package.json. `buildMeta` (commit y fecha) no se muestra en ningún lado.

No cambia comportamiento.

**Verificación previa:**
- Los 33 archivos de entrada son idénticos a los del dispositivo.
- Después del cambio, `tsc --noUnusedLocals` da 0.
- `tsc` del proyecto limpio. Los specs dan los mismos 7 errores que antes,
  todos previos: ninguno nuevo.
- `build:demo` limpio, 9 advertencias. main.js 42 bytes más chico.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- **NO corras `npm run deploy:*`, `npm run build` ni `node set-version.js`:**
  reescriben `version.ts` o deployan. Para compilar usá
  `npm run build:demo`.
- Si un texto a BUSCAR no está o aparece más de una vez: detenete y
  reportá.
- Aplicá los cambios de cada archivo EN ORDEN.
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md.
- Si se toca un tipo, interfaz, módulo o export, revisá TODOS sus usos en
  src/ (incluidos .spec.ts y .html).
- "Borrá la línea COMPLETA que contiene X": borrá la línea entera (con su
  salto de línea). X tiene que aparecer en una sola línea del archivo.

## PASO 0 — Verificación (sin modificar nada)

Corré y reportá la salida:

```
npx tsc -p tsconfig.app.json --noEmit --noUnusedLocals 2>&1 | grep -c "error TS"
npx tsc -p tsconfig.app.json --noEmit --noUnusedLocals 2>&1 | grep "error TS" | sed -E 's/\(.*//' | sort | uniq -c
npx tsc -p tsconfig.spec.json --noEmit 2>&1 | grep -c "error TS"
grep -n "set-version" package.json
```

Esperado:
1. 58.
2. 33 archivos. Cantidad por archivo:
   - app.component 7;
   - login 1;
   - carga 2;
   - migracion 1;
   - papelera-legado 1;
   - registro 1;
   - choferes-alta 5;
   - choferes-control 1;
   - choferes-listado 4;
   - modal-vehiculo 2;
   - cliente-alta 1;
   - clientes-listado 2;
   - modal-contacto 1;
   - home 2;
   - liq-gral 1;
   - carga-asignacion 1;
   - operaciones-editor 1;
   - tablero-asignaciones 2;
   - tablero-op 1;
   - proveedores-alta 3;
   - proveedores-listado 3;
   - sidebar 1;
   - excel.service 1;
   - pdf.service 1;
   - legajo.service 1;
   - chofer-migration 2;
   - proveedor-migration 1;
   - operacion.service 1;
   - vendedor.service 2;
   - solo-letras.directive 1;
   - baja-objeto 2;
   - objeto-papelera 1;
   - tablero-fechas 1.
3. Un número N: los errores previos de los specs. En la copia de
   referencia son 7. Anotalo: no tiene que cambiar.
4. Una sola línea: `"prebuild": "node set-version.js",`.

Si algo no coincide, detenete y reportá.

## PASO 1 — package.json

1.1 BUSCAR:
```
    "deploy:demo": "ng build --configuration=demo && firebase use demo && firebase deploy",
```
REEMPLAZAR:
```
    "deploy:demo": "node set-version.js && ng build --configuration=demo && firebase use demo && firebase deploy",
```

1.2 BUSCAR:
```
    "deploy:vantruck": "ng build --configuration=vantruck && firebase use vantruck && firebase deploy"
```
REEMPLAZAR:
```
    "deploy:vantruck": "node set-version.js && ng build --configuration=vantruck && firebase use vantruck && firebase deploy"
```


## PASO 2 — src/app/app.component.ts

2.1 Borrá la línea COMPLETA que contiene:
```
import { Router } from '@angular/router';
```
por:
```
(borrar la línea)
```

2.2 Borrá la línea COMPLETA que contiene:
```
import { AuthService } from './servicios/autentificacion/auth.service';
```
por:
```
(borrar la línea)
```

2.3 BUSCAR:
```
import Swal from 'sweetalert2';
```
REEMPLAZAR:
```
import Swal from 'sweetalert2';
// Este import parece sin uso, pero mete version.ts en la compilación: lo
// necesitan los require() de versión (acá, home y sidebar). No borrar.
```

2.4 Borrá la línea COMPLETA que contiene:
```
import { StorageService } from './servicios/storage/storage.service';
```
por:
```
(borrar la línea)
```

2.5 Borrá la línea COMPLETA que contiene:
```
import { Cliente } from './interfaces/cliente';
```
por:
```
(borrar la línea)
```

2.6 Borrá la línea COMPLETA que contiene:
```
import { Chofer } from './interfaces/chofer';
```
por:
```
(borrar la línea)
```

2.7 Borrá la línea COMPLETA que contiene:
```
import { Proveedor } from './interfaces/proveedor';
```
por:
```
(borrar la línea)
```

2.8 BUSCAR:
```
  constructor(private swUpdate: SwUpdate, private storageService: StorageService) {
```
REEMPLAZAR:
```
  constructor(private swUpdate: SwUpdate) {
```


## PASO 3 — src/app/appLogin/login/login.component.ts

3.1 Borrá la línea COMPLETA que contiene:
```
import { Router } from '@angular/router';
```
por:
```
(borrar la línea)
```


## PASO 4 — src/app/carga/carga.component.ts

4.1 Borrá la línea COMPLETA que contiene:
```
import { take } from 'rxjs';
```
por:
```
(borrar la línea)
```

4.2 Borrá la línea COMPLETA que contiene:
```
import { DbFirestoreService } from '../servicios/database/db-firestore.service';
```
por:
```
(borrar la línea)
```

4.3 BUSCAR:
```
  constructor(private storageService: StorageService, private router: Router, private dbFirebase: DbFirestoreService){
```
REEMPLAZAR:
```
  constructor(private storageService: StorageService, private router: Router){
```


## PASO 5 — src/app/componentes/migracion/migracion.component.ts

5.1 BUSCAR:
```
import { TarifaMigrationService, ItemPreviewEventual, ItemHistorialGeneral } from 'src/app/servicios/migracion/tarifa-migration.service';
```
REEMPLAZAR:
```
import { TarifaMigrationService, ItemPreviewEventual } from 'src/app/servicios/migracion/tarifa-migration.service';
```


## PASO 6 — src/app/raiz/ajustes/papelera-legado/papelera-legado.component.ts

6.1 Borrá la línea COMPLETA que contiene:
```
    let respuesta;
```
por:
```
(borrar la línea)
```


## PASO 7 — src/app/raiz/ajustes/registro/registro.component.ts

7.1 Borrá la línea COMPLETA que contiene:
```
    let respuesta
```
por:
```
(borrar la línea)
```


## PASO 8 — src/app/raiz/choferes/choferes-alta/choferes-alta.component.ts

8.1 Borrá la línea COMPLETA que contiene:
```
import { Router } from "@angular/router";
```
por:
```
(borrar la línea)
```

8.2 Borrá la línea COMPLETA que contiene:
```
import { StorageService } from "src/app/servicios/storage/storage.service";
```
por:
```
(borrar la línea)
```

8.3 BUSCAR:
```
import { ConId, ConIdType } from "src/app/interfaces/conId";
```
REEMPLAZAR:
```
import { ConIdType } from "src/app/interfaces/conId";
```

8.4 Borrá la línea COMPLETA que contiene:
```
    const apellido = this.form.value.apellido;
```
por:
```
(borrar la línea)
```

8.5 Borrá la línea COMPLETA que contiene:
```
    const nombre = this.form.value.nombre;
```
por:
```
(borrar la línea)
```


## PASO 9 — src/app/raiz/choferes/choferes-control/choferes-control.component.ts

9.1 Borrá la línea COMPLETA que contiene:
```
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
```
por:
```
(borrar la línea)
```


## PASO 10 — src/app/raiz/choferes/choferes-listado/choferes-listado.component.ts

10.1 BUSCAR:
```
import { Cliente } from "src/app/interfaces/cliente";
import { ConId, ConIdType } from "src/app/interfaces/conId";
```
REEMPLAZAR:
```
import { ConIdType } from "src/app/interfaces/conId";
```

10.2 Borrá la línea COMPLETA que contiene:
```
import { StorageService } from "src/app/servicios/storage/storage.service";
```
por:
```
(borrar la línea)
```

10.3 Borrá la línea COMPLETA que contiene:
```
    private storageService: StorageService,
```
por:
```
(borrar la línea)
```

10.4 BUSCAR:
```
  }

  private randomDominio(): string {
    const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numeros = "0123456789";

    const l = () => letras.charAt(Math.floor(Math.random() * letras.length));
    const n = () => numeros.charAt(Math.floor(Math.random() * numeros.length));

    return `${l()}${l()}${l()}${n()}${n()}${n()}`;
  }

  async actualizarActivos() {
```
REEMPLAZAR:
```
  }

  async actualizarActivos() {
```


## PASO 11 — src/app/raiz/choferes/modal-vehiculo/modal-vehiculo.component.ts

11.1 BUSCAR:
```
import { Router } from '@angular/router';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
```
REEMPLAZAR:
```
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
```

11.2 BUSCAR:
```
  constructor(private fb: FormBuilder, private storageService: StorageService, private router:Router, public activeModal: NgbActiveModal, private modalService: NgbModal, private vehiculoFactoryService: VehiculoFactoryService, private tarifarioService: TarifarioService){
```
REEMPLAZAR:
```
  constructor(private fb: FormBuilder, private storageService: StorageService, public activeModal: NgbActiveModal, private vehiculoFactoryService: VehiculoFactoryService, private tarifarioService: TarifarioService){
```


## PASO 12 — src/app/raiz/clientes/cliente-alta/cliente-alta.component.ts

12.1 Borrá la línea COMPLETA que contiene:
```
import { StorageService } from 'src/app/servicios/storage/storage.service';
```
por:
```
(borrar la línea)
```

12.2 BUSCAR:
```
  constructor(private fb: FormBuilder, private storageService: StorageService, private modalService: NgbModal, public activeModal: NgbActiveModal, private domicilioServ: DomicilioService, private clienteService: ClienteService) {
```
REEMPLAZAR:
```
  constructor(private fb: FormBuilder, private modalService: NgbModal, public activeModal: NgbActiveModal, private domicilioServ: DomicilioService, private clienteService: ClienteService) {
```


## PASO 13 — src/app/raiz/clientes/clientes-listado/clientes-listado.component.ts

13.1 Borrá la línea COMPLETA que contiene:
```
import { StorageService } from 'src/app/servicios/storage/storage.service';
```
por:
```
(borrar la línea)
```

13.2 Borrá la línea COMPLETA que contiene:
```
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
```
por:
```
(borrar la línea)
```

13.3 Borrá la línea COMPLETA que contiene:
```
    private storageService: StorageService,
```
por:
```
(borrar la línea)
```

13.4 Borrá la línea COMPLETA que contiene:
```
    private dbFirestore: DbFirestoreService,
```
por:
```
(borrar la línea)
```


## PASO 14 — src/app/raiz/clientes/modal-contacto/modal-contacto.component.ts

14.1 Borrá la línea COMPLETA que contiene:
```
import { ValidarService } from 'src/app/servicios/validar/validar.service';
```
por:
```
(borrar la línea)
```


## PASO 15 — src/app/raiz/home/home.component.ts

15.1 BUSCAR:
```
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
```
REEMPLAZAR:
```
import { Subject } from 'rxjs';
```

15.2 BUSCAR:
```
  constructor(private storageService: StorageService, private categoriaDocumentacionService: CategoriaDocumentacionService, private legajoService: LegajoService, private router: Router, private choferService: ChoferService, private proveedorService: ProveedorService, private clienteService: ClienteService, private tarifarioService: TarifarioService) { }
```
REEMPLAZAR:
```
  constructor(private storageService: StorageService, private categoriaDocumentacionService: CategoriaDocumentacionService, private legajoService: LegajoService, private choferService: ChoferService, private proveedorService: ProveedorService, private clienteService: ClienteService, private tarifarioService: TarifarioService) { }
```


## PASO 16 — src/app/raiz/liquidacion/liq-gral/liq-gral.component.ts

16.1 Borrá la línea COMPLETA que contiene:
```
import { StorageService } from 'src/app/servicios/storage/storage.service';
```
por:
```
(borrar la línea)
```

16.2 BUSCAR:
```
  constructor(private storageService: StorageService, private router: Router){
```
REEMPLAZAR:
```
  constructor(private router: Router){
```


## PASO 17 — src/app/raiz/operaciones/carga-asignacion/carga-asignacion.component.ts

17.1 BUSCAR:
```
      const modalRef = this.modal.open(ModalChoferesNoDisponiblesComponent, { centered: true, size: 'lg', });
```
REEMPLAZAR:
```
      this.modal.open(ModalChoferesNoDisponiblesComponent, { centered: true, size: 'lg', });
```


## PASO 18 — src/app/raiz/operaciones/operaciones-editor/operaciones-editor.component.ts

18.1 Borrá la línea COMPLETA que contiene:
```
import { AsignacionItem } from 'src/app/interfaces/asignacion';
```
por:
```
(borrar la línea)
```


## PASO 19 — src/app/raiz/operaciones/tablero-asignaciones/tablero-asignaciones.component.ts

19.1 BUSCAR:
```
import { Asignacion, AsignacionItem, AsignacionRef, EstadoAsignacion, SujetoAsignacion } from 'src/app/interfaces/asignacion';
```
REEMPLAZAR:
```
import { Asignacion, AsignacionItem, AsignacionRef, SujetoAsignacion } from 'src/app/interfaces/asignacion';
```

19.2 BUSCAR:
```
    const modalRef = this.modal.open(ModalChoferesNoDisponiblesComponent, { centered: true, size: 'lg', });
```
REEMPLAZAR:
```
    this.modal.open(ModalChoferesNoDisponiblesComponent, { centered: true, size: 'lg', });
```


## PASO 20 — src/app/raiz/operaciones/tablero-op/tablero-op.component.ts

20.1 Borrá la línea COMPLETA que contiene:
```
import { StorageService } from 'src/app/servicios/storage/storage.service';
```
por:
```
(borrar la línea)
```

20.2 Borrá la línea COMPLETA que contiene:
```
    private storage: StorageService,
```
por:
```
(borrar la línea)
```


## PASO 21 — src/app/raiz/proveedores/proveedores-alta/proveedores-alta.component.ts

21.1 Borrá la línea COMPLETA que contiene:
```
import { Router } from '@angular/router';
```
por:
```
(borrar la línea)
```

21.2 Borrá la línea COMPLETA que contiene:
```
import { StorageService } from 'src/app/servicios/storage/storage.service';
```
por:
```
(borrar la línea)
```

21.3 BUSCAR:
```
import { ConId, ConIdType } from 'src/app/interfaces/conId';
```
REEMPLAZAR:
```
import { ConIdType } from 'src/app/interfaces/conId';
```

21.4 BUSCAR:
```
  constructor(private fb: FormBuilder, private storageService: StorageService, private router: Router, public activeModal: NgbActiveModal, private modalService: NgbModal, private domicilioServ: DomicilioService, private proveedorService: ProveedorService) {
```
REEMPLAZAR:
```
  constructor(private fb: FormBuilder, public activeModal: NgbActiveModal, private modalService: NgbModal, private domicilioServ: DomicilioService, private proveedorService: ProveedorService) {
```


## PASO 22 — src/app/raiz/proveedores/proveedores-listado/proveedores-listado.component.ts

22.1 BUSCAR:
```
import { Subject, take, takeUntil } from "rxjs";
```
REEMPLAZAR:
```
import { Subject, takeUntil } from "rxjs";
```

22.2 Borrá la línea COMPLETA que contiene:
```
  ContratacionChofer,
```
por:
```
(borrar la línea)
```

22.3 Borrá la línea COMPLETA que contiene:
```
import { StorageService } from "src/app/servicios/storage/storage.service";
```
por:
```
(borrar la línea)
```

22.4 Borrá la línea COMPLETA que contiene:
```
    private storageService: StorageService,
```
por:
```
(borrar la línea)
```


## PASO 23 — src/app/raiz/sidebar/sidebar.component.ts

23.1 Borrá la línea COMPLETA que contiene:
```
import { Router } from '@angular/router';
```
por:
```
(borrar la línea)
```


## PASO 24 — src/app/servicios/informes/excel/excel.service.ts

24.1 BUSCAR:
```
    const [year, month, day] = fecha.split("-").map(Number);

    // Crear la fecha asegurando que tome la zona horaria local
    const date = new Date(year, month - 1, day); // mes - 1 porque los meses en JavaScript son 0-indexed
```
REEMPLAZAR:
```
    const [, , day] = fecha.split("-").map(Number);
```


## PASO 25 — src/app/servicios/informes/pdf/pdf.service.ts

25.1 BUSCAR:
```
    const [year, month, day] = fecha.split("-").map(Number);

    // Crear la fecha asegurando que tome la zona horaria local
    const date = new Date(year, month - 1, day); // mes - 1 porque los meses en JavaScript son 0-indexed
```
REEMPLAZAR:
```
    const [, , day] = fecha.split("-").map(Number);
```


## PASO 26 — src/app/servicios/legajos/legajo.service.ts

26.1 Borrá la línea COMPLETA que contiene:
```
import { StorageArchivosService } from 'src/app/servicios/storage-archivos/storage-archivos.service';
```
por:
```
(borrar la línea)
```

26.2 Borrá la línea COMPLETA que contiene:
```
    private storageArchivosService: StorageArchivosService, // sin uso todavía en este bloque — ver nota en guardarDocumentacion
```
por:
```
(borrar la línea)
```


## PASO 27 — src/app/servicios/migracion/chofer-migration.service.ts

27.1 BUSCAR:
```
import { ContratacionChofer, Vehiculo, AsignacionVehiculo } from 'src/app/interfaces/chofer';
```
REEMPLAZAR:
```
import { ContratacionChofer, Vehiculo } from 'src/app/interfaces/chofer';
```

27.2 BUSCAR:
```
    // Buscar la colección de backup más reciente
    // El nombre sigue el patrón _backup_choferes_YYYYMMDD
    // Leemos directamente con el nombre que el usuario indique via parámetro
    const backupRef = collection(this.firestore, '/Vantruck/datos/_backup_choferes');

    // Como no sabemos la fecha exacta, leemos desde los choferes actuales
```
REEMPLAZAR:
```
    // Como no sabemos la fecha exacta, leemos desde los choferes actuales
```


## PASO 28 — src/app/servicios/migracion/proveedor-migration.service.ts

28.1 Borrá la línea COMPLETA que contiene:
```
import { Proveedor } from 'src/app/interfaces/proveedor';
```
por:
```
(borrar la línea)
```


## PASO 29 — src/app/servicios/operaciones/operacion.service.ts

29.1 Borrá la línea COMPLETA que contiene:
```
import { FormatoNumericoService } from 'src/app/servicios/formato-numerico/formato-numerico.service';
```
por:
```
(borrar la línea)
```

29.2 Borrá la línea COMPLETA que contiene:
```
    private formNumServ:      FormatoNumericoService,
```
por:
```
(borrar la línea)
```


## PASO 30 — src/app/servicios/vendedores/vendedor.service.ts

30.1 BUSCAR:
```
import { Cliente } from 'src/app/interfaces/cliente';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
```
REEMPLAZAR:
```
import { ConId } from 'src/app/interfaces/conId';
```


## PASO 31 — src/app/shared/directives/solo-letras.directive.ts

31.1 Borrá la línea COMPLETA que contiene:
```
  private valorAnterior: string = ''; // Guardar el último valor válido
```
por:
```
(borrar la línea)
```

31.2 BUSCAR:
```
    this.renderer.removeStyle(this.el.nativeElement, 'border');

    // Guardar el último valor válido
    this.valorAnterior = valor;
  }
```
REEMPLAZAR:
```
    this.renderer.removeStyle(this.el.nativeElement, 'border');
  }
```


## PASO 32 — src/app/shared/modales/baja-objeto/baja-objeto.component.ts

32.1 BUSCAR:
```
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
```
REEMPLAZAR:
```
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
```

32.2 Borrá la línea COMPLETA que contiene:
```
import { StorageService } from 'src/app/servicios/storage/storage.service';
```
por:
```
(borrar la línea)
```


## PASO 33 — src/app/shared/modales/objeto-papelera/objeto-papelera.component.ts

33.1 BUSCAR:
```
import { Subject, take, takeUntil } from 'rxjs';
```
REEMPLAZAR:
```
import { Subject, takeUntil } from 'rxjs';
```


## PASO 34 — src/app/shared/tablero-fechas/tablero-fechas.component.ts

34.1 BUSCAR:
```
import { NgbDateStruct, NgbDate, NgbCalendar } from '@ng-bootstrap/ng-bootstrap';
```
REEMPLAZAR:
```
import { NgbDateStruct, NgbDate } from '@ng-bootstrap/ng-bootstrap';
```

34.2 Borrá la línea COMPLETA que contiene:
```
    private calendar: NgbCalendar
```
por:
```
(borrar la línea)
```

## Verificación

1. Comandos (reportá la salida):
```
npx tsc -p tsconfig.app.json --noEmit --noUnusedLocals 2>&1 | grep -c "error TS"
npx tsc -p tsconfig.spec.json --noEmit 2>&1 | grep -c "error TS"
grep -n "set-version" package.json
git diff --numstat -- src package.json
git diff -U0 -- src package.json | grep -n "^+.* $"
git status --short src/environments
```
Esperado:
- (a) 0.
- (b) el mismo N del PASO 0.
- (c) 3 líneas: `prebuild`, `deploy:demo` y `deploy:vantruck`.
- (d) 34 archivos (agregadas / borradas):
  - package.json 2/2;
  - app.component 3/7;
  - login 0/1;
  - carga 1/3;
  - migracion 1/1;
  - papelera-legado 0/1;
  - registro 0/1;
  - choferes-alta 1/5;
  - choferes-control 0/1;
  - choferes-listado 1/14;
  - modal-vehiculo 2/3;
  - cliente-alta 1/2;
  - clientes-listado 0/4;
  - modal-contacto 0/1;
  - home 2/3;
  - liq-gral 1/2;
  - carga-asignacion 1/1;
  - operaciones-editor 0/1;
  - tablero-asignaciones 2/2;
  - tablero-op 0/2;
  - proveedores-alta 2/4;
  - proveedores-listado 1/4;
  - sidebar 0/1;
  - excel.service 1/4;
  - pdf.service 1/4;
  - legajo.service 0/2;
  - chofer-migration 1/6;
  - proveedor-migration 0/1;
  - operacion.service 0/2;
  - vendedor.service 1/2;
  - solo-letras.directive 0/4;
  - baja-objeto 1/2;
  - objeto-papelera 1/1;
  - tablero-fechas 1/2.
- (e) nada.
- (f) nada.

2. `npm run build:demo`. Reportá la tabla de tamaños y las advertencias.
   Referencia: sin cambio apreciable (main ≈ 1,10 MB; Initial total ≈
   1,53 MB) y las mismas 9 advertencias.

## Pruebas manuales en demo (las hace Nico)

Recorrida rápida de las pantallas tocadas: que carguen y funcionen como
antes, sin errores en la consola.
1. **Inicio:** login, pantalla de carga y home. El sidebar muestra
   "Versión v1.6.2".
2. **Choferes:**
   - listado;
   - alta y edición de un chofer (los campos de nombre usan la
     directiva de solo letras);
   - modal de vehículo.
3. **Clientes:** listado, alta y modal de contacto.
4. **Proveedores:** listado (modal de choferes y vehículos) y alta.
5. **Operaciones:**
   - tablero de operaciones;
   - tablero de asignaciones y carga de asignación: el botón de choferes
     no operativos abre su modal;
   - editor de operación.
6. **Liquidación:** pantalla general (liq-gral) y su selector de fechas.
7. **Legajos:** cargar documentación de un chofer.
8. **Ajustes:**
   - dar de baja algo (modal de baja);
   - Papelera: abrir un objeto;
   - Registro viejo y Papelera legado: consultar por id.
9. **/migracion:** la pantalla carga (no hace falta correr nada).
10. **Próximo deploy a demo (`npm run deploy:demo`):**
    - antes de compilar imprime "Versión generada: v1.6.2 (<commit> -
      <fecha>)";
    - `version.ts` queda modificado; commitealo.

## Mensaje de commit

```
CI1 (lazy-fechas): cierre de código — imports, inyecciones y variables sin uso

- 58 avisos de tsc --noUnusedLocals en 33 archivos → 0: imports sin uso,
  20 servicios inyectados como private sin uso (incl.
  OperacionService.formNumServ), variables locales (se conservan las
  llamadas), randomDominio y SoloLetrasDirective.valorAnterior.
- Se conserva (con comentario) el import de appVersion en app.component:
  mete version.ts en la compilación para los require() de versión.
- package.json: deploy:demo y deploy:vantruck corren set-version.js
  antes del build (antes solo lo hacía npm run build).
```

FIN DE LA INSTRUCCIÓN CI1
````
