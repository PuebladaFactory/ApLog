import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-limbo',
    templateUrl: './limbo.component.html',
    styleUrls: ['./limbo.component.scss'],
    standalone: false
})
export class LimboComponent implements OnInit {
  
  constructor(private router: Router){}

  ngOnInit(): void {}

  volver(){this.router.navigate(['login']);}

}
