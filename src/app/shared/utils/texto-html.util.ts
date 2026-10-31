/** Escapa texto para meterlo en el `html` de un Swal: los nombres y motivos
 *  los escribe el usuario. */
export function escaparHtml(texto: string): string {
  return texto.replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!
  ));
}

/** Texto plano con saltos de línea (ej. el `mensaje` de un Resultado que
 *  lista ítems) → html escapado con <br>. Swal ignora los '\n' en `text`. */
export function textoAHtml(texto: string): string {
  return escaparHtml(texto).replace(/\n/g, '<br>');
}
