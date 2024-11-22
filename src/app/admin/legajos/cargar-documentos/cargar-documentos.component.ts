import { Component, OnInit } from '@angular/core';
import { Chofer } from 'src/app/interfaces/chofer';
import { Legajo } from 'src/app/interfaces/legajo';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-cargar-documentos',
  templateUrl: './cargar-documentos.component.html',
  styleUrls: ['./cargar-documentos.component.scss']
})
export class CargarDocumentosComponent implements OnInit {
  
  $choferes!: Chofer[];
  $legajos!: Legajo[];
  choferSeleccionado!: Chofer;
  legajoSeleccionado!: Legajo;
  tramites: string[] = [
    'DNI',
    'Antecedentes Penales',
    'Licencia',
    'LINTI',
    'Libreta Sanitaria',
    'ART/ACC. Personales',
    'Cedula',
    'Título',
    'Seguro',
    'VTV/RTO',
    'RUTA',
    'Senasa'
  ];

  
  
  constructor(private storageService: StorageService){

  }  
  
  ngOnInit(): void {
    this.storageService.choferes$.subscribe(data => {
      this.$choferes = data;     
      this.$choferes = this.$choferes      
      .sort((a, b) => a.apellido.localeCompare(b.apellido)); // Ordena por el nombre del chofer
      console.log("1)choferes especiales: ", this.$choferes);      
      
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
    console.log("legajos: ", this.$legajos);    
    let legajoSel : Legajo[];
    legajoSel = this.$legajos.filter((l)=> l.idChofer === this.choferSeleccionado.idChofer);    
    this.legajoSeleccionado = legajoSel[0];
    if (this.legajoSeleccionado) {
      this.inicializarDocumentacion();
    }
  }

  inicializarDocumentacion(): void {
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
  }

  actualizarFechaVto(index: number, fecha: string): void {
    if (this.legajoSeleccionado) {
      const documento = this.legajoSeleccionado.documentacion[index];
      documento.sinVto = false;
      documento.fechaVto = new Date(fecha).getTime();
    }
  }

  toggleSinVto(index: number, checked: boolean): void {
    if (this.legajoSeleccionado) {
      const documento = this.legajoSeleccionado.documentacion[index];
      documento.sinVto = checked;
      if (checked) documento.fechaVto = 0;
    }
  }

  agregarImagen(tramiteIndex: number, archivos: FileList | null): void {
    if (this.legajoSeleccionado && archivos) {
      const documento = this.legajoSeleccionado.documentacion[tramiteIndex];
  
      for (let i = 0; i < archivos.length; i++) {
        const reader = new FileReader();
        const archivo = archivos[i];
  
        reader.onload = (e: any) => {
          documento.imagenes.push(e.target.result); // Aquí se almacenan las imágenes como base64.
        };
  
        reader.readAsDataURL(archivo);
      }
    }
  }
  
  eliminarImagen(tramiteIndex: number, imagenIndex: number): void {
    if (this.legajoSeleccionado) {
      this.legajoSeleccionado.documentacion[tramiteIndex].imagenes.splice(imagenIndex, 1);
    }
  }

  guardar(): void {
    if (!this.legajoSeleccionado) {
      console.error("No hay legajo seleccionado");
      return;
    }
  
    let algunVencido = false;
    let algunPorVencer = false;
    let todosEnFecha = true;
  
    this.legajoSeleccionado.documentacion.forEach((doc) => {
      // Limpiamos el array de imágenes porque no está implementada su gestión en la base de datos aún
      doc.imagenes = [];
  
      if (doc.sinVto) {
        doc.fechaVto = 0;
        doc.estado = {
          enFecha: false,
          porVencer: false,
          vencido: false,
          vacio: !doc.titulo.trim(), // Está vacío si no hay título
        };
      } else {
        const fechaActual = new Date().getTime();
        const fechaVto = typeof doc.fechaVto === 'number' ? doc.fechaVto : doc.fechaVto.getTime();
        const diferenciaDias = Math.floor((fechaVto - fechaActual) / (1000 * 60 * 60 * 24));
  
        // Actualizamos el estado individual del documento
        doc.estado = {
          enFecha: diferenciaDias > 30,
          porVencer: diferenciaDias <= 30 && diferenciaDias >= 0,
          vencido: diferenciaDias < 0,
          vacio: !doc.titulo.trim(), // Está vacío si no hay título
        };
  
        // Verificamos el estado general del legajo
        if (doc.estado.vencido) {
          algunVencido = true;
        }
        if (doc.estado.porVencer) {
          algunPorVencer = true;
        }
        if (!doc.estado.enFecha) {
          todosEnFecha = false;
        }
      }
    });
  
    // Actualizamos el estado general del legajo
    this.legajoSeleccionado.estadoGral = {
      vencido: algunVencido,
      porVencer: algunPorVencer,
      enFecha: !algunVencido && !algunPorVencer && todosEnFecha,
      vacio: this.legajoSeleccionado.documentacion.every((doc) => doc.estado.vacio),
    };
  
    // Llamamos a updateItem para guardar el legajo actualizado
    try {
      this.storageService.updateItem('legajos', this.legajoSeleccionado);
      console.log("Legajo actualizado correctamente:", this.legajoSeleccionado);
    } catch (error) {
      console.error("Error al actualizar el legajo:", error);
    }
  }

}
