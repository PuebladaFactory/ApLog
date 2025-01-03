import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-btn-agregar',

  template: `
<!-- <button class="btn btn-success"  style="border-radius: 10%;  margin: 10px;"
[disabled]=disabled>
   <i *ngIf="name !== 'Vehiculo'" class="fa fa-plus" style=" vertical-align: middle;"></i>
   <i *ngIf="name === 'Vehiculo'" class="fa fa-car" style=" vertical-align: middle;"></i>

   {{name || "Agregar"}}
</button> -->


<button *ngIf="name === 'Cerrar'" class="btn azul mt-2" type="submit">
    Cerrar Operación 
</button>

<button *ngIf="name === 'Guardar'" class="btn azul mt-2" type="submit">
    Guardar 
</button>

<button *ngIf="name === 'Descargar Legajo'" class="btn azul mt-2" type="submit">
    Descargar Legajo 
</button>

<button *ngIf="name === 'GuardarClaro'" class="btn btn-outline-secondary mt-2" type="submit">
    Guardar 
</button>

<button *ngIf="name === 'GuardarCambios'" class="btn btn-secondary mt-2" type="submit">
    Guardar los cambios
</button>

<button *ngIf="name === 'GuardarCambiosClaro'" class="btn azul  mt-2" type="submit">
    Guardar los cambios
</button>

<button *ngIf="name === 'guardarTarifa'" class="btn azul  mt-2" type="submit">
    Guardar Nueva Tarifa
</button>

<button *ngIf="name === 'editarTarifa'" class="btn azul  mt-2" type="submit">
    Editar última Tarifa
</button>

<button *ngIf="name === 'Agregar'" class="btn azul mt-2" type="submit">
    Agregar 
</button>

<button *ngIf="name === 'Agregar Contacto'" class="btn btn-secondary mt-2" type="submit">
    Agregar Contacto
</button>

<button *ngIf="name === 'AgregarContactoClaro'" class="btn btn-outline-secondary mt-2" type="submit">
    Agregar Contacto
</button>

<button *ngIf="name === 'Facturar'" class="btn btn-secondary mt-2" type="submit">
    Facturar 
</button>


<button *ngIf="name === 'Factura'" class="btn btn-light m-0 verde"  style="border-radius: 10%;  margin: 10px;"
[disabled]=disabled>
<svg  xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-currency-dollar" viewBox="0 0 16 16">
    <path d="M4 10.781c.148 1.667 1.513 2.85 3.591 3.003V15h1.043v-1.216c2.27-.179 3.678-1.438 3.678-3.3 0-1.59-.947-2.51-2.956-3.028l-.722-.187V3.467c1.122.11 1.879.714 2.07 1.616h1.47c-.166-1.6-1.54-2.748-3.54-2.875V1H7.591v1.233c-1.939.23-3.27 1.472-3.27 3.156 0 1.454.966 2.483 2.661 2.917l.61.162v4.031c-1.149-.17-1.94-.8-2.131-1.718zm3.391-3.836c-1.043-.263-1.6-.825-1.6-1.616 0-.944.704-1.641 1.8-1.828v3.495l-.2-.05zm1.591 1.872c1.287.323 1.852.859 1.852 1.769 0 1.097-.826 1.828-2.2 1.939V8.73z"/>
</svg>
</button>
`,
  styles: [
    `
     .verde:hover{
        background-color: lightgreen;
        color: black;
        border-color: black;
        font-size: 1.25rem;
      }

    .azul{
        background-color: #3d8bfd;
        color: white;
        font-size: 1.25rem;
    }  
    .azul:hover{
        background-color: #0d6efd;
        color: white;
        font-size: 1.25rem;
    }      


  `
  ]



})
export class BtnAgregarComponent implements OnInit {

  @Input() name?: string;
  @Input() disabled!: boolean;
  constructor() { }

  ngOnInit(): void {
  }

}
