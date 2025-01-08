import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Chofer } from 'src/app/interfaces/chofer';
import { Documentacion, Estado, Legajo } from 'src/app/interfaces/legajo';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { CarruselComponent } from 'src/app/shared/carrusel/carrusel.component';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-cargar-documentos',
  templateUrl: './cargar-documentos.component.html',
  styleUrls: ['./cargar-documentos.component.scss']
})
export class CargarDocumentosComponent implements OnInit {
  
  $choferes!: Chofer[];
  $legajos!: Legajo[];
  choferSeleccionado!: Chofer | null;
  legajoSeleccionado!: Legajo;
  tramites: any[] = [
    {nombre:'DNI', seleccionado : false},
    {nombre:'Antecedentes Penales', seleccionado : false},
    {nombre:'Licencia', seleccionado : false},
    {nombre:'LINTI', seleccionado : false},
    {nombre:'Libreta Sanitaria', seleccionado : false},
    {nombre:'ART/ACC. Personales', seleccionado : false},
    {nombre:'Cedula', seleccionado : false},
    {nombre:'Título', seleccionado : false},
    {nombre:'Seguro', seleccionado : false},
    {nombre:'VTV/RTO', seleccionado : false},
    {nombre:'RUTA', seleccionado : false},
    {nombre:'Senasa', seleccionado : false},
  ];
  tramitesSeleccionados:Documentacion[] = [];
  tieneVto: any = null;
  docu!:Documentacion;
  titulo: any = null; 
  imagenes: { nombre: string; url: string }[] = []; // Especificamos el tipo = [];
  fechaDeVto!: string | null;
  archivosPrevisualizados: any
  archivosSeleccionados: File[] = [];
  svg:string = "";
  cloudinaryUrl = `https://api.cloudinary.com/v1_1/${environment.cloudinary.cloudName}/image/upload`;
  
  archivoPDFBase64: SafeResourceUrl | null = null;
  private destroy$ = new Subject<void>(); // Subject para manejar la destrucción
  
  constructor(private storageService: StorageService, private sanitizer: DomSanitizer, private modalService: NgbModal, private http: HttpClient){

  }  
  
