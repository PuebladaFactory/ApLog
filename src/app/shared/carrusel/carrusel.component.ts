import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-carrusel',
  templateUrl: './carrusel.component.html',
  styleUrls: ['./carrusel.component.scss']
})
export class CarruselComponent implements OnInit {
  
  @Input() fromParent!:any

  constructor(){}
  
  ngOnInit(): void {
    console.log("imagenes: ", this.fromParent.item);    
  }

}
