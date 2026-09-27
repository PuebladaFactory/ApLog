/** Abre en una pestaña nueva una URL que se obtiene de forma asíncrona (ej.
 *  la URL de descarga de un archivo de Storage a partir de su path).
 *  La pestaña se abre ANTES del await, dentro del gesto del usuario: si se
 *  abriera después, el bloqueador de ventanas emergentes la frena. Llamar
 *  sincrónicamente desde el handler del click (sin awaits previos). Si
 *  obtener la URL falla, cierra la pestaña vacía y relanza el error. */
export async function abrirUrlEnPestana(obtenerUrl: () => Promise<string>): Promise<void> {
  const pestana = window.open('', '_blank');
  try {
    const url = await obtenerUrl();
    if (pestana) {
      pestana.location.href = url;
    } else {
      window.open(url, '_blank');
    }
  } catch (e) {
    pestana?.close();
    throw e;
  }
}
