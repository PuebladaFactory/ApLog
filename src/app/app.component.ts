import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './servicios/autentificacion/auth.service';




@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  title = 'ApLog';
  // $estado;



  constructor(

    private router: Router,
    private authService: AuthService
  ) {
    // this.$estado = authService.logged$;
  }
  ngOnInit(): void {
    // this.$estado.subscribe;
  }
}
