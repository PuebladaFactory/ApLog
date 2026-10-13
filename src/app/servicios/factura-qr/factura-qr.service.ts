import { Injectable } from '@angular/core';

// Frente lazy-fechas (LZ7): pdfjs-dist y jsqr se cargan con import dinámico
// dentro del método, así no viajan en el chunk de Facturación y solo se
// descargan la primera vez que se lee una factura. NO importarlos arriba.
// El worker de pdfjs es el local (angular.json lo copia a assets/pdfjs).
const PDFJS_WORKER_SRC = 'assets/pdfjs/pdf.worker.min.mjs';

@Injectable({
  providedIn: 'root'
})
export class FacturaQrService {
  async decodificarQRdesdePDF(file: File): Promise<any> {
    const [pdfjsLib, { default: jsQR }] = await Promise.all([
      import('pdfjs-dist'),
      import('jsqr'),
    ]);
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;

    const arrayBuffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2 });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvas,
        canvasContext: context,
        viewport
      }).promise;

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, canvas.width, canvas.height);
      

if (code) {
  const texto = code.data;
  console.log('Texto QR detectado:', texto);
  return texto;
}
    }

    return null; // Si no encontró ningún QR
  }
}
