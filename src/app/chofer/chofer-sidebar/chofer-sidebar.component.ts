import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-chofer-sidebar',
  templateUrl: './chofer-sidebar.component.html',
  styleUrls: ['./chofer-sidebar.component.css']
})
export class ChoferSidebarComponent implements OnInit {

  constructor(private router: Router) { }

  ngOnInit(): void {
  }

  volverLogin(){
    this.router.navigate(['login'])
  }

}
