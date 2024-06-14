import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-btn-leer',
  template: `
  <button *ngIf="name === 'excel'" class="btn btn-outline-primary">
      Excel
  </button>
  <button *ngIf="name === 'pdf'" class="btn btn-outline-primary">
      Pdf
  </button>

  <button *ngIf="name === 'cliente'" class="btn btn-outline-secondary">
      Alta Cliente
  </button>

  <button *ngIf="name === 'chofer'" class="btn btn-outline-secondary">
      Alta Chofer
  </button>

  <button *ngIf="name === 'proveedor'" class="btn btn-outline-secondary">
      Alta Proveedor
  </button>
 
 <button *ngIf="name === 'Detalle'"  class="btn btn-secondary m-0" style="border-radius: 10%;  margin: 10px;" >
    <!-- <i class="bi bi-pencil"></i> -->

    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye" viewBox="0 0 16 16">
      <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
      <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
    </svg>

   <!--  {{name || "Editar"}} -->
</button> 
<button *ngIf="name === 'Imprimir'"  class="btn btn-secondary m-0" style="border-radius: 10%;  margin: 10px;" >
    <!-- <i class="bi bi-pencil"></i> -->

    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-printer-fill" viewBox="0 0 16 16">
        <path d="M5 1a2 2 0 0 0-2 2v1h10V3a2 2 0 0 0-2-2zm6 8H5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1"/>
        <path d="M0 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2H2a2 2 0 0 1-2-2zm2.5 1a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1"/>
    </svg>

   <!--  {{name || "Editar"}} -->
</button> 
`,
  styles: [``]
})
export class BtnLeerComponent implements OnInit {
  @Input() name?: string;
  @Input() disabled! : boolean;
  constructor() { }

  ngOnInit(): void {
  }
}
