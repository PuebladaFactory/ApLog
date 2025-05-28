import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';



import { AuthService } from 'src/app/servicios/autentificacion/auth.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';


@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css'],
    standalone: false
})
export class LoginComponent implements OnInit {
  // propiedades servicio modal


  hide = true;
  spinner: boolean = false;



  constructor(
    public authService: AuthService,
    private storageService: StorageService
  ) {


  }

  ngOnInit(): void {
    this.storageService.clearAllLocalStorage()
  }


  loginWithGoogle() {
    this.authService
      .GoogleAuth()
      .catch((e) => console.log(e.message));
  }

  /* accionAsincrona = async () => {
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
  } */

      onKeydown(event: KeyboardEvent, username: string, password: string) {
        if (event.key === 'Enter') {
          this.authService.SignIn(username, password);
        }
      }



}
