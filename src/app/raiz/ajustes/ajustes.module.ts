import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AjustesRoutingModule } from './ajustes-routing.module';
import { AjustesControlComponent } from './ajustes-control/ajustes-control.component';
import { GestionUsuariosComponent } from './gestion-usuarios/gestion-usuarios.component';
import { ModalUsuarioComponent } from './gestion-usuarios/modal-usuario/modal-usuario.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { RegistroComponent } from './registro/registro.component';
import { NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
import { PapeleraComponent } from './papelera/papelera.component';
import { PapeleraLegadoComponent } from './papelera-legado/papelera-legado.component';
import { RegistroLogComponent } from './registro-log/registro-log.component';
import { FilterPipeModule } from 'ngx-filter-pipe';



@NgModule({
  declarations: [
    AjustesControlComponent,
    GestionUsuariosComponent,
    ModalUsuarioComponent,
    RegistroComponent,
    PapeleraComponent,
    PapeleraLegadoComponent,
    RegistroLogComponent,
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
