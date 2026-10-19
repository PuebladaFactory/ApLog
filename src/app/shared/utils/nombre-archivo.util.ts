/** Nombre de archivo de una descarga: sin acentos ni caracteres inválidos en
 *  Windows, espacios y separadores → '_', sin '_' repetidos ni en los bordes.
 *  Única definición para los documentos del camino nuevo (DocumentoTabular /
 *  LibroTabular); hasta este frente vivía privada en documento-liq.util.ts.
 *
 *  Ojo: `exportacion-finanzas.util.ts` exporta otra `sanearNombreArchivo` con
 *  reglas distintas (conserva los espacios como '_' pero no colapsa, recorta a
 *  120 caracteres y cae en 'finanzas' si queda vacío). No se unificó acá para
 *  no cambiar los nombres de archivo de Finanzas; queda como deuda menor. */
export function sanearNombreArchivo(texto: string): string {
  return texto
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}
