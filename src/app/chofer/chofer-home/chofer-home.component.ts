import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-chofer-home',
  templateUrl: './chofer-home.component.html',
  styleUrls: ['./chofer-home.component.css']
})
export class ChoferHomeComponent implements OnInit {

  activo:boolean = false;

  constructor() { }

  ngOnInit(): void {
  }

  toogleSidebar(){
    this.activo = !this.activo;
    console.log(this.activo);
  }

  

}
