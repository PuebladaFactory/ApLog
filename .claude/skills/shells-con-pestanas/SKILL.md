---
name: shells-con-pestanas
description: Convención de ApLog para componentes shell con pestañas (los *-control) — cómo se deriva la pestaña activa de la URL (TabRuta, selectedTab, tabActivaDesdeUrl) y qué tiene que cumplir un shell nuevo. Leer antes de crear o modificar un componente shell con pestañas.
---

## Pestaña activa derivada de la URL

`selectedTab` dejó de
ser un campo actualizado por clicks y es un getter que deriva la pestaña de
`router.url` con `tabActivaDesdeUrl(tabs, url)` (`shared/utils/tabs-url.util.ts`).
Así no hace falta suscripción ni desuscripción, y F5/deep-link/atrás-adelante/
redirect quedan alineados. Compara por segmentos completos y gana la ruta
más larga ('ajustes/registro' ya no matchea 'ajustes/registro-log').
`alias` cubre pantallas hijas sin pestaña propia
(ej. 'finanzas/cuenta' → Cuentas, '<modulo>/alta' → Alta/Listado).
Derivados de la pestaña (`ocultarCalendario` en LiqGral; Vendedores lo perdió en su frente) también
son getters.

**Convención para shells nuevos:** `tabs: TabRuta[]` + getter
`selectedTab` + `selectTab` que solo navega.
