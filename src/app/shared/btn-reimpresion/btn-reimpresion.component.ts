import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-btn-reimpresion',
  templateUrl: './btn-reimpresion.component.html',
  styleUrls: ['./btn-reimpresion.component.scss']
})
export class BtnReimpresionComponent implements OnInit {

  @Input() nombre?: string;
  constructor() { }

  ngOnInit(): void {
  }

}
