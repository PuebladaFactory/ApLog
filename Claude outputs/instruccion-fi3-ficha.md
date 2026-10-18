````
Si no ves la línea FIN DE LA INSTRUCCIÓN FI3 al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN FI3 — Ficha de entidad: cliente + accesos desde los listados y Legajos (ApLog, rama refactor)
=========================================================================================================

## Contexto y razonamiento

Tercer bloque del frente "Ficha de entidad" (diseño: `claude/diseno-ficha-entidad.md`). Junta
FI3 y FI5 del plan revisado (§9), a pedido de Nico, para poder probar la ficha del cliente
apenas se aplica: sin un acceso, la ficha del cliente no se podía abrir desde ninguna
pantalla.

**1. Ficha del cliente** (`FichaEntidadComponent`):
- Encabezado: razón social, CUIT · condición fiscal, badge "Cliente" y "Oculto en listados"
  si `visible === false`.
- Pestañas: **Datos de la empresa** y **Contactos**, con las mismas pestañas que el proveedor
  (`FichaEmpresaDatosComponent` y `FichaContactosComponent` de FI2, sin cambios).
- Sin vendedores asignados (F11: no por ahora).
- Datos vivos: la suscripción única suma `ClienteService.clientes$` (ya en memoria desde
  `HomeComponent`, sin lecturas nuevas). Si el cliente se edita en otra pestaña, se
  actualiza; si se da de baja, lo avisa.
- Desaparece el aviso "La ficha de … todavía no está disponible" para el cliente (el
  `@default` queda solo como red, ya no lo alcanza ningún tipo).

**2. "Ver" (el ojo) de los listados → ficha** (F7 (a)): en Clientes, Choferes y Proveedores,
`abrirVista` deja de abrir el modal de alta en modo vista y abre la ficha
(`FichaEntidadService.abrir`). `openModal` no cambia: lo siguen usando el alta y la edición, y
el modo `'vista'` del alta sigue existiendo para `VisualizadorObjetoService` (Registro,
Papelera, Tarifas). Editar, eliminar y vehículos (proveedores) no cambian.

**3. Legajos (F14):**
- **Consulta:** botón "Ver ficha" al lado de "Descargar Legajo". Aparece apenas hay un chofer
  elegido (aunque su legajo esté vacío); "Descargar Legajo" sigue apareciendo solo si hay
  documentos, como hoy.
- **Vencimientos:** el nombre del chofer abre su ficha, igual que en el tablero. Si el chofer
  ya no existe (la fila muestra "—"), la ficha avisa que se dio de baja.

**Cómo se hace el enlace en Vencimientos:** usa `tabla-generica`, que no tenía celdas con
acción. Se agrega a `ColumnaTablaGenerica` un campo OPCIONAL `accionCelda?: (fila) => void`
(mismo criterio que `claseCelda`): si la columna lo define, el texto se dibuja como enlace
(`role="link"`, Enter con el teclado, mismo estilo que el tablero: sin azul ni subrayado,
subrayado al pasar el mouse). Ningún otro listado lo usa, así que ninguno cambia. Es también
el camino (a) de la alternativa de F7 que quedó para analizar (el apellido / la razón social
de los listados como enlace a la ficha): con esto, cada listado sería una línea; queda para
decidir después de usar la ficha.

**Bundle:** la ficha ahora la usan cuatro módulos lazy (Clientes, Choferes, Proveedores y
Legajos). Angular la saca del chunk de Legajos (177,5 → 150,6 kB) a un chunk compartido de
39,6 kB que se descarga con el primero de esos módulos. El inicial no cambia (1,53 MB).

**Verificación previa (sobre una copia del repo en el estado actual de `refactor`, con FI2 y
tu commit del sidebar, aplicando esta instrucción con un script que valida todos los BUSCAR
antes de escribir):**
- antes de armarla se compararon con tu repo (por el puente) los 14 archivos involucrados:
  iguales;
