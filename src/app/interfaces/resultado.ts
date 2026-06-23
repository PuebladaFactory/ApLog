/** Resultado de una operación de negocio, para que el componente muestre
 *  feedback al usuario (ej. Swal). objeto es opcional y tipado por T. */
export interface Resultado<T = void> {
  exito: boolean;
  mensaje: string;
  objeto?: T;
}