  ngOnInit(): void {
    this.storageService.choferes$
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      this.$choferes = data;     
      this.$choferes = this.$choferes      
      .sort((a, b) => a.apellido.localeCompare(b.apellido)); // Ordena por el nombre del chofer
      console.log("1)choferes especiales: ", this.$choferes);      
      
    })     
    this.storageService.legajos$
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      this.$legajos = data;     
    })        
  }

  ngOnDestroy(): void {
    // Completa el Subject para cancelar todas las suscripciones
    this.destroy$.next();
    this.destroy$.complete();
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
    if(this.tramitesSeleccionados.length > 0){
      this.reiniciarDatos();
    }
  }

  reiniciarDatos(){
    this.tramitesSeleccionados.forEach((tramite)=>{
      this.tramites.forEach((t)=>{
        if(t.nombre === tramite.titulo){
          t.seleccionado = false;
        }
      })
    })
    this.fechaDeVto = null;      
    this.imagenes = [];
    this.titulo = null;
    this.tieneVto = null;
     // Limpieza: reinicia los archivos seleccionados
    this.archivosSeleccionados = [];
    const inputArchivos = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (inputArchivos) {
      inputArchivos.value = ''; // Limpia el campo de archivos en el DOM
    };
    this.tramitesSeleccionados = []
  }

  buscarLegajo(){    
    //console.log("legajos: ", this.$legajos);    
    let legajoSel : Legajo[];
    legajoSel = this.$legajos.filter((l)=> l.idChofer === this.choferSeleccionado?.idChofer);    
    this.legajoSeleccionado = legajoSel[0];
    console.log("legajo seleccionado: ", this.legajoSeleccionado);       
  }

  changeTramite(e:any){   
    let id = Number(e.target.value);   
    this.titulo = this.tramites[id].nombre;
  }

  seleccioneVto(e:any){
    this.tieneVto = e.target.value.toLowerCase() == 'true';
    //console.log(this.tieneVto);
    if(!this.tieneVto){
      this.fechaDeVto = null;
      //console.log(this.fechaDeVto);
    }    
  }

  fechaVto(fecha: Date): void {
    //console.log(fecha);
  
    if (this.tieneVto) {
      this.fechaDeVto = fecha.toLocaleString()
    } else {
      this.fechaDeVto = null;
    }
  
    console.log(this.fechaDeVto);
  }

  onArchivosSeleccionados(event: any): void {
    let archivos = event.target.files;
    this.archivosSeleccionados = Array.from(archivos); // Convierte FileList a un array de File
  }

  agregarDocumento(archivos: FileList | null){
    if (!archivos) return;
    
    
    let documentoSeleccionado = this.tramites.find((doc) => !doc.seleccionado);
    console.log("documentoSeleccionado", documentoSeleccionado);
    
    if (documentoSeleccionado) {
      for (let i = 0; i < archivos.length; i++) {
        let archivo = archivos[i];
        this.convertirPDFaBase64(archivo)
        let reader = new FileReader();
  
        reader.onload = (e: any) => {
          // Agrega el archivo al array de imágenes temporalmente
          this.imagenes = this.imagenes || [];
          this.imagenes.push({
            nombre: archivo.name,
            url: e.target.result, // Base64
          });
        };
  
        reader.readAsDataURL(archivo);
        //console.log("docu", this.docu);
        
      }
    }
  }

  getFecha(fecha:any){   
    let fechaDate = new Date(fecha) 
    //console.log("fechaDate: ", fechaDate);    
    return fechaDate.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  agregarTramite(): void {
    //let documentoSeleccionado = this.tramites.find((doc) => !doc.seleccionado);
    /* if (this.imagenes.length === 0) {
      console.error('No se cargaron archivos.');
      return;
    } */
   console.log("tiene vto:", this.tieneVto, "fecha de vto: ", this.fechaDeVto);
      if (this.tieneVto && !this.fechaDeVto) {
        
        return this.mensajesError("No se ingreso una fecha de vencimiento");
      }
  
    // Calcular estado del documento
    let estado: Estado = { enFecha: false, porVencer: false, vencido: false, vacio: false };
    let fechaActual = new Date().getTime();
    
  
    if (this.tieneVto) {
      if(this.fechaDeVto){
        console.log("1)this.fechaDeVto", this.fechaDeVto);
        let fechaVto = new Date(this.fechaDeVto).getTime();
        let diferenciaDias = Math.floor((fechaVto - fechaActual) / (1000 * 60 * 60 * 24));
        estado = {
          enFecha: diferenciaDias > 30,
          porVencer: diferenciaDias <= 30 && diferenciaDias >= 0,
          vencido: diferenciaDias < 0,
          vacio: false,
        };
      }      
    } else {
      estado = { enFecha: false, porVencer: false, vencido: false, vacio: false };
    }
    //console.log("titulo: ",this.titulo);
    // Crear el objeto Documentacion
    console.log("2)this.fechaDeVto", this.fechaDeVto);
    let nuevoTramite: Documentacion = {
      titulo: this.titulo,
      sinVto: !this.tieneVto,
      fechaVto: this.tieneVto ? this.fechaDeVto : null,
      estado,
      imagenes: this.imagenes || [],
    };
    console.log("nuevoTramite", nuevoTramite);
    
    // Agregar al array de tramites seleccionados
    this.tramitesSeleccionados.push(nuevoTramite);
  
    // Marcar el trámite como seleccionado
    //documentoSeleccionado.seleccionado = true;
    this.tramites.map((doc)=>{
      if(doc.nombre === this.titulo){
        doc.seleccionado = true;
      }
    })
    
    // Reiniciar valores para el siguiente trámite
    
    this.fechaDeVto = null;
    //documentoSeleccionado.imagenes = [];
    this.imagenes = [];
    this.titulo = null;
    this.tieneVto = null;
     // Limpieza: reinicia los archivos seleccionados
    this.archivosSeleccionados = [];
    const inputArchivos = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (inputArchivos) {
      inputArchivos.value = ''; // Limpia el campo de archivos en el DOM
    }
    //console.log("tramites: ",this.tramites);
    console.log("tramitesSeleccionados: ", this.tramitesSeleccionados);
    //console.log("titulo: ",this.titulo);
    //console.log("imagenes: ", this.imagenes);

   
  }

  eliminarTramite(doc:Documentacion){    
      let index = this.tramitesSeleccionados.indexOf(doc);
      let titulo = doc.titulo;      
      if (index !== -1) {
        this.tramitesSeleccionados.splice(index, 1); // Eliminar archivo del array
      } else {
        return this.mensajesError("Error al eliminar el archivo")
      }
      this.tramites.map((doc)=>{
        if(doc.nombre === titulo){
          doc.seleccionado = false;
        }
      });
      console.log("tramites", this.tramites);
      
  }

/*   inicializarDocumentacion(): void {
    if (!this.legajoSeleccionado) return;

    this.legajoSeleccionado.documentacion = this.tramites.map((tramite) => {
      const docExistente = this.legajoSeleccionado!.documentacion.find((doc) => doc.titulo === tramite);

      return (
        docExistente || {
          titulo: tramite,
          sinVto: true,
          fechaVto: 0,
          estado: { enFecha: false, porVencer: false, vencido: false, vacio: true },
          imagenes: []
        }
      );
    });
  } */

/*   actualizarFechaVto(index: number, fecha: string): void {
    if (this.legajoSeleccionado) {
      const documento = this.legajoSeleccionado.documentacion[index];
      documento.sinVto = false;
      documento.fechaVto = new Date(fecha).getTime();
    }
  } */

 /*  toggleSinVto(index: number, checked: boolean): void {
    if (this.legajoSeleccionado) {
      const documento = this.legajoSeleccionado.documentacion[index];
      documento.sinVto = checked;
      if (checked) documento.fechaVto = 0;
    }
  } */

  /* agregarImagen(tramiteIndex: number, archivos: FileList | null): void {
    if (this.legajoSeleccionado && archivos) {
      const documento = this.legajoSeleccionado.documentacion[tramiteIndex];
  
      for (let i = 0; i < archivos.length; i++) {
        const archivo = archivos[i];
  
        // Lee el archivo como base64 y almacena su contenido
        const reader = new FileReader();
        reader.onload = (e: any) => {
          documento.imagenes.push({
            nombre: archivo.name, // Nombre original del archivo
            url: e.target.result, // Contenido en base64
          });
        };
        reader.readAsDataURL(archivo);
      }
    }
  } */
  
 /*  eliminarImagen(tramiteIndex: number, imagenIndex: number): void {
    if (this.legajoSeleccionado) {
      this.legajoSeleccionado.documentacion[tramiteIndex].imagenes.splice(imagenIndex, 1);
    }
  } */

    guardar(): void {
      if (!this.legajoSeleccionado) {
        this.mensajesError("No hay legajo seleccionado");
        return;
      }
    
      Swal.fire({
        title: "¿Desea guardar los datos del legajo?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Agregar",
        cancelButtonText: "Cancelar"
      }).then((result) => {
        if (result.isConfirmed) {
          // Promesas para subir imágenes a Cloudinary
          const uploadPromises: Promise<any>[] = [];
    
          // Actualizar trámites seleccionados en el legajo
          this.tramitesSeleccionados.forEach((nuevoTramite) => {
            const tramiteExistente = this.legajoSeleccionado.documentacion.find(
              (doc) => doc.titulo === nuevoTramite.titulo
            );
    
            if (tramiteExistente) {
              // Actualizar los datos del trámite existente
              tramiteExistente.sinVto = nuevoTramite.sinVto;
              tramiteExistente.fechaVto = nuevoTramite.fechaVto;
              tramiteExistente.estado = nuevoTramite.estado;
    
              if (nuevoTramite.imagenes.length > 0) {
                tramiteExistente.imagenes = [];
                nuevoTramite.imagenes.forEach((archivo: any) => {
                  if (!archivo.url.startsWith('data:') || archivo.url.split(',')[1].length === 0) {
                    console.error('El archivo no tiene datos válidos:', archivo.nombre);
                    return;
                  }
                  const blob = this.dataURLtoBlob(archivo.url);
                  const formData = new FormData();
                  formData.append('file', blob);
                  formData.append('upload_preset', environment.cloudinary.uploadPreset);
    
                  const uploadPromise = this.http.post(this.cloudinaryUrl, formData).toPromise();
                  uploadPromises.push(
                    uploadPromise.then((response: any) => {
                      tramiteExistente.imagenes.push({
                        nombre: archivo.nombre,
                        url: response.secure_url,
                      });
                    })
                  );
                });
              }
            } else {
              // Crear un nuevo trámite si no existe
              const tramiteNuevo: Documentacion = {
                titulo: nuevoTramite.titulo,
                sinVto: nuevoTramite.sinVto,
                fechaVto: nuevoTramite.fechaVto,
                estado: nuevoTramite.estado,
                imagenes: [],
              };
    
              if (nuevoTramite.imagenes.length > 0) {
                nuevoTramite.imagenes.forEach((archivo: any) => {
                  if (!archivo.url.startsWith('data:') || archivo.url.split(',')[1].length === 0) {
                    console.error('El archivo no tiene datos válidos:', archivo.nombre);
                    return;
                  }
                  const blob = this.dataURLtoBlob(archivo.url);
                  const formData = new FormData();
                  formData.append('file', blob);
                  formData.append('upload_preset', environment.cloudinary.uploadPreset);
    
                  const uploadPromise = this.http.post(this.cloudinaryUrl, formData).toPromise();
                  uploadPromises.push(
                    uploadPromise.then((response: any) => {
                      tramiteNuevo.imagenes.push({
                        nombre: archivo.nombre,
                        url: response.secure_url,
                      });
                    })
                  );
                });
              }
    
              this.legajoSeleccionado.documentacion.push(tramiteNuevo);
            }
          });
    
          // Esperar a que todas las imágenes se suban antes de guardar el legajo
          Promise.all(uploadPromises)
            .then(() => {
              this.actualizarEstadoGeneral();
              this.updateItem();
              Swal.fire({
                title: "Confirmado",
                text: "El legajo ha sido guardado.",
                icon: "success"
              }).then((result) => {
                if (result.isConfirmed) {
                  this.tramitesSeleccionados = [];
                  this.choferSeleccionado = null;
                }
              });
            })
            .catch((error) => {
              console.error('Error al subir imágenes o guardar el legajo:', error);
              this.mensajesError("Error al subir imágenes o guardar el legajo");
            });
        }
      });
    }
    
    dataURLtoBlob(dataURL: string): Blob {
      const byteString = atob(dataURL.split(',')[1]);
      const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      return new Blob([ab], { type: mimeString });
    }

  actualizarEstadoGeneral(): void {
    let algunVencido = false;
    let algunPorVencer = false;
    let todosEnFecha = true;
  
    this.legajoSeleccionado.documentacion.forEach((doc) => {
      if (doc.sinVto || !doc.fechaVto) return; // Saltar si no tiene vencimiento o fechaVto es null
    
      const fechaActual = new Date().getTime();
      const fechaVto = new Date(doc.fechaVto).getTime();
      const diferenciaDias = Math.floor((fechaVto - fechaActual) / (1000 * 60 * 60 * 24));
    
      if (diferenciaDias < 0) {
        algunVencido = true;
      } else if (diferenciaDias <= 30) {
        algunPorVencer = true;
      } else {
        todosEnFecha = todosEnFecha && true;
      }
    });
  
    this.legajoSeleccionado.estadoGral = {
      vencido: algunVencido,
      porVencer: algunPorVencer,
      enFecha: !algunVencido && !algunPorVencer && todosEnFecha,
      vacio: this.legajoSeleccionado.documentacion.every((doc) => doc.estado.vacio),
    };
  }



  /* guardar(): void {
    if (!this.legajoSeleccionado) {
      console.error("No hay legajo seleccionado");
      return;
    }
  
    // Verificar fechas de vencimiento y estados
    let algunVencido = false;
    let algunPorVencer = false;
    let todosEnFecha = true;
  
    this.legajoSeleccionado.documentacion.forEach((doc) => {
      if (doc.sinVto) {
        doc.fechaVto = 0;
        doc.estado = {
          enFecha: false,
          porVencer: false,
          vencido: false,
          vacio: !doc.titulo.trim(),
        };
      } else {
        const fechaActual = new Date().getTime();
        const fechaVto = typeof doc.fechaVto === 'number' ? doc.fechaVto : doc.fechaVto.getTime();
        const diferenciaDias = Math.floor((fechaVto - fechaActual) / (1000 * 60 * 60 * 24));
  
        doc.estado = {
          enFecha: diferenciaDias > 30,
          porVencer: diferenciaDias <= 30 && diferenciaDias >= 0,
          vencido: diferenciaDias < 0,
          vacio: !doc.titulo.trim(),
        };
  
        if (doc.estado.vencido) algunVencido = true;
        if (doc.estado.porVencer) algunPorVencer = true;
        if (!doc.estado.enFecha) todosEnFecha = false;
      }
    });
  
    this.legajoSeleccionado.estadoGral = {
      vencido: algunVencido,
      porVencer: algunPorVencer,
      enFecha: !algunVencido && !algunPorVencer && todosEnFecha,
      vacio: this.legajoSeleccionado.documentacion.every((doc) => doc.estado.vacio),
    };
  
    // Subir imágenes a Cloudinary y guardar legajo
    this.subirImagenesACloudinary()
      .then(() => {
        // Guardar legajo actualizado en la base de datos
        this.storageService.updateItem('legajos', this.legajoSeleccionado);
        console.log("Legajo guardado correctamente:", this.legajoSeleccionado);
      })
      .catch((error) => {
        console.error("Error al subir imágenes o guardar el legajo:", error);
      });
  } */

  
    getFileIconSVG(fileName: string): SafeHtml {
      const extension = this.getFileExtension(fileName);
      //console.log("extension: ", extension);      
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

  /* getFileName(filePath: string): string {
    return filePath.split('/').pop() || filePath;
  } */

  getShortFileName(fileName: string): string {
    //console.log("fileName: ", fileName);
    
    const maxLength = 30; // Cantidad de caracteres a mostrar
    if (fileName.length <= maxLength) {
      return fileName;
    }
    return '...' + fileName.slice(-maxLength); // Mostrar los últimos caracteres
  }

  eliminarArchivoCarga(archivo: any): void {
    let index = this.imagenes.indexOf(archivo);
    console.log("index", index);    
    if (index !== -1) {
      this.imagenes.splice(index, 1); // Eliminar archivo del array
    }
  }
  

  eliminarArchivoTramite(doc: any, archivo: any): void {
    const index = doc.imagenes.indexOf(archivo);
    console.log("index", index);
    
    if (index !== -1) {
      doc.imagenes.splice(index, 1); // Eliminar archivo del array
    }
  }
  
 /*  esImagen(fileName: string): boolean {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension === 'jpg' || extension === 'png';
  } */
  
  updateItem(): void {
    this.storageService.updateItem('legajos', this.legajoSeleccionado);
  }

 
  abrirModal(doc: Documentacion){
    this.archivosPrevisualizados = doc.imagenes.map(imagen => ({
      url: imagen.url,
      vistaPreviaSanitizada: this.sanitizer.bypassSecurityTrustResourceUrl(imagen.url),
    }));
    
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

  mensajesError(msj:string){
    Swal.fire({
      icon: "error",
      //title: "Oops...",
      text: `${msj}`
      //footer: `${msj}`
    });
  }

  convertirPDFaBase64(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const base64 = e.target.result; // Base64 generado
      this.archivoPDFBase64 = this.sanitizer.bypassSecurityTrustResourceUrl(base64); // Sanitiza la URL
    };
    reader.readAsDataURL(file);
  }

/*   subirImagenesACloudinary(): Promise<void> {
    const promises: Promise<any>[] = [];
  
    this.tramitesSeleccionados.forEach((documento) => {
      // Procesar imágenes con contenido base64
      documento.imagenes.forEach((imagen, index) => {
        if (imagen.url) {
          const formData = new FormData();
          formData.append('file', imagen.url); // Contenido base64
          formData.append('upload_preset', environment.cloudinary.uploadPreset);
  
          // Subir a Cloudinary
          const uploadPromise = this.http.post(this.cloudinaryUrl, formData).toPromise();
          promises.push(
            uploadPromise.then((response: any) => {
              // Reemplazar contenido base64 con la URL de Cloudinary
              documento.imagenes[index] = {
                nombre: imagen.nombre, // Mantener el nombre
                url: response.secure_url, // URL de Cloudinary
              };
            })
          );
        }
      });
    });
  
    return Promise.all(promises).then(() => {
      console.log('Todas las imágenes fueron subidas a Cloudinary');
    });
  } */
}
  


