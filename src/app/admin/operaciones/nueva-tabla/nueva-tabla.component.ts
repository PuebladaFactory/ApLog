import { Component, OnInit } from '@angular/core';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';

@Component({
  selector: 'app-nueva-tabla',
  templateUrl: './nueva-tabla.component.html',
  styleUrls: ['./nueva-tabla.component.scss']
})
export class NuevaTablaComponent implements OnInit {

  constructor(){}

  ngOnInit(): void {
    throw new Error('Method not implemented.');
  }

   columnDefs: ColDef[] = [
    { headerName: 'ID', field: 'id', sortable: true, filter: true },
    { headerName: 'Nombre', field: 'nombre', sortable: true, filter: true },
    { headerName: 'Edad', field: 'edad', sortable: true, filter: true },
    { headerName: 'Ciudad', field: 'ciudad', sortable: true, filter: true },
  ];

  defaultColDef: ColDef = {
    resizable: true, // permite ajustar tamaño
    sortable: true,
    filter: true,    // filtro básico
    floatingFilter: true // filtros visibles en el header
  };

  rowData: any[] = []; // tus datos dinámicos
  private gridApi!: GridApi;

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    // Ejemplo de carga de datos dinámica
    this.rowData = [
      { id: 1, nombre: 'Juan', edad: 30, ciudad: 'Madrid' },
      { id: 2, nombre: 'Ana', edad: 25, ciudad: 'Barcelona' },
      { id: 3, nombre: 'Luis', edad: 28, ciudad: 'Valencia' },
      // ...
    ];
  }

}
