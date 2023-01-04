import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';


import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';


import { HttpClientModule } from '@angular/common/http';



import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireDatabaseModule } from '@angular/fire/compat/database';
import { environment } from '../environments/environment';

import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';





import { FIREBASE_OPTIONS } from '@angular/fire/compat';

// LOGIN

import { AuthService } from './servicios/autentificacion/auth.service';
import {
  AuthGuard,
  canActivate,
  redirectLoggedInTo,
  redirectUnauthorizedTo,
} from '@angular/fire/auth-guard';




import { AppRoutingModule } from './app-routing.module';
import { ForgotPasswordComponent } from './appLogin/forgot-password/forgot-password.component';
import { LoginHeaderComponent } from './appLogin/login-header/login-header.component';
import { LoginComponent } from './appLogin/login/login.component';
import { LogoutComponent } from './appLogin/logout/logout.component';
import { SignUpComponent } from './appLogin/sign-up/sign-up.component';
import { VerifyEmailComponent } from './appLogin/verify-email/verify-email.component';
import { HeaderComponent } from './home/header/header.component';
import { HomeComponent } from './home/home.component';
import { NavbarComponent } from './home/navbar/navbar.component';
import { PagenotfoundComponent } from './pagenotfound/pagenotfound.component';
import { EmpresaFormComponent } from './perfil-empresa/empresa-form/empresa-form.component';
import { PerfilEmpresaComponent } from './perfil-empresa/perfil-empresa.component';
import { PerfilUsuarioComponent } from './perfil-usuario/perfil-usuario.component';
import { BtnAgregarComponent } from './shared/btn-agregar/btn-agregar.component';
import { BtnEditarComponent } from './shared/btn-editar/btn-editar.component';
import { BtnEliminarComponent } from './shared/btn-eliminar/btn-eliminar.component';
import { BtnReimpresionComponent } from './shared/btn-reimpresion/btn-reimpresion.component';





@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    LoginComponent,
    HomeComponent,
    BtnAgregarComponent,
    BtnEditarComponent,
    BtnEliminarComponent,


    PagenotfoundComponent,

    BtnReimpresionComponent,





    LogoutComponent,
    ForgotPasswordComponent,
    VerifyEmailComponent,
    SignUpComponent,
    LoginHeaderComponent,

    PerfilUsuarioComponent,
    PerfilEmpresaComponent,
    EmpresaFormComponent,

    NavbarComponent,

  ],
  imports: [
    BrowserModule,
    FormsModule,

    AppRoutingModule,
    NgbModule, //se importa la clase RouterModule y se le indica la const donde estan las rutas
    ReactiveFormsModule,
    HttpClientModule,
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFirestore(() => getFirestore()),
    provideAuth(() => getAuth()),

  ],
  providers: [

    AuthService,
    { provide: FIREBASE_OPTIONS, useValue: environment.firebase },

  ],

  bootstrap: [AppComponent],
})
export class AppModule {}