- 32 BUSCAR, cada uno encontrado una sola vez; el resultado coincide con la referencia;
- `tsc` limpio (también `--noUnusedLocals` en lo tocado);
- pruebas de render con Karma + Chromium: ficha del cliente (encabezado, 2 pestañas,
  contactos, datos vivos, baja) y `tabla-generica` con `accionCelda` (dibuja un solo enlace;
  clic y Enter llaman a la acción con la fila);
- `build:demo` con las mismas 9 advertencias.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- NO corras `npm run deploy:*`, `npm run build` ni `node set-version.js`. Para compilar
  usá `npm run build:demo`.
- Validá TODOS los BUSCAR antes de escribir el primero; después aplicá los pasos EN ORDEN.
- Si un texto a BUSCAR no está o aparece más de una vez: detenete y reportá. Los BUSCAR
  son líneas completas.
- Editá cada archivo en el lugar (leer, reemplazar, escribir); nunca abras un archivo
  para escritura antes de haber leído su contenido. Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md (se actualizan al cierre del frente).

## PASO 0 — Verificación (sin modificar nada)

No hace falta que el último commit sea FI2: alcanza con que los archivos a tocar estén como
se indica abajo.

```
git status --short
git hash-object src/app/shared/ficha-entidad/ficha-entidad.component.ts src/app/shared/ficha-entidad/ficha-entidad.component.html
grep -rn "accionCelda\|contactosCliente\|verFicha" src/app
grep -n "openModal('vista'\|openModal(\"vista\"\|public usuarioSesion: UsuarioSesionService," src/app/raiz/clientes/clientes-listado/clientes-listado.component.ts src/app/raiz/choferes/choferes-listado/choferes-listado.component.ts src/app/raiz/proveedores/proveedores-listado/proveedores-listado.component.ts
grep -n "@if (legajoSeleccionado) {\|private modalService: NgbModal,\|ngOnDestroy(): void {\|field: 'chofer'" src/app/raiz/legajos/consulta-legajos/consulta-legajos.component.html src/app/raiz/legajos/consulta-legajos/consulta-legajos.component.ts src/app/raiz/legajos/vencimientos/vencimientos.component.ts
grep -n "claseCelda" src/app/interfaces/tabla-generica.ts src/app/shared/tabla/tabla-generica/tabla-generica.component.html
wc -l src/app/interfaces/tabla-generica.ts src/app/shared/tabla/tabla-generica/tabla-generica.component.html src/app/shared/tabla/tabla-generica/tabla-generica.component.scss src/app/raiz/clientes/clientes-listado/clientes-listado.component.ts src/app/raiz/choferes/choferes-listado/choferes-listado.component.ts src/app/raiz/proveedores/proveedores-listado/proveedores-listado.component.ts src/app/raiz/legajos/consulta-legajos/consulta-legajos.component.html src/app/raiz/legajos/consulta-legajos/consulta-legajos.component.ts src/app/raiz/legajos/vencimientos/vencimientos.component.ts
```
Esperado:
1. Nada (o solo `Claude outputs/`).
2. `5a47acbed02976daf1e44ef696df4e8abb5aef5c` (el `.ts`) y
   `bd249ca6e93de02b2cf047ec14019aafca1fe405` (el `.html`): los de FI2.
3. Nada.
4. `clientes-listado` 38 y 121; `choferes-listado` 44 y 140; `proveedores-listado` 55 y 201.
5. `consulta-legajos.component.html` 17 y 32; `consulta-legajos.component.ts` 38 y 62;
   `vencimientos.component.ts` 23, 41 y 76.
6. `tabla-generica.ts` 7; `tabla-generica.component.html` 138 y 139.
7. 14, 170, 123, 288, 266, 472, 292, 182 y 132.

Si algo no coincide, detenete y reportá.

## PASO 1 — Ficha del cliente

1.1 `src/app/shared/ficha-entidad/ficha-entidad.component.ts` — imports del cliente. BUSCAR:
```
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
```
REEMPLAZAR:
```
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
```

1.2 `src/app/shared/ficha-entidad/ficha-entidad.component.ts` — ClienteService. BUSCAR:
```
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
```
REEMPLAZAR:
```
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
```

