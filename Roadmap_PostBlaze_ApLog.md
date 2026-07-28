# Roadmap post-Blaze — Mejoras arquitectónicas para ApLog

> Documento de planificación. No ejecutar antes de cerrar el refactor de Tarifas en curso.
> Este documento define QUÉ y POR QUÉ; el CÓMO puntual (código real, reglas actuales) se
> audita con Claude Code contra el repo en el momento de encarar cada frente.

## Contexto

Con Blaze ya decidido, este documento identifica mejoras concretas habilitadas por el
nuevo plan — más allá de "hacer backups" en abstracto — priorizadas según el estado
actual del proyecto (ver CLAUDE.md / CHANGELOG.md) y el roadmap de apps complementarias
(depósito, ruteos, chofer).

---

## 1. Roles y seguridad — el frente más urgente

**Problema actual**: según CLAUDE.md, toda la lógica de negocio corre en el cliente y los
roles (`god > admin > manager > user > demo`) se resuelven vía `RoleGuard` (protege rutas
de Angular) y `*appRole` (oculta UI). Ninguno de los dos protege la escritura directa a
Firestore — si las Security Rules actuales no restringen por rol, cualquier usuario
autenticado puede escribir en cualquier colección saltándose Angular por completo
(herramientas de desarrollador del navegador).

**Solución con Blaze**: Custom Claims + Cloud Function trigger.
- Trigger `onWrite` en `/Vantruck/datos/users/{uid}` que, al cambiar el campo `roles`,
  llama a `admin.auth().setCustomUserClaims(uid, {role})`.
- Las Security Rules leen el rol desde `request.auth.token.role` (viaja en el token) en
  vez de hacer un `get()` a la colección `users` en cada evaluación de regla — evita una
  lectura de Firestore oculta y no reflejada en las métricas de la app por cada chequeo
  de permiso.
- Recién con esto las reglas pueden aplicar restricciones reales por colección
  (ej. `demo` no puede escribir en `liquidaciones` o `tarifasGralCliente`).

**Independiente del resto del roadmap.** No depende de Tarifas ni de ningún otro frente.
Conviene resolverlo antes de exponer más colecciones sensibles (Finanzas, Facturación) en
producción.

---

## 2. Cloud Functions como capa de API compartida (para el ecosistema de apps futuras)

**Motivación**: las apps complementarias (depósito, ruteos, chofer) van a necesitar la
misma lógica de negocio que hoy vive solo en servicios Angular (`OperacionFactoryService`,
`TarifasService`, transiciones de `EstadoOp` en `LiquidacionService`, cálculo de valores en
`valores-op*`). Sin una capa compartida, cada app nueva reimplementa las reglas a su manera
(riesgo de divergencia) o escribe directo a Firestore sin las validaciones que hoy solo
existen en Angular.

**Solución**: portar los coordinadores críticos a Cloud Functions callables —
`altaDesdeAsignacion`, `bajaOperacion`, `restaurarOperacion`, y `editarOperacion` cuando
salga del refactor de Tarifas.

- Todas las apps (web admin, chofer, depósito) llaman la misma función; no hay lógica
  duplicada.
- Un chofer no puede manipular su propia liquidación escribiendo directo a Firestore desde
  su app — la única puerta de escritura para operaciones sensibles es la función.
- Los coordinadores actuales ya están encapsulados como "una transacción atómica + un log
  único" (patrón ya establecido en `OperacionService`) — portarlos es mover el mismo código
  de lugar, no rediseñarlo.

**Secuenciación**: depende de que Tarifas esté cerrado (`calcularValoresIniciales` y
`editarOperacion` dependen de ese refactor). Conviene encararlo **antes** de arrancar la
primera app complementaria, no en paralelo con Tarifas.

---

## 3. Consultas más eficientes

Algunas de estas técnicas no requieren Blaze, pero se incluyen porque responden
directamente al patrón que causó los incidentes de lectura (14 abril, 24 junio).

- **Aggregation queries** (`count()`, `sum()`, `average()` de Firestore, disponibles en
  Spark): para Reportes/Finanzas, pedirle a Firestore que sume del lado del servidor en
  vez de traer todas las operaciones al cliente para sumar ahí. Habría evitado los dos
  picos de lectura detectados.
- **Documentos de resumen pre-calculados** (requiere Cloud Functions → Blaze): un trigger
  `onWrite` en `operaciones`/`liquidaciones` que actualiza incrementalmente un documento
  `resumenFinancieroEntidad/{idCliente}` con aging/riesgo financiero ya calculado.
  Reportes y Finanzas leen ese documento (1 lectura) en vez de recorrer todas las
  operaciones cada vez que se abre la pantalla.
- **Export a BigQuery** para consultas que legítimamente necesiten ver el histórico
  completo (ej. reportes anuales) — que corran contra BigQuery, no contra Firestore.

---

## 4. Automatización operativa (Cloud Scheduler + Functions)

- **Legajos**: job diario que recorra documentación con vencimiento próximo y genere
  alertas — hoy no ocurre si nadie abre la app ese día.
- **Recálculo nocturno de Finanzas/Reportes**: alternativa o complemento a los triggers en
  tiempo real del punto 3, corriendo fuera de horario de uso.
- **Notificaciones push (FCM)**: relevante en cuanto exista la app de choferes — recibir
  una asignación nueva sin tener que abrir la app.

---

## 5. Continuidad de datos (backups — versión concreta)

- **Point-in-Time Recovery (PITR)**: si se necesita poder volver a un estado de hace
  horas ante un bug que corrompe datos en producción. Más caro por GB, pero el volumen de
  ApLog es chico.
- **Export programado a Cloud Storage**: snapshots diarios/semanales, más barato, si con
  volver al día anterior alcanza.
- Definir política de retención (cuántos backups conservar) antes de activarlo.

---

## 6. Nota — bug de listener en background (no depende de Blaze)

El listener de `tablero-op` que queda mudo en segundo plano (documentado en CLAUDE.md) se
resuelve con manejo de error en la suscripción + `visibilitychange`/`focus` para
re-disparar `cargarOperaciones()`, sin necesitar Blaze. Si se toca esa zona de todos modos,
es un buen momento para evaluar si conviene sumar notificaciones (punto 4) en vez de
depender solo del listener.

---

## Secuenciación sugerida

1. **Roles + Custom Claims + auditoría de Security Rules** — independiente, corto, cuanto
   antes mejor.
2. Cerrar refactor de Tarifas (en curso).
3. **Aggregation queries** en los primeros reportes de Finanzas/Reportes — no depende de
   Blaze, evita repetir el incidente de lecturas.
4. **Documentos de resumen + triggers** cuando Finanzas/Reportes salgan de "en desarrollo".
5. **Cloud Functions callables para los coordinadores críticos** — antes de la primera app
   complementaria, no en paralelo con Tarifas.
6. **Backups y automatización de Legajos** — bajo riesgo, no bloquean nada más, encarar
   cuando resulte cómodo.
