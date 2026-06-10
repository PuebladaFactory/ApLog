# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Aplicación web de administración para empresa de logística (Vantruck). Angular 20 SPA con Firebase (Firestore + Auth + Hosting). En producción activa — se agregan funcionalidades, se mejoran las existentes y se corrigen errores.

**Firebase plan gratuito: no hay Cloud Functions disponibles. Toda la lógica de negocio corre en el cliente.**

## Stack técnico

- **Frontend:** Angular 20, TypeScript 5.8 (strict mode), RxJS 7
- **UI:** Bootstrap 5 + ng-bootstrap. Tablas de datos: `TablaGenericaComponent` propio
  (reemplazó a AG Grid en los módulos refactorizados; AG Grid puede subsistir en módulos
  aún no migrados)
- **Backend/DB:** Firebase (Firestore + Auth + Hosting), Cloudinary (imágenes)
- **Exports:** ExcelJS, jsPDF, PDFMake
- **Editor:** VSCode

## Comandos

```bash
npm start                   # Dev server en localhost:4200
npm test                    # Tests con Karma
npm run build               # Build de producción
npm run build:demo          # Build para entorno demo
npm run build:vantruck      # Build para entorno Vantruck (producción)
npm run deploy:demo         # Build + firebase deploy (demo)
npm run deploy:vantruck     # Build + firebase deploy (vantruck)
```

## Arquitectura

### Estructura de módulos

```
src/app/
├── appLogin/          # Rutas sin autenticación (login, registro, reset)
├── raiz/              # App principal (lazy-loaded, protegida por RoleGuard)
│   ├── operaciones/   # Operaciones diarias (tablero, alta/baja/cierre)
│   ├── clientes/      # CRUD + tarifas
│   ├── choferes/      # CRUD + tarifas + documentación
│   ├── proveedores/   # CRUD + tarifas
│   ├── liquidacion/   # Liquidación de operaciones cerradas
│   ├── facturacion/   
│   ├── nueva-facturacion/ # Facturación (legacy)
│   ├── legajos/       # Legajos de choferes
│   ├── vendedores/    # CRUD + comisiones
│   ├── reportes/      # (en desarrollo)
│   ├── finanzas/      # (en desarrollo)
│   └── ajustes/       # Usuarios, log de actividad, papelera
├── shared/            # Componentes, directivas y pipes reutilizables
├── servicios/         # 22 servicios especializados
├── interfaces/        # 32+ interfaces TypeScript de dominio
├── guards/            # RoleGuard (control de acceso por rol)
└── constants/         # Constantes de negocio
```

Todos los módulos bajo `raiz/` son lazy-loaded.

### Autenticación y roles

Firebase Auth (email/password + Google). Al autenticarse, se lee `/Vantruck/datos/users/{uid}` en Firestore para obtener el objeto `roles`.

Jerarquía: `god > admin > manager > user > demo`

Flujo: login → `/carga` (resuelve roles) → `/raiz` o `/limbo`.

Las rutas declaran roles requeridos en `data: { roles: [...] }`. `RoleGuard` verifica acceso. La directiva `*appRole` oculta/muestra elementos de UI según el rol.

### State management

El refactor arquitectónico está migrando el manejo de estado desde un store central
único hacia servicios por entidad. Conviven dos esquemas según el módulo:

**Módulos refactorizados** (Choferes, Proveedores, Clientes; Operaciones en progreso):
cada entidad tiene su `XxxService` con un BehaviorSubject propio que mantiene el estado
en memoria (NO en localStorage). El `init()` del servicio abre el listener de Firestore
y se llama al arrancar la app. Los componentes se suscriben directamente al observable
del servicio.

**Módulos no migrados:** todavía dependen de `StorageService`
(`servicios/storage/storage.service.ts`), que expone múltiples BehaviorSubjects y
sincroniza con localStorage.

