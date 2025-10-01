import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConId } from 'src/app/interfaces/conId';
import { Operacion } from 'src/app/interfaces/operacion';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { PdfService } from 'src/app/servicios/informes/pdf/pdf.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-tablero-actividad',
  standalone: false,
  templateUrl: './tablero-actividad.component.html',
  styleUrl: './tablero-actividad.component.scss'
})
export class TableroActividadComponent implements OnInit, OnDestroy{

  private destroy$ = new Subject<void>();
  componenteOp: string = "operaciones"
  choferes: ConId<Chofer>[] = [];
  clientes: ConId<Cliente>[] = [];
  proveedores: ConId<Proveedor>[] = [];
  fechasConsulta?: any = {
    fechaDesde: 0,
    fechaHasta: 0,
  };
  operaciones:ConId<Operacion>[]=[];

  constructor(
    
    private storageService: StorageService,
    private excelServ: ExcelService, 
    private pdfServ: PdfService, 
    private modalService: NgbModal, 
    private dbFirebase: DbFirestoreService,

  ){}

      ngOnInit(): void {
      
      
  
      /// CHOFERES/CLIENTES/PROVEEDORES
      this.choferes = this.storageService.loadInfo('choferes');
      this.choferes = this.choferes.sort((a, b) => a.apellido.localeCompare(b.apellido)); // Ordena por el nombre del chofer
      this.clientes = this.storageService.loadInfo('clientes');
      this.clientes = this.clientes.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
      this.proveedores = this.storageService.loadInfo('proveedores');
      this.proveedores = this.proveedores.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
  
      ////////// FECHAS E INFORMES OP ///////////////
        this.storageService.fechasConsulta$
      .pipe(takeUntil(this.destroy$))
      .subscribe(fechas => {
        this.fechasConsulta = fechas;
  
         // 2. Una vez obtenidas, sincronizar informes
            this.storageService.syncChangesDateValue<Operacion>(
              this.componenteOp,
              "fecha",
              this.fechasConsulta.fechaDesde,
              this.fechasConsulta.fechaHasta,
              "desc"
            );
  
            
  
            this.storageService.getObservable<ConId<Operacion>>(this.componenteOp)
              .pipe(takeUntil(this.destroy$))
              .subscribe(data => {
                this.operaciones = data;
                if (this.operaciones) {
                  console.log("operaciones: ", this.operaciones);
                  
                } else {
                  this.mensajesError("error: facturaOpCliente", "error");
                }
              });
      });
    }
  
    ngOnDestroy(): void {
      this.destroy$.next();
      this.destroy$.complete();
    }

    mensajesError(msj:string, resultado:string){
      Swal.fire({
        icon: resultado === 'error' ? "error" : "success",
        //title: "Oops...",
        text: `${msj}`
        //footer: `${msj}`
      });
    }
}
