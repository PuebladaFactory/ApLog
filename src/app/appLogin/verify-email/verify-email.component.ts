import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/servicios/autentificacion/auth.service';

@Component({
    selector: 'app-verify-email',
    templateUrl: './verify-email.component.html',
    styleUrls: ['./verify-email.component.scss'],
    standalone: false
})
export class VerifyEmailComponent implements OnInit {

  constructor(public authService: AuthService) {}

  // reenvio de email de verificacion, no lo hacia antes

  ngOnInit(): void {
  }
  SendVerificationMail() {
    return this.authService.enviarEmailVerificacion();
  }
}