`StorageService` NO desaparece: además del estado de los módulos viejos, sigue siendo la
**capa de escritura centralizada** por la que pasan todas las mutaciones para garantizar
el logging (ver "Escritura en Firestore" en Patrones de refactorización). Es decir, los
`XxxService` leen su propio estado pero escriben a través de `StorageService`.

Flujo de datos en módulos refactorizados:
```
Lectura:   Firestore --(listener)--> XxxService (BehaviorSubject) --> Component
Escritura: Component --> XxxService --> StorageService (log) --> DbFirestoreService --> Firestore
```

### Capa de datos

`DbFirestoreService` (`servicios/database/db-firestore.service.ts`) envuelve todas las operaciones de Firestore. Todas las colecciones viven bajo `/Vantruck/datos/`. Colecciones principales: `operaciones`, `clientes`, `choferes`, `proveedores`, `tarifasGralCliente/Esp/Pers`, `tarifasGralChofer/Esp`, `facturaCliente`, `facturaChofer`, `liquidaciones`, `legajos`, `vendedores`, `logs`, `users`.

### Sistema de tarifas

Cada entidad (cliente, chofer, proveedor) tiene tres niveles: general (`Gral`), especial (`Esp`) y personalizada (`Pers`). `TarifasService` resuelve qué nivel aplica a cada operación. Es una regla de negocio central — los cambios acá afectan facturación y liquidaciones.

> **Refactor planificado (no iniciado):** se unificará en un tarifario único con interfaz
> común para general/especial/personalizada (eventual queda aparte por ser ad-hoc por
> operación), y `TarifaTipo` pasará de 4 booleanos a un union de string. Hasta entonces,
> la lógica de cálculo de tarifas en los servicios de Operaciones se toca al mínimo para
> compilar (marcada con `// TODO: refactor Tarifas`), no se reescribe.

### Operaciones — modelo de estado y reglas de dominio

Conocimiento de dominio que debe tenerse presente al tocar Operaciones, Liquidaciones o
los servicios de cálculo de valores.

**Estado de la operación (`EstadoOp`).** Tres ejes ortogonales, no flags sueltos:
```typescript
estado.ciclo: 'abierta' | 'cerrada' | 'liquidada'        // valor único, secuencial
estado.liquidacion: { cliente: boolean; chofer: boolean } // progreso por parte
estado.proforma: { cliente: boolean; chofer: boolean }    // congelamiento por parte
```
- "Liquidada total" es DERIVADO (`liquidacion.cliente && liquidacion.chofer`), nunca se
  almacena. Los flags de `liquidacion` no se apagan una vez activados.
- `ciclo = 'liquidada'` solo cuando ambas partes están liquidadas; la liquidación parcial
  se refleja en `liquidacion`, no en `ciclo`.
- En los métodos de transición, los modos `'chofer'` y `'proveedor'` afectan ambos el lado
  chofer (proveedor es variante de chofer).
- El ciclo de vida del estado de la op termina al crear el `InformeLiq`. Liquidar
  (incluir un InformeOp en un InformeLiq) NO es lo mismo que facturar (factura electrónica
  real, externa a la app): por eso el modelo dice `liquidacion`, no "factura".
- Toda transición de estado vive en `LiquidacionService` (`servicios/liquidaciones/`).
  El `EstadoOp` debería construirse siempre desde el factory de Operaciones, nunca con
  literales inline.

**Regla de bloqueo de proformas (negocio, no obvia).** La proforma de CHOFER es dominante:
bloquea los InformeOp del CLIENTE de las mismas operaciones. No se puede liquidar a un
cliente mientras sus op estén dentro de una proforma de chofer no confirmada. La regla NO
es simétrica: las proformas de cliente no bloquean los InformeOp del chofer. Las dos
proformas pueden coexistir en los datos; es el bloqueo lo que las separa en la práctica.
Por eso `Proforma CH` tiene mayor prioridad visual que `Proforma CL` en el badge del tablero.

