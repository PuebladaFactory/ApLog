import { Component, Input, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Pipe, PipeTransform } from '@angular/core';
import { Legajo } from 'src/app/interfaces/legajo';

@Pipe({
    name: 'safeUrl',
    standalone: false
})
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
    standalone: false
})
export class CarruselComponent implements OnInit {
  @Input() fromParent: any;
  @Input() legajoBorrado!: Legajo;
  imagenes: any[] = [];
  papelera:boolean = false;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    if (this.fromParent?.item) {
      this.papelera = false;
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
    if(this.legajoBorrado){
      this.papelera = true
      console.log("this.legajoBorrado", this.legajoBorrado);
      
      this.legajoBorrado.documentacion.forEach((d:any) => {
        d.imagenes.forEach((i:any)=>{
          this.imagenes.push(i);
        })
        
      });
      console.log("this.imagenes", this.imagenes);
      this.imagenes.forEach((archivo: any) => {
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
