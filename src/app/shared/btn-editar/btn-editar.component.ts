import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-btn-editar',
  template: `
<!-- <button *ngIf="name !== 'Detalle'"  class="btn btn-primary" style="border-radius: 10%;  margin: 10px;" >
     <i class="bi bi-pencil"></i>

    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 1000 1000"  width="16" height="16" enable-background="new 0 0 1000 1000" xml:space="preserve">
      <metadata> Svg Vector Icons : http://www.onlinewebfonts.com/icon </metadata>
      <g><path style="fill: white" d="M945.8,295.3c-1,2.1-2.2,4.1-3.9,5.9L346.7,896.4c-2.3,4-5.5,7.5-10.1,9.3L41.1,988.4c-0.6,0.3-1.3,0.3-2,0.6l-1,0.3c-0.2,0.1-0.4,0-0.5,0.1c-2,0.5-4,1-6.1,1c-2.1,0.1-4-0.3-6-0.9c-0.4-0.1-0.9,0-1.3-0.2c-0.2-0.1-0.3-0.2-0.4-0.3c-1.9-0.7-3.5-1.8-5.1-3c-0.8-0.6-1.7-1.1-2.4-1.8c-0.7-0.7-1.2-1.6-1.8-2.4c-1.2-1.6-2.3-3.2-3-5.1c-0.1-0.2-0.2-0.3-0.3-0.4c-0.1-0.4-0.1-0.9-0.2-1.3c-0.5-2-0.9-3.9-0.9-6c0-2.1,0.4-4.1,1-6.1c0.1-0.2,0-0.3,0.1-0.5l0.3-1c0.2-0.6,0.3-1.3,0.6-2l82.8-295.5c1.7-4.6,5.2-7.8,9.3-10.1L690,67.5c0.9-1,1.9-1.8,2.7-2.7l6.4-6.4c0.3-0.3,0.7-0.4,1.1-0.7c30.8-29.4,72.1-48,118.1-48C913.1,9.7,990,86.5,990,181.3C990,225.3,973,265,945.8,295.3z M865.2,319L788,241.8L283.8,746c0.1,0.2,0.3,0.2,0.4,0.4l50.6,103L865.2,319z M63.4,936.9l59.4-16.6L80,877.6L63.4,936.9z M92.9,831.5l75.9,75.9l130.5-36.6c0,0-55.2-114.6-55.2-114.6L129.5,701L92.9,831.5z M253.9,716.2c0.2,0.1,0.2,0.3,0.4,0.4l504.3-504.3l-77.2-77.2L151,665.5L253.9,716.2z M817.7,52.3c-38,0-71.9,16.6-95.7,42.5l-0.1-0.1l-11,10.9l183.8,183.8l11.2-11.3l-0.1-0.1c25.8-23.8,42.2-57.6,42.2-95.5C948,110.7,889.7,52.3,817.7,52.3z"/></g>
    </svg>

    {{name || "Editar"}}
</button> 

<button *ngIf="name === 'Detalle'"  class="btn btn-secondary" style="border-radius: 10%;  margin: 10px;" >
    <i class="bi bi-pencil"></i> 

    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye" viewBox="0 0 16 16">
      <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
      <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
    </svg>

   {{name || "Editar"}} 
</button>  -->
<button *ngIf="name === 'editarTarifa'" type="button" class="btn celeste-fijo mt-2">
  Editar última Tarifa
</button>


<button *ngIf="name === 'Editar'"  class="btn btn-light m-0 celeste" style="border-radius: 10%;  margin: 10px;" >    <!-- <i class="bi bi-pencil"></i> -->

    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil" viewBox="0 0 16 16">
      <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325"/>
    </svg>

    <!-- {{name || "Editar"}} -->
</button> 

<button *ngIf="name === 'EditarClaro'"  class="btn btn-outline-secondary m-0 celeste" style="border-radius: 10%;  margin: 10px;" >
    <!-- <i class="bi bi-pencil"></i> -->

    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil" viewBox="0 0 16 16">
      <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325"/>
    </svg>

    <!-- {{name || "Editar"}} -->
</button> 

  <button *ngIf="name === 'modificarTarifa'"  class="btn azul">
    Modificar Tarifa
  </button>

  `,
  styles: [
    `
     .celeste:hover{
        background-color: lightblue;
        color: black;
        border-color: black;
        font-size: 1.25rem;
      }

      .celeste-fijo{
        background-color: lightblue;
        color: white;
        border-color: blue;
        font-size: 1.25rem;
      }

      .celeste-fijo:hover{
        background-color: rgb(121, 174, 192);;
        color: white;
        border-color: blue;
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
export class BtnEditarComponent implements OnInit {

  @Input() name?: string;
  constructor() { }

  ngOnInit(): void {
  }

}
