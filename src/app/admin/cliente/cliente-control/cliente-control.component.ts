import { Component, OnInit } from '@angular/core';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';

@Component({
  selector: 'app-cliente-control',
  template: `  
  <router-outlet></router-outlet>
    `,
  styleUrls: ['./cliente-control.component.scss']
})
export class ClienteControlComponent implements OnInit {

  componente:string = 'clientes'
  data:any;  

  constructor(private dbFirebase: DbFirestoreService,) {}

  ngOnInit(): void {
    //this.getAll();  
   
  }

  getAll(){
    this.dbFirebase.getAll(this.componente).subscribe(data => {
      this.data = data;
      localStorage.setItem(`${this.componente}`, JSON.stringify(data))
      console.log(this.data);
    })
  }
  

}