### Servicios clave

| Servicio | Responsabilidad |
|---|---|
| `autentificacion/` | Firebase Auth, sesión de usuario |
| `database/` | CRUD Firestore |
| `storage/` | Estado de módulos no migrados (BehaviorSubjects + localStorage) y capa de escritura/logging centralizada para todos los módulos |
| `log/` | Log de actividad (ALTA / EDITAR / BAJA) |
| `tarifas/` | Resolución y cálculo de tarifas |
| `liquidaciones/` | Cálculo de liquidaciones y transiciones de estado de operación (proformas, InformeLiq) |
| `informes/` | Generación de reportes Excel y PDF |
| `numerador/` | Generación de IDs secuenciales (operaciones, facturas) |
| `validar/` | Validación de reglas de negocio |
| `formato-numerico/` | Formateo de números/moneda estilo Argentina |
| `fechas/` | Utilidades de fecha |

### Entornos de build

| Config | Proyecto Firebase | Uso |
|---|---|---|
| `development` | `pf-logistics` | Dev local |
| `demo` | demo project | Staging |
| `vantruck` | `lplog-31164` | Producción |

## Convenciones

- **Interfaces:** definidas en `src/app/interfaces/`. Usar siempre interfaces tipadas, nunca `any`.
- **Logging:** toda mutación de datos debe llamar a `LogService` con acción (`ALTA`, `EDITAR`, `BAJA`), nombre de colección e ID del registro. El rol `god` queda excluido del log.
- **IDs secuenciales:** usar `NumeradorService` al crear operaciones o facturas — nunca generar IDs manualmente.
- **Locale argentino:** fechas en `dd/MM/yyyy`, miles con `.` y decimales con `,`. Hay servicios de formateo para ambos.
- **Formularios:** Reactive Forms (`FormBuilder`). Directivas propias manejan CUIT, solo-letras, solo-números y fechas.
- **Modales:** `ng-bootstrap NgbModal`. Modales reutilizables en `shared/modales/`, específicos dentro del módulo feature.
- **Estilo de código:** respetar el estilo existente en cada archivo que se modifique — nombres de variables, indentación, estructura — sin imponer patrones nuevos salvo que se indique explícitamente.

## Forma de trabajo

- Antes de implementar: explicar qué va a hacer y cómo encaja con lo existente.
- Respuestas concretas, sin relleno.
- Si algo es ambiguo, preguntar antes de asumir.
- No refactorizar funcionalidades existentes salvo que se indique explícitamente.
- Tener en cuenta la limitación de Firebase sin Cloud Functions al proponer soluciones.

## Contexto adicional

- Desarrollador autodidacta — primer proyecto serio.
- Se planean apps complementarias futuras: depósito, ruteos, app para choferes.

## Patrones de refactorización establecidos

### Servicios por entidad
Cada entidad tiene dos servicios dedicados:
- `XxxService`: maneja estado en memoria (BehaviorSubject), operaciones de escritura
  coordinadas y lógica de negocio específica del dominio
- `XxxFactoryService`: construye y valida objetos tipados a partir de datos del formulario

**El factory NO toca la base de datos ni inyecta otros services: solo construye.** Recibe
los datos ya resueltos (campos de formulario y/o entidades completas) y devuelve el objeto
tipado. Si construir un objeto requiere otras entidades (ej. una Operacion necesita el
Cliente y el Chofer vivos para extraer snapshots), quien llama al factory resuelve esas
entidades y se las pasa ya resueltas.

**Patrón puente (resolución de IDs).** Cuando un `XxxService` necesita construir un objeto
a partir de IDs de otras entidades, actúa de puente: resuelve cada ID contra el getter
síncrono del service correspondiente (ver "Estado en memoria") y le pasa las entidades
resueltas al factory. Ejemplo: `OperacionService.crearOperacionesDesdeAsignacion` resuelve
cliente/chofer/proveedor por ID y delega a `OperacionFactoryService.crearOperacionBase`.
La resolución que falla no aborta la tanda: se recolectan los errores y se devuelven junto
con los objetos creados, para que el componente avise al usuario.

