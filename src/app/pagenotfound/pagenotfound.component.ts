import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { StorageService } from '../servicios/storage/storage.service';

@Component({
  selector: 'app-pagenotfound',
  templateUrl: './pagenotfound.component.html',
  styleUrls: ['./pagenotfound.component.scss']
})
export class PagenotfoundComponent implements OnInit {

  usuario!: any;

  constructor(private router: Router, private storageService: StorageService ) { }

  ngOnInit(): void {
    let usuarioLogueado = this.storageService.loadInfo("usuario");
    this.usuario = structuredClone(usuarioLogueado[0])
  }

  volver() {
    if(this.usuario.hasOwnProperty('roles')){
      this.router.navigate(['op']);
    }else {
      this.router.navigate(['login']);
    }
    
  }


}
