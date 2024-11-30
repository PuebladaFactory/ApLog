import { Component, Input, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'safeUrl' })
export class SafeUrlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}

@Component({
  selector: 'app-carrusel',
  templateUrl: './carrusel.component.html',
  styleUrls: ['./carrusel.component.scss'],
})
export class CarruselComponent implements OnInit {
  @Input() fromParent: any;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    if (this.fromParent?.item) {
      console.log('Archivos recibidos:', this.fromParent.item); // Verifica los archivos
      this.fromParent.item.forEach((archivo: any) => {
        if (this.esPDF(archivo.url)) {
          archivo.vistaPreviaSanitizada = this.sanitizer.bypassSecurityTrustResourceUrl(archivo.url);
        } else if (this.esImagen(archivo.url)) {
          archivo.vistaPreviaSanitizada = archivo.url;
        }
        console.log('Procesado archivo:', archivo); // Debug cada archivo
      });
    }
  }

  esImagen(url: string): boolean {
    const extensionesImagen = ['jpg', 'jpeg', 'png', 'gif'];
    const extension = url.split('.').pop()?.toLowerCase();
    return extensionesImagen.includes(extension || '');
  }

  esPDF(url: string): boolean {
    console.log("pasa por aca?");    

    return /\.pdf$/i.test(url);
  }
  
}