1.3 `src/app/shared/ficha-entidad/ficha-entidad.component.ts` — la última emisión incluye los clientes. BUSCAR:
```
  ConIdType<Legajo>[],
];
```
REEMPLAZAR:
```
  ConIdType<Legajo>[],
  ConIdType<Cliente>[],
];
```

1.4 `src/app/shared/ficha-entidad/ficha-entidad.component.ts` — comentario de la clase. BUSCAR:
```
 * un chofer o un proveedor (el cliente viene en FI3). Se abre con
```
REEMPLAZAR:
```
 * un chofer, un proveedor o un cliente. Se abre con
```

1.5 `src/app/shared/ficha-entidad/ficha-entidad.component.ts` — estado del cliente. BUSCAR:
```
  choferesProveedor: FilaChoferFicha[] = [];
```
REEMPLAZAR:
```
  choferesProveedor: FilaChoferFicha[] = [];

  /** Ficha de cliente: el cliente. */
  cliente: ConIdType<Cliente> | null = null;
```

1.6 `src/app/shared/ficha-entidad/ficha-entidad.component.ts` — inyección. BUSCAR:
```
    private categoriaDocumentacionService: CategoriaDocumentacionService,
```
REEMPLAZAR:
```
    private categoriaDocumentacionService: CategoriaDocumentacionService,
    private clienteService: ClienteService,
```

1.7 `src/app/shared/ficha-entidad/ficha-entidad.component.ts` — suscripción: suma clientes$. BUSCAR:
```
      this.categoriaDocumentacionService.categorias$,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([choferes, vehiculos, proveedores, legajos]) =>
        this.zone.run(() => {
          this.ultimosDatos = [choferes, vehiculos, proveedores, legajos];
```
REEMPLAZAR:
```
      this.categoriaDocumentacionService.categorias$,
      this.clienteService.clientes$,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([choferes, vehiculos, proveedores, legajos, , clientes]) =>
        this.zone.run(() => {
          this.ultimosDatos = [choferes, vehiculos, proveedores, legajos, clientes];
```

1.8 `src/app/shared/ficha-entidad/ficha-entidad.component.ts` — contactos del cliente. BUSCAR:
```
  /** Contacto principal del proveedor (el primero de la lista). */
```
REEMPLAZAR:
```
  /** Contactos del cliente (un doc viejo puede no tener la lista). */
  get contactosCliente(): Contacto[] {
    return this.cliente?.contactos ?? [];
  }

  /** Contacto principal del proveedor (el primero de la lista). */
```

1.9 `src/app/shared/ficha-entidad/ficha-entidad.component.ts` — título del cliente. BUSCAR:
```
    if (this.tipo === 'proveedor' && this.proveedor) return this.proveedor.razonSocial;
```
REEMPLAZAR:
```
    if (this.tipo === 'proveedor' && this.proveedor) return this.proveedor.razonSocial;
    if (this.tipo === 'cliente' && this.cliente) return this.cliente.razonSocial;
```

1.10 `src/app/shared/ficha-entidad/ficha-entidad.component.ts` — armar: rama del cliente. BUSCAR:
```
    const [choferes, vehiculos, proveedores, legajos] = this.ultimosDatos;
    if (this.tipo === 'chofer') {
      this.armarChofer(choferes, vehiculos, proveedores, legajos);
    } else if (this.tipo === 'proveedor') {
      this.armarProveedor(choferes, vehiculos, proveedores, legajos);
    }
```
REEMPLAZAR:
```
    const [choferes, vehiculos, proveedores, legajos, clientes] = this.ultimosDatos;
    if (this.tipo === 'chofer') {
      this.armarChofer(choferes, vehiculos, proveedores, legajos);
    } else if (this.tipo === 'proveedor') {
      this.armarProveedor(choferes, vehiculos, proveedores, legajos);
    } else if (this.tipo === 'cliente') {
      this.cliente = clientes.find(c => c.idCliente === this.id) ?? null;
    }
```

1.11 `src/app/shared/ficha-entidad/ficha-entidad.component.ts` — limpiar. BUSCAR:
```
    this.choferesProveedor = [];
  }
```
REEMPLAZAR:
```
    this.choferesProveedor = [];
    this.cliente = null;
  }
```

