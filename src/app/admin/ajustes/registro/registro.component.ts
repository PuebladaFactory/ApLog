import { Component, OnInit } from '@angular/core';
import { distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { LogEntry } from 'src/app/interfaces/log-entry';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-registro',
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.scss']
})
export class RegistroComponent implements OnInit {
 
  searchText: string = "";
  $usuariosTodos: any[] = [];
  $usuario!: any;
  limite:number = 20;
  registros: LogEntry [] = [];
  private destroy$ = new Subject<void>();

  constructor(private dbFirebase: DbFirestoreService, private storageService: StorageService){}
  
  ngOnInit(): void {
    this.consultarRegistro()
      this.storageService.users$
      .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
      .subscribe(data => {
        if(data){
          
          this.$usuariosTodos = data;
          console.log("usuarios REGISTRO todos: ", this.$usuariosTodos);        
        }      
    });

    this.storageService.syncChangesUsers("users");
  }

  getUsuario(email:string){
    let usuario = this.$usuariosTodos.find(u => u.email === email)
    console.log("usuario encontrado: ",usuario);
    return usuario ?  usuario.name !== '' ? usuario.name : usuario.email : ''
    
  }

  getFecha(date:number){
    return new Date(date).toLocaleDateString(undefined, {year: 'numeric', month: '2-digit', day: '2-digit', weekday:"long", hour: '2-digit', hour12: false, minute:'2-digit', second:'2-digit'});
  }

  consultarRegistro(){
    this.dbFirebase.getAllColectionLimit<LogEntry>('logs', this.limite)
    .pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)) // Emitir solo si hay cambios reales
    )
    .subscribe(data => {    
      console.log("data registro", data);
                      
      if(data){
        this.registros = data;
        console.log("this.resgistro: ", this.registros);
      }
    });
  }

}
