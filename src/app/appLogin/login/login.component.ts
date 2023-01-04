import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';



import { AuthService } from 'src/app/servicios/autentificacion/auth.service';


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  // propiedades servicio modal


  hide = true;
  spinner: boolean = false;



  constructor(private router: Router,
    public authService: AuthService,
  ) {


  }

  ngOnInit(): void {

  }


  loginWithGoogle() {
    this.authService
      .GoogleAuth()
      .catch((e) => console.log(e.message));
  }

  accionAsincrona = async () => {
    console.log("pasa por aca 1?");
    this.spinner = true;
    return new Promise<void>((resolve, reject) => {
      console.log("pasa por aca 2?");
      setTimeout(() => {
        resolve();
      }, 3000);
    })

      .then(() => {
        console.log("pasa por aca 3?");
        this.spinner = false;
      });
  }



}