1.12 `src/app/shared/ficha-entidad/ficha-entidad.component.html` — encabezado del cliente. BUSCAR:
```
        @if (proveedor.visible === false) {
          <span class="badge bg-light text-dark border">Oculto en listados</span>
        }
      </div>
    } @else {
```
REEMPLAZAR:
```
        @if (proveedor.visible === false) {
          <span class="badge bg-light text-dark border">Oculto en listados</span>
        }
      </div>
    } @else if (tipo === 'cliente' && cliente) {
      <h4 class="modal-title">{{ titulo }}</h4>
      <div class="text-muted">
        CUIT {{ cuitLegible(cliente.cuit) }}
        @if (cliente.condFiscal) {
          · {{ cliente.condFiscal }}
        }
      </div>
      <div class="d-flex flex-wrap gap-1 mt-1">
        <span class="badge bg-secondary">Cliente</span>
        @if (cliente.visible === false) {
          <span class="badge bg-light text-dark border">Oculto en listados</span>
        }
      </div>
    } @else {
```

1.13 `src/app/shared/ficha-entidad/ficha-entidad.component.html` — pestañas del cliente. BUSCAR:
```
    @default {
      <div class="alert alert-secondary mb-0">La ficha de {{ tipo }} todavía no está disponible.</div>
    }
```
REEMPLAZAR:
```
    @case ('cliente') {
      @if (cliente; as cli) {
        <ul class="nav nav-tabs flex-nowrap overflow-auto" role="tablist">
          <li class="nav-item" role="presentation">
            <button type="button" class="nav-link" role="tab" [class.active]="pestana === 'datos'"
              [attr.aria-selected]="pestana === 'datos'" (click)="pestana = 'datos'">Datos de la empresa</button>
          </li>
          <li class="nav-item" role="presentation">
            <button type="button" class="nav-link" role="tab" [class.active]="pestana === 'contactos'"
              [attr.aria-selected]="pestana === 'contactos'" (click)="pestana = 'contactos'">
              Contactos <span class="badge rounded-pill bg-secondary">{{ contactosCliente.length }}</span>
            </button>
          </li>
        </ul>
        <div class="mt-3" role="tabpanel">
          @switch (pestana) {
            @case ('datos') {
              <app-ficha-empresa-datos [empresa]="cli"></app-ficha-empresa-datos>
            }
            @case ('contactos') {
              <app-ficha-contactos [contactos]="contactosCliente"></app-ficha-contactos>
            }
          }
        </div>
      } @else if (cargado) {
        <div class="alert alert-secondary mb-0">
          El cliente ya no existe: se dio de baja. Su información está en Ajustes → Papelera.
        </div>
      }
    }
```

## PASO 2 — tabla-generica: celda con enlace (`accionCelda`, opcional)

2.1 `src/app/interfaces/tabla-generica.ts` — accionCelda (opcional). BUSCAR:
```
  claseCelda?: (fila: any) => string; // clase(s) Bootstrap para un <span class="badge"> dentro de la celda (no pinta el <td>). Primer consumidor: Vencimientos.
```
REEMPLAZAR:
```
  claseCelda?: (fila: any) => string; // clase(s) Bootstrap para un <span class="badge"> dentro de la celda (no pinta el <td>). Primer consumidor: Vencimientos.
  accionCelda?: (fila: any) => void; // el texto de la celda pasa a ser un enlace que ejecuta esto (ej. abrir la ficha). Primer consumidor: Vencimientos (frente Ficha de entidad).
```

2.2 `src/app/shared/tabla/tabla-generica/tabla-generica.component.html` — render del enlace. BUSCAR:
```
                                } @else {
                                    {{ fila[col.field] }}
                                }
```
REEMPLAZAR:
```
                                } @else if (col.accionCelda) {
                                    <a
                                        class="enlace-celda"
                                        role="link"
                                        tabindex="0"
                                        (click)="col.accionCelda(fila)"
                                        (keydown.enter)="col.accionCelda(fila)"
                                        >{{ fila[col.field] }}</a
                                    >
                                } @else {
                                    {{ fila[col.field] }}
                                }
```

