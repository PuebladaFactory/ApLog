/** Modelo NUEVO de Vendedor (Frente Vendedores). La colección `vendedores`
 *  se corrige EN EL LUGAR: el id es el id del documento (patrón ConId, no se
 *  guarda en el body). Los docs viejos traen además `idVendedor`,
 *  `asignaciones`, `datosPersonales.mail` y `cuit` string: VendedorService
 *  los normaliza al leer y los reescribe en este formato al guardar.
 *  La interfaz vieja (vendedor.ts) queda hasta el retiro del módulo viejo. */

export interface DatosPersonalesVendedor {
  nombre: string;
  apellido: string;
  cuit: number;
  celular: string;
  email: string;
}

export interface VendedorNuevo {
  datosPersonales: DatosPersonalesVendedor;
  /** Baja = desactivar (no se borra). Un inactivo no tiene asignaciones,
   *  pero puede tener saldo pendiente y se liquida desde el Tablero. */
  activo: boolean;
}

/** Asignación de un vendedor a un cliente con su porcentaje de comisión.
 *  Vive en el Cliente (`Cliente.comisionesVenta`) y se copia al snapshot de
 *  la operación al alta (`RefCliente.comisiones`). Un cliente puede tener
 *  varios vendedores; la suma de porcentajes del cliente es ≤ 100. */
export interface AsignacionVenta {
  idVendedor: string;
  porcentaje: number;   // 0 < porcentaje ≤ 100
}
