# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Aplicación web de administración para empresa de logística (Vantruck). Angular 20 SPA con Firebase (Firestore + Auth + Hosting). En producción activa — se agregan funcionalidades, se mejoran las existentes y se corrigen errores.

**Firebase plan gratuito: no hay Cloud Functions disponibles. Toda la lógica de negocio corre en el cliente.**

## Stack técnico

- **Frontend:** Angular 20, TypeScript 5.8 (strict mode), RxJS 7
- **UI:** Bootstrap 5 + ng-bootstrap, AG Grid 33 (tablas de datos)
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

`StorageService` (`servicios/storage/storage.service.ts`) es el store central. Expone 50+ BehaviorSubjects (`clientes$`, `operaciones$`, `tarifasGralCliente$`, etc.) y sincroniza con `localStorage` para acceso offline. Los componentes se suscriben a estos observables — no llaman a Firestore directamente.

Flujo de datos:
```
Component → StorageService → DbFirestoreService → Firestore
                ↑                                      |
                └──────── onSnapshot listener ─────────┘
```

### Capa de datos

`DbFirestoreService` (`servicios/database/db-firestore.service.ts`) envuelve todas las operaciones de Firestore. Todas las colecciones viven bajo `/Vantruck/datos/`. Colecciones principales: `operaciones`, `clientes`, `choferes`, `proveedores`, `tarifasGralCliente/Esp/Pers`, `tarifasGralChofer/Esp`, `facturaCliente`, `facturaChofer`, `liquidaciones`, `legajos`, `vendedores`, `logs`, `users`.

### Sistema de tarifas

Cada entidad (cliente, chofer, proveedor) tiene tres niveles: general (`Gral`), especial (`Esp`) y personalizada (`Pers`). `TarifasService` resuelve qué nivel aplica a cada operación. Es una regla de negocio central — los cambios acá afectan facturación y liquidaciones.

### Servicios clave

| Servicio | Responsabilidad |
|---|---|
| `autentificacion/` | Firebase Auth, sesión de usuario |
| `database/` | CRUD Firestore |
| `storage/` | Estado global (BehaviorSubjects + localStorage) |
| `log/` | Log de actividad (ALTA / EDITAR / BAJA) |
| `tarifas/` | Resolución y cálculo de tarifas |
| `liquidacion/` | Cálculo de liquidaciones a choferes/proveedores |
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