2.3 `src/app/shared/tabla/tabla-generica/tabla-generica.component.scss` — estilo del enlace. BUSCAR:
```
// Ancho fijo para que el badge no cambie de tamaño según el largo del texto
```
REEMPLAZAR:
```
// Celda con accionCelda: se ve como el resto del texto y se subraya al pasar el
// mouse (mismo criterio que .enlace-entidad de Finanzas y el tablero de Legajos).
.enlace-celda {
  color: inherit;
  text-decoration: none;
  cursor: pointer;
}

.enlace-celda:hover {
  text-decoration: underline;
}

// Ancho fijo para que el badge no cambie de tamaño según el largo del texto
```

## PASO 3 — "Ver" de los listados → ficha

3.1 `src/app/raiz/clientes/clientes-listado/clientes-listado.component.ts` — import. BUSCAR:
```
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
```
REEMPLAZAR:
```
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import { FichaEntidadService } from 'src/app/servicios/ficha-entidad/ficha-entidad.service';
```

3.2 `src/app/raiz/clientes/clientes-listado/clientes-listado.component.ts` — inyección. BUSCAR:
```
    public usuarioSesion: UsuarioSesionService,
```
REEMPLAZAR:
```
    public usuarioSesion: UsuarioSesionService,
    private fichaEntidad: FichaEntidadService,
```

3.3 `src/app/raiz/clientes/clientes-listado/clientes-listado.component.ts` — ver → ficha. BUSCAR:
```
    this.openModal('vista', cliente);
```
REEMPLAZAR:
```
    this.fichaEntidad.abrir('cliente', cliente.idCliente);
```

3.4 `src/app/raiz/choferes/choferes-listado/choferes-listado.component.ts` — import. BUSCAR:
```
import { UsuarioSesionService } from "src/app/servicios/usuario-sesion/usuario-sesion.service";
```
REEMPLAZAR:
```
import { UsuarioSesionService } from "src/app/servicios/usuario-sesion/usuario-sesion.service";
import { FichaEntidadService } from "src/app/servicios/ficha-entidad/ficha-entidad.service";
```

3.5 `src/app/raiz/choferes/choferes-listado/choferes-listado.component.ts` — inyección. BUSCAR:
```
    public usuarioSesion: UsuarioSesionService,
```
REEMPLAZAR:
```
    public usuarioSesion: UsuarioSesionService,
    private fichaEntidad: FichaEntidadService,
```

3.6 `src/app/raiz/choferes/choferes-listado/choferes-listado.component.ts` — ver → ficha. BUSCAR:
```
    this.openModal('vista', chofer);
```
REEMPLAZAR:
```
    this.fichaEntidad.abrir('chofer', chofer.idChofer);
```

3.7 `src/app/raiz/proveedores/proveedores-listado/proveedores-listado.component.ts` — import. BUSCAR:
```
import { UsuarioSesionService } from "src/app/servicios/usuario-sesion/usuario-sesion.service";
```
REEMPLAZAR:
```
import { UsuarioSesionService } from "src/app/servicios/usuario-sesion/usuario-sesion.service";
import { FichaEntidadService } from "src/app/servicios/ficha-entidad/ficha-entidad.service";
```

3.8 `src/app/raiz/proveedores/proveedores-listado/proveedores-listado.component.ts` — inyección. BUSCAR:
```
    public usuarioSesion: UsuarioSesionService,
```
REEMPLAZAR:
```
    public usuarioSesion: UsuarioSesionService,
    private fichaEntidad: FichaEntidadService,
```

3.9 `src/app/raiz/proveedores/proveedores-listado/proveedores-listado.component.ts` — ver → ficha. BUSCAR:
```
    this.openModal("vista", proveedor);
```
REEMPLAZAR:
```
    this.fichaEntidad.abrir("proveedor", proveedor.idProveedor);
```

## PASO 4 — Legajos: Consulta (Ver ficha) y Vencimientos (nombre)

