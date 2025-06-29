import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AjustesRoutingModule } from './ajustes-routing.module';
import { AjustesControlComponent } from './ajustes-control/ajustes-control.component';
import { AjustesUsuariosComponent } from './ajustes-usuarios/ajustes-usuarios.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { UsuariosEdicionComponent } from './modales/usuarios-edicion/usuarios-edicion.component';
import { RegistroComponent } from './registro/registro.component';
import { NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
import { PapeleraComponent } from './papelera/papelera.component';
import { FilterPipeModule } from 'ngx-filter-pipe';



@NgModule({
  declarations: [
    AjustesControlComponent,
    AjustesUsuariosComponent,
    UsuariosEdicionComponent,
    RegistroComponent,
    PapeleraComponent
  ],
  imports: [
    CommonModule,
    AjustesRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    FilterPipeModule,    
    NgbDatepickerModule,
  ]
})
export class AjustesModule { }
