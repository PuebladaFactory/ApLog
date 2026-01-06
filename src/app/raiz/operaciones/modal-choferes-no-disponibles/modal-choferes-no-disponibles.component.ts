import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import { Chofer } from 'src/app/interfaces/chofer';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { NoDisponibilidadChofer } from 'src/app/interfaces/no-disponibilidad-chofer';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

interface NoDisponibilidadChoferView extends NoDisponibilidadChofer {
  nombreChofer: string;
}


@Component({
  selector: 'app-modal-choferes-no-disponibles',
  standalone: false,
  templateUrl: './modal-choferes-no-disponibles.component.html',
  styleUrl: './modal-choferes-no-disponibles.component.scss'
})
export class ModalChoferesNoDisponiblesComponent implements OnInit {
  
  choferes!: ConId<Chofer>[];
  choferSeleccionado!: ConId<Chofer> | undefined;
  cantidad: number = 30;
  desde: string = "";
  hasta: string = "";
  motivo: string = "";
  editando: boolean = false;
  form!: FormGroup;
  verInactivas: boolean= false;
  noDisponibilidades: ConId<NoDisponibilidadChofer>[] = [];
  idEditando: number | null = null;
  bajaOp!: ConIdType<NoDisponibilidadChoferView>;
  private destroy$ = new Subject<void>();
  searchText: string = "";
  noDisponibilidadesView: any[] = [];
  ordenColumna: string = '';
  ordenAscendente: boolean = true;
  columnaOrdenada: string = '';
  isLoading:boolean = false;

  

  constructor(
    private fb: FormBuilder,
    private storageService: StorageService,    
    public activeModal: NgbActiveModal,  
    private dbFirestore: DbFirestoreService,
  ){
    this.form = this.fb.group({
    idChofer: ['', Validators.required],
    desde: ['', Validators.required],
    hasta: ['', Validators.required],
    motivo: [''],    
  })
  
  }
  
  ngOnInit(): void {
    this.choferes = this.storageService.loadInfo('choferes');
    this.choferes.sort((a, b) => a.apellido.localeCompare(b.apellido));
    //this.noDisponibilidades = this.storageService.loadInfo('noOperativo')
    this.cargarDatos()
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarDatos(){
    this.storageService
    .getObservable<ConIdType<NoDisponibilidadChofer>>('noOperativo')
    .pipe(takeUntil(this.destroy$))
    .subscribe((data) => {
      //console.log("data: ", data);
      this.noDisponibilidades = data;
      //console.log("this.noDisponibilidades", this.noDisponibilidades);
      this.construirVista(this.noDisponibilidades)
    });
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) return;

    const respuesta = await Swal.fire({
      title: '¿Guardar?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar'
    })

    if(respuesta.isConfirmed){
      this.isLoading = true;
      const value = this.form.value;

      const data: NoDisponibilidadChofer = {
        idNoDisponibilidad: this.idEditando ?? new Date().getTime() + Math.floor(Math.random() * 1000),
        idChofer: +value.idChofer,
        desde: value.desde,
        hasta: value.hasta ?? null,
        motivo: value.motivo,
        activa: true,
      };

      try {
        let titulo: string = this.editando ? 'editada' : 'dada de alta'
        if (this.editando) {      
          this.storageService.updateItem('noOperativo', data, data.idNoDisponibilidad, "EDICION", `Edición de baja operativa N° ${data.idNoDisponibilidad} del chofer ${this.getNombreChofer(data.idChofer)}`, this.bajaOp.id)
        } else {
          this.storageService.addItem('noOperativo', data, data.idNoDisponibilidad, "ALTA", `Alta de baja operativa N° ${data.idNoDisponibilidad} del chofer ${this.getNombreChofer(data.idChofer)}`)
        }
  
        this.isLoading = false;
        Swal.fire({
          title: "Confirmado",
          text: `La baja operativa ha sido ${titulo}`,
          icon: "success"
        });
  
      } catch (error) {
        console.error("Error con la baja operativa:", error);
        this.isLoading = false;
  
        Swal.fire({
          title: "Error",
          text: "Ocurrió un error con la baja operativa.",
          icon: "error"
        });
      }
    
          

      this.resetForm();
   
    }
    
  }