4.1 `src/app/raiz/legajos/consulta-legajos/consulta-legajos.component.html` — botón Ver ficha al lado de Descargar Legajo. BUSCAR:
```
    @if (legajoSeleccionado) {
        <div class="d-flex align-items-center">
            @if (estadoGeneralDeLegajo(legajoSeleccionado) !== "vacio") {
                <app-btn-agregar
                    name="Descargar Legajo"
                    (click)="descargarLegajo()"
                ></app-btn-agregar>
            }
        </div>
    }
```
REEMPLAZAR:
```
    @if (choferSeleccionado) {
        <div class="d-flex align-items-center gap-2">
            <button
                type="button"
                class="btn btn-outline-primary mt-2"
                (click)="verFicha()"
            >
                Ver ficha
            </button>
            @if (
                legajoSeleccionado &&
                estadoGeneralDeLegajo(legajoSeleccionado) !== "vacio"
            ) {
                <app-btn-agregar
                    name="Descargar Legajo"
                    (click)="descargarLegajo()"
                ></app-btn-agregar>
            }
        </div>
    }
```

4.2 `src/app/raiz/legajos/consulta-legajos/consulta-legajos.component.ts` — import. BUSCAR:
```
import { CarruselComponent } from 'src/app/shared/carrusel/carrusel.component';
```
REEMPLAZAR:
```
import { CarruselComponent } from 'src/app/shared/carrusel/carrusel.component';
import { FichaEntidadService } from 'src/app/servicios/ficha-entidad/ficha-entidad.service';
```

4.3 `src/app/raiz/legajos/consulta-legajos/consulta-legajos.component.ts` — inyección. BUSCAR:
```
    private modalService: NgbModal,
  ) {}
```
REEMPLAZAR:
```
    private modalService: NgbModal,
    private fichaEntidad: FichaEntidadService,
  ) {}
```

4.4 `src/app/raiz/legajos/consulta-legajos/consulta-legajos.component.ts` — verFicha (antes de ngOnDestroy). BUSCAR:
```
  ngOnDestroy(): void {
```
REEMPLAZAR:
```
  verFicha(): void {
    if (this.choferSeleccionado) {
      this.fichaEntidad.abrir('chofer', this.choferSeleccionado.idChofer);
    }
  }

  ngOnDestroy(): void {
```

4.5 `src/app/raiz/legajos/vencimientos/vencimientos.component.ts` — import. BUSCAR:
```
import { CarruselComponent } from 'src/app/shared/carrusel/carrusel.component';
```
REEMPLAZAR:
```
import { CarruselComponent } from 'src/app/shared/carrusel/carrusel.component';
import { FichaEntidadService } from 'src/app/servicios/ficha-entidad/ficha-entidad.service';
```

4.6 `src/app/raiz/legajos/vencimientos/vencimientos.component.ts` — el nombre del chofer abre la ficha. BUSCAR:
```
    { field: 'chofer', header: 'Chofer', visible: true, width: 180 },
```
REEMPLAZAR:
```
    {
      field: 'chofer', header: 'Chofer', visible: true, width: 180,
      accionCelda: (fila) => this.fichaEntidad.abrir('chofer', fila._objeto.idChofer),
    },
```

4.7 `src/app/raiz/legajos/vencimientos/vencimientos.component.ts` — inyección. BUSCAR:
```
    private modalService: NgbModal,
  ) {}
```
REEMPLAZAR:
```
    private modalService: NgbModal,
    private fichaEntidad: FichaEntidadService,
  ) {}
```

## Verificación

1. Comandos (reportá la salida):
```
grep -rn "openModal('vista'\|openModal(\"vista\"" src/app/raiz
grep -rln "fichaEntidad.abrir" src/app
grep -c "accionCelda" src/app/shared/tabla/tabla-generica/tabla-generica.component.html
git diff --numstat
git diff -U0 | grep "^+" | grep -v "^+++" | grep -c " $"
npx tsc -p tsconfig.app.json --noEmit
```
Esperado:
- (a) nada.
- (b) 6 archivos: `clientes-listado`, `choferes-listado`, `proveedores-listado`,
  `consulta-legajos`, `vencimientos` y `tablero-legajos` (los `.component.ts`).
