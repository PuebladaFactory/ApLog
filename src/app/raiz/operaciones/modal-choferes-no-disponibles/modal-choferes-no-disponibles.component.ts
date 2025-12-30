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
  bajaOp!: ConId<NoDisponibilidadChofer>;
  private destroy$ = new Subject<void>();
  

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
      console.log("data: ", data);
      this.noDisponibilidades = data;
      console.log("this.noDisponibilidades", this.noDisponibilidades);
      
    });
  }

  guardar(): void {
    if (this.form.invalid) return;

    const value = this.form.value;

    const data: NoDisponibilidadChofer = {
      idNoDisponibilidad: this.idEditando ?? new Date().getTime() + Math.floor(Math.random() * 1000),
      idChofer: +value.idChofer,
      desde: value.desde,
      hasta: value.hasta,
      motivo: value.motivo,
      activa: true,
    };

    let lista = this.storageService.loadInfo(
      'noOperativo'
    ) || [];

   /*  if (this.editando) {
      lista = lista.map(n =>
        n.idNoDisponibilidad === data.idNoDisponibilidad ? data : n
      );
    } else {
      lista.push(data);
    } */

    if (this.editando) {      
      this.storageService.updateItem('noOperativo', data, data.idNoDisponibilidad, "EDiCION", `Editada baja operativa N° ${data.idNoDisponibilidad} del chofer ${this.getNombreChofer(data.idChofer)}`, this.bajaOp.id)
    } else {
      this.storageService.addItem('noOperativo', data, data.idNoDisponibilidad, "ALTA", `Alta de baja operativa N° ${data.idNoDisponibilidad} del chofer ${this.getNombreChofer(data.idChofer)}`)
    }    

    this.resetForm();
    //this.consultar();
  }


  cancelarEdicion(): void {
    this.resetForm();
  }

  resetForm(): void {
    this.editando = false;
    this.idEditando = null;
    this.form.reset({
      activa: true
    });
  }


  consultar(): void {
    this.form.reset();
    this.dbFirestore.getMostRecentLimitId<NoDisponibilidadChofer>("noOperativo", "desde", "activa", false, this.cantidad).subscribe(data=>{
      this.noDisponibilidades = data;
    })
    /* const todas = this.storageService.loadInfo<NoDisponibilidadChofer>(
      'noDisponibilidadChofer'
    ) || [];

    let filtradas = todas.filter(n =>
      this.verInactivas ? !n.activa : n.activa
    );

    // ordenar por fecha desde DESC
    filtradas.sort((a, b) => b.desde.localeCompare(a.desde));

    this.noDisponibilidades = filtradas.slice(0, this.cantidad)
      .map(n => ({
        ...n,
        nombreChofer: this.getNombreChofer(n.idChofer)
      }) as any); */
    
  }

  getNombreChofer(idChofer: number): string {
    const c = this.choferes.find(ch => ch.idChofer === idChofer);
    return c ? `${c.apellido}, ${c.nombre}` : 'Chofer no encontrado';
  }

  editar(n: ConId<NoDisponibilidadChofer>): void {
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
}


  desactivar(n: ConId<NoDisponibilidadChofer>): void {
    Swal.fire({
      title: '¿Desactivar baja operativa?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Desactivar',
      cancelButtonText: 'Cancelar'
    }).then(res => {
      if (!res.isConfirmed) return;

      this.bajaOp = n;
      this.bajaOp.activa = false;
      let {id, ...data} = this.bajaOp

      /* let lista = this.storageService.loadInfo<NoDisponibilidadChofer>(
        'noDisponibilidadChofer'
      ) || [];

      lista = lista.map(item =>
        item.idNoDisponibilidad === n.idNoDisponibilidad
          ? { ...item, activa: false }
          : item
      ); */

      this.storageService.updateItem('noOperativo', data, data.idNoDisponibilidad, "BAJA", `Baja operativa N° ${data.idNoDisponibilidad} del chofer ${this.getNombreChofer(data.idChofer)}, cerrada`, this.bajaOp.id)
      this.consultar();
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


}