  cancelarEdicion(): void {
    this.resetForm();
  }

  resetForm(): void {
    this.form.reset();
    this.editando = false;
    this.idEditando = null;
    this.form.get('hasta')?.enable();
    
  }


  consultar(): void {
    this.form.reset();
    this.form.get('hasta')?.enable();
    this.dbFirestore.getMostRecentLimitId<NoDisponibilidadChofer>("noOperativo", "desde", "activa", false, this.cantidad).subscribe(data=>{
      this.noDisponibilidades = data;
      this.construirVista(this.noDisponibilidades);
    })
  
    
  }

  getNombreChofer(idChofer: number): string {
    const c = this.choferes.find(ch => ch.idChofer === idChofer);
    return c ? `${c.apellido}, ${c.nombre}` : 'Chofer no encontrado';
  }

  editar(n: ConIdType<NoDisponibilidadChoferView>): void {
    this.editando = true;
    this.idEditando = n.idNoDisponibilidad;
    this.bajaOp = n;

    this.form.patchValue({
      idChofer: n.idChofer,
      desde: n.desde,
      hasta: n.hasta,
      motivo: n.motivo,
      activa: n.activa
    });

    if (!n.hasta) {
      this.form.get('hasta')?.disable();
    } else {
      this.form.get('hasta')?.enable()
    }
}


  desactivar(n: ConIdType<NoDisponibilidadChoferView>): void {
    Swal.fire({
      title: '¿Desactivar baja operativa?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Desactivar',
      cancelButtonText: 'Cancelar'
    }).then(res => {
      if (!res.isConfirmed) return;
        this.isLoading = true;
        try {
          this.bajaOp = n;
          this.bajaOp.activa = false;
          let {id, type, nombreChofer, ...data} = this.bajaOp

     
          console.log("data: ", data);
      
          this.storageService.updateItem('noOperativo', data, data.idNoDisponibilidad, "BAJA", `Baja operativa N° ${data.idNoDisponibilidad} del chofer ${this.getNombreChofer(data.idChofer)}: cerrada`, this.bajaOp.id);         
    
          this.isLoading = false;
          Swal.fire({
            title: "Confirmado",
            text: `La baja operativa ha sido desactivada`,
            icon: "success"
          });
    
        } catch (error) {
          console.error("Error al cerrar la baja operativa:", error);
          this.isLoading = false;
    
          Swal.fire({
            title: "Error",
            text: "Ocurrió un error con la baja operativa.",
            icon: "error"
          });
        }

      
      
    });
  }

  verHistorial(){
    this.form.reset();
    if(this.verInactivas){
      this.cargarDatos()
    } else {
      this.noDisponibilidades = [];
    }
  }

  private construirVista(
    bajas: NoDisponibilidadChofer[]
  ) {
    this.noDisponibilidadesView = bajas.map(baja => {
      const chofer = this.choferes.find(c => c.idChofer === baja.idChofer);

      return {
        ...baja,
        nombreChofer: chofer
          ? `${chofer.apellido} ${chofer.nombre}`
          : 'Chofer desconocido'
      };
    });
    this.noDisponibilidadesView.sort((a, b) => a.nombreChofer.localeCompare(b.nombreChofer));
  }

  toggleSinDefinir(event: any): void {
    const checked = event.target.checked;

    if (checked) {
      this.form.get('hasta')?.setValue(null);
      this.form.get('hasta')?.disable();
    } else {
      this.form.get('hasta')?.enable();
    }
  }

    ordenar(columna: string): void {
      if (this.ordenColumna === columna) {
        this.ordenAscendente = !this.ordenAscendente;
      } else {
        this.ordenColumna = columna;
        this.ordenAscendente = true;
      }
      this.noDisponibilidadesView.sort((a, b) => {
        const valorA = a[columna];
        const valorB = b[columna];
        if (typeof valorA === 'string') {
          return this.ordenAscendente
            ? valorA.localeCompare(valorB)
            : valorB.localeCompare(valorA);
        } else {
          return this.ordenAscendente ? valorA - valorB : valorB - valorA;
        }
      });
    }



}
