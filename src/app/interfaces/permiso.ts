export type ModuloPermiso =
  | 'operaciones'
  | 'clientes'
  | 'choferes'
  | 'proveedores'
  | 'liquidaciones'
  | 'legajos'
  | 'vendedores'
  | 'facturacion'
  | 'finanzas'
  | 'reportes'
  | 'usuarios';

// Unión abierta (no unión cerrada): agregar acciones nuevas simplemente
// sumando un `| 'nombreAccion'` acá a medida que aparezcan casos reales
// en el frente de Botones y Permisos. Una unión cerrada obligaría a tocar
// cada callsite existente cada vez que se suma un valor.
export type AccionPermiso =
  | 'ver'
  | 'editar'
  | 'eliminar'
  | 'agregar'
  | 'anular'
  | 'vincularFactura'
  | 'verFactura'
  | 'reimprimir'
  | 'vehiculos'
  | 'cerrar'
  | 'liquidar'
  | 'descargarTablero'
  | 'limpiarTablero';

// Las 4 acciones reales que distingue firestore.rules (función permitido()).
// Toda AccionPermiso se traduce a una de estas 4 antes de consultar la
// matriz — ver PermisosService.mapaAccionCrud.
export type AccionCrud = 'leer' | 'crear' | 'editar' | 'eliminar';
