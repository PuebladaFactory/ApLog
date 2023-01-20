import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/servicios/autentificacion/auth.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-chofer-sidebar',
  templateUrl: './chofer-sidebar.component.html',
  styleUrls: ['./chofer-sidebar.component.css']
})
export class ChoferSidebarComponent implements OnInit {

  user:any;

  constructor(private router: Router, private authService: AuthService, private storageService: StorageService ) { }

  ngOnInit(): void {
    this.user = this.storageService.choferes$
    console.log("sidebar. user: ", this.user.source._value[0]);
    
  }

  volverLogin(){
    this.authService.SignOut()
    this.router.navigate(['login'])
  }

}
