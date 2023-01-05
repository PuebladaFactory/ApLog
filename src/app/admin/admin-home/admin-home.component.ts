import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-admin-home',
  templateUrl: './admin-home.component.html',
  styleUrls: ['./admin-home.component.css']
})
export class AdminHomeComponent implements OnInit {

  activo:boolean = false;

  constructor() { }

  ngOnInit(): void {
  }

  toogleSidebar(){
    this.activo = !this.activo;
    console.log(this.activo);
  }

}
