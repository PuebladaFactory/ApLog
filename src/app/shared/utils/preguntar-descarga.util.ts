import Swal from 'sweetalert2';

/** Pregunta si descargar el informe recién creado y en qué formato: Excel /
 *  PDF / No descargar (mismo gesto que el camino viejo después de liquidar).
 *  `titulo`: el mensaje de éxito de la operación. null = no descargar.
 *
 *  `icon` es 'success' por defecto porque el gesto original es "la operación
 *  salió bien, ¿lo descargás?". Cuando el botón ES la descarga y no hay nada
 *  que festejar (el informe del tablero de asignaciones), el caller pasa
 *  'question'. */
export async function preguntarFormatoDescarga(
  titulo: string,
  texto = '¿Querés descargar el informe?',
  icon: 'success' | 'question' = 'success',
): Promise<'excel' | 'pdf' | null> {
  const r = await Swal.fire({
    title: titulo,
    text: texto,
    icon,
    showCancelButton: true,
    showDenyButton: true,
    confirmButtonText: 'Excel',
    denyButtonText: 'PDF',
    cancelButtonText: 'No descargar',
  });
  if (r.isConfirmed) return 'excel';
  if (r.isDenied) return 'pdf';
  return null;
}
