import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/servicios/autentificacion/auth.service';



@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.scss']
})
export class SignUpComponent implements OnInit {

  constructor(public authService: AuthService,
 ) {}

  ngOnInit(): void {
  }


  loginWithGoogle() {
    this.authService
      .GoogleAuth()
      // .then(() => this.authService.getCurrentUser())

      //.then(() => this.router.navigate(['/playa']))             
      //.then(() => this.accionAsincrona())
     
      //.then(() => this.router.navigate(['/home']))
      .catch((e) => console.log(e.message));
  }

}
