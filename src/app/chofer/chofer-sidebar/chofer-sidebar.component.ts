import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/servicios/autentificacion/auth.service';

@Component({
  selector: 'app-chofer-sidebar',
  templateUrl: './chofer-sidebar.component.html',
  styleUrls: ['./chofer-sidebar.component.css']
})
export class ChoferSidebarComponent implements OnInit {

  constructor(private router: Router, private authService: AuthService ) { }

  ngOnInit(): void {
  }

  volverLogin(){
    this.authService.SignOut()
    this.router.navigate(['login'])
  }

}
