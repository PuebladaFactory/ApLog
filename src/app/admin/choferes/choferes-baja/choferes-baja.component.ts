import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Chofer } from 'src/app/interfaces/chofer';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';


@Component({
  selector: 'app-choferes-baja',
  templateUrl: './choferes-baja.component.html',
  styleUrls: ['./choferes-baja.component.scss']
})
export class ChoferesBajaComponent implements OnInit {
  
  choferes!: Chofer[];
  searchText: string = "";
  componente: string = "choferes";

  constructor(private dbFirebase: DbFirestoreService, private router: Router){

  }
  
  ngOnInit(): void { 
    this.leerChoferes()  
  }

  leerChoferes(){
    this.choferes = JSON.parse(localStorage.getItem("choferes")||`{}`)
  }

  eliminarChofer(id:any){
    this.dbFirebase.delete(this.componente, id)
      .then((data) => console.log(data))
      .then(() => this.ngOnInit())
      .then(() => this.router.navigate(['/choferes/listado']))
      .catch((e) => console.log(e.message));
  }

}
