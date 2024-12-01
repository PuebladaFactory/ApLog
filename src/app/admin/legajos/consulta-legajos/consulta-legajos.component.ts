import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Chofer } from 'src/app/interfaces/chofer';
import { Legajo } from 'src/app/interfaces/legajo';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { CarruselComponent } from 'src/app/shared/carrusel/carrusel.component';
import * as JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'safeUrl' })
export class SafeUrlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}


@Component({
  selector: 'app-consulta-legajos',
  templateUrl: './consulta-legajos.component.html',
  styleUrls: ['./consulta-legajos.component.scss']
})
export class ConsultaLegajosComponent implements OnInit {

  $choferes!: Chofer[];
  $legajos!: Legajo[];
  choferSeleccionado!: Chofer;
  legajoSeleccionado!: Legajo;
  archivosPrevisualizados!: { nombre: string; url: string }[]; // Especificamos el tipo = [];

  constructor(private storageService: StorageService, private modalService: NgbModal, private sanitizer: DomSanitizer){}


  transform(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  ngOnInit(): void {
    this.storageService.choferes$.subscribe(data => {
      this.$choferes = data;     
      this.$choferes = this.$choferes      
      .sort((a, b) => a.apellido.localeCompare(b.apellido)); // Ordena por el nombre del chofer
    })     
    this.storageService.legajos$.subscribe(data => {
      this.$legajos = data;     
    })        
  }

  changeChofer(e: any) {    
    console.log(e.target.value);    
    let id = Number(e.target.value);    
    ////console.log()("1)",id);    
    let choferSel: Chofer[];
    choferSel = this.$choferes.filter((chofer:Chofer)=>{
      ////console.log()("2", cliente.idCliente, id);
      return chofer.idChofer === id;
    });
    this.choferSeleccionado = choferSel[0];
    this.buscarLegajo();
  }

  buscarLegajo(){    
    //console.log("legajos: ", this.$legajos);    
    let legajoSel : Legajo[];
    legajoSel = this.$legajos.filter((l)=> l.idChofer === this.choferSeleccionado.idChofer);    
    this.legajoSeleccionado = legajoSel[0];    
    //console.log("legajo seleccionado: ",this.legajoSeleccionado);  
  }

  getFileIconSVG(fileName: string): SafeHtml {
    console.log("llega aca?", fileName );
    
    const extension = this.getFileExtension(fileName);
    console.log("extension: ", extension);
    
    const svgIcons: { [key: string]: string } = {
      jpg: `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="34" fill="currentColor" class="bi bi-filetype-jpg" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M14 4.5V14a2 2 0 0 1-2 2h-1v-1h1a1 1 0 0 0 1-1V4.5h-2A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v9H2V2a2 2 0 0 1 2-2h5.5zm-4.34 8.132q.114.23.14.492h-.776a.8.8 0 0 0-.097-.249.7.7 0 0 0-.17-.19.7.7 0 0 0-.237-.126 1 1 0 0 0-.299-.044q-.428 0-.665.302-.234.301-.234.85v.498q0 .351.097.615a.9.9 0 0 0 .304.413.87.87 0 0 0 .519.146 1 1 0 0 0 .457-.096.67.67 0 0 0 .272-.264q.09-.164.091-.363v-.255H8.24v-.59h1.576v.798q0 .29-.097.55a1.3 1.3 0 0 1-.293.458 1.4 1.4 0 0 1-.495.313q-.296.111-.697.111a2 2 0 0 1-.753-.132 1.45 1.45 0 0 1-.533-.377 1.6 1.6 0 0 1-.32-.58 2.5 2.5 0 0 1-.105-.745v-.506q0-.543.2-.95.201-.406.582-.633.384-.228.926-.228.357 0 .636.1.28.1.48.275t.314.407ZM0 14.786q0 .246.082.465.083.22.243.39.165.17.407.267.246.093.569.093.63 0 .984-.345.357-.346.358-1.005v-2.725h-.791v2.745q0 .303-.138.466t-.422.164a.5.5 0 0 1-.454-.246.6.6 0 0 1-.073-.27H0Zm4.92-2.86H3.322v4h.791v-1.343h.803q.43 0 .732-.172.305-.177.463-.475.162-.302.161-.677 0-.374-.158-.677a1.2 1.2 0 0 0-.46-.477q-.3-.18-.732-.179Zm.546 1.333a.8.8 0 0 1-.085.381.57.57 0 0 1-.238.24.8.8 0 0 1-.375.082H4.11v-1.406h.66q.327 0 .512.182.185.181.185.521Z"/>
          </svg>`,
      png:`<svg xmlns="http://www.w3.org/2000/svg" width="25" height="34" fill="currentColor" class="bi bi-filetype-png" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M14 4.5V14a2 2 0 0 1-2 2v-1a1 1 0 0 0 1-1V4.5h-2A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v9H2V2a2 2 0 0 1 2-2h5.5zm-3.76 8.132q.114.23.14.492h-.776a.8.8 0 0 0-.097-.249.7.7 0 0 0-.17-.19.7.7 0 0 0-.237-.126 1 1 0 0 0-.299-.044q-.427 0-.665.302-.234.301-.234.85v.498q0 .351.097.615a.9.9 0 0 0 .304.413.87.87 0 0 0 .519.146 1 1 0 0 0 .457-.096.67.67 0 0 0 .272-.264q.09-.164.091-.363v-.255H8.82v-.59h1.576v.798q0 .29-.097.55a1.3 1.3 0 0 1-.293.458 1.4 1.4 0 0 1-.495.313q-.296.111-.697.111a2 2 0 0 1-.753-.132 1.45 1.45 0 0 1-.533-.377 1.6 1.6 0 0 1-.32-.58 2.5 2.5 0 0 1-.105-.745v-.506q0-.543.2-.95.201-.406.582-.633.384-.228.926-.228.357 0 .636.1.281.1.48.275.2.176.314.407Zm-8.64-.706H0v4h.791v-1.343h.803q.43 0 .732-.172.305-.177.463-.475a1.4 1.4 0 0 0 .161-.677q0-.374-.158-.677a1.2 1.2 0 0 0-.46-.477q-.3-.18-.732-.179m.545 1.333a.8.8 0 0 1-.085.381.57.57 0 0 1-.238.24.8.8 0 0 1-.375.082H.788v-1.406h.66q.327 0 .512.182.185.181.185.521m1.964 2.666V13.25h.032l1.761 2.675h.656v-3.999h-.75v2.66h-.032l-1.752-2.66h-.662v4z"/>
          </svg>`,        
      html:`<svg xmlns="http://www.w3.org/2000/svg" width="25" height="34" fill="currentColor" class="bi bi-filetype-html" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M14 4.5V11h-1V4.5h-2A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v9H2V2a2 2 0 0 1 2-2h5.5zm-9.736 7.35v3.999h-.791v-1.714H1.79v1.714H1V11.85h.791v1.626h1.682V11.85h.79Zm2.251.662v3.337h-.794v-3.337H4.588v-.662h3.064v.662zm2.176 3.337v-2.66h.038l.952 2.159h.516l.946-2.16h.038v2.661h.715V11.85h-.8l-1.14 2.596H9.93L8.79 11.85h-.805v3.999zm4.71-.674h1.696v.674H12.61V11.85h.79v3.325Z"/>
          </svg>`,        
      pdf: `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="34" fill="currentColor" class="bi bi-filetype-pdf" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M14 4.5V14a2 2 0 0 1-2 2h-1v-1h1a1 1 0 0 0 1-1V4.5h-2A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v9H2V2a2 2 0 0 1 2-2h5.5zM1.6 11.85H0v3.999h.791v-1.342h.803q.43 0 .732-.173.305-.175.463-.474a1.4 1.4 0 0 0 .161-.677q0-.375-.158-.677a1.2 1.2 0 0 0-.46-.477q-.3-.18-.732-.179m.545 1.333a.8.8 0 0 1-.085.38.57.57 0 0 1-.238.241.8.8 0 0 1-.375.082H.788V12.48h.66q.327 0 .512.181.185.183.185.522m1.217-1.333v3.999h1.46q.602 0 .998-.237a1.45 1.45 0 0 0 .595-.689q.196-.45.196-1.084 0-.63-.196-1.075a1.43 1.43 0 0 0-.589-.68q-.396-.234-1.005-.234zm.791.645h.563q.371 0 .609.152a.9.9 0 0 1 .354.454q.118.302.118.753a2.3 2.3 0 0 1-.068.592 1.1 1.1 0 0 1-.196.422.8.8 0 0 1-.334.252 1.3 1.3 0 0 1-.483.082h-.563zm3.743 1.763v1.591h-.79V11.85h2.548v.653H7.896v1.117h1.606v.638z"/>
            </svg>`,
      // Otros íconos aquí...
      default: `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="34" fill="currentColor" class="bi bi-file-earmark" viewBox="0 0 16 16">
                  <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5z"/>
                </svg>`,
    };

    const svg = svgIcons[extension] || svgIcons['default'];
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  private getFileExtension(fileName: string): string {
    if (fileName.startsWith('data:')) {
      const mimeType = fileName.split(';')[0].split(':')[1];
      return this.mapMimeTypeToExtension(mimeType);
    }
    return fileName.split('.').pop()?.toLowerCase() || 'default';
  }

  private mapMimeTypeToExtension(mimeType: string): string {
    //console.log("1)ESTE: mimeType: ", mimeType);
    
    switch (mimeType) {
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'application/pdf':
        return 'pdf';
      case 'text/html':
        return 'html';          
      default:
        return 'default';
    }
  }


  getShortFileName(fileName: string): string {
    console.log("fileName: ", fileName);
    
    const maxLength = 30; // Cantidad de caracteres a mostrar
    if (fileName.length <= maxLength) {
      return fileName;
    }
    return '...' + fileName.slice(-maxLength); // Mostrar los últimos caracteres
  }


  abrirModal(index: number){
    this.archivosPrevisualizados = this.legajoSeleccionado.documentacion[index].imagenes || [];
    
    {
      const modalRef = this.modalService.open(CarruselComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'lg', 
        //backdrop:"static" 
      });      

     let info = {
        //modo: modo,
        item: this.archivosPrevisualizados,
      } 
      ////console.log()(info); */
      
      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
         
        },
        (reason) => {}
      );
    }
  }

  descargarLegajo(): void {
    if (!this.legajoSeleccionado) {
      console.error('No hay legajo seleccionado');
      return;
    }
  
    const zip = new JSZip();
    const carpeta = zip.folder(this.choferSeleccionado.apellido + '_' + this.choferSeleccionado.nombre);
    const promises: Promise<any>[] = [];
  
    this.legajoSeleccionado.documentacion.forEach((doc) => {
      doc.imagenes.forEach((archivo) => {
        const url = archivo.url;
        const nombreArchivo = archivo.nombre;
  
        const promesa = fetch(url)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Error al descargar ${nombreArchivo}: ${response.statusText}`);
            }
            const contentType = response.headers.get('content-type');
            if (!contentType || !(contentType.includes('application/pdf') || contentType.includes('image/'))) {
              throw new Error(`El archivo ${nombreArchivo} no es válido (${contentType})`);
            }
            return response.blob();
          })
          .then((blob) => {
            if (blob.size === 0) {
              throw new Error(`El archivo ${nombreArchivo} está vacío.`);
            }
            carpeta?.file(nombreArchivo, blob);
          })
          .catch((error) => {
            console.error('Error al procesar archivo:', error);
          });
  
        promises.push(promesa);
      });
    });
  
    Promise.all(promises)
      .then(() => {
        if (carpeta?.length === 0) {
          console.error('No se pudo agregar ningún archivo al ZIP');
          return;
        }
        zip.generateAsync({ type: 'blob' })
          .then((contenido: string | Blob) => {
            saveAs(contenido, `${this.choferSeleccionado.apellido}_${this.choferSeleccionado.nombre}_legajo.zip`);
          });
      })
      .catch((error) => {
        console.error('Error al generar el ZIP:', error);
      });
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
