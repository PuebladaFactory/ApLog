/** Pestaña de un componente shell-con-pestañas (*-control, LiqGral).
 *  `route`: ruta a la que navega la pestaña (ej. 'clientes/listado').
 *  `alias`: otras rutas que también la marcan activa (pantallas hijas que
 *  no tienen pestaña propia, ej. 'finanzas/movimiento' → Historial). */
export interface TabRuta {
  id: string;
  name?: string;
  route: string;
  alias?: string[];
}

/** Id de la pestaña activa según la URL real ('' si ninguna coincide).
 *
 *  La pestaña resaltada se DERIVA de la URL en vez de guardarse en un campo
 *  que solo se actualiza con clicks: así F5, deep-links, atrás/adelante y
 *  redirects la dejan siempre alineada con lo que muestra el router-outlet.
 *
 *  Compara por segmentos completos, no con `includes` de texto: así
 *  'ajustes/registro' no matchea 'ajustes/registro-log'. Si coinciden varias,
 *  gana la ruta más larga (la más específica). Ignora query string, fragment
 *  y parámetros matriciales. */
export function tabActivaDesdeUrl(tabs: ReadonlyArray<TabRuta>, url: string): string {
  const path = url.split(/[?#]/)[0].replace(/;[^/]*/g, '');
  const conBordes = '/' + limpiar(path) + '/';
  let mejor: { id: string; largo: number } | null = null;
  for (const tab of tabs) {
    for (const r of [tab.route, ...(tab.alias ?? [])]) {
      const ruta = limpiar(r);
      if (conBordes.includes('/' + ruta + '/') && (!mejor || ruta.length > mejor.largo)) {
        mejor = { id: tab.id, largo: ruta.length };
      }
    }
  }
  return mejor?.id ?? '';
}

function limpiar(ruta: string): string {
  return ruta.replace(/^\/+|\/+$/g, '');
}
