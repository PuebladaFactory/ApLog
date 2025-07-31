import { Injectable } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';
import jsQR from 'jsqr';

// ✅ Usar el worker local (ya lo copiaste correctamente en angular.json)
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = 'assets/pdfjs/pdf.worker.min.mjs';

@Injectable({
  providedIn: 'root'
})
export class FacturaQrService {
  async decodificarQRdesdePDF(file: File): Promise<any> {
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