### IDs
Todos los IDs son string (Firebase document ID).
- El campo `idXxx` se asigna en `XxxService` desde `ConIdType.id` al recibir datos de Firestore
- `toFirestore()` excluye `idXxx`, `id` y `type` antes de escribir en Firestore
- Los IDs numéricos legacy tienen comentario TODO en las interfaces no migradas

### Snapshot + ID para registros históricos
Las entidades que son registros históricos (ej. `Operacion`) NO embeben los objetos
relacionados completos. Guardan, por cada entidad relacionada, un snapshot mínimo con el
ID canónico + los campos congelados al momento del alta. Criterio de qué va al snapshot:
- **Datos de exhibición histórica** (razón social, nombre, patente, CUIT al momento del
  alta) — al snapshot, para mostrar sin leer la entidad viva y para preservar la verdad
  histórica aunque la entidad cambie después.
- **Datos de cálculo** (contratación, tipo de tarifa, etc.) — NO se congelan; se resuelven
  por ID contra el `XxxService` vivo en el momento que se necesitan.

### Estado en memoria
- BehaviorSubject en XxxService, nunca en localStorage para datos de colecciones
- `init()` se llama desde HomeComponent al arrancar la app
- Los componentes se suscriben directamente al observable del servicio
- **Getter síncrono:** cada XxxService expone un `getXxxActuales()` que devuelve el array
  actual del BehaviorSubject (`.getValue()`), para que otros services resuelvan entidades
  por ID sin suscribirse (ver "Patrón puente").
- **Carga por rango (Operaciones):** las colecciones acotadas por consulta (ej. Operaciones,
  que se traen por rango de fechas, no completas) usan un BehaviorSubject que se REEMPLAZA
  entero en cada carga, no acumula. Al cambiar de rango se cancela la suscripción anterior
  con un Subject dedicado (`cancelarRango$`) + `takeUntil(merge(destroy$, cancelarRango$))`,
  para no dejar streams superpuestos. Difiere del patrón de catálogos completos
  (Clientes/Choferes/Proveedores), que acumulan added/modified/removed.

### Escritura en Firestore
Siempre pasar por StorageService para mantener el log centralizado:
- Alta: `addItemAndGetId()` — retorna el ID generado
- Edición: `updateItemAsync()`
- Baja simple: `deleteItemAsync()`
- Baja con papelera: `deleteItemPapeleraCompuestoAsync()` con objeto compuesto
  que incluye todas las entidades relacionadas

### Operaciones compuestas
Las operaciones que afectan múltiples entidades viven en XxxService, no en el componente:
- `guardarXxxConRelaciones()`: alta/edición de entidad principal + entidades relacionadas
- `eliminarXxxConRelaciones()`: baja en cascada + papelera

### Tablas
`TablaGenericaComponent` para todos los listados:
- El componente padre define `columnas: ColumnaTabla[]`, arma `filas: any[]`
  con los datos aplanados y `_objeto` como referencia al original,
  y define `acciones: AccionTabla[]` con handlers
- El filtro de visibilidad (visibles/todos) lo maneja el padre
- Los botones del toolbar (alta, descarga, visibilidad) quedan fuera de la tabla

### Formularios en modo vista
Usar `form.disable()` y `formTipoTarifa.disable()` en ngOnInit cuando
`fromParent.modo === 'vista'`, no clases CSS.

### Migración de datos
Cada módulo tiene su XxxMigrationService con:
- Backup previo via MigrationBackupService
- Transformación de documentos con mapeo viejo→nuevo de IDs
- Verificación final de cantidad de documentos
- Métodos de corrección separados para limpiar campos residuales