- (c) 3.
- (d) 11 archivos:
  - `src/app/interfaces/tabla-generica.ts` `1 0`;
  - `src/app/raiz/choferes/choferes-listado/choferes-listado.component.ts` `3 1`;
  - `src/app/raiz/clientes/clientes-listado/clientes-listado.component.ts` `3 1`;
  - `src/app/raiz/legajos/consulta-legajos/consulta-legajos.component.html` `13 3`;
  - `src/app/raiz/legajos/consulta-legajos/consulta-legajos.component.ts` `8 0`;
  - `src/app/raiz/legajos/vencimientos/vencimientos.component.ts` `6 1`;
  - `src/app/raiz/proveedores/proveedores-listado/proveedores-listado.component.ts` `3 1`;
  - `src/app/shared/ficha-entidad/ficha-entidad.component.html` `43 2`;
  - `src/app/shared/ficha-entidad/ficha-entidad.component.ts` `21 4`;
  - `src/app/shared/tabla/tabla-generica/tabla-generica.component.html` `9 0`;
  - `src/app/shared/tabla/tabla-generica/tabla-generica.component.scss` `12 0`.
- (e) 0 (sin espacios finales en lo agregado).
- (f) sin errores.

2. `npm run build:demo`: las mismas 9 advertencias; main ≈ 1,10 MB; Initial total
   ≈ 1,53 MB; `legajos-legajos-module` ≈ 151 kB (antes ≈ 177) y un chunk nuevo compartido
   de ≈ 40 kB (la ficha; el build lo nombra con uno de los módulos que lo usan, por ejemplo
   `clientes-clientes-module`).

## Pruebas manuales en demo (las hace Nico)

1. **Clientes → Listado → ver (ojo):** se abre la ficha del cliente: razón social, CUIT con
   guiones, condición fiscal, badge "Cliente" (y "Oculto en listados" si corresponde); Datos
   de la empresa con las dos direcciones; Contactos con su contador. Editar y eliminar siguen
   igual.
2. **Choferes → Listado → ver:** ficha del chofer (la de siempre). Un chofer de proveedor
   tiene la pestaña Proveedor y la navegación de FI2.
3. **Proveedores → Listado → ver:** ficha del proveedor; desde Choferes se abre un chofer y
   "← Volver" funciona. Vehículos (camión) y editar siguen igual.
4. **Legajos → Consultar:** al elegir un chofer aparece "Ver ficha" (también con legajo
   vacío) al lado de "Descargar Legajo" (este, solo si hay documentos). Abre la ficha.
5. **Legajos → Vencimientos:** el nombre del chofer se ve como texto, se subraya al pasar el
   mouse y abre la ficha; con Tab + Enter también. El resto de la tabla (filtros, orden,
   "ver" del documento) no cambia.
6. **Datos vivos:** con la ficha de un cliente abierta, editá un contacto en otra pestaña
   del navegador → se actualiza.
7. **Registro de actividad / Papelera:** "ver objeto" de un cliente, chofer o proveedor
   sigue abriendo el modal de alta en modo vista (no cambia).
8. Rol **user** y rol **demo**: el ojo de los tres listados abre la ficha igual.

## Mensaje de commit

```
FI3: ficha del cliente y accesos desde los listados y Legajos

- Ficha del cliente: Datos de la empresa y Contactos (pestañas de FI2), encabezado con
  razón social, CUIT y condición fiscal; datos vivos (suma clientes$ a la suscripción).
- "Ver" de los listados de Clientes, Choferes y Proveedores → ficha de la entidad (el modo
  vista del alta sigue para Registro/Papelera).
- Consulta de legajos: botón "Ver ficha" al lado de "Descargar Legajo".
- Vencimientos: el nombre del chofer abre la ficha.
- tabla-generica: ColumnaTablaGenerica.accionCelda (opcional) dibuja la celda como enlace.
```

FIN DE LA INSTRUCCIÓN FI3
````
