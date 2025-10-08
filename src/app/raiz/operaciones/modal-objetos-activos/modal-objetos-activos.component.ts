import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-modal-objetos-activos',
  standalone:false,
  templateUrl: './modal-objetos-activos.component.html',
  styleUrl: './modal-objetos-activos.component.scss'
})
export class ModalObjetosActivosComponent implements OnInit {
  
  @Input() fromParent: any;
  objetos:any[] = []
  objetosInactivos: any[] = [];
  coleccion: string = "";
  isLoading: boolean = false;

  constructor(
    private storageService: StorageService,    
    public activeModal: NgbActiveModal,  
        
  ){}


  ngOnInit(): void {    
    console.log("this.fromParent", this.fromParent);
    
    this.objetos = this.fromParent.objetos;
    this.objetosInactivos = this.fromParent.inactivos;
    this.coleccion = this.fromParent.coleccion;    

    console.log("this.objetos", this.objetos);
    console.log("this.objetosInactivos", this.objetosInactivos);
    console.log("this.coleccion", this.coleccion);
  }

  toggleActivo(objeto:any) {
    this.isLoading = true;    
    objeto.activo = !objeto.activo;
    this.updateItem(objeto)
  }  
  
  updateItem(objeto:any){
    console.log("objeto", objeto);
    let idObj: any = this.coleccion === "clientes" ? objeto.idCliente : objeto.idChofer;
    let{id, type, ...obj} = objeto;

    this.storageService.updateItem(this.coleccion, obj, idObj, "INTERNA", "", objeto.id);
    this.verificarObjetos();
  }

  getNombre(objeto:any): string{
    let nombre = this.coleccion === "clientes" ? objeto.razonSocial : objeto.apellido + " " + objeto.nombre;
    return nombre;
  }

  verificarObjetos(){
    this.objetosInactivos = [];
    this.objetos.map(obj =>{
      if(!obj.activo){
        this.objetosInactivos.push(obj)
      }      
    })
    this.isLoading = false;
  }


}
